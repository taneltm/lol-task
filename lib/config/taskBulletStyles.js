const term = require('terminal-kit').terminal;

module.exports = {
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
    todo:      () => term('🙂'),
    done:      () => term('😎'),
    cancelled: () => term('😡'),
    width: 1,
  },

  emoji2: {
    todo:      () => term('👉'),
    done:      () => term('👍'),
    cancelled: () => term('💩'),
    width: 1,
  },

  emoji3: {
    todo:      () => term('💙'),
    done:      () => term('❤️ '),
    cancelled: () => term('💔'),
    width: 1,
  },

  emoji4: {
    todo:      () => term('⚪'),
    done:      () => term('🔘'),
    cancelled: () => term('⚫️'),
    width: 1,
  },

  emoji5: {
    todo:      () => term('🌀'),
    done:      () => term('💯'),
    cancelled: () => term('💢'),
    width: 1,
  },

  emoji6: {
    todo:      () => term('⭕'),
    done:      () => term('✔️ '),
    cancelled: () => term('❌'),
    width: 1,
  },
};
