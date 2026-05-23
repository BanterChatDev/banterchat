export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  channels: '/channels',
  messages: '/messages',
  admin: '/admin',
  downloads: '/downloads',
  tos: '/tos',
  privacy: '/privacy',
  guidelines: '/guidelines',
  contentPolicy: '/content-policy',
  developerApplications: '/developers/applications',
};

// URL builders so every component produces matching paths.
export function channelPath(guildId, channelId) {
  if (!guildId) return '/channels';
  if (!channelId) return `/channels/${guildId}`;
  return `/channels/${guildId}/${channelId}`;
}

export function dmPath(userId, peerId) {
  return `/messages/${userId}/${peerId}`;
}

// Parses "/channels/:guildId/:channelId" → { guildId, channelId }.
// Missing segments are undefined. Non-channel paths return nulls.
export function parseChannelPath(path) {
  if (!path || !path.startsWith('/channels')) return { guildId: null, channelId: null };
  const parts = path.split('/').filter(Boolean);
  return { guildId: parts[1] || null, channelId: parts[2] || null };
}

// Parses "/messages" or "/messages/:userId/:peerId" → { isDMPath, peerId }.
// Bare /messages returns { isDMPath: true, peerId: null } — the home/friends view.
export function parseDMPath(path) {
  if (!path) return { isDMPath: false, peerId: null };
  if (path === '/messages') return { isDMPath: true, peerId: null };
  if (!path.startsWith('/messages/')) return { isDMPath: false, peerId: null };
  const parts = path.split('/').filter(Boolean);
  return { isDMPath: true, peerId: parts[2] || null };
}