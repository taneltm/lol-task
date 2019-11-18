const moment = require('moment');
const { terminal, ScreenBuffer } = require('terminal-kit');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { smcup, rmcup } = require('./util/alt-screen');
const Task = require('./models/Task');
const TaskState = require('./models/TaskState');

const tasksFile    = path.join(os.homedir(), 'lol-tasks.json');
const settingsFile = path.join(os.homedir(), 'lol-settings.json');

const term = terminal;

const title = 'LOL-TASK';

const theme = {
  toolbar: {
    background: 'black',
    labelBackground: 'white',
    labelTextColor: 'black',
    labelHighlight: 'red',
  },
  frame: {
    color: 'brightGreen',
    background: 'black',
  },
  task: {
    todoColor: 'white',
    doneColor: 'gray',
    cancelledColor: 'gray',
    movePointerColor: 'red',
    dateColor: 'gray',
  },
};

const taskBulletStyles = {
  ballot: {
    todo:      () => term.white('☐'),
    done:      () => term.green('✔'),
    cancelled: () => term.red('✘'),
    width: 1,
  },

  radio: {
    todo:      () => term.white('( )'),
    done:      () => term.white('(').green('*').white(')'),
    cancelled: () => term.white('(').red('x').white(')'),
    width: 3,
  },

  plus: {
    todo:      () => term.white('-'),
    done:      () => term.green('+'),
    cancelled: () => term.red('x'),
    width: 1,
  },

  boxxy: {
    todo:      () => term.white('[ ]'),
    done:      () => term.white('[').green('x').white(']'),
    cancelled: () => term.white('[').red('-').white(']'),
    width: 3,
  },

  ascii: {
    todo:      () => term.gray('■'),
    done:      () => term.green('√'),
    cancelled: () => term.red('x'),
    width: 1,
  },

  boot: {
    todo:      () => term.white('[    ]'),
    done:      () => term.white('[').green(' OK ').white(']'),
    cancelled: () => term.white('[').red('FAIL').white(']'),
    width: 6,
  },

  emoji1: {
    todo: () => term('🙂'),
    done: () => term('😎'),
    cancelled: () => term('😡'),
    width: 1,
  },

  emoji2: {
    todo: () => term('👉'),
    done: () => term('👍'),
    cancelled: () => term('💩'),
    width: 1,
  },

  emoji3: {
    todo: () => term('💙'),
    done: () => term('❤️ '),
    cancelled: () => term('💔'),
    width: 1,
  },

  emoji4: {
    todo: () => term('⚪'),
    done: () => term('🔘'),
    cancelled: () => term('⚫️'),
    width: 1,
  },

  emoji5: {
    todo: () => term('🌀'),
    done: () => term('💯'),
    cancelled: () => term('💢'),
    width: 1,
  },

  emoji6: {
    todo: () => term('⭕'),
    done: () => term('✔️ '),
    cancelled: () => term('❌'),
    width: 1,
  },
}

const Mode = {
  VIEW:  1,
  ENTRY: 2,
  EDIT:  3,
  MOVE:  4,
  SETUP: 5,
};

let settings = {
  taskBulletStyle: 'ballot'
};

let tasks             = [];
let currentTask       = null;
let selectedTaskIndex = null;
let mode              = Mode.VIEW;
let inputText         = '';

try {
  tasks = JSON.parse(fs.readFileSync(tasksFile)).map((obj) => Object.assign(new Task(), obj));
} catch (e) {
  console.log('Tasks will be saved at ' + tasksFile);
}

try {
  settings = JSON.parse(fs.readFileSync(settingsFile));
} catch (e) {
  console.log('Settings will be saved at ' + settingsFile);

  mode = Mode.SETUP;
}

if (mode === Mode.SETUP) {
  console.log('Depending on your OS, some of these styles may not display properly.\n');

  Object.keys(taskBulletStyles).forEach((name) => {
    const bullet = taskBulletStyles[name];

    term.white(name + '\n');
    term('  ');
    bullet.todo();
    term.white(' Pending task\n');

    term('  ');
    bullet.done();
    term.white(' Completed task\n');

    term('  ');
    bullet.cancelled();
    term.white(' Cancelled task\n\n');
  });

  term('Enter the name of your list style: ').inputField((err, input) => {
    term('\n');

    if (!Object.keys(taskBulletStyles).includes(input)) {
      console.error(`Sorry, "${input}" doesn't match any known style.`);
      return quit();
    }

    settings.taskBulletStyle = input;

    fs.writeFile(settingsFile, JSON.stringify(settings, null, '  '), (err) => {
      if (err) {
        console.error(err);
        quit();
      }

      mode = Mode.VIEW;
      init();
    });

  })
} else {
  init();
}

function init() {
  if (!tasks.length) tasks.push(new Task('First task, add some new tasks!'));

  smcup();
  draw();

  term.grabInput();
  term.on('key', keyEventListener);
  term.on('resize', draw);
}

function saveTasks() {
  fs.writeFile(tasksFile, JSON.stringify(tasks, null, '  '), (err) => {
    if (err) {
      rmcup();
      console.error(err);
      quit();
    }
  });
}

function draw() {
  term.bgColor(theme.toolbar.background);
  term.clear();

  drawFrame();

  if (mode === Mode.VIEW) {
    drawToolbar();
    drawTasks();
    if (tasks.length && selectedTaskIndex == null) {
      setSelectedTask(0);
    } else {
      setSelectedTask(Math.min(tasks.length - 1, selectedTaskIndex));
    }
    term.hideCursor();
  } else if (mode === Mode.ENTRY || mode == Mode.EDIT) {
    term.hideCursor(false);
    drawInputText();
  }

}

function drawFrame() {
  term.color(theme.frame.color).bgColor(theme.frame.background);

  const topLineLength = (
    term.width
    - 2 // Corners
    - 2 // Title padding
    - title.length
  );

  const topLeftLineLength  = Math.floor(topLineLength / 2);
  const topRightLineLength = topLineLength - topLeftLineLength;

  term('┌' + '─'.repeat(topLeftLineLength));
  term.color(theme.frame.background).bgColor(theme.frame.color);
  term(` ${title} `);
  term.color(theme.frame.color).bgColor(theme.frame.background);
  term('─'.repeat(topRightLineLength) + '┐');

  for (let i = 0; i < term.height - 4; i++) {
    term('│' + ' '.repeat(term.width - 2) + '│');
  }

  term('└' + '─'.repeat(term.width - 2) + '┘');

  term()

}

function drawToolbar() {
  term.moveTo(2, term.height - 1);
  term.color(theme.frame.color).bgColor(theme.frame.background);

  items = [
    'New',
    'Move',
    'Todo',
    'Done',
    'Cancel',
    'Remove',
    'Quit',
  ];

  toolbarWidth = items.join(' ').length + items.length * 2;

  if (term.width > toolbarWidth) {
    items.forEach((item) => drawToolbarItem(item));
  } else {
    items.forEach((item) => drawToolbarItem(item.substring(0, 1) + '…'));
  }
}

function drawToolbarItem(name) {
  term.color(theme.toolbar.labelHighlight).bgColor(theme.toolbar.labelBackground);
  term(' ' + name.substring(0, 1));

  term.color(theme.toolbar.labelTextColor).bgColor(theme.toolbar.labelBackground);
  term(name.substring(1) + ' ');

  term.color('white').bgColor(theme.toolbar.background);
  term(' ');
}

function drawInputText() {
  term.color(theme.frame.color).bgColor(theme.frame.background);
  term.moveTo(2, 2);
  term.wrapColumn({x: 2 , width: term.width - 2 }) ;
  term.wrap(inputText);
}

function drawTasks() {
  const bullet = taskBulletStyles[settings.taskBulletStyle];

  term.bgColor(theme.frame.background);

  tasks.forEach((task, index) => {
    term.moveTo(4, 2 + index);

    switch (task.state) {
      case TaskState.TODO: {
        let excerpt = task.getExcerpt(term.width - 5 - bullet.width);

        bullet.todo();

        term.color(theme.task.todoColor);
        term(' ' + excerpt);

        term(' '.repeat(term.width - 5 - bullet.width - excerpt.length));


        break;
      }
      case TaskState.DONE: {
        let excerpt = task.getExcerpt(term.width - 5 - bullet.width - 15);

        bullet.done();

        term.color(theme.task.doneColor);
        term(' ' + excerpt);

        const date = moment(task.date).format('DD MMM');
        const time = moment(task.date).format('HH:mm');

        term.color(theme.task.dateColor);
        term(` (${date} ${time})`);

        term(' '.repeat(term.width - 5 - bullet.width - 15 - excerpt.length));


        break;
      }
      case TaskState.CANCELLED: {
        let excerpt = task.getExcerpt(term.width - 5 - bullet.width - 15);

        bullet.cancelled();

        term.color(theme.task.cancelledColor);
        term(' ' + excerpt);

        const date = moment(task.date).format('DD MMM');
        const time = moment(task.date).format('HH:mm');

        term.color(theme.task.dateColor);
        term(` (${date} ${time})`);

        term(' '.repeat(term.width - 5 - bullet.width - 15 - excerpt.length));

        break;
      }
    }

  });
}

function setSelectedTask(index) {
  if (!tasks.length) return;

  term.color(theme.frame.color).bgColor(theme.frame.background);

  if (selectedTaskIndex !== null) {
    term.moveTo(1, 2 + selectedTaskIndex);
    term('│ ');
  }

  selectedTaskIndex = index;

  term.moveTo(1, 2 + index);

  if (mode === Mode.VIEW) {
    term('├→');
  } else if (mode === Mode.MOVE) {
    term('│');
    term.color(theme.task.movePointerColor);
    term('»')
  }
}




function keyEventListener(key, matches, data) {
  if (key === 'CTRL_C') {
    quit();
  } else if (mode === Mode.VIEW) {
    if (key.toUpperCase() === 'Q') {
      quit();

    } else if (key === 'UP') {
      if (selectedTaskIndex > 0) {
        setSelectedTask(selectedTaskIndex - 1);
      } else {
        setSelectedTask(tasks.length - 1);
      }

    } else if (key === 'DOWN') {
      if (selectedTaskIndex < tasks.length - 1) {
        setSelectedTask(selectedTaskIndex + 1);
      } else {
        setSelectedTask(0);
      }

    } else if (key.toUpperCase() === 'M' && tasks.length) {
      mode = Mode.MOVE;
      setSelectedTask(selectedTaskIndex);

    } else if (key.toUpperCase() === 'T' && tasks.length) {
      tasks[selectedTaskIndex].todo();
      drawTasks();
      saveTasks();

    } else if (key.toUpperCase() === 'D' && tasks.length) {
      tasks[selectedTaskIndex].done();
      drawTasks();
      saveTasks();

    } else if (key.toUpperCase() === 'C' && tasks.length) {
      tasks[selectedTaskIndex].cancel();
      drawTasks();
      saveTasks();

    } else if (key.toUpperCase() === 'R' && tasks.length) {
      tasks = tasks.filter((item, index) => index != selectedTaskIndex);
      draw();
      saveTasks();

    } else if (key === 'ENTER') {
      mode = Mode.EDIT;
      currentTask = tasks[selectedTaskIndex];
      inputText   = currentTask.text;
      draw();

    } else {
      if (key.toUpperCase() === 'N') {
        mode = Mode.ENTRY;
        currentTask = new Task();
        tasks = [
          currentTask,
          ...tasks,
        ];
        inputText = '';

        draw();
      }
    }

  } else if (mode === Mode.ENTRY || mode === Mode.EDIT) {
    if (key === 'ENTER') {
      mode = Mode.VIEW;

      if (!inputText.length) {
        tasks = tasks.filter((item, index) => index != selectedTaskIndex);
      }

      draw();
      saveTasks();

    } else if (data.isCharacter) {
      inputText += key;
      currentTask.setText(inputText);
      draw();

    } else if (key === 'BACKSPACE') {
      inputText = inputText.substring(0, inputText.length - 1);
      currentTask.setText(inputText);
      draw();
    }

  } else if (mode === Mode.MOVE) {
    if (key === 'UP') {
      const oldIndex = selectedTaskIndex;

      if (selectedTaskIndex > 0) {
        setSelectedTask(selectedTaskIndex - 1);
      } else {
        setSelectedTask(tasks.length - 1);
      }

      tasks.splice(
        selectedTaskIndex,
        0,
        tasks.splice(oldIndex,1)[0]
      );

      drawTasks();

    } else if (key === 'DOWN') {
      const oldIndex = selectedTaskIndex;

      if (selectedTaskIndex < tasks.length - 1) {
        setSelectedTask(selectedTaskIndex + 1);
      } else {
        setSelectedTask(0);
      }

      tasks.splice(
        selectedTaskIndex,
        0,
        tasks.splice(oldIndex,1)[0]
      );

      drawTasks();
    } else if (key === 'ENTER' || key === 'ESCAPE') {
      mode = Mode.VIEW;
      draw();
      saveTasks();
    }
  }
}

function quit() {
  rmcup();
  term.hideCursor(false);
  term.processExit();
}
