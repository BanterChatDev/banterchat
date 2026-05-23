const fs = require('fs');
const path = require('path');

const LANGUAGES = [
  { id: 'en_us', name: 'English (US)' },
  { id: 'es_es', name: 'Español (España)' },
  { id: 'it_it', name: 'Italiano' },
  { id: 'fr_fr', name: 'Français' },
  { id: 'de_de', name: 'Deutsch' },
  { id: 'pt_br', name: 'Português (Brasil)' },
  { id: 'pt_pt', name: 'Português (Portugal)' },
  { id: 'nl_nl', name: 'Nederlands' },
  { id: 'pl_pl', name: 'Polski' },
  { id: 'cs_cz', name: 'Čeština' },
  { id: 'hu_hu', name: 'Magyar' },
  { id: 'ro_ro', name: 'Română' },
  { id: 'sv_se', name: 'Svenska' },
  { id: 'nb_no', name: 'Norsk Bokmål' },
  { id: 'da_dk', name: 'Dansk' },
  { id: 'fi_fi', name: 'Suomi' },
  { id: 'el_gr', name: 'Ελληνικά' },
  { id: 'tr_tr', name: 'Türkçe' },
  { id: 'ru_ru', name: 'Русский' },
  { id: 'uk_ua', name: 'Українська' },
  { id: 'he_il', name: 'עברית' },
  { id: 'ar_sa', name: 'العربية' },
  { id: 'fa_ir', name: 'فارسی' },
  { id: 'hi_in', name: 'हिन्दी' },
  { id: 'bn_bd', name: 'বাংলা' },
  { id: 'th_th', name: 'ไทย' },
  { id: 'vi_vn', name: 'Tiếng Việt' },
  { id: 'id_id', name: 'Bahasa Indonesia' },
  { id: 'zh_cn', name: '简体中文' },
  { id: 'zh_tw', name: '繁體中文' },
  { id: 'ja_jp', name: '日本語' },
  { id: 'ko_kr', name: '한국어' },
];

const langsDir = path.join(__dirname, 'langs');
const stringsCache = new Map();
const langMap = {};

function loadStrings(id) {
  if (stringsCache.has(id)) return stringsCache.get(id);
  try {
    const raw = fs.readFileSync(path.join(langsDir, id + '.json'), 'utf8');
    const parsed = JSON.parse(raw);
    const obj = (parsed && typeof parsed === 'object') ? parsed : {};
    stringsCache.set(id, obj);
    return obj;
  } catch (e) {
    stringsCache.set(id, {});
    return {};
  }
}

for (const l of LANGUAGES) {
  langMap[l.id] = l;
}

function getLangById(id) {
  const entry = langMap[id] || langMap['en_us'];
  return { id: entry.id, name: entry.name, strings: loadStrings(entry.id) };
}

function getAllLanguages() {
  return LANGUAGES.map((l) => ({ id: l.id, name: l.name }));
}

module.exports = { LANGUAGES, getLangById, getAllLanguages };