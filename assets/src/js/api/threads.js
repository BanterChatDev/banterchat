import { request } from './client';
import { r } from './routes';

export function apiListThreads(channelId, includeArchived = false) {
  const path = r.threads.list(channelId) + (includeArchived ? '?archived=true' : '');
  return request('GET', path);
}

export function apiCreateThread(channelId, name, parentMessageId = '') {
  return request('POST', r.threads.create(channelId), { name, parent_message_id: parentMessageId });
}

export function apiGetThread(threadId) {
  return request('GET', r.threads.get(threadId));
}

export function apiArchiveThread(threadId) {
  return request('PUT', r.threads.archive(threadId));
}

export function apiUnarchiveThread(threadId) {
  return request('PUT', r.threads.unarchive(threadId));
}

export function apiDeleteThread(threadId) {
  return request('DELETE', r.threads.delete(threadId));
}