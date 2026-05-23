import React from 'react';
import { CheckIcon, CloseIcon, MinusIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Tooltip from './Tooltip';

const STATES = ['neutral', 'allow', 'deny'];

export default function TriStateToggle({ value, onChange }) {
  const t = useT();
  const idx = STATES.indexOf(value || 'neutral');
  const next = () => onChange(STATES[(idx + 1) % 3]);
  if (value === 'allow') return (
    <Tooltip text={t('ui.tristate_allowed_title')}>
      <button type="button" onClick={next} aria-label={t('ui.tristate_allowed_title')} className="w-8 h-8 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-colors">
        <CheckIcon className="w-4 h-4 text-emerald-400" />
      </button>
    </Tooltip>
  );
  if (value === 'deny') return (
    <Tooltip text={t('ui.tristate_denied_title')}>
      <button type="button" onClick={next} aria-label={t('ui.tristate_denied_title')} className="w-8 h-8 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-colors">
        <CloseIcon className="w-4 h-4 text-red-400" />
      </button>
    </Tooltip>
  );
  return (
    <Tooltip text={t('ui.tristate_inherit_title')}>
      <button type="button" onClick={next} aria-label={t('ui.tristate_inherit_title')} className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.1] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
        <MinusIcon className="w-4 h-4 text-white/30" />
      </button>
    </Tooltip>
  );
}

export function TriStateLegend() {
  const t = useT();
  return (
    <div className="flex items-center gap-3 pt-1 text-[9px] text-white/15">
      <span className="flex items-center gap-1"><span className="inline-block w-2 h-0.5 bg-white/20 rounded-full" /> {t('ui.tristate_legend_inherit')}</span>
      <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> {t('ui.tristate_legend_allow')}</span>
      <span className="flex items-center gap-1"><span className="text-red-400">✗</span> {t('ui.tristate_legend_deny')}</span>
    </div>
  );
}