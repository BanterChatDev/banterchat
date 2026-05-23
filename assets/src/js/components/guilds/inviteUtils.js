import { t as tBare } from '../../lang/apply';

export function formatInviteUses(uses, maxUses) {
  if (!maxUses || maxUses === 0) return tBare('guilds.invite_uses_template').replace('{n}', uses || 0);
  return tBare('guilds.invite_uses_ratio_template').replace('{uses}', uses || 0).replace('{max}', maxUses);
}

export function formatInviteExpiry(expiresAt) {
  if (!expiresAt) return tBare('guilds.invite_never_expires');
  const d = new Date(expiresAt);
  const now = Date.now();
  if (d.getTime() < now) return tBare('guilds.invite_expired');
  const mins = Math.floor((d.getTime() - now) / 60000);
  if (mins < 60) return tBare('guilds.invite_expires_in_minutes_template').replace('{n}', mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tBare('guilds.invite_expires_in_hours_template').replace('{n}', hrs);
  const days = Math.floor(hrs / 24);
  return tBare('guilds.invite_expires_in_days_template').replace('{n}', days);
}

export function isInviteUsable(inv) {
  if (!inv) return false;
  if (inv.max_uses > 0 && inv.uses >= inv.max_uses) return false;
  if (inv.expires_at) {
    const exp = new Date(inv.expires_at).getTime();
    if (!isNaN(exp) && exp < Date.now()) return false;
  }
  return true;
}

export function pickReusableInvite(invites) {
  const usable = (invites || []).filter(isInviteUsable);
  usable.sort((a, b) => {
    const score = (x) => (x.max_uses === 0 ? 2 : 0) + (!x.expires_at ? 1 : 0);
    const s = score(b) - score(a);
    if (s !== 0) return s;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return usable[0] || null;
}