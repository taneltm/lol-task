const TaskState = require('./TaskState');

function now() {
  return (new Date()).toJSON();
}

module.exports = class Task {
  constructor(text) {
    this.state = TaskState.TODO;
    this.text  = text;
    this.date  = null;

    this.createCheckpoint();
  }

  setText(text) {
    this.state = TaskState.TODO;
    this.text  = text;

    return this;
  }

  todo() {
    this.state = TaskState.TODO;
    this.date  = null;

    return this;
  }

  done() {
    this.state = TaskState.DONE;
    this.date  = now();

    return this;
  }

  cancel() {
    this.state = TaskState.CANCELLED;
    this.date  = now();

    return this;
  }

  getExcerpt(width) {
    return this.text.length <= width
      ? this.text
      : this.text.substring(0, width - 1) + '…';
  }

  createCheckpoint() {
    const {state, text, date} = this;

    this.checkpoint = {state, text, date};
  }

  restoreCheckpoint() {
    const {state, text, date} = this.checkpoint;

    this.state = state;
    this.text  = text;
    this.date  = date;
  }
}
