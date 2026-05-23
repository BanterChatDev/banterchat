const fs = require('fs');
const path = require('path');

const FILENAME = 'settings.json';

const DEFAULTS = {
  start_minimized: false,
  close_to_tray: false,
  launch_on_login: false,
  ui_lang: '',
};

function filePath(app) {
  return path.join(app.getPath('userData'), FILENAME);
}

function exists(app) {
  try { return fs.statSync(filePath(app)).isFile(); } catch (e) { return false; }
}

function read(app) {
  try {
    const raw = fs.readFileSync(filePath(app), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function write(app, patch) {
  const current = read(app);
  const next = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) };
  const dir = path.dirname(filePath(app));
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  fs.writeFileSync(filePath(app), JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

function ensureExists(app) {
  if (exists(app)) return;
  write(app, {});
}

module.exports = { read, write, DEFAULTS, filePath, exists, ensureExists };