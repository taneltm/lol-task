const taskBulletStyles = require('./config/taskBulletStyles');
const term             = require('terminal-kit').terminal;

module.exports = () => {
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

  console.log('Depending on your OS, some of these styles may not display properly.\n\n');

  return new Promise((resolve, reject) => {
    term('Enter the name of your list style: ').inputField(async (err, input) => {
      term('\n');

      if (!Object.keys(taskBulletStyles).includes(input)) {
        return reject(`Sorry, "${input}" doesn't match any known style.`);
      }

      resolve(input);
    });
  });
};