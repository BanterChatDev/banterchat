import { hasPerm, PERM_MENTION_EVERYONE } from '../permissions';

function textHasMention(text, user, guildRoleIds) {
  if (!text) return false;
  if (text.includes(`<@${user.id}>`)) return true;
  if (!guildRoleIds || guildRoleIds.length === 0) return false;
  return guildRoleIds.some(rid => text.includes(`<&${rid}>`));
}

function embedText(embed) {
  if (!embed) return '';
  let t = embed.description || '';
  if (embed.fields) embed.fields.forEach(f => { t += ' ' + (f.value || ''); });
  return t;
}

export function isMentioned(msg, user, guildRoleIds) {
  if (!user) return false;
  if (msg.reply?.user_id === user.id) return true;
  const content = (msg.content || '') + ' ' + embedText(msg.embed);
  if (content.includes('<@everyone>') && hasPerm(msg.author_perms || 0, PERM_MENTION_EVERYONE)) return true;
  return textHasMention(content, user, guildRoleIds);
}