const fs = require('fs');
const path = require('path');
const { initSession, unlockSession, reencryptData } = require('./crypto');
const { SESSION_FILE } = require('./config');

function filePath(app) {
  return path.join(app.getPath('userData'), SESSION_FILE);
}

function exists(app) {
  try { return fs.statSync(filePath(app)).isFile(); } catch (e) { return false; }
}

function readBlob(app) {
  try { return fs.readFileSync(filePath(app)); } catch (e) { return null; }
}

function atomicWrite(app, blob) {
  const p = filePath(app);
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch (e) {}
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, blob, { mode: 0o600 });
  fs.renameSync(tmp, p);
}

function emptyState() {
  return { cookies: [], lastURL: '', version: 1 };
}

function initialize(app, passphrase) {
  const { blob, dek } = initSession(passphrase, JSON.stringify(emptyState()));
  atomicWrite(app, blob);
  const r = unlockSession(passphrase, blob);
  return { dek, salt: r.salt, state: emptyState() };
}

function unlock(app, passphrase) {
  const blob = readBlob(app);
  if (!blob) return null;
  const r = unlockSession(passphrase, blob);
  let state;
  try {
    const parsed = JSON.parse(r.plaintext);
    state = parsed && typeof parsed === 'object' ? { ...emptyState(), ...parsed } : emptyState();
    if (!Array.isArray(state.cookies)) state.cookies = [];
  } catch (e) {
    state = emptyState();
  }
  return { dek: r.dek, salt: r.salt, state };
}

function saveState(app, dek, salt, state) {
  const blob = readBlob(app);
  if (!blob) throw new Error('no existing session file');
  const newBlob = reencryptData(dek, salt, JSON.stringify(state), blob);
  atomicWrite(app, newBlob);
}

function wipe(app) {
  try { fs.unlinkSync(filePath(app)); } catch (e) {}
}

async function applyCookiesToSession(electronSession, cookies, fallbackHost) {
  if (!Array.isArray(cookies)) return;
  for (const c of cookies) {
    const host = c.domain || fallbackHost;
    const scheme = c.secure ? 'https' : 'http';
    try {
      await electronSession.cookies.set({
        url: `${scheme}://${host.replace(/^\./, '')}${c.path || '/'}`,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: !!c.secure,
        httpOnly: !!c.httpOnly,
        sameSite: c.sameSite || 'lax',
        expirationDate: c.expirationDate,
      });
    } catch (e) {}
  }
}

async function snapshotCookies(electronSession, url) {
  try { return await electronSession.cookies.get({ url }); }
  catch (e) { return []; }
}

module.exports = {
  exists, filePath, wipe,
  initialize, unlock, saveState,
  applyCookiesToSession, snapshotCookies,
  emptyState,
};