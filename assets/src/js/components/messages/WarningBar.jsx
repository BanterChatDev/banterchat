import React from 'react';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

// WarningBar — an inline warning row that sits immediately above the
// message input. Used for errors scoped to the current send attempt:
// file too large, max files exceeded, upload failed, rate-limited by
// the WS server. Replaces corner toasts for these cases because the
// user is looking at the input, not the top-right of the screen.
//
// Tone:
//   type='error'   — destructive (upload failed, too large)
//   type='warn'    — recoverable (rate limit, will clear in a moment)
//
// Dismiss: the little × on the right, or parent can set the prop to
// null. Auto-dismiss handled by the parent (MessageInput) via a timer
// so multiple warnings in rapid succession reset cleanly without each
// managing its own lifecycle.
export default function WarningBar({ warning, onDismiss }) {
  const t = useT();
  if (!warning) return null;
  const tone = warning.type === 'warn'
    ? 'bg-[rgb(var(--accent-warning-rgb)/0.12)] border-[rgb(var(--accent-warning-rgb)/0.3)] text-[var(--accent-warning)]'
    : 'bg-[rgb(var(--accent-danger-rgb)/0.12)] border-[rgb(var(--accent-danger-rgb)/0.3)] text-[rgb(var(--accent-danger-rgb))]';
  return (
    <div className={`flex items-center gap-2 rounded-t-lg px-3 py-2 border-b-0 border text-[12px] mb-[-1px] ${tone}`} role="alert">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span className="flex-1 leading-snug break-words">{warning.text}</span>
      <Tooltip text={t('messages.warning_dismiss')}>
        <button
          onClick={onDismiss}
          aria-label={t('messages.warning_dismiss')}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}