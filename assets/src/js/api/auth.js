import { request } from './client';
import { r } from './routes';

export async function apiRegister(username, password) {
  const _b = `${window.screen.width}x${window.screen.height}`;
  return request('POST', r.auth.register(), { username, password, _b });
}

export async function apiLogin(username, password) {
  return request('POST', r.auth.login(), { username, password });
}

export async function apiLogout() {
  return request('POST', r.auth.logout());
}

export async function apiMe() {
  try {
    return await request('GET', r.me());
  } catch {
    return null;
  }
}

export async function apiForgotPassword(username, keyfileHex, newPassword) {
  return request('POST', r.auth.forgot(), { username, keyfile: keyfileHex, new_password: newPassword });
}

export async function apiVerifyKeyfile(username, keyfileHex) {
  return request('POST', r.auth.verifyKeyfile(), { username, keyfile: keyfileHex });
}

export async function apiGenerateKeyfile(password) {
  return request('POST', r.me_keyfile(), { password });
}

export async function apiRotateKeyfile(password) {
  return request('PUT', r.me_keyfile(), { password });
}

export async function apiRemoveKeyfile(password, keyfileHex) {
  return request('DELETE', r.me_keyfile(), { password, keyfile: keyfileHex });
}

export async function apiChangePassword(oldPassword, newPassword, keyfileHex) {
  const body = { old_password: oldPassword, new_password: newPassword };
  if (keyfileHex) body.keyfile = keyfileHex;
  return request('PUT', r.me_password(), body);
}

export function apiListSessions() {
  return request('GET', r.sessions.list());
}

export function apiRevokeSession(id) {
  return request('DELETE', r.sessions.revoke(id));
}

export function apiSecurityLog() {
  return request('GET', r.me_security_log());
}