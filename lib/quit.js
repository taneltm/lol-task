const { smcup, rmcup } = require('./util/alt-screen');
const term             = require('terminal-kit').terminal;

module.exports = (reason) => {
  rmcup();

  term.hideCursor(false);

  if (reason) {
    console.error(reason);
  }

  term.processExit(+!!reason);
};
