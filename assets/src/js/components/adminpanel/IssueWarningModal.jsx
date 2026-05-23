import React, { useEffect, useState } from 'react';
import Modal, { ModalHeader, ModalActions, ModalError } from '../ui/Modal';
import Slider from '../ui/Slider';
import { apiAdminWarnUser, apiAdminWarningPresets } from '../../api/admin';
import { ShieldIcon } from '../icons';

export default function IssueWarningModal({ isOpen, onClose, userId, username, onIssued }) {
  const [presets, setPresets] = useState([]);
  const [selected, setSelected] = useState({});
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState(2);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected({});
    setNote('');
    setSeverity(2);
    setError('');
    apiAdminWarningPresets().then(r => setPresets(r.reasons || [])).catch(() => setPresets([]));
  }, [isOpen]);

  const toggle = (reason) => {
    setSelected(prev => ({ ...prev, [reason]: !prev[reason] }));
  };

  const submit = async () => {
    const reasons = Object.keys(selected).filter(k => selected[k]);
    if (reasons.length === 0 && !note.trim()) {
      setError('Pick at least one reason or write a note.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiAdminWarnUser(userId, { reasons, note: note.trim(), severity });
      onIssued?.();
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        icon={<ShieldIcon className="w-5 h-5" />}
        title="Issue Warning"
        subtitle={username ? `To @${username}` : `To user ${userId?.slice(0, 12)}…`}
      />

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Preset Reasons</label>
          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {presets.length === 0 && <span className="text-[12px] text-white/30">Loading presets…</span>}
            {presets.map(reason => (
              <label key={reason} className="flex items-start gap-2 p-2 rounded hover:bg-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selected[reason]}
                  onChange={() => toggle(reason)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span className="text-[12px] text-white/70 leading-snug">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
            Severity: <span className="text-white/70 tabular-nums">{severity}</span> / 5
          </label>
          <Slider
            min={1}
            max={5}
            step={1}
            value={severity}
            onChange={setSeverity}
            trackClassName="w-full"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
            <span>Light</span>
            <span>Severe</span>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Additional Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else the recipient should see…"
            rows={3}
            className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
            maxLength={500}
          />
        </div>

        <ModalError message={error} />
      </div>

      <ModalActions>
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 disabled:opacity-40">Cancel</button>
        <button onClick={submit} disabled={loading} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40">
          {loading ? 'Issuing…' : 'Issue Warning'}
        </button>
      </ModalActions>
    </Modal>
  );
}