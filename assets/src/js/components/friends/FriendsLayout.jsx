import React, { useState, useEffect, useRef } from 'react';
import DMSidebar from '../dms/DMSidebar';
import FriendsView from './FriendView';
import DMView from '../dms/DMView';
import UserBar from '../user/UserBar';
import SettingsModal from '../settings/SettingsModal';
import ResizeHandle from '../ui/ResizeHandle';
import { useDMList } from '../../hooks/useDMList';
import { useFriends } from '../../hooks/useFriends';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { apiGetOrCreateDM } from '../../api/dms';
import { parseDMPath, dmPath, channelPath, ROUTES } from '../../routes';
import { CloseIcon, MenuIcon } from '../icons';
import GuildSelector from '../guilds/GuildSelector';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function FriendsLayout({ user, navigate, onLogout, setUser, path }) {
  const t = useT();
  const { convos, onlineMap } = useDMList();
  const { pendingCount } = useFriends();
  const { prefs, setPref } = useUIPrefs();
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { peerId } = parseDMPath(path || '');
  const [dmConvInfo, setDmConvInfo] = useState(null);
  const [dmOpenError, setDmOpenError] = useState(null);
  const dmCacheRef = useRef({});
  useEffect(() => {
    if (peerId && peerId !== prefs?.last_dm_peer_id) {
      setPref('last_dm_peer_id', peerId);
    }
  }, [peerId]);
  useEffect(() => {
    if (!peerId) { setDmConvInfo(null); setDmOpenError(null); return; }
    const cached = dmCacheRef.current[peerId];
    if (cached) { setDmConvInfo(cached); setDmOpenError(null); return; }
    const existing = convos.find(c => c.peer_id === peerId);
    if (existing) {
      dmCacheRef.current[peerId] = existing;
      setDmConvInfo(existing);
      setDmOpenError(null);
      return;
    }
    setDmOpenError(null);
    apiGetOrCreateDM(peerId).then(info => {
      dmCacheRef.current[peerId] = info;
      setDmConvInfo(info);
    }).catch(err => {
      setDmConvInfo(null);
      setDmOpenError(err?.message || t('friends.layout.fail_open_conversation'));
    });
  }, [peerId, convos]);

  const notif = useChannelNotifications();

  const dmEntries = React.useMemo(() => {
    return (convos || [])
      .filter(c => c.peer_id !== peerId)
      .map(c => ({
        peer_id: c.peer_id,
        peer_username: c.peer_username,
        peer_avatar: c.peer_avatar,
        online: onlineMap[c.peer_id] === true,
        count: notif.unread?.[c.id] || 0,
      }))
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [convos, onlineMap, notif.unread, peerId]);

  const sidebarWidth = Math.max(prefs.dmSidebarWidth || 220, 200);

  const sharedSidebarProps = {
    convos, onlineMap,
    unread: notif.unread, mentions: notif.mentions,
    activeDmPeerId: peerId,
    friendsActive: !peerId,
    pendingCount,
    onSelect: (p) => navigate(dmPath(user.id, p)),
  };

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} setUser={setUser} />

      <div className="hidden lg:flex flex-col flex-shrink-0" style={{ width: sidebarWidth }}>
        <div className="flex flex-1 min-h-0 pb-[52px]">
          <DMSidebar
            {...sharedSidebarProps}
            onFriendsClick={() => navigate(ROUTES.messages)}
            width={sidebarWidth}
          />
          <ResizeHandle currentWidth={sidebarWidth} onResize={(w) => setPref('dmSidebarWidth', w)} min={200} max={320} />
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-40 flex flex-col transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-row flex-1 min-h-0">
          <GuildSelector
            variant="mobile"
            activeGuildId={null}
            isDMActive={!peerId}
            onSelect={(id) => { navigate(channelPath(id)); setSidebarOpen(false); }}
            onDMs={() => { navigate(ROUTES.messages); setSidebarOpen(false); }}
            onSelectDM={(p) => { navigate(dmPath(user.id, p)); setSidebarOpen(false); }}
            guildUnread={notif.guildUnread}
            guildMentions={notif.guildMentions}
            dmEntries={dmEntries}
            user={user}
          />
          <div className="w-64 border-r border-white/[0.04] flex flex-col bg-[var(--bg-secondary)]">
            <div className="h-12 flex items-center px-2 border-b border-white/[0.04] flex-shrink-0">
              <span className="flex-1 text-[13px] font-semibold text-white/60 px-2">{t('friends.layout.sidebar_header')}</span>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-white/30 hover:text-white/60 transition-colors">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DMSidebar
                {...sharedSidebarProps}
                onFriendsClick={() => { navigate(ROUTES.messages); setSidebarOpen(false); }}
                onSelect={(p) => { navigate(dmPath(user.id, p)); setSidebarOpen(false); }}
                fullWidth
              />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)]">
          <UserBar user={user} onLogout={onLogout} navigate={navigate} onOpenSettings={() => setShowSettings(true)} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {peerId && (dmConvInfo || dmOpenError) && (
          <div className="h-12 flex items-center px-4 border-b border-white/[0.06] flex-shrink-0 bg-[var(--bg-base)] lg:hidden">
            <Tooltip text={t('friends.layout.open_menu_title')}>
              <button onClick={() => setSidebarOpen(true)} aria-label={t('friends.layout.open_menu_title')} className="mr-3 text-white/40 hover:text-white/70 transition-colors">
                <MenuIcon className="w-5 h-5" />
              </button>
            </Tooltip>
            <span className="text-[13px] font-semibold text-white/80 truncate">@ {dmConvInfo?.peer_username || t('friends.layout.dm_peer_fallback')}</span>
          </div>
        )}
        {peerId && dmConvInfo && dmConvInfo.peer_id === peerId ? (
          <DMView peerId={peerId} peerInfo={dmConvInfo} user={user} convId={dmConvInfo.id} peerOnline={onlineMap[peerId] === true} />
        ) : peerId && dmOpenError ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-[13px] text-white/40 text-center">{dmOpenError}</p>
          </div>
        ) : peerId ? (
          <div className="flex-1" />
        ) : (
          <FriendsView navigate={navigate} user={user} onMobileMenu={() => setSidebarOpen(true)} />
        )}
      </div>
    </div>
  );
}