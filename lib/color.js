const chalk = require('chalk'); // Make sure chalk is installed: npm install chalk

/**
 * Colors text using Chalk.
 * @param {string} text - The text to color.
 * @param {string} [color] - The color keyword (e.g., 'red', 'blue', 'green'). Defaults to green if not provided.  Supports any chalk color keyword.
 * @returns {string} The colored text.
 */
const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

/**
 * Colors the background of text using Chalk.
 * @param {string} text - The text to color.
 * @param {string} [bgcolor] - The background color keyword (e.g., 'red', 'blue', 'green'). Defaults to green if not provided. Supports any chalk background color keyword.
 * @returns {string} The text with colored background.
 */
const bgcolor = (text, bgcolor) => {
  return !bgcolor ? chalk.bgGreen(text) : chalk.bgKeyword(bgcolor)(text);
};

/**
 * Pauses execution for a specified number of milliseconds.
 * @param {number} ms - The delay time in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Attach functions to global object
global.color = color;
global.bgcolor = bgcolor;
global.sleep = sleep;

module.exports = { color, bgcolor, sleep }; // Export the functions if you want to use them in other modules.
