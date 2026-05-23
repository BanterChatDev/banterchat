import { getAllPermissions } from './permissions';

export const ADMIN_ROLE_ID = '00000000000000000000000000000001';
export const DEFAULT_ROLE_ID = '00000000000000000000000000000002';
export const ALL_PERMISSIONS = getAllPermissions();

export let MAX_FILE_SIZE = 75 * 1024 * 1024;
export let MAX_FILE_COUNT = 10;
export let MAX_MESSAGE_LENGTH = 10000;
export let DISCOVERY_URL = '';
export let TERMS_URL = '';

export async function loadServerConfig() {
  try {
    const res = await fetch('/api/v1/config', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.max_file_size === 'number' && data.max_file_size > 0) MAX_FILE_SIZE = data.max_file_size;
    if (typeof data.max_file_count === 'number' && data.max_file_count > 0) MAX_FILE_COUNT = data.max_file_count;
    if (typeof data.max_message_length === 'number' && data.max_message_length > 0) MAX_MESSAGE_LENGTH = data.max_message_length;
    if (typeof data.discovery_url === 'string') DISCOVERY_URL = data.discovery_url;
    if (typeof data.terms_url === 'string') TERMS_URL = data.terms_url;
  } catch {}
}