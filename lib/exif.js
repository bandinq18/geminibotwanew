require("./module");
const path = require('path');
const os = require('os');
const fs = require('fs/promises'); // Use promises version for async/await
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg'); // Make sure fluent-ffmpeg is installed: npm install fluent-ffmpeg
const webp = require('node-webpmux'); // Make sure node-webpmux is installed: npm install node-webpmux
const chalk = require('chalk'); // Make sure chalk is installed: npm install chalk


/**
 * Converts an image buffer to a WebP buffer.
 * @param {Buffer} media - The image buffer.
 * @returns {Promise<Buffer>} A promise that resolves with the WebP buffer.  Rejects if conversion fails.
 */
async function imageToWebp(media) {
  const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);

  await fs.writeFile(tmpFileIn, media);

  return new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on("error", reject)
      .on("end", () => {
        fs.unlink(tmpFileIn).catch(console.error); //Clean up after conversion
        resolve(fs.readFile(tmpFileOut)); // Resolve with the promise to read the file
      })
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });
}


/**
 * Converts a video buffer to a WebP buffer (first 5 seconds).
 * @param {Buffer} media - The video buffer.
 * @returns {Promise<Buffer>} A promise that resolves with the WebP buffer. Rejects if conversion fails.
 */
async function videoToWebp(media) {
  const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);

  await fs.writeFile(tmpFileIn, media);

  return new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on("error", reject)
      .on("end", () => {
        fs.unlink(tmpFileIn).catch(console.error); //Clean up after conversion
        resolve(fs.readFile(tmpFileOut)); //Resolve with the promise to read the file
      })
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
        "-loop", "0",
        "-ss", "00:00:00",
        "-t", "00:00:05",
        "-preset", "default",
        "-an",
        "-vsync", "0"
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });
}

/**
 * Adds EXIF metadata to a WebP image.
 * @param {Buffer} media - The WebP image buffer.
 * @param {object} metadata - Metadata object with packname and author properties.
 * @returns {Promise<string>} A promise that resolves with the path to the WebP file with EXIF data.
 */
async function writeExif(media, metadata) {
  if (!metadata.packname || !metadata.author) return media; //Return original if no metadata is given

  const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);

  await fs.writeFile(tmpFileIn, media);

  const img = new webp.Image();
  const json = {
    "sticker-pack-name": metadata.packname,
    "sticker-pack-publisher": metadata.author,
    "emojis": metadata.categories || [""]
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(tmpFileIn);
  await fs.unlink(tmpFileIn); // Clean up temporary file after loading
  img.exif = exif;
  await img.save(tmpFileOut);
  return fs.readFile(tmpFileOut); //Return the buffer after saving

}

// Attach functions to global object (generally not recommended, prefer exports)
global.imageToWebp = imageToWebp;
global.videoToWebp = videoToWebp;
global.writeExif = writeExif;


//Better practice: Export functions for use in other modules
module.exports = { imageToWebp, videoToWebp, writeExif };

//File watcher (keep this if needed, but generally unnecessary in modern development)
const file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
