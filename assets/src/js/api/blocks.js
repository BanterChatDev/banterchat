import { request } from './client';
import { r } from './routes';

export async function apiListBlocks() {
  return request('GET', r.blocks.list());
}

export async function apiListBlockedBy() {
  return request('GET', r.blocks.listBy());
}

export async function apiBlockUser(username) {
  return request('POST', r.blocks.add(), { username });
}

export async function apiUnblockUser(username) {
  return request('DELETE', r.blocks.remove(username));
}