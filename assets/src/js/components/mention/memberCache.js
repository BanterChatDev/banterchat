import { apiListChannelMembers } from '../../api/users';
import { apiListDMMembers } from '../../api/dms';
import { on } from '../../eventBus';
import { registerResetHandler } from '../../cache';

const membersByGuild = new Map();
const inflightByGuild = new Map();
const dmMembersByPeer = new Map();
const inflightByDMPeer = new Map();
const listeners = new Set();

registerResetHandler(() => {
  membersByGuild.clear();
  inflightByGuild.clear();
  dmMembersByPeer.clear();
  inflightByDMPeer.clear();
  listeners.forEach(fn => { try { fn(null); } catch {} });
});

function notify(guildId) {
  listeners.forEach(fn => { try { fn(guildId); } catch (e) {} });
}

export function getGuildMembers(guildId) {
  if (!guildId) return null;
  return membersByGuild.get(guildId) || null;
}

export function getDMMembers(peerId) {
  if (!peerId) return null;
  return dmMembersByPeer.get(peerId) || null;
}

export function setGuildMembers(guildId, list) {
  if (!guildId) return;
  membersByGuild.set(guildId, Array.isArray(list) ? list : []);
  notify(guildId);
}

export function setDMMembers(peerId, list) {
  if (!peerId) return;
  dmMembersByPeer.set(peerId, Array.isArray(list) ? list : []);
  notify(peerId);
}

export function addMemberToGuild(guildId, member) {
  if (!guildId || !member || !member.id) return;
  const list = membersByGuild.get(guildId);
  if (!list) return;
  if (list.some(m => m.id === member.id)) return;
  membersByGuild.set(guildId, [...list, member]);
  notify(guildId);
}

export function removeMemberFromGuild(guildId, userId) {
  if (!guildId || !userId) return;
  const list = membersByGuild.get(guildId);
  if (!list) return;
  const next = list.filter(m => m.id !== userId);
  if (next.length === list.length) return;
  membersByGuild.set(guildId, next);
  notify(guildId);
}

export function invalidateGuild(guildId) {
  if (!guildId) return;
  membersByGuild.delete(guildId);
  inflightByGuild.delete(guildId);
  notify(guildId);
}

export function fetchGuildMembers(guildId, channelIdForApi) {
  if (!guildId || !channelIdForApi) return Promise.resolve([]);
  const cached = membersByGuild.get(guildId);
  if (cached) return Promise.resolve(cached);
  const inflight = inflightByGuild.get(guildId);
  if (inflight) return inflight;
  const p = apiListChannelMembers(channelIdForApi, 200, 0, '').then(res => {
    const list = res.users || [];
    membersByGuild.set(guildId, list);
    inflightByGuild.delete(guildId);
    notify(guildId);
    return list;
  }).catch(() => {
    inflightByGuild.delete(guildId);
    return [];
  });
  inflightByGuild.set(guildId, p);
  return p;
}

export function fetchDMMembers(peerId) {
  if (!peerId) return Promise.resolve([]);
  const cached = dmMembersByPeer.get(peerId);
  if (cached) return Promise.resolve(cached);
  const inflight = inflightByDMPeer.get(peerId);
  if (inflight) return inflight;
  const p = apiListDMMembers(peerId).then(res => {
    const list = res.users || [];
    dmMembersByPeer.set(peerId, list);
    inflightByDMPeer.delete(peerId);
    notify(peerId);
    return list;
  }).catch(() => {
    inflightByDMPeer.delete(peerId);
    return [];
  });
  inflightByDMPeer.set(peerId, p);
  return p;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

on('guildMemberAdd', ({ guild_id, member }) => {
  if (!guild_id) return;
  if (member && member.id) {
    addMemberToGuild(guild_id, member);
  } else {
    invalidateGuild(guild_id);
  }
});

on('guildMemberRemove', ({ guild_id, user_id }) => {
  if (!guild_id) return;
  if (user_id) {
    removeMemberFromGuild(guild_id, user_id);
  } else {
    invalidateGuild(guild_id);
  }
});

on('guildBanAdd', ({ guild_id, user_id }) => {
  if (!guild_id) return;
  if (user_id) removeMemberFromGuild(guild_id, user_id);
  else invalidateGuild(guild_id);
});

on('guildBanRemove', ({ guild_id }) => {
  invalidateGuild(guild_id);
});