import { request } from './client';
import { r } from './routes';

export async function apiGetReads() {
  return request('GET', r.reads.list());
}

export async function apiMarkRead(channelId) {
  return request('PUT', r.reads.mark(channelId));
}