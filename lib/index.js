const fs = require('fs');
const os = require('os');
const path = require('path');

const moment = require('moment');
const { terminal, ScreenBuffer } = require('terminal-kit');
const yaml = require('js-yaml');
const touch = require('touch');

const defaultSettings = require('./config/defaultSettings');
const taskBulletStyles = require('./config/taskBulletStyles');
const theme = require('./config/theme');
const { smcup, rmcup } = require('./util/alt-screen');
const Mode = require('./models/Mode');
const Task = require('./models/Task');
const TaskState = require('./models/TaskState');
const bulletStyleSetup = require('./bulletStyleSetup');
const quit = require('./quit');

const tasksFile    = path.join(os.homedir(), '.lol_task', 'tasks.json');
const settingsFile = path.join(os.homedir(), '.lol_task', 'config.yaml');

const term = terminal;

fs.mkdir(path.join(os.homedir(), '.lol_task'), (err) => {
  if (err) {
      console.log('');
  }
});

let settings          = defaultSettings;
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
  settings = {
    ...settings,
    ...yaml.load(fs.readFileSync(settingsFile, 'utf8'))
  };
} catch (e) {
  console.log('Settings will be saved at ' + settingsFile);
  mode = Mode.SETUP;
}

(async function() {
  if (mode === Mode.SETUP) {
    try {
      settings.taskBulletStyle = await bulletStyleSetup();

      await saveSettings();
      mode = Mode.VIEW;

    } catch (err) {
      return quit(err);
    }
  }

  init();
})();

function init() {
  if (!tasks.length) tasks.push(new Task('First task, add some new tasks!'));

  smcup();
  draw();

  term.grabInput();
  term.on('key', onKeyEvent);
  term.on('resize', onThrottledResize);
}


let throttledResizeTimer;
function onThrottledResize() {
  clearTimeout(throttledResizeTimer);
  term.clear();
  throttledResizeTimer = setTimeout(() => {
    draw();
  }, 250);
}

function saveSettings() {
  return new Promise((resolve, reject) => {
    fs.writeFile(settingsFile, yaml.dump(settings), (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function saveTasks() {
  fs.writeFile(tasksFile, JSON.stringify(tasks, null, '  '), (err) => {
    if (err) {
      rmcup();
      quit(err);
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
    - settings.title.length
  );

  const topLeftLineLength  = Math.floor(topLineLength / 2);
  const topRightLineLength = topLineLength - topLeftLineLength;

  term('┌' + '─'.repeat(topLeftLineLength));
  term.color(theme.frame.background).bgColor(theme.frame.color);
  term(` ${settings.title} `);
  term.color(theme.frame.color).bgColor(theme.frame.background);
  term('─'.repeat(topRightLineLength) + '┐');

  for (let i = 0; i < term.height - 4; i++) {
    term('│' + ' '.repeat(term.width - 2) + '│');
  }

  term('└' + '─'.repeat(term.width - 2) + '┘');

  term();

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
  term.color(theme.task.todoColor).bgColor(theme.frame.background);
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
    term('»');
  }

  term.moveTo(term.width, term.height);
}




function onKeyEvent(key, matches, data) {
  if (key === 'CTRL_C') {
    quit();
  } else if (mode === Mode.VIEW) {
    term.hideCursor();

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
      mode        = Mode.EDIT;
      currentTask = tasks[selectedTaskIndex];
      inputText   = currentTask.text;

      currentTask.createCheckpoint();

      draw();

    } else {
      if (key.toUpperCase() === 'N') {
        mode = Mode.ENTRY;
        currentTask = new Task();
        selectedTaskIndex = 0;
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

    } else if (key === 'ESCAPE') {
      if (mode === Mode.ENTRY) {
        tasks = tasks.filter((item, index) => index != selectedTaskIndex);
      } else if (mode === Mode.EDIT) {
        currentTask.restoreCheckpoint();
      }

      mode = Mode.VIEW;

      draw();

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
