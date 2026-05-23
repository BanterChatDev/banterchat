import { u } from './routes';
import { t as tBare } from '../lang/apply';

let csrfToken = '';

export function getCSRFToken() { return csrfToken; }

// Bootstrap CSRF token. Called from apiLogin / apiRegister and as the
// 403-invalid-csrf retry. Uses u.csrf() so there are zero raw /api/...
// literals in this file.
export async function fetchCSRF() {
  const res = await fetch(u.csrf(), { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrf_token;
  return csrfToken;
}

export async function request(method, path, body = null, isRetry = false) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 413) throw new Error(tBare('notifications.request_too_large'));
      throw new Error(text || tBare('notifications.request_failed'));
    }
    return {};
  }
  if (!res.ok) {
    if (!isRetry && res.status === 403 && data.error === 'invalid csrf token') {
      await fetchCSRF();
      return request(method, path, body, true);
    }
    const err = new Error(data.error || data.message || tBare('notifications.request_failed'));
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function uploadImage(endpoint, file, { fallbackName = 'upload', crop, method = 'PUT' } = {}) {
  const buildForm = () => {
    const f = new FormData();
    f.append('file', file, file.name || fallbackName);
    if (crop) f.append('crop', JSON.stringify(crop));
    return f;
  };
  const send = (token) => fetch(endpoint, {
    method,
    credentials: 'include',
    headers: { 'X-CSRF-Token': token },
    body: buildForm(),
  });
  let res = await send(getCSRFToken());
  let data = await res.json().catch(() => ({}));
  if (res.status === 403 && data.error === 'invalid csrf token') {
    await fetchCSRF();
    res = await send(getCSRFToken());
    data = await res.json().catch(() => ({}));
  }
  if (!res.ok) throw new Error(data.error || tBare('messages.input_warn_upload_failed'));
  return data;
}

export async function uploadFormData(endpoint, fields, files, method = 'POST') {
  const buildForm = () => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields || {})) {
      if (v != null) f.append(k, v);
    }
    for (const [k, file] of Object.entries(files || {})) {
      if (file) f.append(k, file, file.name || k);
    }
    return f;
  };
  const send = (token) => fetch(endpoint, {
    method,
    credentials: 'include',
    headers: { 'X-CSRF-Token': token },
    body: buildForm(),
  });
  let res = await send(getCSRFToken());
  let data = await res.json().catch(() => ({}));
  if (res.status === 403 && data.error === 'invalid csrf token') {
    await fetchCSRF();
    res = await send(getCSRFToken());
    data = await res.json().catch(() => ({}));
  }
  if (!res.ok) throw new Error(data.error || tBare('messages.input_warn_upload_failed'));
  return data;
}