require('../config');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('node:fs/promises'); // Use promises version of fs
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const chalk = require('chalk'); //Import chalk for logging

const apikey = process.env.GeminiKey; //Get API key from environment variables for security
const genAI = new GoogleGenerativeAI(apikey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const MAX_HISTORY = process.env.GeminiMAXHistory || 10; // Use environment variable or default to 10

const SESSION_FILE = './gemsession.json';

/**
 * Fetches an image from a URL and returns it as a base64 string.
 * @param {string} url - The URL of the image.
 * @returns {Promise<string>} A promise that resolves with the base64 encoded image data. Rejects on error.
 */
async function fetchImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    return buffer.toString('base64');
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    throw error; //Re-throw the error to be handled by the caller
  }
}

/**
 * Loads all chat sessions from the session file.
 * @returns {object} An object containing all chat sessions. Returns an empty object if the file doesn't exist.
 */
async function loadAllSessions() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}; //File not found, return empty object
    }
    console.error("Error loading sessions:", error);
    throw error; //Re-throw for other errors
  }
}

/**
 * Saves all chat sessions to the session file.
 * @param {object} sessions - An object containing all chat sessions.
 */
async function saveAllSessions(sessions) {
  try {
    await fs.writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error("Error saving sessions:", error);
    throw error;
  }
}


/**
 * Creates a new chat session.
 * @param {string} [sessionId] - The ID of the session (optional, generates a new one if not provided).
 * @param {string} userMessage - The user's initial message.
 * @returns {Promise<string>} A promise that resolves with the AI's response.
 */
async function createNewSession(sessionId, userMessage) {
  const allSessions = await loadAllSessions();

  if (allSessions[sessionId]) {
    throw new Error(`Session ID: ${sessionId} already exists. Use a different session ID.`);
  }

  const newSessionId = sessionId || uuidv4();
  const sessionData = {
    sessionId: newSessionId,
    history: [{ role: "user", parts: [{ text: userMessage }] }],
  };

  allSessions[newSessionId] = sessionData;
  await saveAllSessions(allSessions); //Use await here

  const chatSession = model.startChat({ history: sessionData.history, sessionId: newSessionId });

  const result = await chatSession.sendMessage(userMessage);
  sessionData.history.push({ role: "model", parts: [{ text: result.response.text() }] });
  await saveAllSessions(allSessions); //Use await here

  return result.response.text();
}


/**
 * Continues an existing chat session.
 * @param {string} sessionId - The ID of the session.
 * @param {string} text - The user's message.
 * @returns {Promise<string>} A promise that resolves with the AI's response.
 */
async function continueSession(sessionId, text) {
  const allSessions = await loadAllSessions();

  if (!allSessions[sessionId]) {
    throw new Error(`Session ID: ${sessionId} not found.`);
  }

  const sessionData = allSessions[sessionId];

  const recentHistory = sessionData.history.slice(-MAX_HISTORY * 2).filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.role === item.role && JSON.stringify(t.parts) === JSON.stringify(item.parts)
    ))
  );

  const chatSession = model.startChat({ history: recentHistory });
  const result = await chatSession.sendMessage(text);

  sessionData.history.push({ role: "user", parts: [{ text }] });
  sessionData.history.push({ role: "model", parts: [{ text: result.response.text() }] });
  await saveAllSessions(allSessions); //Use await here

  return result.response.text();
}


/**
 * Sends an image to the Gemini API and gets a response.
 * @param {string} sessionId - The ID of the session.
 * @param {string} imagePath - The path to the image file.
 * @param {string} userMessage - The user's message accompanying the image.
 * @returns {Promise<string>} A promise that resolves with the AI's response.
 */
async function sendImage(sessionId, imagePath, userMessage) {
  const allSessions = await loadAllSessions();
  if (!allSessions[sessionId]) {
    throw new Error(`Session ID: ${sessionId} not found.`);
  }

  const sessionData = allSessions[sessionId];
  const base64Image = (await fs.readFile(imagePath)).toString("base64");
  const image = {
    inlineData: { data: base64Image, mimeType: "image/jpeg" },
  };

  sessionData.history.push({ role: "user", parts: [{ text: `${userMessage} (image)` }] });

  const limitedHistory = sessionData.history.slice(-MAX_HISTORY * 2);

  const chatSession = model.startChat({ history: limitedHistory });
  const result = await chatSession.sendMessage({ text: userMessage, image });

  sessionData.history.push({ role: "model", parts: [{ text: result.response.text() }] });
  await saveAllSessions(allSessions); //Use await here

  return result.response.text();
}

module.exports = { createNewSession, continueSession, sendImage, fetchImage };

//File watcher (generally better to use nodemon or a build system for this)
const file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
