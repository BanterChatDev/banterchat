import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tooltip from '../ui/Tooltip';
import UserAvatar from '../user/UserAvatar';
import { RichTextComposer } from '../composer';
import { resolveChannelPerms } from '../../permissions';
import UserInfo from '../user/UserInfo';
import { useContextMenu } from '../contextmenu';
import { useBlocks } from '../../hooks/useBlocks';
import { MentionText } from '../mention';
import { hasPerm, PERM_MENTION_EVERYONE } from '../../permissions';
import { isMentioned } from '../../utils/mentions';
import { resolveDisplayName } from '../../utils/displayName';
import AttachmentView from '../attachments/AttachmentView';
import { EmbedView, LinkEmbed } from '../embed';
import { getTenorId } from '../embed/LinkEmbed/shared';
import CharCount from './CharCount';
import TypingDots from '../typing/TypingDots';
import Reactions from '../reactions/Reactions';
import MessageComponents from './MessageComponents';
import { CloseIcon } from '../icons';
import { MAX_MESSAGE_LENGTH } from '../../config';
import { resolveNameColor } from '../../utils/userColor';
import { u } from '../../api/routes';
import SystemMessage from './SystemMessage';
import { useT } from '../../hooks/useT';

function filterEmbedClaimedAttachments(attachments, embed) {
  if (!attachments || attachments.length === 0) return attachments;
  if (!embed) return attachments;
  const claimed = new Set();
  if (embed.image?.attachment_id) claimed.add(embed.image.attachment_id);
  if (embed.thumbnail?.attachment_id) claimed.add(embed.thumbnail.attachment_id);
  if (embed.author?.icon_attachment_id) claimed.add(embed.author.icon_attachment_id);
  if (embed.footer?.icon_attachment_id) claimed.add(embed.footer.icon_attachment_id);
  if (claimed.size === 0) return attachments;
  return attachments.filter(att => !claimed.has(att.id));
}

function EditBox({ msg, onDone, channel, channels, guildId, user, channelPerms }) {
  const t = useT();
  const [value, setValue] = useState(msg.content);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.selectionStart = len;
      ref.current.selectionEnd = len;
    }
  }, []);

  const submit = useCallback((content) => {
    const trimmed = (content || '').trim();
    if (!trimmed || trimmed === msg.content) return onDone();
    window.__wsSend?.({ type: 'message_edit', payload: { message_id: msg.id, content: trimmed } });
    onDone();
  }, [msg.content, msg.id, onDone]);

  return (
    <div className="mt-1 bg-[var(--bg-float)] border border-white/[0.08] rounded px-2 py-1 focus-within:border-white/20 transition-colors">
      <RichTextComposer
        value={value}
        onChange={setValue}
        onSubmit={submit}
        onCancel={onDone}
        inputRef={ref}
        channel={channel}
        channels={channels}
        guildId={guildId}
        user={user}
        channelPerms={channelPerms}
        placeholder=""
        maxLength={MAX_MESSAGE_LENGTH}
      />
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-white/20">
        {t('messages.edit_box_hint_prefix')}<button onClick={onDone} className="text-blue-400/60 hover:text-blue-400">{t('messages.edit_box_hint_cancel')}</button>{t('messages.edit_box_hint_middle')}<button onClick={() => submit(value)} className="text-blue-400/60 hover:text-blue-400">{t('messages.edit_box_hint_save')}</button>
        </p>
        <CharCount length={value.length} />
      </div>
    </div>
  );
}

function ReplyPreview({ reply, onJump, onUserClick }) {
  const t = useT();
  if (!reply) return null;
  if (reply.deleted) {
    return (
      <div className="flex items-center gap-1.5 mb-0.5 text-[11px]">
        <div className="w-5 h-3 flex-shrink-0 relative">
          <div className="absolute top-0 left-[50%] w-[50%] h-full border-l-2 border-t-2 border-white/10 rounded-tl-md" />
        </div>
        <span className="text-white/20 italic">{t('messages.list_reply_deleted')}</span>
      </div>
    );
  }
  const nameColor = resolveNameColor({ source: { role_color: reply.role_color }, fallback: 'rgba(255,255,255,0.55)' });
  const displayName = resolveDisplayName(reply);
  const openUser = (e) => { e.stopPropagation(); onUserClick && onUserClick(reply.user_id, e); };
  const hasContent = reply.content && reply.content.length > 0;
  const showAttachmentPlaceholder = !hasContent && reply.attachment_count > 0;
  return (
    <div onClick={() => onJump?.(reply.id)} className="flex items-center gap-1.5 mb-0.5 text-[11px] cursor-pointer transition-colors group/reply">
      <div className="w-5 h-3 flex-shrink-0 relative">
        <div className="absolute top-0 left-[50%] w-[50%] h-full border-l-2 border-t-2 border-white/10 rounded-tl-md group-hover/reply:border-white/20 transition-colors" />
      </div>
      <img
        src={reply.avatar_id ? u.avatar(reply.avatar_id) : '/media/default/default.png'}
        alt=""
        onError={(e) => { e.currentTarget.src = '/media/default/default.png'; }}
        onClick={openUser}
        className="w-4 h-4 rounded-full object-cover flex-shrink-0 hover:opacity-80 transition-opacity"
      />
      <span onClick={openUser} className="font-semibold flex-shrink-0 truncate max-w-[140px] hover:underline" style={{ color: nameColor }}>@{displayName}</span>
      {showAttachmentPlaceholder ? (
        <span className="text-white/35 italic truncate max-w-[300px] group-hover/reply:text-white/55 transition-colors">{t('messages.list_reply_attachment_only')}</span>
      ) : (
        <span className="text-white/30 truncate max-w-[300px] pointer-events-none [&_a]:text-white/30 [&_a]:no-underline [&_span]:bg-transparent [&_span]:text-white/35 group-hover/reply:text-white/45"><MentionText content={reply.content} authorPerms={reply.author_perms} /></span>
      )}
    </div>
  );
}

function invocationReply(msg) {
  if (msg.reply) return null;
  const cmd = msg.command_name || msg._commandName;
  if (!cmd) return null;
  const args = msg.command_args || msg._commandArgs || '';
  return {
    id: '',
    user_id: msg.invoker_id || '',
    username: msg.invoker_username || '',
    avatar_id: msg.invoker_avatar || '',
    role_color: msg.invoker_role_color || '',
    content: '/' + cmd + (args ? ' ' + args : ''),
    author_perms: 0,
    attachment_count: 0,
  };
}

function MessageBody({ msg, isEditing, onEditDone, onUserClick, onJumpToReply, user, channel, channels, guildId, channelPerms }) {
  const t = useT();
  const trimmed = (msg.content || '').trim();
  const hideTextForTenor = !isEditing && !msg.edited && !!getTenorId(trimmed) && trimmed === (msg.content || '').trim();
  const isThinking = !!msg._thinking;
  const isTimedOut = !!msg._timedOut;
  const isEphemeral = !!(msg._ephemeral || msg.ephemeral);
  const reply = msg.reply || invocationReply(msg);
  return (
    <>
      <ReplyPreview reply={reply} onJump={onJumpToReply} onUserClick={onUserClick} />
      {isThinking ? (
        <div className="text-[13px] text-white/40 leading-relaxed inline-flex items-center gap-1.5">
          <TypingDots size="sm" />
        </div>
      ) : isTimedOut ? (
        <div className="flex items-center gap-1.5 text-[13px] text-red-400/80">
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-400/20 text-red-400 text-[10px] font-bold">!</span>
          {msg.content || t('messages.command_app_timeout')}
        </div>
      ) : isEditing ? (
        <EditBox msg={msg} onDone={onEditDone} channel={channel} channels={channels} guildId={guildId} user={user} channelPerms={channelPerms} />
      ) : hideTextForTenor ? null : msg.content ? (
        <div className="text-[13px] text-white/65 leading-relaxed break-words select-text"><MentionText content={msg.content} onMentionClick={onUserClick} authorPerms={msg.author_perms} embedGifs />{msg.edited && <Tooltip text={t('messages.list_edited_tooltip')}><span className="text-[10px] text-white/20 ml-1" aria-label={t('messages.list_edited_tooltip')}>{t('messages.list_edited_marker')}</span></Tooltip>}</div>
      ) : null}
      {!isThinking && !isTimedOut && msg.embed && <EmbedView embed={msg.embed} attachments={msg.attachments} onMentionClick={onUserClick} />}
      {!isThinking && !isTimedOut && !msg.embed && msg.content && <LinkEmbed content={msg.content} />}
      {msg._failed && (
        <p className="text-[10px] text-red-400/60 mt-0.5 flex items-center gap-1.5">
          <span>{t('messages.list_failed_to_send')}</span>
          <Tooltip text={t('messages.warning_dismiss')}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('dismissMessage', { detail: { id: msg.id } }))}
              aria-label={t('messages.warning_dismiss')}
              className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-opacity"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </Tooltip>
        </p>
      )}
      {!isThinking && !isTimedOut && <AttachmentView attachments={filterEmbedClaimedAttachments(msg.attachments, msg.embed)} />}
      {!isThinking && !isTimedOut && <MessageComponents components={msg.components} messageId={msg.id} channelId={msg.channel_id} guildId={msg.guild_id} />}
      {!isThinking && !isTimedOut && <Reactions reactions={msg.reactions} messageId={msg.id} channelId={msg.channel_id} guildId={msg.guild_id} userId={user?.id} />}
      {isEphemeral && !isThinking && (
        <div className="text-[10px] text-white/25 mt-0.5">{t('messages.command_ephemeral_only_you')}</div>
      )}
    </>
  );
}

const MemoMessageBody = React.memo(MessageBody, (prev, next) => {
  return prev.msg.id === next.msg.id
    && prev.msg.content === next.msg.content
    && prev.msg.edited === next.msg.edited
    && prev.msg._pending === next.msg._pending
    && prev.msg._failed === next.msg._failed
    && prev.msg.attachments === next.msg.attachments
    && prev.msg.reactions === next.msg.reactions
    && prev.msg.reply === next.msg.reply
    && prev.msg.embed === next.msg.embed
    && prev.msg.components === next.msg.components
    && prev.isEditing === next.isEditing
    && prev.onJumpToReply === next.onJumpToReply
    && prev.onUserClick === next.onUserClick;
});

function rowClass(msg, isEditing, mentioned, extra) {
  const isEph = msg._ephemeral || msg.ephemeral;
  return `group hover:bg-white/[0.02] rounded -mx-2 px-2 ${isEditing ? 'bg-white/[0.03]' : ''} ${mentioned ? 'bg-[var(--mention-bg)] border-l-2 border-[var(--mention-border)]' : ''} ${isEph ? 'opacity-50' : ''} ${msg._pending ? 'animate-msg-in' : ''} ${msg._failed ? 'bg-red-500/10 opacity-60' : ''} ${extra}`;
}

export default function MessageList({ messages: rawMessages, channel, channelName, channels, categories, guildId, onUserClick, user, onJumpToReply, guildMe }) {
  const t = useT();
  const { isBlocked } = useBlocks();
  const messages = Array.isArray(rawMessages) ? rawMessages : [];
  const isDM = !!channel?._dm;
  const channelPerms = isDM ? -1 : resolveChannelPerms(guildMe, channel, categories);
  const { openMenu } = useContextMenu();
  const [editingId, setEditingId] = useState(null);
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const toggleReveal = useCallback((id) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => setEditingId(e.detail.id);
    window.addEventListener('editMessage', handler);
    return () => window.removeEventListener('editMessage', handler);
  }, []);

  const handleEditDone = useCallback(() => setEditingId(null), []);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white/15">#</span>
          </div>
          <h3 className="text-lg font-bold text-white/80 mb-1">{t('messages.list_welcome_template').replace('{name}', channelName || '')}</h3>
          <p className="text-xs text-white/25">{t('messages.list_welcome_body')}</p>
        </div>
      </div>
    );
  }

  const groupedRows = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const blocked = isBlocked(m.user_id) && !revealedIds.has(m.id);
    if (blocked) {
      const last = groupedRows[groupedRows.length - 1];
      if (last && last._blockedStub && last._authorId === m.user_id) {
        last._msgIds.push(m.id);
      } else {
        groupedRows.push({ _blockedStub: true, _authorId: m.user_id, _authorName: m.username, _msgIds: [m.id], _key: 'stub-' + m.id });
      }
    } else {
      groupedRows.push(m);
    }
  }

  return (
    <div>
      {groupedRows.map((row, i) => {
        if (row._blockedStub) {
          const oneMsg = row._msgIds.length === 1;
          const stubKey = row._authorName
            ? (oneMsg ? 'messages.list_blocked_one_from_template' : 'messages.list_blocked_other_from_template')
            : (oneMsg ? 'messages.list_blocked_one_template' : 'messages.list_blocked_other_template');
          const stubText = t(stubKey).replace('{n}', row._msgIds.length).replace('{name}', row._authorName || '');
          return (
            <div key={row._key} className="my-2 mx-2">
              <button
                type="button"
                onClick={() => row._msgIds.forEach(toggleReveal)}
                className="w-full text-left px-3 py-2 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-[12px] text-white/30 hover:text-white/60"
              >
                {stubText}
              </button>
            </div>
          );
        }
        const msg = row;
        const prev = (() => { for (let k = i - 1; k >= 0; k--) { if (!groupedRows[k]._blockedStub && !groupedRows[k].system_type) return groupedRows[k]; } return null; })();
        const isWebhookMsg = msg.type === 'webhook';
        const prevIsWebhook = prev && prev.type === 'webhook';
        const hookMeta = (m) => (m && typeof m.meta === 'object' && m.meta) || null;
        const sameWebhookIdentity = (() => {
          if (!isWebhookMsg || !prevIsWebhook) return false;
          const a = hookMeta(msg);
          const b = hookMeta(prev);
          if (!a || !b) return false;
          return a.webhook_id === b.webhook_id
            && a.webhook_name === b.webhook_name
            && a.webhook_avatar_id === b.webhook_avatar_id
            && a.webhook_avatar_url === b.webhook_avatar_url;
        })();
        const sameAuthor = isWebhookMsg
          ? sameWebhookIdentity
          : (prev && prev.user_id === msg.user_id && !prevIsWebhook);
        const hasInvoker = !!(msg.command_name || msg._commandName || msg._command);
        const prevHasInvoker = !!(prev && (prev.command_name || prev._commandName || prev._command));
        const grouped = prev && sameAuthor && (new Date(msg.created_at) - new Date(prev.created_at)) < 300000 && !hasInvoker && !prevHasInvoker && !msg.reply;
        const isEditing = editingId === msg.id;
        const mentioned = isMentioned(msg, user, guildMe?.roles?.map(r => r.id));
        const ctx = (e) => !msg._pending && !msg._failed && openMenu(e, { message: msg, channel, guildMe });
        const nameColor = resolveNameColor({ source: msg, guildMe, isDM });

        if (msg.system_type) {
          return (
            <SystemMessage
              key={msg.id}
              msg={msg}
              onContextMenu={ctx}
              onUserClick={onUserClick}
              rowClassName={rowClass(msg, false, false, 'py-0.5')}
            />
          );
        }

        return grouped ? (
          <div key={msg.id} data-message-id={msg.id} onContextMenu={ctx} style={{ marginTop: 'var(--msg-row-gap)' }}
className={rowClass(msg, isEditing, mentioned, 'flex items-center transition-opacity')}>
            <div className="w-8 mr-3 flex-shrink-0 flex justify-center">
              <UserInfo timestamp={msg.created_at} compact />
            </div>
            <div className="min-w-0 flex-1 max-w-[720px]">
              <MemoMessageBody msg={msg} isEditing={isEditing} onEditDone={handleEditDone} onUserClick={onUserClick} onJumpToReply={onJumpToReply} user={user} channel={channel} channels={channels} guildId={guildId} channelPerms={channelPerms} />
            </div>
          </div>
        ) : (
                    <div key={msg.id} data-message-id={msg.id} onContextMenu={ctx} style={{ marginTop: i > 0 ? 'var(--msg-group-gap)' : '0' }}
className={rowClass(msg, isEditing, mentioned, 'flex items-start gap-3')}>

            <UserAvatar username={msg.username} avatarId={msg.avatar_id} avatarUrl={msg.avatar_url} userId={msg.user_id} isWebhook={isWebhookMsg} />
            <div className="min-w-0 flex-1 max-w-[720px]">
              <UserInfo username={msg.username} displayName={msg.display_name} timestamp={msg.created_at} onUsernameClick={isWebhookMsg ? undefined : (e) => onUserClick && onUserClick(msg.user_id, e)} onUsernameContext={isWebhookMsg ? undefined : (e) => openMenu(e, { targetUser: { id: msg.user_id, username: msg.username, display_name: msg.display_name }, guildMe })} nameColor={nameColor} isBot={msg.is_bot} isWebhook={isWebhookMsg} />
              <MemoMessageBody msg={msg} isEditing={isEditing} onEditDone={handleEditDone} onUserClick={onUserClick} onJumpToReply={onJumpToReply} user={user} channel={channel} channels={channels} guildId={guildId} channelPerms={channelPerms} />
            </div>
          </div>
        );
      })}
    </div>
  );
}