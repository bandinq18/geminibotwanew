require("./module.js");
const chalk = require('chalk'); // Make sure to install chalk: npm install chalk
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const Jimp = require('jimp'); //Make sure to install Jimp: npm install jimp
const fetch = require('node-fetch');


const spinner = {
  interval: 500,
  frames: [
    "🅘",
    "🅡",
    "🅕",
    "🅐",
    "🅝",
    "🅑",
    "🅐",
    "🅢",
    "🅔"
  ]
};

let globalSpinner;

//Corrected getGlobalSpinner function.
const getGlobalSpinner = (disableSpins = false) => {
  if (!globalSpinner) {
    const Spin = require('ora'); // Import ora here, making sure it is installed: npm install ora
    globalSpinner = new Spin({ color: 'blue', succeedColor: 'green', spinner, disableSpins });
  }
  return globalSpinner;
};


const spins = getGlobalSpinner(false);


const start = (id, text) => spins.start(text);
const info = (id, text) => spins.text = text;
const success = (id, text) => spins.succeed(text);
const close = (id, text) => spins.fail(text);


const reSize = async (buffer, ukur1, ukur2) => {
  try {
    const baper = await Jimp.read(buffer);
    const ab = await baper.resize(ukur1, ukur2).getBufferAsync(Jimp.MIME_JPEG);
    return ab;
  } catch (error) {
    console.error("Error resizing image:", error);
    throw error; //Re-throw the error for better error handling
  }
};

const createSerial = (size) => crypto.randomBytes(size).toString('hex').slice(0, size);


const getBuffer = async (url, options) => {
  try {
    options = options || {};
    const res = await axios({
      method: "get",
      url,
      headers: {
        'DNT': 1,
        'Upgrade-Insecure-Request': 1
      },
      ...options,
      responseType: 'arraybuffer'
    });
    return res.data;
  } catch (err) {
    console.error(`Error in getBuffer: ${err}`);
    return null; // Return null instead of the error object.
  }
};

const getRandom = (ext = "") => `${Math.floor(Math.random() * 100000)}.${ext}`;


const fetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching JSON:", error);
    throw error; // Re-throw to be handled by caller
  }
};

const runtime = (seconds) => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? `${d} ${d == 1 ? "Hari, " : "Hari, "}` : "";
  const hDisplay = h > 0 ? `${h} ${h == 1 ? "Jam, " : "Jam, "}` : "";
  const mDisplay = m > 0 ? `${m} ${m == 1 ? "Menit, " : "Menit, "}` : "";
  const sDisplay = s > 0 ? `${s} ${s == 1 ? "Detik" : "Detik"}` : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
};

const isUrl = (url) => url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));

// Attach functions to global
global.start = start;
global.info = info;
global.success = success;
global.close = close;
global.reSize = reSize;
global.createSerial = createSerial;
global.getBuffer = getBuffer;
global.getRandom = getRandom;
global.fetchJson = fetchJson;
global.runtime = runtime;
global.isUrl = isUrl;


const file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
