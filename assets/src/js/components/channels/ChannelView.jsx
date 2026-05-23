import React, { useState, useEffect, useCallback, useRef } from 'react';
import MessageList from '../messages/MessageList';
import { useGuildMe } from '../../hooks/useGuildMe';
import MessageInput from '../messages/MessageInput';
import MembersSidebar from '../membersidebar';
import DMUserCard from '../dms/DMUserCard';
import UserProfileModal from '../user/UserProfileModal';
import TypingIndicator from '../typing/TypingIndicator';
import UserAvatar from '../user/UserAvatar';
import { AvatarWithStatus } from '../status';
import { UserIcon, BellIcon, HashIcon } from '../icons';
import ChannelNotifPopover from '../notifications/ChannelNotifPopover';
import Tooltip from '../ui/Tooltip';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import ResizeHandle from '../ui/ResizeHandle';
import Spinner from '../ui/Spinner';
import { useActiveChannel } from '../../hooks/useChannelNotifications';
import { useChatTimeline } from '../../hooks/useChatTimeline';
import { useT } from '../../hooks/useT';
import ThreadHeader from '../threads/ThreadHeader';
import { useSwitchChannel } from '../../hooks/useSwitchChannel';
import { resolveChannelPerms, hasPerm, PERM_MANAGE_CHANNELS, PERM_CREATE_PUBLIC_THREADS, PERM_ATTACH_FILES } from '../../permissions';
import useDragDrop from '../../hooks/useDragDrop';
import { emit } from '../../eventBus';
import { DocumentIcon } from '../icons';

export default function ChannelView({ channelId, channels, categories, user, dm, guildId, thread }) {
  const t = useT();
  useActiveChannel(channelId);
  const { data: guildMe } = useGuildMe(guildId, user?.id);
  const parentChannel = thread ? channels.find(c => c.id === thread.parent_channel_id) : null;
  const channel = thread ? parentChannel : channels.find(c => c.id === channelId);
  const isDM = !!dm;

  if (!window.__channelNames || channels !== window.__channelsSrc) {
    window.__channelNames = {};
    channels.forEach(c => { window.__channelNames[c.id] = c.name; });
    window.__channelsSrc = channels;
  }

  const timeline = useChatTimeline({ channelId, user, guildMe, isDM });
  const {
    messages, loading, loadingMore, loadingNewer,
    viewingHistory, scrollReady,
    containerRef, bottomRef, onContainerScroll,
    sendMessage, jumpToMessage, jumpToPresent,
  } = timeline;

  const { prefs, setPref } = useUIPrefs();
  const [showMembers, setShowMembers] = useState(prefs.showMembers);
  useEffect(() => { setPref('showMembers', showMembers); }, [showMembers]);

  const [membersMobileOpen, setMembersMobileOpen] = useState(false);
  useEffect(() => {
    const handler = () => setMembersMobileOpen(p => !p);
    window.addEventListener('toggleMembersMobile', handler);
    return () => window.removeEventListener('toggleMembersMobile', handler);
  }, []);

  const [profileUserId, setProfileUserId] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const handleUserClick = useCallback((uid, e) => {
    setProfileUserId(uid);
    setProfileAnchor(e ? { x: e.clientX, y: e.clientY } : null);
  }, []);

  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (e.detail?.channelId === channelId) setNotifOpen(true); };
    window.addEventListener('openChannelNotifPopover', handler);
    return () => window.removeEventListener('openChannelNotifPopover', handler);
  }, [channelId]);
  useEffect(() => { setNotifOpen(false); }, [channelId]);

  const switchChannel = useSwitchChannel();
  const threadCanManage = thread && parentChannel
    ? (hasPerm(resolveChannelPerms(guildMe, parentChannel, categories), PERM_MANAGE_CHANNELS) || thread.owner_id === user?.id)
    : false;

  const canDropFiles = isDM || (channel && hasPerm(resolveChannelPerms(guildMe, channel, categories), PERM_ATTACH_FILES));
  const handleDroppedFiles = useCallback((files) => {
    emit('dropFiles', { files, channelId: channel?.id });
  }, [channel?.id]);
  const drag = useDragDrop(handleDroppedFiles, { enabled: !!canDropFiles });

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 relative" {...(canDropFiles ? drag.dragProps : {})}>
        {canDropFiles && drag.dragging && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-6">
            <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-[rgb(var(--accent-rgb)/0.55)] bg-[rgb(var(--bg-base-rgb)/0.85)] backdrop-blur-md" />
            <div className="relative flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] flex items-center justify-center">
                <DocumentIcon className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <div className="text-base font-semibold text-white/90">{t('messages.input_drop_to_attach')}</div>
              <div className="text-[12px] text-white/40">{t('messages.input_drop_hint')}</div>
            </div>
          </div>
        )}
        {thread && (
          <ThreadHeader
            thread={thread}
            canManage={threadCanManage}
            onJumpToParent={() => { if (guildId && thread.parent_channel_id) switchChannel(thread.parent_channel_id, guildId); }}
          />
        )}
        <div className="hidden lg:flex h-12 items-center px-4 border-b border-white/[0.06] flex-shrink-0 bg-[var(--bg-base)]">
          {dm ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarWithStatus online={!!dm._peerOnline} size="xs">
                <UserAvatar username={dm._peerInfo?.peer_username || ''} avatarId={dm._peerInfo?.peer_avatar || ''} size="sm" />
              </AvatarWithStatus>
              <span className="text-sm font-semibold text-white/80 truncate">{dm._peerInfo?.peer_username || t('friends.layout.dm_peer_fallback')}</span>
              <span className="mx-1 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
              <span className={`text-[11px] flex-shrink-0 ${dm._peerOnline ? 'text-emerald-400/80' : 'text-white/35'}`}>
                {dm._peerOnline ? t('friends.online_tab.subtext_online') : t('friends.online_tab.subtext_offline')}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white/15 text-base font-medium leading-none">#</span>
                <span className="text-[13px] font-semibold text-white/80 truncate">{channel ? channel.name : t('friends.blocked_tab.unknown_user')}</span>
              </div>
              {channel && channel.description && (
                <>
                  <span className="mx-2.5 w-px h-3.5 bg-white/[0.08] flex-shrink-0" />
                  <span
                    className="text-[11px] text-white/20 truncate cursor-pointer hover:text-white/30 transition-colors"
                    onClick={() => window.dispatchEvent(new CustomEvent('showChannelDescription', { detail: { name: channel.name, description: channel.description } }))}
                  >{channel.description}</span>
                </>
              )}
              <div className="ml-auto flex items-center gap-2 flex-shrink-0 relative">
                {!thread && !isDM && channel && hasPerm(resolveChannelPerms(guildMe, channel, categories), PERM_CREATE_PUBLIC_THREADS) && (
                  <Tooltip text={t('channels.view.create_thread')}>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('createThreadFromMessage', { detail: { parentChannelId: channel.id, messageId: '' } }))}
                      aria-label={t('channels.view.create_thread')}
                      className="transition-colors p-1 text-white/20 hover:text-white/50"
                    >
                      <HashIcon className="w-4 h-4" />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Notification settings">
                  <button
                    ref={bellRef}
                    onClick={() => setNotifOpen(o => !o)}
                    aria-label="Notification settings"
                    className={`transition-colors p-1 ${notifOpen ? 'text-white/50' : 'text-white/20 hover:text-white/50'}`}
                  >
                    <BellIcon className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip text={t('channels.view.members_title')}>
                  <button
                    onClick={() => {
                      const isLg = window.innerWidth >= 1024;
                      if (isLg) setShowMembers(p => !p);
                      else setMembersMobileOpen(p => !p);
                    }}
                    aria-label={t('channels.view.members_title')}
                    className={`transition-colors p-1 ${showMembers || membersMobileOpen ? 'text-white/50' : 'text-white/20 hover:text-white/50'}`}
                  >
                    <UserIcon className="w-4 h-4" />
                  </button>
                </Tooltip>
                {notifOpen && channel && (
                  <ChannelNotifPopover
                    channelId={channel.id}
                    channelName={channel.name}
                    onClose={() => setNotifOpen(false)}
                    anchorRef={bellRef}
                  />
                )}
              </div>
            </>
          )}
        </div>
        <div
          ref={containerRef}
          onScroll={onContainerScroll}
          style={{ paddingTop: 'var(--msg-container-py)', paddingBottom: 'var(--msg-container-py)' }}
          className="flex-1 overflow-y-auto px-3 sm:px-4 scrollbar-thin"
        >
          <div ref={bottomRef} className={`transition-opacity duration-100 ${scrollReady ? 'opacity-100' : 'opacity-0'}`}>
            {(loading || loadingMore) && (
              <div className="flex justify-center py-2"><Spinner size="md" /></div>
            )}
            <MessageList
              messages={messages}
              channel={channel}
              channelName={channel?.name}
              channels={channels}
              categories={categories}
              guildId={guildId}
              user={user}
              onUserClick={handleUserClick}
              onJumpToReply={jumpToMessage}
              guildMe={guildMe}
            />
            {loadingNewer && (
              <div className="flex justify-center py-2"><Spinner size="md" /></div>
            )}
          </div>
        </div>
        {viewingHistory && (
          <div className="flex justify-center py-1.5 px-4">
            <button onClick={jumpToPresent} className="text-[12px] text-white/50 bg-[rgb(var(--accent-rgb)/0.2)] hover:bg-[rgb(var(--accent-rgb)/0.3)] px-4 py-1.5 rounded-full transition-colors">
              {t('channels.view.viewing_history_prefix')}<span className="text-[var(--accent)] font-medium">{t('channels.view.jump_to_present')}</span>
            </button>
          </div>
        )}
        <TypingIndicator channelId={channelId} userId={user?.id} />
        <MessageInput
          channelName={channel?.name}
          onSend={sendMessage}
          user={user}
          channel={channel}
          channels={channels}
          categories={categories}
          guildId={guildId}
        />
      </div>
      {dm ? (
        <>
          <ResizeHandle currentWidth={prefs.membersSidebarWidth} direction="left" onResize={(w) => setPref('membersSidebarWidth', w)} min={200} max={380} />
          <DMUserCard peerId={dm._peerInfo?.peer_id} width={prefs.membersSidebarWidth} currentUserId={user?.id} />
        </>
      ) : (
        showMembers && (
          <>
            <ResizeHandle currentWidth={prefs.membersSidebarWidth} direction="left" onResize={(w) => setPref('membersSidebarWidth', w)} min={160} max={360} />
            <MembersSidebar
              channelId={channelId}
              guildId={guildId}
              guildMe={guildMe}
              onUserClick={handleUserClick}
              mobileOpen={membersMobileOpen}
              onCloseMobile={() => setMembersMobileOpen(false)}
              width={prefs.membersSidebarWidth}
            />
          </>
        )
      )}
      {profileUserId && <UserProfileModal userId={profileUserId} guildId={guildId} currentUserId={user?.id} onClose={() => { setProfileUserId(null); setProfileAnchor(null); }} anchorPos={profileAnchor} />}
    </div>
  );
}