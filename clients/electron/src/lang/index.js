const { app } = require('electron');
const { LANGUAGES, getLangById, getAllLanguages } = require('./registry');

const fallback = getLangById('en_us').strings;
let currentId = 'en_us';
let currentStrings = fallback;

function pickLocale() {
  let raw = '';
  try { raw = (app.getLocale() || '').toLowerCase().replace('-', '_'); } catch (e) {}
  if (!raw) return 'en_us';
  if (LANGUAGES.find((l) => l.id === raw)) return raw;
  const prefix = raw.split('_')[0];
  const found = LANGUAGES.find((l) => l.id.startsWith(prefix + '_'));
  return found ? found.id : 'en_us';
}

function lookup(dict, key) {
  const parts = key.split('.');
  let node = dict;
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return typeof node === 'string' ? node : undefined;
}

function applyLanguage(id) {
  const lang = getLangById(id);
  currentId = lang.id;
  currentStrings = lang.strings;
  return lang;
}

function getCurrentLangID() {
  return currentId;
}

function translateFrom(strings, key) {
  return lookup(strings, key) ?? lookup(fallback, key) ?? key;
}

function t(key) {
  return translateFrom(currentStrings, key);
}

function getAll() {
  return { id: currentId, name: getLangById(currentId).name, strings: currentStrings };
}

module.exports = {
  pickLocale,
  applyLanguage,
  getCurrentLangID,
  translateFrom,
  t,
  getAll,
  getAllLanguages,
  getLangById,
  LANGUAGES,
};