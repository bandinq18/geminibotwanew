const chalk = require('chalk'); //Make sure to install chalk: npm install chalk
const fs = require('node:fs');


// Configuration data (move to a separate config file if it grows larger)
const config = {
    botName: 'BandinqBot',
    geminiGreetings: `
Namamu adalah ${config.botName}, deskripsikan dirimu apa yang dapat kamu lakukan seperti dapat membantu menjawab dari gambar dan lain sebagainya, dan beritahu user jika ingin menghentikan sesi dapat mengetik /stop

Sekarang sapalah dan perkenalkan dirimu!
    `,
    prefix: '/',
    geminiBackGreetings: `Halo! aku kembali!`,
    geminiMaxHistory: 10,
    geminiKey: process.env.GEMINI_KEY || 'AIzaSyADkodF-yOmXa5iyuQL1UQEEhUnGGgFJK4', // Get key from env vars for security
    geminiTimeout: 30 * 60 * 1000, // 30 minutes
    messages: {
        onlyGroup: "Bot ini hanya dapat digunakan di private chat",
        notRegistered: "Anda belum pernah menggunakan bot ini\n\nUntuk menggunakan bot, silahkan ketik /start",
        leaveSession: "Anda berhasil keluar dari sesi bot!\n\nUntuk menggunakannya kembali silahkan ketik /start",
        afkSession: "Sesi anda dengan bot telah habis dikarenakan tidak ada aktifitas\n\nUntuk memulai kembali silahkan ketik /start",
        onSession: "Anda sedang berada di sesi.\n\nAnda hanya dapat menggunakan perintah /stop untuk mengakhiri sesi",
    },
};


require("./lib/module"); //Import modules


/**
 * Sets up a file watcher.  Generally, use nodemon instead of this for development.
 * @param {string} filePath - Path to the file to watch.
 */
const setupFileWatcher = (filePath) => {
    try {
        fs.watch(filePath, { persistent: false }, (eventType, filename) => {
            if (eventType === 'change') {
                console.log(chalk.redBright(`[${new Date().toLocaleTimeString()}]` + ` Re-loading module: ${path.basename(filePath)}`));
                delete require.cache[require.resolve(filePath)];
                require(filePath);
            }
        });
    } catch (error) {
        console.error(chalk.redBright(`Error setting up file watcher for ${filePath}: ${error}`));
    }
};



//Export the config object, making it readily available to other modules.
module.exports = config;

// Set up file watcher only if this is the main module.
if (require.main === module) {
    const file = require.resolve(__filename);
    setupFileWatcher(file);
}
