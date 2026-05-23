const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMode: () => ipcRenderer.invoke('passphrase:getMode'),
  submitPassphrase: (pp) => ipcRenderer.invoke('passphrase:submit', pp),
  resetSession: () => ipcRenderer.invoke('passphrase:reset'),
  getStrings: () => ipcRenderer.invoke('lang:getStrings'),
  setLanguage: (id) => ipcRenderer.invoke('lang:setLanguage', id),
  getAvailableLanguages: () => ipcRenderer.invoke('lang:getAvailable'),
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    changePassphrase: (current, next) => ipcRenderer.invoke('settings:changePassphrase', current, next),
    clearSession: () => ipcRenderer.invoke('settings:clearSession'),
    openSessionFolder: () => ipcRenderer.invoke('settings:openSessionFolder'),
    getInfo: () => ipcRenderer.invoke('settings:getInfo'),
    close: () => ipcRenderer.invoke('settings:close'),
  },
});