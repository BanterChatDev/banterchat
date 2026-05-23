import { request } from './client';
import { r } from './routes';

export function apiListMyWarnings() {
  return request('GET', r.me_warnings());
}

export function apiAcknowledgeWarning(warningId) {
  return request('POST', r.me_ack_warning(warningId));
}