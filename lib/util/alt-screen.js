// Based on https://github.com/sergeysova/alternate-screen

let isAltScreen = false;

module.exports = {
  smcup: () => {
    isAltScreen = true;
    process.stdout.write(
      Buffer.from([0x1b, 0x5b, 0x3f, 0x31, 0x30, 0x34, 0x39, 0x68])
    );
  },

  rmcup: () => {
    if (!isAltScreen) return;

    isAltScreen = false;

    process.stdout.write(
      Buffer.from([0x1b, 0x5b, 0x3f, 0x31, 0x30, 0x34, 0x39, 0x6c])
    );
  }
};