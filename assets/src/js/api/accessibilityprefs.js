import { request } from './client';
import { r } from './routes';

export function apiGetAccessibilityPrefs() {
  return request('GET', r.accessibilityPrefs());
}

export function apiUpdateAccessibilityPrefs(prefs) {
  return request('PUT', r.accessibilityPrefs(), prefs);
}