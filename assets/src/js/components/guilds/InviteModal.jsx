import React, { useState, useEffect } from 'react';
import Modal, { ModalHeader } from '../ui/Modal';
import { apiCreateInvite, apiJoinByInvite, apiGetInvitePreview } from '../../api/guilds';
import { CopyIcon } from '../icons';
import { useInvites } from '../../hooks/useInvites';
import { pickReusableInvite } from './inviteUtils';
import { useT } from '../../hooks/useT';
import SearchableSelect from '../ui/SearchableSelect';

function getMaxUsesOptions(t) {
  return [
    { value: 0, label: t('guilds.invite_modal_max_uses_no_limit') },
    { value: 1, label: t('guilds.invite_modal_max_uses_one') },
    { value: 5, label: t('guilds.invite_modal_max_uses_template').replace('{n}', 5) },
    { value: 10, label: t('guilds.invite_modal_max_uses_template').replace('{n}', 10) },
    { value: 25, label: t('guilds.invite_modal_max_uses_template').replace('{n}', 25) },
    { value: 50, label: t('guilds.invite_modal_max_uses_template').replace('{n}', 50) },
    { value: 100, label: t('guilds.invite_modal_max_uses_template').replace('{n}', 100) },
  ];
}

function getExpiryOptions(t) {
  return [
    { value: 0, label: t('guilds.invite_modal_expiry_never') },
    { value: 30 * 60, label: t('guilds.invite_modal_expiry_30_min') },
    { value: 60 * 60, label: t('guilds.invite_modal_expiry_1_hour') },
    { value: 6 * 60 * 60, label: t('guilds.invite_modal_expiry_6_hours') },
    { value: 12 * 60 * 60, label: t('guilds.invite_modal_expiry_12_hours') },
    { value: 24 * 60 * 60, label: t('guilds.invite_modal_expiry_1_day') },
    { value: 7 * 24 * 60 * 60, label: t('guilds.invite_modal_expiry_7_days') },
  ];
}

export function CreateInviteModal({ isOpen, onClose, guildId, onCreated }) {
  const t = useT();
  const { invites, loading: loadingExisting, setInvites } = useInvites(isOpen ? guildId : null);
  const [maxUses, setMaxUses] = useState(0);
  const [expiresIn, setExpiresIn] = useState(7 * 24 * 60 * 60);
  const [creating, setCreating] = useState(false);
  const [current, setCurrent] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !guildId) return;
    setError('');
    setCopied(false);
    setShowCustom(false);
    setMaxUses(0);
    setExpiresIn(7 * 24 * 60 * 60);
  }, [isOpen, guildId]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrent(pickReusableInvite(invites));
  }, [isOpen, invites]);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await apiCreateInvite(guildId, maxUses, expiresIn);
      const fresh = {
        ...res,
        uses: res.uses ?? 0,
        max_uses: res.max_uses ?? maxUses,
        expires_at: res.expires_at ?? (expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null),
        created_at: res.created_at ?? new Date().toISOString(),
      };
      setCurrent(fresh);
      setInvites(prev => [fresh, ...(prev || [])]);
      setShowCustom(false);
      onCreated?.(fresh);
    } catch (e) {
      setError(e.message || t('guilds.invite_modal_fail_create'));
    }
    setCreating(false);
  };

  const copyLink = () => {
    if (!current) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${current.code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={t('guilds.invite_modal_create_title')} subtitle={t('guilds.invite_modal_create_subtitle')} />

      {loadingExisting ? (
        <div className="mt-6 flex justify-center">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      ) : showCustom ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-white/35 font-semibold mb-1.5 block">{t('guilds.invite_modal_label_max_uses')}</label>
            <SearchableSelect
              value={maxUses}
              onChange={(v) => setMaxUses(v)}
              options={getMaxUsesOptions(t)}
              searchable={false}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-white/35 font-semibold mb-1.5 block">{t('guilds.invite_modal_label_expiry')}</label>
            <SearchableSelect
              value={expiresIn}
              onChange={(v) => setExpiresIn(v)}
              options={getExpiryOptions(t)}
              searchable={false}
            />
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowCustom(false)} className="flex-1 px-4 py-2 rounded-md text-sm text-white/60 hover:bg-white/[0.04]">{t('guilds.invite_modal_btn_back')}</button>
            <button onClick={handleCreate} disabled={creating} className="tw-btn-accent flex-1 rounded-md disabled:opacity-50 py-2 text-sm">
              {creating ? t('auth.button.creating') : t('guilds.invite_modal_btn_create_link')}
            </button>
          </div>
        </div>
      ) : current ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-md bg-white/[0.03] border border-white/[0.06]">
            <code className="text-[13px] text-white/80 font-mono flex-1 truncate">{`${window.location.origin}/invite/${current.code}`}</code>
            <button onClick={copyLink} className="tw-btn-accent px-3 py-1.5 rounded text-[12px] flex items-center gap-1.5">
              {copied ? (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t('guilds.invite_modal_btn_copied')}</>
              ) : (
                <><CopyIcon className="w-3.5 h-3.5" />{t('guilds.invite_modal_btn_copy')}</>
              )}
            </button>
          </div>
          <p className="text-[11px] text-white/30 text-center">
            {current.max_uses > 0 ? t('guilds.invite_modal_uses_ratio_template').replace('{uses}', current.uses || 0).replace('{max}', current.max_uses) : t('guilds.invite_modal_unlimited')}
            {current.expires_at && ` · ${t('guilds.invite_modal_expires_template').replace('{date}', new Date(current.expires_at).toLocaleDateString())}`}
          </p>
          <button onClick={() => setShowCustom(true)} className="w-full px-4 py-2 rounded-md text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            {t('guilds.invite_modal_custom_link')}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] text-white/50 text-center">{t('guilds.invite_modal_no_reusable')}</p>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <button onClick={handleCreate} disabled={creating} className="tw-btn-accent w-full rounded-md disabled:opacity-50 py-2">
            {creating ? t('auth.button.creating') : t('guilds.invite_modal_btn_create_invite')}
          </button>
          <button onClick={() => setShowCustom(true)} className="w-full px-4 py-2 rounded-md text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            {t('guilds.invite_modal_btn_custom_options')}
          </button>
        </div>
      )}
    </Modal>
  );
}

export function JoinByInviteModal({ isOpen, onClose, onJoined, initialCode = '' }) {
  const t = useT();
  const [code, setCode] = useState(initialCode);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode);
      checkPreview(initialCode);
    }
  }, [isOpen, initialCode]);

  const checkPreview = async (val) => {
    const cleaned = val.trim().split('/').pop();
    if (!cleaned || cleaned.length < 4) { setPreview(null); return; }
    setChecking(true);
    try {
      const res = await apiGetInvitePreview(cleaned);
      if (res?.guild) setPreview(res.guild);
      else setPreview(null);
    } catch {
      setPreview(null);
    }
    setChecking(false);
  };

  const handleJoin = async () => {
    const cleaned = code.trim().split('/').pop();
    if (!cleaned) return;
    setJoining(true);
    setError('');
    try {
      const res = await apiJoinByInvite(cleaned);
      onJoined?.(res.guild_id, res.guild);
      onClose();
      setCode('');
      setPreview(null);
    } catch (e) {
      setError(e.message || t('guilds.join_modal_fail_invalid'));
    }
    setJoining(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={t('guilds.join_modal_title')} subtitle={t('guilds.join_modal_subtitle')} />
      <div className="mt-4 space-y-3">
        <div className="relative">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            onBlur={() => checkPreview(code)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder={t('guilds.join_modal_placeholder')}
            className="tw-input w-full px-3 py-2.5 rounded-md text-sm"
            autoFocus
          />
        </div>
        {preview && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{(preview.name || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/90 truncate">{preview.name}</p>
              <p className="text-[11px] text-white/30 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {t('guilds.join_modal_online_template').replace('{n}', preview.online_count || 0)}
                </span>
                <span className="text-white/20">·</span>
                <span>{t('guilds.card_members_template').replace('{n}', preview.member_count || 0)}</span>
              </p>
            </div>
          </div>
        )}
        {error && <p className="text-[12px] text-red-400">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={joining || !code.trim()}
          className="tw-btn-accent w-full rounded-md disabled:opacity-50"
        >
          {joining ? t('embed_invite.btn_joining') : checking ? t('guilds.join_modal_btn_checking') : t('guilds.join_modal_btn_join')}
        </button>
        <p className="text-[11px] text-white/15 text-center">{t('guilds.join_modal_helper')}</p>
      </div>
    </Modal>
  );
}