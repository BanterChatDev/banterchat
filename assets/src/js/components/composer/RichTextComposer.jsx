import React, { useRef, useCallback, useEffect } from 'react';
import { MentionAutocomplete, ChannelMentionAutocomplete, useMention, useChannelMention } from '../mention';
import { EmojiAutocomplete, useEmojiAutocomplete } from '../emoji';
import { SlashAutocomplete } from '../slashcommand';
import MarkdownHighlight from '../markdown/MarkDownHighlight';

const MAX_HEIGHT = 200;

export default function RichTextComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  inputRef: parentRef,
  channel,
  channels,
  guildId,
  user,
  channelPerms,
  slashAC = null,
  placeholder,
  maxLength,
  onTextActivity,
  onPaste,
  onUndoKeyDown,
  textareaClassName,
  rows = 1,
}) {
  const localRef = useRef(null);
  const inputRef = parentRef || localRef;
  const mirrorRef = useRef(null);

  const isDM = !!channel?._dm;
  const dmPeerId = isDM ? channel._peerInfo?.peer_id : null;

  const ping = useMention(user?.id, value, onChange, inputRef, channelPerms, channel?.id, dmPeerId, guildId);
  const chanMention = useChannelMention(value, onChange, inputRef, isDM ? [] : (channels || []));
  const emojiAC = useEmojiAutocomplete(value, onChange, inputRef, guildId);

  const resize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + 'px';
    if (mirrorRef.current) mirrorRef.current.scrollTop = el.scrollTop;
  }, [inputRef]);

  useEffect(() => { resize(); }, [value, resize]);

  const handleChange = (e) => {
    onChange(e.target.value);
    ping.detect(e.target.value, e.target.selectionStart);
    chanMention.detect(e.target.value, e.target.selectionStart);
    emojiAC.detect(e.target.value, e.target.selectionStart);
    if (slashAC) slashAC.detect(e.target.value, e.target.selectionStart);
    if (e.target.value.trim() && onTextActivity) onTextActivity();
    resize();
  };

  const submit = useCallback(() => {
    const raw = (value || '').trim();
    if (!raw) {
      if (onSubmit) onSubmit('');
      return;
    }
    const content = chanMention.buildContent(ping.buildContent(raw));
    ping.dismiss();
    ping.clearMap();
    chanMention.dismiss();
    chanMention.clearMap();
    if (onSubmit) onSubmit(content);
  }, [value, chanMention, ping, onSubmit]);

  const handleKeyDown = (e) => {
    if (onUndoKeyDown && onUndoKeyDown(e)) return;
    if (slashAC && slashAC.handleKeyDown(e)) return;
    if (ping.handleKeyDown(e)) return;
    if (chanMention.handleKeyDown(e)) return;
    if (emojiAC.handleKeyDown(e)) return;
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const slashActive = !!slashAC && slashAC.isActive;

  return (
    <div className="flex-1 min-w-0">
      {ping.isActive && (
        <MentionAutocomplete
          users={ping.mentionUsers}
          activeIndex={ping.mentionIndex}
          onSelect={ping.select}
          onHover={ping.setMentionIndex}
          isDM={isDM}
        />
      )}
      {chanMention.isActive && !ping.isActive && (
        <ChannelMentionAutocomplete
          channels={chanMention.results}
          activeIndex={chanMention.index}
          onSelect={chanMention.select}
          onHover={chanMention.setIndex}
        />
      )}
      {emojiAC.isActive && !ping.isActive && !chanMention.isActive && !slashActive && (
        <EmojiAutocomplete
          emojis={emojiAC.results}
          activeIndex={emojiAC.index}
          onSelect={emojiAC.select}
          onHover={emojiAC.setIndex}
        />
      )}
      {slashActive && (
        <SlashAutocomplete
          commands={slashAC.results}
          activeIndex={slashAC.index}
          onSelect={slashAC.select}
          onHover={slashAC.setIndex}
        />
      )}
      <div className="relative">
        <div
          ref={mirrorRef}
          className="absolute inset-0 text-[13px] text-white/80 py-2.5 leading-relaxed whitespace-pre-wrap break-words overflow-hidden pointer-events-none select-none"
          aria-hidden="true"
        >
          {value ? <MarkdownHighlight text={value} /> : null}
        </div>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={() => { if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollTop = inputRef.current.scrollTop; }}
          onPaste={onPaste}
          placeholder={placeholder}
          className={textareaClassName || "relative w-full bg-transparent text-[13px] placeholder-white/15 focus:outline-none min-w-0 py-2.5 select-text resize-none overflow-hidden leading-relaxed"}
          style={{ color: 'transparent', caretColor: 'rgba(255,255,255,0.8)' }}
          maxLength={maxLength}
          rows={rows}
        />
      </div>
    </div>
  );
}