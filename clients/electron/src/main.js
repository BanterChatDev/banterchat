const { app, BrowserWindow, ipcMain, session, Menu, shell, globalShortcut } = require('electron');
const { rewrapDEK } = require('./crypto');
const sessionStore = require('./sessionStore');
const settingsStore = require('./settingsStore');
const lockState = require('./lockState');
const lang = require('./lang');
const { TARGET_URL, TARGET_HOST, APP_ID, APP_TITLE, WINDOWS, BG_COLOR, COOKIE_PERSIST_DEBOUNCE_MS, PATHS } = require('./config');

let switchingWindows = false;
const wins = { lock: null, main: null, settings: null };

const COMMON_WEB_PREFS = {
  preload: PATHS.preload,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};

function getStringsPayload() {
  const prefs = settingsStore.read(app);
  lang.applyLanguage(prefs.ui_lang || lang.pickLocale());
  const all = lang.getAll();
  return { id: all.id, strings: all.strings };
}

function makeWindow({ key, options, query }) {
  if (wins[key]) { wins[key].focus(); return wins[key]; }
  const win = new BrowserWindow({
    backgroundColor: BG_COLOR,
    autoHideMenuBar: true,
    icon: PATHS.icon,
    webPreferences: COMMON_WEB_PREFS,
    ...options,
  });
  win.setMenuBarVisibility(false);
  win.loadFile(PATHS.index, query ? { search: query } : undefined);
  win.on('closed', () => { wins[key] = null; });
  wins[key] = win;
  return win;
}

function openLockWindow() {
  makeWindow({
    key: 'lock',
    query: 'view=passphrase',
    options: { ...WINDOWS.lock, title: APP_TITLE },
  });
}

function openSettingsWindow() {
  if (!lockState.isUnlocked()) return;
  makeWindow({
    key: 'settings',
    query: 'view=settings',
    options: { ...WINDOWS.settings, parent: wins.main || undefined, title: lang.t('settings.window_title') },
  });
}

async function persistCookies() {
  if (!lockState.isUnlocked()) return;
  const cookies = await sessionStore.snapshotCookies(session.defaultSession, TARGET_URL);
  lockState.setStateField('cookies', cookies);
  try { sessionStore.saveState(app, lockState.getDEK(), lockState.getSalt(), lockState.getState()); } catch (e) {}
}

function persistURL(url) {
  if (!lockState.isUnlocked()) return;
  if (typeof url !== 'string' || !url.startsWith(TARGET_URL)) return;
  if (lockState.getState().lastURL === url) return;
  lockState.setStateField('lastURL', url);
  try { sessionStore.saveState(app, lockState.getDEK(), lockState.getSalt(), lockState.getState()); } catch (e) {}
}

function setupGlobalSessionHandlers() {
  const NETWORK_SCHEMES = ['http://', 'https://', 'ws://', 'wss://'];
  session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
    const isNetwork = NETWORK_SCHEMES.some((s) => details.url.startsWith(s));
    if (isNetwork) {
      cb({ requestHeaders: { ...details.requestHeaders, 'X-Banter-Client': 'desktop' } });
    } else {
      cb({ requestHeaders: details.requestHeaders });
    }
  });

  let debounce;
  session.defaultSession.cookies.on('changed', () => {
    clearTimeout(debounce);
    debounce = setTimeout(persistCookies, COOKIE_PERSIST_DEBOUNCE_MS);
  });
}

async function openMainWindow() {
  const state = lockState.getState() || sessionStore.emptyState();
  if (state.cookies && state.cookies.length) {
    try { await sessionStore.applyCookiesToSession(session.defaultSession, state.cookies, TARGET_HOST); } catch (e) {}
  }

  const win = new BrowserWindow({
    ...WINDOWS.main,
    title: lang.t('app.title'),
    backgroundColor: BG_COLOR,
    autoHideMenuBar: true,
    icon: PATHS.icon,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
  });
  wins.main = win;
  win.setMenuBarVisibility(false);

  win.webContents.setWindowOpenHandler(({ url }) => {
    const u = new URL(url);
    if (u.hostname === TARGET_HOST || u.hostname === 'localhost') return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('did-navigate', (_e, url) => persistURL(url));
  win.webContents.on('did-navigate-in-page', (_e, url) => persistURL(url));

  win.on('close', async (e) => {
    e.preventDefault();
    await persistCookies();
    win.destroy();
  });
  win.on('closed', () => { wins.main = null; });

  const startURL = (state.lastURL && state.lastURL.startsWith(TARGET_URL)) ? state.lastURL : TARGET_URL;
  win.loadURL(startURL);
}

const ipcHandlers = {
  'lang:getStrings': () => getStringsPayload(),
  'lang:setLanguage': (e, id) => {
    if (typeof id !== 'string' || !id) return null;
    lang.applyLanguage(id);
    settingsStore.write(app, { ui_lang: id });
    const all = lang.getAll();
    return { id: all.id, strings: all.strings };
  },
  'lang:getAvailable': () => lang.getAllLanguages(),
  'settings:get': () => settingsStore.read(app),
  'settings:set': (e, patch) => settingsStore.write(app, patch),
  'settings:getInfo': () => ({ version: app.getVersion(), sessionFile: sessionStore.filePath(app) }),
  'settings:openSessionFolder': () => { shell.showItemInFolder(sessionStore.filePath(app)); return { ok: true }; },
  'settings:close': () => { if (wins.settings) wins.settings.close(); return { ok: true }; },
  'settings:changePassphrase': (e, current, next) => {
    if (typeof current !== 'string' || typeof next !== 'string' || next.length < 8) return { error: 'invalid' };
    if (!sessionStore.exists(app)) return { error: 'no_session' };
    const fs = require('fs');
    const blob = fs.readFileSync(sessionStore.filePath(app));
    let result;
    try { result = rewrapDEK(current, next, blob); }
    catch (e2) { return { error: 'invalid' }; }
    try {
      const tmp = sessionStore.filePath(app) + '.tmp';
      fs.writeFileSync(tmp, result.blob, { mode: 0o600 });
      fs.renameSync(tmp, sessionStore.filePath(app));
    } catch (e2) { return { error: 'save_failed' }; }
    result.dek.fill(0);
    return { ok: true };
  },
  'settings:clearSession': async () => {
    sessionStore.wipe(app);
    try { await session.defaultSession.clearStorageData({ storages: ['cookies'] }); } catch (e) {}
    lockState.clear();
    app.relaunch();
    app.exit(0);
    return { ok: true };
  },
  'passphrase:getMode': () => sessionStore.exists(app) ? 'unlock' : 'setup',
  'passphrase:submit': async (e, passphrase) => {
    if (typeof passphrase !== 'string' || !passphrase) return { error: 'empty' };
    const isSetup = !sessionStore.exists(app);
    let unlocked;
    if (isSetup) {
      try { unlocked = sessionStore.initialize(app, passphrase); }
      catch (err) { return { error: 'setup_failed' }; }
    } else {
      try { unlocked = sessionStore.unlock(app, passphrase); }
      catch (err) { return { error: 'invalid' }; }
      if (!unlocked) return { error: 'invalid' };
    }
    lockState.set(unlocked);
    switchingWindows = true;
    try {
      await openMainWindow();
      if (wins.lock) wins.lock.close();
    } finally {
      switchingWindows = false;
    }
    return { ok: true };
  },
  'passphrase:reset': () => {
    sessionStore.wipe(app);
    if (wins.lock) wins.lock.webContents.reload();
    return { ok: true };
  },
};

for (const [channel, handler] of Object.entries(ipcHandlers)) {
  ipcMain.handle(channel, handler);
}

app.whenReady().then(() => {
  app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);
  settingsStore.ensureExists(app);
  setupGlobalSessionHandlers();
  openLockWindow();
});

app.on('browser-window-focus', () => {
  globalShortcut.register('CommandOrControl+,', openSettingsWindow);
});

app.on('browser-window-blur', () => {
  globalShortcut.unregister('CommandOrControl+,');
});

app.on('window-all-closed', () => {
  if (switchingWindows) return;
  lockState.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  lockState.clear();
});