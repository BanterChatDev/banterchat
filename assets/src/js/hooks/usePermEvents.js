import { useEffect, useRef } from 'react';
import { on } from '../eventBus';

export function getTopRole(roles) {
  if (!roles || roles.length === 0) return null;
  return [...roles].sort((a, b) => (a.position || 0) - (b.position || 0))[0];
}

export function applyRoleUpdate(roles, updated) {
  if (!roles || !roles.some(r => r.id === updated.id)) return null;
  return roles.map(r => r.id === updated.id ? {
    ...r,
    name: updated.name ?? r.name,
    color: updated.color ?? r.color,
    position: updated.position ?? r.position,
    permissions: updated.permissions ?? r.permissions,
    deny: updated.deny ?? r.deny,
  } : r)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
}

export function applyRoleDelete(roles, roleId) {
  if (!roles || !roles.some(r => r.id === roleId)) return null;
  return roles.filter(r => r.id !== roleId);
}

export function patchUser(prev, data) {
  const patch = {};
  if (data.bio !== undefined) patch.bio = data.bio;
  if (data.avatar_id !== undefined) patch.avatar_id = data.avatar_id;
  if (data.banner_id !== undefined) patch.banner_id = data.banner_id;
  if (data.banner_crop !== undefined) patch.banner_crop = data.banner_crop;
  if (data.username !== undefined) patch.username = data.username;
  if (data.discriminator !== undefined) patch.discriminator = data.discriminator;
  if (data.display_name !== undefined) patch.display_name = data.display_name;
  if (data.flair !== undefined) patch.flair = data.flair;
  if (data.theme_id !== undefined) patch.theme_id = data.theme_id;
  if (data.lang_id !== undefined) patch.lang_id = data.lang_id;
  if (data.presence_status !== undefined) patch.presence_status = data.presence_status;
  if (data.banned !== undefined) patch.banned = data.banned;
  if (data.has_keyfile !== undefined) patch.has_keyfile = data.has_keyfile;
  if (data.keyfile_fingerprint !== undefined) patch.keyfile_fingerprint = data.keyfile_fingerprint;
  return Object.keys(patch).length > 0 ? { ...prev, ...patch } : prev;
}

export function onPermEvent(key, fn) {
  return on(key, fn);
}

export function usePermEvents(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const unsubs = [];
    for (const [key, fn] of Object.entries(ref.current)) {
      if (fn) {
        const wrapped = (data) => ref.current[key]?.(data);
        unsubs.push(on(key, wrapped));
      }
    }
    return () => unsubs.forEach(u => u());
  }, []);
}
