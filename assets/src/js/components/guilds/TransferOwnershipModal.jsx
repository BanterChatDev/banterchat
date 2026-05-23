import React, { useState, useEffect } from 'react';
import Modal, { ModalHeader, ModalActions, ModalError } from '../ui/Modal';
import PasswordInput from '../ui/PasswordInput';
import { apiTransferGuildOwnership } from '../../api/guilds';
import { useT } from '../../hooks/useT';

export default function TransferOwnershipModal() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [guild, setGuild] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const onOpen = (e) => {
      const detail = e?.detail || {};
      if (!detail.guild || !detail.targetUser) return;
      setGuild(detail.guild);
      setTargetUser(detail.targetUser);
      setPassword('');
      setErr('');
      setOpen(true);
    };
    window.addEventListener('openTransferOwnership', onOpen);
    return () => window.removeEventListener('openTransferOwnership', onOpen);
  }, []);

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setErr('');
  };

  const handleTransfer = async () => {
    if (!guild?.id || !targetUser?.id || !password) return;
    setErr('');
    setBusy(true);
    try {
      await apiTransferGuildOwnership(guild.id, targetUser.id, password);
      window.dispatchEvent(new CustomEvent('guildOwnershipTransferred', { detail: { guildId: guild.id, newOwnerId: targetUser.id } }));
      setOpen(false);
      setPassword('');
    } catch (e) {
      setErr(e?.message || t('guilds.transfer_modal_fail'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={handleClose} size="sm">
      <ModalHeader title={t('guilds.transfer_modal_title')} subtitle={t('guilds.transfer_modal_subtitle')} />
      <div className="mt-4 space-y-3">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-3">
          <p className="text-xs text-white/70">
            {t('guilds.transfer_modal_warning_prefix')}
            <span className="font-mono text-amber-300">{targetUser?.username || targetUser?.id}</span>
            {t('guilds.transfer_modal_warning_suffix')}
          </p>
        </div>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('guilds.transfer_modal_password_placeholder')}
          autoFocus
        />
        <ModalError message={err} />
        <ModalActions>
          <button onClick={handleClose} disabled={busy} className="flex-1 tw-btn-secondary rounded-md disabled:opacity-40">
            {t('common.cancel')}
          </button>
          <button onClick={handleTransfer} disabled={busy || !password} className="flex-1 tw-btn-danger rounded-md disabled:opacity-40">
            {busy ? t('guilds.transfer_modal_btn_busy') : t('guilds.transfer_modal_btn_confirm')}
          </button>
        </ModalActions>
      </div>
    </Modal>
  );
}