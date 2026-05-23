import React from 'react';
import { useContextMenu } from '../contextmenu';
import { PERM_MANAGE_CHANNELS, canViewChannel } from '../../permissions';
import ThreadList from '../threads/ThreadList';
import { useChannelDrag } from '../../hooks/useChannelDrag';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import { useGuildMe } from '../../hooks/useGuildMe';
import ChannelBadge from './ChannelBadge';
import ChannelUnreadBar from './ChannelUnreadBar';
import GuildSidebarHeader from '../guilds/GuildSidebarHeader';
import { CloseIcon, PlusIcon, ChevronIcon, VolumeIcon } from '../icons';
import VoiceUserStack from '../voice/VoiceUserStack';
import UserProfileModal from '../user/UserProfileModal';
import Tooltip from '../ui/Tooltip';
import { useT } from '../../hooks/useT';
import { t as tBare } from '../../lang/apply';

function ChannelItem({ ch, activeId, canManage, onSelect, openMenu, onDragStart, onDragOver, onDrop, isDropTarget, unread, mentionCount, voicePeers, voiceSpeakingByUserId, can, onVoiceUserClick }) {
  const isActive = activeId === ch.id;
  const hasUnread = !isActive && unread > 0;
  const hasMention = !isActive && mentionCount > 0;
  const touchRef = React.useRef(null);
  const suppressClick = React.useRef(false);
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchRef.current = setTimeout(() => {
      touchRef.current = null;
      suppressClick.current = true;
      const synthetic = { preventDefault: () => {}, stopPropagation: () => {}, clientX: touch.clientX, clientY: touch.clientY };
      openMenu(synthetic, { channel: ch, can });
    }, 500);
  };
  const handleTouchEnd = () => {
    if (touchRef.current) { clearTimeout(touchRef.current); touchRef.current = null; }
  };
  const handleTouchMove = () => {
    if (touchRef.current) { clearTimeout(touchRef.current); touchRef.current = null; }
  };
  return (
    <>
    <button
      draggable={canManage}
      onDragStart={canManage ? (e) => onDragStart(e, ch) : undefined}
      onDragOver={canManage ? (e) => onDragOver(e, ch) : undefined}
      onDrop={canManage ? (e) => onDrop(e, ch) : undefined}
      onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onSelect(ch.id); }}
      onContextMenu={(e) => openMenu(e, { channel: ch, can })}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`group/ch w-full text-left px-2.5 py-2 rounded-md text-sm transition-all duration-150 flex items-center gap-2 relative ${
        isActive
          ? 'bg-white/[0.1] text-white font-medium shadow-sm shadow-black/10'
          : hasUnread
            ? 'text-white/90 font-semibold hover:bg-white/[0.06]'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.06]'
      } ${isDropTarget ? 'bg-white/[0.06]' : ''}`}
    >
      <ChannelUnreadBar visible={hasUnread} />
    {ch.type === 'voice' ? (
      <VolumeIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white/40' : hasUnread ? 'text-white/30' : 'text-white/15 group-hover/ch:text-white/25'}`} />
    ) : (
        <span className={`text-[15px] font-medium leading-none ${isActive ? 'text-white/40' : hasUnread ? 'text-white/30' : 'text-white/15 group-hover/ch:text-white/25'}`}>#</span>
      )}
      <span className="truncate">{ch.name}</span>
      <ChannelBadge count={hasMention ? mentionCount : 0} />
    </button>
    <VoiceUserStack peers={voicePeers} speakingByUserId={voiceSpeakingByUserId} onUserClick={onVoiceUserClick} />
    </>
  );
}

function CategoryHeader({ cat, canManage, isCollapsed, onToggle, openMenu, onShowCreate, onDragStart, onHeaderDragOver, onDrop, isDropTarget, can }) {
  const t = useT();
  return (
    <div
      draggable={canManage}
      onDragStart={canManage ? (e) => onDragStart(e, cat) : undefined}
      onDragOver={canManage ? (e) => { e.preventDefault(); onHeaderDragOver(e, cat); } : undefined}
      onDrop={canManage ? (e) => onDrop(e, cat) : undefined}
      className={`flex items-center justify-between px-2 py-1.5 mb-0.5 mt-1 group cursor-pointer rounded-md transition-colors duration-150 hover:bg-white/[0.03] ${isDropTarget ? 'bg-white/[0.06]' : ''}`}
      onClick={onToggle}
      onContextMenu={(e) => openMenu(e, { category: cat, can })}
    >
      <div className="flex items-center gap-1 min-w-0">
        <ChevronIcon className={`w-3 h-3 text-white/20 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`} />
        <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.06em] truncate">{cat.name}</span>
      </div>
      {canManage && (
        <Tooltip text={t('channels.list.create_channel_in_category_title')}>
          <button onClick={(e) => { e.stopPropagation(); onShowCreate(cat.id); }} aria-label={t('channels.list.create_channel_in_category_title')} className="w-[18px] h-[18px] flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all opacity-0 group-hover:opacity-100">
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export default function ChannelList({ channels, categories, activeId, unread, mentions, onSelect, user, setChannels, setCategories, onCloseMobile, onShowCreate, onShowCreateCategory, voicePeers, voiceSpeakingByUserId, guildId, onCreateThread }) {
  const t = useT();
  const { prefs, setPref } = useUIPrefs();
  const collapsed = prefs.collapsedCategories || {};
  const { openMenu } = useContextMenu();
  const { data: guildMe, can } = useGuildMe(guildId, user?.id);
  const canManage = can(PERM_MANAGE_CHANNELS);

  const {
    dropTarget,
    onChannelDragStart, onChannelDragOver, onChannelDrop,
    onCategoryDragStart, onCategoryHeaderDragOver, onCategoryBodyDragOver, onCategoryDrop,
    onUncategorizedDragOver, onUncategorizedDrop, onDragEnd,
  } = useChannelDrag({ channels, categories, setChannels, setCategories, guildId });

  const visible = channels.filter(ch => canViewChannel(guildMe, ch, categories));
const visibleCatIds = new Set(visible.map(ch => ch.category_id).filter(Boolean));
  const uncategorized = visible.filter(ch => !ch.category_id);
  const catChannels = (catId) => visible.filter(ch => ch.category_id === catId);

  const toggleCollapse = (catId) => {
    setPref('collapsedCategories', { ...collapsed, [catId]: !collapsed[catId] });
  };

  const handleChannelClick = (id) => {
    onSelect(id);
    if (onCloseMobile) onCloseMobile();
  };

  const [profileUserId, setProfileUserId] = React.useState(null);
  const [profileAnchor, setProfileAnchor] = React.useState(null);
  const handleVoiceUserClick = React.useCallback((uid, e) => {
    setProfileUserId(uid);
    setProfileAnchor(e ? { x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleWhitespaceContext = (e) => {
    if (!canManage) return;
    e.preventDefault();
    openMenu(e, {
      channelListWhitespace: true,
      onCreateChannel: () => onShowCreate(),
      onCreateCategory: () => onShowCreateCategory(),
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]" onDragEnd={onDragEnd} onContextMenu={handleWhitespaceContext}>
      <GuildSidebarHeader
        guildId={guildId}
        user={user}
        onCloseMobile={onCloseMobile}
      />

      <div className="flex-1 overflow-y-auto px-2 pt-2">
        {(uncategorized.length > 0 || canManage) && (
        <div
          className={`mb-2 rounded transition-colors duration-150 ${dropTarget?.type === 'uncategorized' ? 'bg-white/[0.04]' : ''}`}
          onDragOver={canManage ? onUncategorizedDragOver : undefined}
          onDrop={canManage ? onUncategorizedDrop : undefined}
        >
          <div className="space-y-px">
            {uncategorized.map(ch => (
              <React.Fragment key={ch.id}>
                <ChannelItem ch={ch} activeId={activeId} canManage={canManage} onSelect={handleChannelClick} openMenu={openMenu} can={can}
                  onDragStart={onChannelDragStart} onDragOver={onChannelDragOver} onDrop={onChannelDrop}
                  isDropTarget={dropTarget?.type === 'channel' && dropTarget?.id === ch.id}
                  unread={unread?.[ch.id] || 0} mentionCount={mentions?.[ch.id] || 0}
                  voicePeers={ch.type === 'voice' ? (voicePeers || {})[ch.id] : undefined}
                  voiceSpeakingByUserId={voiceSpeakingByUserId} onVoiceUserClick={handleVoiceUserClick} />
                {ch.type === 'text' && (ch.has_threads || ch.has_archived_threads) && (
                  <ThreadList parentChannelId={ch.id} activeId={activeId} onSelect={handleChannelClick} can={can} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        )}

        {(categories || []).filter(cat => visibleCatIds.has(cat.id) || canManage).map(cat => {
          const chans = catChannels(cat.id);
          const isCollapsed = collapsed[cat.id];
          return (
            <div key={cat.id} className="mb-2">
              <CategoryHeader cat={cat} canManage={canManage} isCollapsed={isCollapsed} can={can}
                onToggle={() => toggleCollapse(cat.id)} openMenu={openMenu} onShowCreate={onShowCreate}
                onDragStart={onCategoryDragStart} onHeaderDragOver={onCategoryHeaderDragOver} onDrop={onCategoryDrop}
                isDropTarget={(dropTarget?.type === 'category' || dropTarget?.type === 'category-zone') && dropTarget?.id === cat.id} />
              {!isCollapsed && (
                <div
                  className="space-y-px"
                  onDragOver={canManage ? (e) => onCategoryBodyDragOver(e, cat) : undefined}
                  onDrop={canManage ? (e) => onCategoryDrop(e, cat) : undefined}
                >
                  {chans.map(ch => (
                    <React.Fragment key={ch.id}>
                      <ChannelItem ch={ch} activeId={activeId} canManage={canManage} onSelect={handleChannelClick} openMenu={openMenu} can={can}
                        onDragStart={onChannelDragStart} onDragOver={onChannelDragOver} onDrop={onChannelDrop}
                        isDropTarget={dropTarget?.type === 'channel' && dropTarget?.id === ch.id}
                        unread={unread?.[ch.id] || 0} mentionCount={mentions?.[ch.id] || 0}
                        voicePeers={ch.type === 'voice' ? (voicePeers || {})[ch.id] : undefined}
                        voiceSpeakingByUserId={voiceSpeakingByUserId} onVoiceUserClick={handleVoiceUserClick} />
                      {ch.type === 'text' && (ch.has_threads || ch.has_archived_threads) && (
                        <ThreadList parentChannelId={ch.id} activeId={activeId} onSelect={handleChannelClick} can={can} />
                      )}
                    </React.Fragment>
                  ))}
                {chans.length === 0 && (
                    <p className="text-xs text-white/25 px-2 py-1 italic">{t('channels.list.no_channels')}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        </div>

      {profileUserId && <UserProfileModal userId={profileUserId} guildId={guildId} currentUserId={user?.id} onClose={() => { setProfileUserId(null); setProfileAnchor(null); }} anchorPos={profileAnchor} />}
    </div>
  );
}