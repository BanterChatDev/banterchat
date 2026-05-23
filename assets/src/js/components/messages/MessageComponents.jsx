import React, { useCallback, useState } from 'react';

const STYLE_CLASSES = {
  primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
  secondary: 'bg-white/[0.08] hover:bg-white/[0.14] text-white/85',
  success: 'bg-emerald-500/80 hover:bg-emerald-500 text-white',
  danger: 'bg-red-500/80 hover:bg-red-500 text-white',
  link: 'bg-white/[0.06] hover:bg-white/[0.12] text-white/75',
};

function ComponentButton({ button, messageId, channelId, guildId, disabled }) {
  const [pending, setPending] = useState(false);
  const style = STYLE_CLASSES[button.style] || STYLE_CLASSES.secondary;
  const isLink = button.style === 'link';

  const onClick = useCallback(() => {
    if (disabled || pending || button.disabled) return;
    if (isLink) return;

    setPending(true);

    const sent = window.__wsSend?.({
      type: 'button_click',
      payload: {
        message_id: messageId,
        custom_id: button.custom_id,
        channel_id: channelId,
        guild_id: guildId || '',
      },
    });

    setTimeout(() => setPending(false), 1500);

    if (sent === false) {
      setPending(false);
    }
  }, [disabled, pending, button, messageId, channelId, guildId, isLink]);

  const common = `min-w-[72px] h-8 px-3 rounded-[4px] text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${style}`;

  if (isLink && button.url) {
    return (
      <a
        href={button.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${common} inline-flex items-center justify-center gap-1.5`}
      >
        {button.emoji && <span aria-hidden="true">{button.emoji}</span>}
        {button.label}
        <svg
          className="w-3 h-3 opacity-60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!button.disabled || disabled || pending}
      className={`${common} inline-flex items-center justify-center gap-1.5`}
    >
      {button.emoji && <span aria-hidden="true">{button.emoji}</span>}
      {button.label}
    </button>
  );
}

export default function MessageComponents({
  components,
  messageId,
  channelId,
  guildId,
}) {
  if (!components) return null;

  let rows = components;

  if (typeof rows === 'string') {
    try {
      rows = JSON.parse(rows);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {rows.map((row, i) => {
        if (
          row?.type !== 'action_row' ||
          !Array.isArray(row.components)
        ) {
          return null;
        }

        return (
          <div key={i} className="flex flex-wrap gap-1.5">
            {row.components.map((btn, j) => (
              <ComponentButton
                key={btn.custom_id || `link-${j}`}
                button={btn}
                messageId={messageId}
                channelId={channelId}
                guildId={guildId}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}