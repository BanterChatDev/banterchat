import { request } from './client';
import { r } from './routes';

// List + create + reorder are guild-scoped. Update / delete / perms stay
// on /categories/:id — backend resolves guild via category→guild lookup.

export async function apiListCategories(guildId) {
  if (!guildId) throw new Error('apiListCategories requires guildId');
  return request('GET', r.categories.list(guildId));
}

export async function apiCreateCategory(guildId, name) {
  if (!guildId) throw new Error('apiCreateCategory requires guildId');
  return request('POST', r.categories.create(guildId), { name });
}

export async function apiUpdateCategory(id, data) {
  return request('PUT', r.categories.update(id), data);
}

export async function apiReorderCategories(guildId, items) {
  if (!guildId) throw new Error('apiReorderCategories requires guildId');
  return request('PUT', r.categories.reorder(guildId), { items });
}

export async function apiDeleteCategory(id) {
  return request('DELETE', r.categories.delete(id));
}

export async function apiGetCategoryPerms(id) {
  return request('GET', r.categories.permissions(id));
}

export async function apiSetCategoryPerm(id, roleId, allow, deny) {
  return request('PUT', r.categories.permissions(id), { role_id: roleId, allow, deny });
}