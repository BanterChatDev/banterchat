import { getCSRFToken, fetchCSRF } from './client';
import { r } from './routes';
import { MAX_FILE_SIZE } from '../config';
import { t as tBare } from '../lang/apply';
import { sha256Base64Url, hashAvailable } from '../utils/hash';

function probeAttachment(fileHash, file, channelId, extras, isRetry = false) {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append('file_hash', fileHash);
    form.append('filename', file.name || 'file');
    form.append('mime_type', file.type || '');
    form.append('size', String(file.size));
    form.append('channel_id', channelId);
    if (extras && typeof extras === 'object') {
      for (const [k, v] of Object.entries(extras)) {
        if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
      }
    }
    fetch(r.attachments.probe(), {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCSRFToken() },
      body: form,
    }).then(async (res) => {
      let data;
      try { data = await res.json(); } catch { data = null; }
      if (res.status === 201 && data?.id) return resolve(data);
      if (!isRetry && res.status === 403 && data?.error === 'invalid csrf token') {
        await fetchCSRF();
        return resolve(probeAttachment(fileHash, file, channelId, extras, true));
      }
      resolve(null);
    }).catch(() => resolve(null));
  });
}

export async function uploadFile(file, channelId, onProgress, isRetry = false, extras) {
  if (file.size <= MAX_FILE_SIZE && hashAvailable()) {
    try {
      const fileHash = await sha256Base64Url(file);
      const probed = await probeAttachment(fileHash, file, channelId, extras);
      if (probed) {
        if (onProgress) onProgress(100);
        return probed;
      }
    } catch {}
  }
  return uploadFileXhr(file, channelId, onProgress, isRetry, extras);
}

function uploadFileXhr(file, channelId, onProgress, isRetry = false, extras) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      return reject(new Error(tBare('messages.input_warn_file_too_large_no_name_template').replace('{mb}', MAX_FILE_SIZE / (1024 * 1024))));
    }
    const form = new FormData();
    form.append('file', file);
    form.append('channel_id', channelId);
    if (extras && typeof extras === 'object') {
      for (const [k, v] of Object.entries(extras)) {
        if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
      }
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', r.attachments.upload());
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRF-Token', getCSRFToken());
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.min(Math.round((e.loaded / e.total) * 100), 99));
      };
    }
    xhr.onload = () => {
      let data;
      try { data = JSON.parse(xhr.responseText); } catch { data = null; }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(data || {});
      } else if (!isRetry && xhr.status === 403 && data?.error === 'invalid csrf token') {
        fetchCSRF().then(() => uploadFileXhr(file, channelId, onProgress, true, extras).then(resolve, reject)).catch(reject);
      } else if (xhr.status === 413) {
        reject(new Error(tBare('messages.input_warn_file_too_large_short')));
      } else {
        reject(new Error(data?.error || tBare('messages.input_warn_upload_failed')));
      }
    };
    xhr.onerror = () => reject(new Error(tBare('messages.input_warn_upload_failed')));
    xhr.send(form);
  });
}