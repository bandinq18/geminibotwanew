require('../config');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios'); 
const apikey = GeminiKey;
const genAI = new GoogleGenerativeAI(apikey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SESSION_FILE = './gemsession.json';
async function fetchImage(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');
  return buffer.toString('base64');
}

function loadAllSessions() {
  if (fs.existsSync(SESSION_FILE)) {
    const data = fs.readFileSync(SESSION_FILE);
    return JSON.parse(data);
  }
  return {};
}
function saveAllSessions(sessions) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}


async function createNewSession(sessionId, userMessage) {
  const allSessions = loadAllSessions();


  if (allSessions[sessionId]) {
    throw new Error(`Session ID: ${sessionId} sudah ada. Gunakan session ID yang berbeda.`);
  }

  const sessionData = {
    sessionId: sessionId || uuidv4(),
    history: [
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
  };

  allSessions[sessionData.sessionId] = sessionData;
  saveAllSessions(allSessions);
  const chatSession = model.startChat({
    history: sessionData.history,
    sessionId: sessionData.sessionId,
  });


  let result = await chatSession.sendMessage(userMessage);
  sessionData.history.push({ role: "model", parts: [{ text: result.response.text() }] });
  allSessions[sessionData.sessionId] = sessionData;
  saveAllSessions(allSessions);


  return result.response.text();
}


async function continueSession(sessionId, text) {
  const allSessions = loadAllSessions();

  if (!allSessions[sessionId]) {
    throw new Error(`Session ID: ${sessionId} tidak ditemukan.`);
  }

  let sessionData = allSessions[sessionId];

  const recentHistory = sessionData.history
    .slice(-20)
    .reduce((acc, entry) => {
      if (acc.length === 0 && entry.role === "model") {
        return acc; 
      }


      const lastEntry = acc[acc.length - 1];
      if (lastEntry && lastEntry.role === entry.role) {
        return acc; 
      }

      acc.push(entry); 
      return acc;
    }, []);


  const finalHistory = recentHistory.slice(-(isNaN(GeminiMAXHistory) ? 10 : GeminiMAXHistory));

  const chatSession = model.startChat({
    history: finalHistory,
  });

  let result = await chatSession.sendMessage(text);

  sessionData.history.push({ role: "user", parts: [{ text: text }] });
  sessionData.history.push({ role: "model", parts: [{ text: result.response.text() }] });

  allSessions[sessionId] = sessionData;
  saveAllSessions(allSessions);

  return result.response.text();
}




async function sendImage(sessionId, imagePath, userMessage) {
  const allSessions = loadAllSessions();
  if (!allSessions[sessionId]) {
    throw new Error(`Session ID: ${sessionId} tidak ditemukan.`);
  }

  const sessionData = allSessions[sessionId];
  const base64Image = Buffer.from(fs.readFileSync(imagePath)).toString("base64");
  const image = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  sessionData.history.push({
    role: "user",
    parts: [{ text: `${userMessage} (foto)` }]
  });

  const limitedHistory = sessionData.history.slice(-(isNaN(GeminiMAXHistory) ? 10 : GeminiMAXHistory));

  const historyWithUserStart = [];
  let userStarted = false;

  for (const entry of limitedHistory) {
    if (entry.role === "user") {
      userStarted = true;
    }
    if (userStarted) {
      const lastEntry = historyWithUserStart[historyWithUserStart.length - 1];
      if (lastEntry && lastEntry.role === entry.role) {
        continue; 
      }
      historyWithUserStart.push(entry);
    }
  }

  const chatHistory = historyWithUserStart
    .map(entry => entry.parts.map(part => part.text).join(' '))
    .join('\n');

  const messageInput = {
    text: chatHistory + `\n${userMessage} (foto)`, 
    image: image, 
  };

  let result;
  try {
    result = await model.generateContent([chatHistory, userMessage, image]);
  } catch (error) {
    console.error("Error processing message:", error);
    throw error;
  }

  sessionData.history.push({
    role: "model",
    parts: [{ text: result.response.text() }]
  });

  allSessions[sessionId] = sessionData;
  saveAllSessions(allSessions);

  return result.response.text();
}

module.exports = {
  createNewSession,
  continueSession,
  sendImage,
};
let file = require.resolve(__filename) 
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.redBright(`Update ${__filename}`))
delete require.cache[file]
require(file)
})