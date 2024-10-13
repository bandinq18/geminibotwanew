const fs = require('node:fs'); //Import fs explicitly
const path = require('node:path'); //Import path explicitly
const chalk = require('chalk'); //Make sure chalk is installed: npm install chalk

require("./module");
require("./color");
require("./animation");

/**
 * Sets up a file watcher for the current file.  This will reload the module when the file changes.  Consider using nodemon instead in a development setting for a better user experience.
 * @param {string} filePath - The path to the file to watch.  Defaults to the current file's path.
 */
const setupFileWatcher = (filePath = __filename) => {
  try {
    const watcher = fs.watch(filePath, { persistent: false }, (eventType, filename) => {
      if (eventType === 'change') {
        console.log(chalk.redBright(`[${new Date().toLocaleTimeString()}]` + ` Re-loading module: ${path.basename(filePath)}`));
        delete require.cache[require.resolve(filePath)]; //Remove the file from cache
        require(filePath); //Re-require the file after changing it.
      }
    });

    //Add an error handler to the file watcher.
    watcher.on('error', (error) => {
      console.error(chalk.redBright(`[${new Date().toLocaleTimeString()}]` + ` Error watching file ${filePath}: ${error}`));
    });
  }
  catch(err) {
    console.error(chalk.redBright(`[${new Date().toLocaleTimeString()}]` + ` Error setting up file watcher ${filePath}: ${err}`));
  }
}

setupFileWatcher();
