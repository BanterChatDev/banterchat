import React from 'react';
import SearchableSelect from '../ui/SearchableSelect';
import { useInvites } from '../../hooks/useInvites';
import { formatInviteUses, formatInviteExpiry } from './inviteUtils';
import { useT } from '../../hooks/useT';

export default function InvitePicker({ guildId, value, onChange, disabled = false, placeholder }) {
  const t = useT();
  const { invites, loading } = useInvites(guildId);
  const placeholderResolved = placeholder ?? t('guilds.picker_default_placeholder');

  if (loading) {
    return (
      <div className="tw-input w-full px-3 py-2 text-xs text-white/30">{t('guilds.picker_loading')}</div>
    );
  }

  if (!invites || invites.length === 0) {
    return (
      <p className="text-[11px] text-white/40 leading-relaxed">
        {t('guilds.picker_no_invites_prefix')}<strong className="text-white/60">{t('guilds.picker_no_invites_link')}</strong>{t('guilds.picker_no_invites_suffix')}
      </p>
    );
  }

  const renderRow = (inv) => (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <span className="font-mono font-semibold text-white/75 truncate">{inv.code}</span>
      <span className="text-[10px] text-white/30 flex-shrink-0">·</span>
      <span className="text-[10px] text-white/40 flex-shrink-0">{formatInviteUses(inv.uses, inv.max_uses)}</span>
      <span className="text-[10px] text-white/20 flex-shrink-0">·</span>
      <span className={`text-[10px] flex-shrink-0 ${!inv.expires_at ? 'text-emerald-400/70' : 'text-white/30'}`}>{formatInviteExpiry(inv.expires_at)}</span>
    </div>
  );

  return (
    <SearchableSelect
      value={value}
      onChange={(code) => onChange(code)}
      options={invites}
      placeholder={placeholderResolved}
      searchPlaceholder={t('guilds.picker_search_placeholder')}
      emptyText={t('guilds.picker_empty')}
      getKey={(inv) => inv.code}
      getLabel={(inv) => inv.code}
      renderOption={renderRow}
      renderSelected={renderRow}
      disabled={disabled}
    />
  );
}