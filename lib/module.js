const {
    default: makeWASocket,
    makeWALegacySocket,
    BufferJSON,
    Browsers,
    initInMemoryKeyStore,
    extractMessageContent,
    makeInMemoryStore,
    proto,
    DisconnectReason,
    useMultiFileAuthState,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    getBinaryNodeChild,
    jidDecode,
    areJidsSameUser,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    getContentType,
    relayMessage,
    WA_DEFAULT_EPHEMERAL
} = require("baileys");

const chalk = require("chalk");
const fetch = require("node-fetch");
const FileType = require("file-type");
const { fromBuffer: formBuffer } = FileType; //Import only formBuffer
const Boom = require("@hapi/boom").Boom;
const PhoneNumber = require("awesome-phonenumber");
const fs = require("node:fs");
const pino = require("pino");
const axios = require("axios");
const qrcode = require("qrcode");
const cheerio = require("cheerio");
const util = require("node:util");
const Jimp = require("jimp");
const moment = require("moment-timezone");
const crypto = require("node:crypto");
const ms = require("parse-ms");
const os = require("node:os");
const spin = require("spinnies");
const path = require("node:path");
const { exec, spawn, execSync } = require("node:child_process");
const vm = require("node:vm");
const rimraf = require("rimraf");
const async = require("async");
const escapeStringRegexp = require("escape-string-regexp");
const request = require("request");
const MultiStream = require("multistream");
const fakeUa = require("fake-useragent");
const FormData = require("form-data");

// Export all the functions and modules as a single object.
module.exports = {
    makeWASocket,
    makeWALegacySocket,
    BufferJSON,
    Browsers,
    initInMemoryKeyStore,
    extractMessageContent,
    makeInMemoryStore,
    proto,
    DisconnectReason,
    useMultiFileAuthState,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    getBinaryNodeChild,
    jidDecode,
    areJidsSameUser,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    getContentType,
    relayMessage,
    WA_DEFAULT_EPHEMERAL,
    chalk,
    fetch,
    FileType,
    formBuffer,
    Boom,
    PhoneNumber,
    fs,
    pino,
    axios,
    qrcode,
    cheerio,
    util,
    Jimp,
    moment,
    crypto,
    ms,
    os,
    spin,
    path,
    exec,
    spawn,
    execSync,
    vm,
    rimraf,
    async,
    escapeStringRegexp,
    request,
    MultiStream,
    fakeUa,
    FormData,
};
