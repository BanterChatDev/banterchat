import { request } from './client';
import { r } from './routes';

export function apiGetPrefs() {
  return request('GET', r.me_prefs());
}

export function apiUpdatePrefs(prefs) {
  return request('PUT', r.me_prefs(), prefs);
}

export function apiSetTheme(themeId) {
  return request('PUT', r.me_prefs(), { theme_id: themeId });
}

export function apiSetLang(langId) {
  return request('PUT', r.me_prefs(), { lang_id: langId });
}