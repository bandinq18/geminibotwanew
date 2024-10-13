const gem = require('./lib/gemini');
const fs = require('node:fs/promises'); // Use the promises version of fs
const chalk = require('chalk'); //Import chalk for logging
const path = require('node:path');


/**
 * Loads the Gemini session data from the JSON file. Creates an empty file if it doesn't exist.
 * @returns {Promise<object>} A promise that resolves with the loaded session data.
 */
async function loadSession() {
    try {
        const data = await fs.readFile('./database/gemini.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile('./database/gemini.json', JSON.stringify({}, null, 2)); // Create empty file
            return {};
        } else {
            console.error('Error loading session:', err);
            throw err; // Re-throw the error to be handled by the caller
        }
    }
}

/**
 * Saves the Gemini session data to the JSON file.
 * @param {object} sessionData - The session data to save.
 * @returns {Promise<void>}
 */
async function saveSession(sessionData) {
    try {
        await fs.writeFile('./database/gemini.json', JSON.stringify(sessionData, null, 2));
    } catch (err) {
        console.error('Error saving session:', err);
        throw err; // Re-throw the error to be handled by the caller
    }
}


/**
 * Main function to handle Gemini interactions.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} store - The message store.
 * @returns {Promise<void>}
 */
module.exports = async (chiwa, m, store) => {
    try {
        const db_gemini_active_user = await loadSession();
        const prefix = '.'; // Define your prefix here.
        const from = m.key.remoteJid;
        const quoted = m.quoted ? m.quoted : m;
        const body = getBody(m); //Helper function to extract body text
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : "";
        const args = body.trim().split(/ +/).slice(1);
        const text = q = args.join(" ");
        const isGroup = from.endsWith('@g.us');
        const botNumber = chiwa.decodeJid(chiwa.user.id);
        const sender = m.key.fromMe ? (chiwa.user.id.split(':')[0] + '@s.whatsapp.net' || chiwa.user.id) : (m.key.participant || m.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const pushname = m.pushName || `${senderNumber}`;
        const isBot = botNumber.includes(senderNumber);
        const groupMetadata = isGroup ? await chiwa.groupMetadata(m.chat).catch(e => ({})) : {}; // Handle potential errors
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? groupMetadata.participants : [];
        const groupAdmins = isGroup ? participants.filter(v => v.admin !== null).map(v => v.id) : [];
        const groupOwner = isGroup ? groupMetadata.owner : '';
        const groupMembers = isGroup ? groupMetadata.participants : [];
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
        const isBotGroupAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
        const isGroupAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const tanggal = moment.tz('Asia/Jakarta').format('DD/MM/YY');

        const listcolor = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
        const randomcolor = listcolor[Math.floor(Math.random() * listcolor.length)];


        //Log message
        if (m.text && m.sender !== botNumber) {
            console.log(chalk.yellow.bgCyan.bold('BotName'), color(`[ PESAN ]`, `${randomcolor}`), color(`FROM`, `${randomcolor}`), color(`${pushname}`, `${randomcolor}`), color(`Text :`, `${randomcolor}`), color(`${body}`, `white`));
        }


        //Get Profile Picture
        let ppuser = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png?q=60';
        try {
            ppuser = await chiwa.profilePictureUrl(m.sender, 'image');
        } catch (err) {
            //Use default if profile picture not available
        }

        const fkethmb = await reSize(ppuser, 300, 300); //Assuming reSize is defined elsewhere


        //Handle Gemini session
        if (command === 'start') {
            if (m.isGroup) return m.reply(mess.OnlyGrup); //Assuming mess.OnlyGrup is defined elsewhere

            if (!db_gemini_active_user[m.sender] || Object.keys(db_gemini_active_user).length === 0) {
                await handleNewSession(chiwa, m, db_gemini_active_user); //Helper function for new session
            } else {
                await handleExistingSession(chiwa, m, db_gemini_active_user); //Helper function for existing session
            }
        } else if (command === 'stop') {
            await handleStopSession(chiwa, m, db_gemini_active_user); //Helper function for stopping session
        } else if (!isCmd && !m.isGroup && db_gemini_active_user[m.sender] && db_gemini_active_user[m.sender].OnSession && m.text) {
            await handleChatMessage(chiwa, m, db_gemini_active_user);
        }


        //Handle $ commands
        if (budy.startsWith('$')) {
            exec(budy.slice(2), (err, stdout) => {
                if (err) return m.reply(err); //Reply with error
                if (stdout) return m.reply(stdout); //Reply with output
            });
        }


    } catch (e) {
        console.log(e);
    }
};



/**
 * Helper function to handle new Gemini sessions.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} db_gemini_active_user - The active user database.
 * @returns {Promise<void>}
 */
async function handleNewSession(chiwa, m, db_gemini_active_user) {
    await chiwa.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } }); //React with loading emoji
    db_gemini_active_user[m.sender] = { OnSession: true, lastActive: new Date().toISOString() };
    await saveSession(db_gemini_active_user);
    const meong = await gem.createNewSession(m.sender, GeminiGreetings); //Assuming GeminiGreetings is defined elsewhere
    await m.reply(meong);
    await chiwa.sendMessage(m.chat, { react: { text: '✅', key: m.key } }); //React with success emoji
}


/**
 * Helper function to handle existing Gemini sessions.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} db_gemini_active_user - The active user database.
 * @returns {Promise<void>}
 */
async function handleExistingSession(chiwa, m, db_gemini_active_user) {
    await chiwa.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } }); //React with loading emoji
    const kawaii = await gem.continueSession(m.sender, GeminiBackGreetings); //Assuming GeminiBackGreetings is defined elsewhere
    await m.reply(kawaii);
    db_gemini_active_user[m.sender].OnSession = true;
    db_gemini_active_user[m.sender].lastActive = new Date().toISOString();
    await saveSession(db_gemini_active_user);
    await chiwa.sendMessage(m.chat, { react: { text: '✅', key: m.key } }); //React with success emoji
}


/**
 * Helper function to handle stopping a Gemini session.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} db_gemini_active_user - The active user database.
 * @returns {Promise<void>}
 */
async function handleStopSession(chiwa, m, db_gemini_active_user) {
    if (!db_gemini_active_user[m.sender]?.OnSession) return m.reply(mess.NotRegistered); //Assuming mess.NotRegistered is defined elsewhere

    await m.reply(mess.LeaveSession); //Assuming mess.LeaveSession is defined elsewhere
    db_gemini_active_user[m.sender].OnSession = false;
    await saveSession(db_gemini_active_user);
}


/**
 * Helper function to handle chat messages during an active Gemini session.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} db_gemini_active_user - The active user database.
 * @returns {Promise<void>}
 */
async function handleChatMessage(chiwa, m, db_gemini_active_user) {
    try {
        await chiwa.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } }); //React with loading emoji

        if (quoted && /image/.test(mime)) {
            await handleImageMessage(chiwa, m, db_gemini_active_user); //Helper function for image messages
        } else {
            await handleTextMessage(chiwa, m, db_gemini_active_user); //Helper function for text messages
        }
    } catch (error) {
        console.error('Error processing chat message:', error);
        await m.reply("An error occurred while processing your message.");
    }
}


/**
 * Helper function to handle image messages.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} db_gemini_active_user - The active user database.
 * @returns {Promise<void>}
 */
async function handleImageMessage(chiwa, m, db_gemini_active_user) {
    const media = await quoted.download();

    if (media) {
        const gorengan = m.message.imageMessage?.caption || m.message.extendedTextMessage?.text || '';
        const felpet = await downloadAndSaveMedia(media); //Helper function for downloading media

        if (felpet) {
            const anunya = await gem.sendImage(m.sender, felpet, gorengan);
            await m.reply(`${anunya}`);
        } else {
            await m.reply('Gagal mengunduh media.');
        }
    } else {
        await m.reply('Gagal mengunduh media.');
    }

    await chiwa.sendMessage(m.chat, { react: { text: '✅', key: m.key } }); //React with success emoji
    db_gemini_active_user[m.sender].lastActive = new Date().toISOString();
    await saveSession(db_gemini_active_user);
}


/**
 * Helper function to handle text messages.
 * @param {object} chiwa - The WhatsApp client instance.
 * @param {object} m - The incoming WhatsApp message object.
 * @param {object} db_gemini_active_user - The active user database.
 * @returns {Promise<void>}
 */
async function handleTextMessage(chiwa, m, db_gemini_active_user) {
    const anun = await gem.continueSession(m.sender, m.text);
    await m.reply(anun);
    db_gemini_active_user[m.sender].lastActive = new Date().toISOString();
    await saveSession(db_gemini_active_user);
}


/**
 * Helper function to extract message body text from different message types
 * @param {object} m - The incoming WhatsApp message object
 * @returns {string} The message body text
 */
function getBody(m) {
    return (m.mtype === 'conversation' && m.message.conversation) ? m.message.conversation :
        (m.mtype === 'imageMessage') && m.message.imageMessage.caption ? m.message.imageMessage.caption :
        (m.mtype === 'documentMessage') && m.message.documentMessage.caption ? m.message.documentMessage.caption :
        (m.mtype === 'videoMessage') && m.message.videoMessage.caption ? m.message.videoMessage.caption :
        (m.mtype === 'extendedTextMessage') && m.message.extendedTextMessage.text ? m.message.extendedTextMessage.text :
        (m.mtype === 'buttonsResponseMessage' && m.message.buttonsResponseMessage.selectedButtonId) ? m.message.buttonsResponseMessage.selectedButtonId :
        (m.mtype === 'templateButtonReplyMessage' && m.message.templateButtonReplyMessage.selectedId) ? m.message.templateButtonReplyMessage.selectedId :
        '';
}


/**
 * Helper function to download and save media
 * @param {Buffer} media - The media buffer
 * @returns {string} File path of the downloaded media or null if failed.
 */
async function downloadAndSaveMedia(media) {
    try {
        const tempDir = './temp';
        await fs.mkdir(tempDir, { recursive: true }); // Create temp dir if doesn't exist
        const fileName = `mediaFile_${Date.now()}.jpg`;
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, media);
        return filePath;
    } catch (error) {
        console.error('Error while saving media:', error);
        return null;
    }
}


// ... (rest of your code, including reSize, exec, etc.) ...



//File watcher (Consider using nodemon instead)
const file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
