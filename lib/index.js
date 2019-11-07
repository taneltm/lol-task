const moment = require('moment');
const { terminal, ScreenBuffer } = require('terminal-kit');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { smcup, rmcup } = require('./util/alt-screen');
const Task = require('./models/Task');
const TaskState = require('./models/TaskState');

const tasksFile = path.join(os.homedir(), 'lol-tasks.json');

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
    todoIconColor: 'white',
    doneIconColor: 'green',
    cancelledIconColor: 'red',
    movePointerColor: 'red',
    dateColor: 'gray',
  },
};

const Mode = {
  VIEW:  1,
  ENTRY: 2,
  EDIT:  3,
  MOVE:  4,
};


let tasks = [];
let currentTask = null;

try {
  tasks = JSON.parse(fs.readFileSync(tasksFile)).map((obj) => Object.assign(new Task(), obj))
} catch (e) {
  console.log('Tasks will be saved at ' + tasksFile);
}

if (!tasks.length) tasks.push(new Task('First task, add some new tasks!'));

let selectedTaskIndex = null;

let mode = Mode.VIEW;

let inputText = '';

smcup();

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
  term.bgColor(theme.frame.background);

  tasks.forEach((task, index) => {
    term.moveTo(4, 2 + index);

    switch (task.state) {
      case TaskState.TODO: {
        let excerpt = task.getExcerpt(term.width - 6);

        term.color(theme.task.todoIconColor);
        term('☐ ');

        term.color(theme.task.todoColor);
        term(excerpt);

        term(' '.repeat(term.width - 6 - excerpt.length));


        break;
      }
      case TaskState.DONE: {
        let excerpt = task.getExcerpt(term.width - 6 - 15);

        term.color(theme.task.doneIconColor);
        term('✔ ');

        term.color(theme.task.doneColor);
        term(excerpt);

        const date = moment(task.date).format('DD MMM');
        const time = moment(task.date).format('HH:mm');

        term.color(theme.task.dateColor);
        term(` (${date} ${time})`);

        term(' '.repeat(term.width - 6 - 15 - excerpt.length));


        break;
      }
      case TaskState.CANCELLED: {
        let excerpt = task.getExcerpt(term.width - 6 - 15);

        term.color(theme.task.cancelledIconColor);
        term('✘ ');

        term.color(theme.task.cancelledColor);
        term(excerpt);

        const date = moment(task.date).format('DD MMM');
        const time = moment(task.date).format('HH:mm');

        term.color(theme.task.dateColor);
        term(` (${date} ${time})`);

        term(' '.repeat(term.width - 6 - 15 - excerpt.length));

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
    term('⇕')
  }
}

draw();

term.grabInput() ;
term.on('key', (key, matches, data) => {
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

        draw();
      }
    }

  } else if (mode === Mode.ENTRY || mode === Mode.EDIT) {
    if (key === 'ENTER') {
      mode = Mode.VIEW;
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
});

term.on('resize', draw);

function quit() {
  rmcup();
  term.hideCursor(false);
  term.processExit();
}
