const path = require('path');

const PROD_URL = 'https://banterchat.org';
const DEV_URL = process.env.BANTER_URL || '';

const TARGET_URL = DEV_URL || PROD_URL;
const TARGET_HOST = new URL(TARGET_URL).hostname;

const APP_ID = 'org.banterchat.desktop';
const APP_TITLE = 'banterchat';

const SESSION_FILE = 'session.banter';
const SETTINGS_FILE = 'settings.json';

const WINDOWS = {
  lock: {
    width: 560, height: 600,
    minWidth: 480, minHeight: 540,
    resizable: true, minimizable: true, maximizable: true,
  },
  main: {
    width: 1200, height: 800,
    minWidth: 600, minHeight: 400,
  },
  settings: {
    width: 720, height: 640,
    minWidth: 520, minHeight: 480,
  },
};

const BG_COLOR = '#1a1d23';

const COOKIE_PERSIST_DEBOUNCE_MS = 1000;

const PATHS = {
  index: path.join(__dirname, 'ui', 'index.html'),
  preload: path.join(__dirname, 'preload.js'),
  icon: path.join(__dirname, '..', 'build', 'icon.ico'),
};

const CRYPTO = {
  MAGIC: Buffer.from('BNTR', 'utf8'),
  FORMAT_VERSION: 1,
  SALT_LEN: 16,
  NONCE_LEN: 12,
  KEY_LEN: 32,
  TAG_LEN: 16,
  SCRYPT_N: 1 << 17,
  SCRYPT_R: 8,
  SCRYPT_P: 1,
  SCRYPT_MAXMEM: 256 * 1024 * 1024,
};

module.exports = {
  TARGET_URL, TARGET_HOST,
  APP_ID, APP_TITLE,
  SESSION_FILE, SETTINGS_FILE,
  WINDOWS, BG_COLOR,
  COOKIE_PERSIST_DEBOUNCE_MS,
  PATHS, CRYPTO,
};