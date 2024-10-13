require('./config.js');
require('./lib/global');
const { makeInMemoryStore, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('node:fs/promises');
const readline = require('node:readline');
const chalk = require('chalk');
const path = require('node:path');
const alo = require('./lib/alo');


const usePairingCode = true;

/**
 * Asks a question via the console and returns the answer as a Promise.
 * @param {string} text - The question to ask.
 * @returns {Promise<string>} - The user's answer.
 */
const question = async (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => rl.question(text, (answer) => {
        rl.close();
        resolve(answer);
    }));
};


/**
 * Loads session data from the file, creating an empty file if it doesn't exist.
 * @returns {Promise<object>} - The loaded session data or an empty object if the file doesn't exist.
 */
async function loadSession() {
    try {
        const data = await fs.readFile('./database/gemini.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile('./database/gemini.json', JSON.stringify({}, null, 2));
            return {};
        } else {
            console.error('Error loading session:', err);
            throw err;
        }
    }
}


/**
 * Saves session data to the file.
 * @param {object} sessionData - The session data to save.
 * @returns {Promise<void>}
 */
async function saveSession(sessionData) {
    try {
        await fs.writeFile('./database/gemini.json', JSON.stringify(sessionData, null, 2));
    } catch (err) {
        console.error('Error saving session:', err);
        throw err;
    }
}


/**
 * Starts a WhatsApp session using Baileys. Handles connection updates, message upserts, and session saving.
 * @returns {Promise<import('@adiwajshing/baileys').Socket>} - The Baileys Socket instance.
 */
async function startSesi() {
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    };

    const chiwa = alo.makeWASocket(connectionOptions);
    if (usePairingCode && !chiwa.authState.creds.registered) {
        const phoneNumber = await question(chalk.red('Silahkan masukkan nomor diawali kode negara:'));
        const code = (await chiwa.requestPairingCode(phoneNumber))?.match(/.{1,4}/g)?.join('-') || '';
        console.log(chalk.blue(`Kode pairing:`, code));
    }

    store.bind(chiwa.ev);

    chiwa.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(chalk.redBright(`Connection closed with reason: ${reason}`));

            //More robust handling of disconnect reasons
            if (reason === DisconnectReason.badSession) {
                console.log(chalk.redBright(`Bad Session File, Please Delete Session and Scan Again`));
            } else if (reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.timedOut) {
                console.log(chalk.yellowBright(`Reconnecting...`));
                setTimeout(startSesi, 2000); //Retry after a short delay
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(chalk.redBright(`Connection Replaced, Another New Session Opened, Please Close Current Session First`));
                chiwa.logout();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.redBright(`Device Logged Out, Please Scan Again And Run.`));
                chiwa.logout();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.yellowBright(`Restart Required, Restarting...`));
                setTimeout(startSesi, 2000); //Retry after a short delay
            } else if (lastDisconnect.error.message === 'Error: Stream Errored (unknown)') {
                console.log(chalk.redBright(`Stream error.  Check your internet connection.`));
                process.exit();
            } else {
                console.error(chalk.redBright(`Unexpected disconnect reason:`, lastDisconnect.error));
            }
        } else if (connection === 'connecting') {
            console.log(chalk.yellowBright('Connecting...'));
        } else if (connection === 'open') {
            console.log(chalk.greenBright('Connected!'));
            setupTimeoutCheck(chiwa);
        }
    });

    /**
     * Sets up a timer to check for inactive Gemini sessions.
     * @param {import('@adiwajshing/baileys').Socket} chiwa - The WhatsApp socket.
     */
    function setupTimeoutCheck(chiwa) {
        setInterval(async () => {
            const db_gemini_active_user = await loadSession();
            const now = Date.now();
            for (const user in db_gemini_active_user) {
                if (db_gemini_active_user[user].OnSession) {
                    const lastActive = new Date(db_gemini_active_user[user].lastActive).getTime();
                    if (now - lastActive > config.geminiTimeout) {
                        db_gemini_active_user[user].OnSession = false;
                        await chiwa.sendMessage(user, { text: config.messages.afkSession });
                        await saveSession(db_gemini_active_user);
                    }
                }
            }
        }, 3000);
    }


    chiwa.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
            if (m.key && m.key.remoteJid === 'status@broadcast') return chiwa.readMessages([m.key]);
            if (!chiwa.public && !m.key.fromMe && chatUpdate.type === 'notify') return;
            if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return;
            const processedMessage = alo.smsg(chiwa, m, store);
            require('./case')(chiwa, processedMessage, store);
        } catch (err) {
            console.error('Error processing message upsert:', err);
        }
    });

    chiwa.public = true;
    chiwa.ev.on('creds.update', saveCreds);
    return chiwa;
}


startSesi()
    .catch(err => {
        console.error('Error starting session:', err);
        process.exit(1); //Exit with an error code
    });


process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1); //Exit with an error code
});
