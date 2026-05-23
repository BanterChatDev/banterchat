export function resolveDisplayName(user) {
  if (!user) return '';
  const dn = user.display_name;
  if (dn && typeof dn === 'string' && dn.trim()) return dn;
  const u = user.username || '';
  if (user.discriminator) return `${u}#${user.discriminator}`;
  return u;
}

export function nameMatches(user, query) {
  if (!user || !query) return false;
  const q = query.toLowerCase();
  const u = user.username || '';
  const d = user.display_name || '';
  return u.toLowerCase().includes(q) || d.toLowerCase().includes(q);
}