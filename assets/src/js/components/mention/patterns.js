export const MENTION_RE = /<@everyone>|<[#@&]([a-f0-9]+)>/g;
export const USER_MENTION_RE = /<@([a-f0-9]+)>/g;

export function hasMentions(text) {
  return text.includes('<@') || text.includes('<&') || text.includes('<#');
}

export function formatUserMention(id) { return `<@${id}>`; }
export function formatRoleMention(id) { return `<&${id}>`; }
export function formatChannelMention(id) { return `<#${id}>`; }
export const EVERYONE_MENTION = '<@everyone>';