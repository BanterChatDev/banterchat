import React, { useEffect, useState } from 'react';
import GuildSelector from './GuildSelector';
import ChannelLayout from '../channels/ChannelLayout';
import FriendsLayout from '../friends/FriendsLayout';
import UserBar from '../user/UserBar';
import { VoiceProvider, useVoiceCtx } from '../../hooks/voice/VoiceProvider';
import VoiceFloatingPanel from '../voice/VoiceFloatingPanel';
import SettingsModal from '../settings/SettingsModal';
import { useGuilds } from '../../hooks/useGuilds';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { useDMList } from '../../hooks/useDMList';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import { setActiveGuild } from '../../broadcasts';
import { parseChannelPath, channelPath, parseDMPath, dmPath, ROUTES } from '../../routes';
import { invalidateByPrefix } from '../../hooks/useCache';
import { useContextMenu } from '../contextmenu';
import CreateGuildModal from './CreateGuildModal';
import GuildSettingsModal from './GuildSettingsModal';
import { JoinByInviteModal, CreateInviteModal } from './InviteModal';
import BotInviteModal from '../modals/BotInviteModal';
import TransferOwnershipModal from './TransferOwnershipModal';
import Spinner from '../ui/Spinner';

// GuildLayout is the outermost authenticated shell for guild/DM views.
// It renders the vertical GuildSidebar on the left and delegates the
// content area to ChannelLayout. Owns the activeGuildId → broadcast
// filter wire-up and the URL ↔ guild-switch translation.
//
// The guild list is fully self-syncing via useGuilds/useServerList —
// no WS subscription or refresh wiring here. This component's only
// list-related concern is the drop-detection effect below, which
// invalidates per-guild caches and navigates away when the authoritative
// list loses a guild id we were viewing.
export default function GuildLayout({ user, navigate, onLogout, path, setUser }) {
  const { guilds, setGuilds } = useGuilds();
  const { convos, onlineMap } = useDMList();
  const { guildId: pathGuildId, channelId } = parseChannelPath(path);
  const notif = useChannelNotifications();
  const isDMPath = path === '/messages' || path.startsWith('/messages/');
  const { prefs } = useUIPrefs();
  const [showSettings, setShowSettings] = useState(false);

  const sidebarWidth = isDMPath
    ? Math.max(prefs.dmSidebarWidth || 220, 200)
    : prefs.channelListWidth || 240;

  // DM circles in the guild rail (Discord-style): only DMs with unread
  // messages, and only when the user is not currently viewing the DMs
  // view (because then they're already in the DM sidebar and this is
  // redundant clutter). Sorted most-unread-first so the loudest DMs
  // sit closest to the Home icon.
  const dmActivePeerId = isDMPath ? parseDMPath(path || '').peerId : null;
  const dmEntries = React.useMemo(() => {
    return (convos || [])
      .filter(c => c.peer_id !== dmActivePeerId)
      .map(c => ({
        peer_id: c.peer_id,
        peer_username: c.peer_username,
        peer_avatar: c.peer_avatar,
        online: onlineMap[c.peer_id] === true,
        count: notif.unread?.[c.id] || 0,
      }))
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [convos, onlineMap, notif.unread, dmActivePeerId]);
  const isDMActive = isDMPath;
  const [showCreateGuild, setShowCreateGuild] = useState(false);
  const [showJoinGuild, setShowJoinGuild] = useState(false);
  const [settingsGuild, setSettingsGuild] = useState(null);
  const [settingsTab, setSettingsTab] = useState('overview');
  const ctxMenu = useContextMenu();

  const [inviteGuild, setInviteGuild] = useState(null);
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [botInviteClientID, setBotInviteClientID] = useState('');
  const [botInvitePermBits, setBotInvitePermBits] = useState(0n);

  useEffect(() => {
    const onOpenSettings = (e) => {
      setSettingsGuild(e.detail);
      setSettingsTab('overview');
    };
    const onOpenInvites = (e) => {
      setInviteGuild(e.detail);
    };
    const onOpenInviteFlow = (e) => {
      const intent = e.detail || {};
      if (intent.kind === 'guild-invite' && intent.code) {
        setJoinInviteCode(intent.code);
        setShowJoinGuild(true);
      } else if (intent.kind === 'bot-invite' && intent.clientID) {
        let bits = 0n;
        try {
          const u = new URL(intent.url);
          bits = BigInt(u.searchParams.get('permissions') || '0');
        } catch {}
        setBotInvitePermBits(bits);
        setBotInviteClientID(intent.clientID);
      }
    };
    window.addEventListener('openGuildSettings', onOpenSettings);
    window.addEventListener('openGuildInviteModal', onOpenInvites);
    window.addEventListener('openInviteFlow', onOpenInviteFlow);
    return () => {
      window.removeEventListener('openGuildSettings', onOpenSettings);
      window.removeEventListener('openGuildInviteModal', onOpenInvites);
      window.removeEventListener('openInviteFlow', onOpenInviteFlow);
    };
  }, []);

  // Active guild = either the URL's guildId, or null for DM/messages views.
  const activeGuildId = isDMPath ? null : (pathGuildId || null);

  // Tell the broadcast layer which guild we're looking at so channel/role
  // events from other guilds get filtered out. Called on every path change.
  useEffect(() => {
    setActiveGuild(activeGuildId);
    return () => setActiveGuild(null);
  }, [activeGuildId]);

  // /channels (bare) redirects to /messages — the friends / DM landing.
  // Home icon in the guild sidebar also navigates here. Guild-less views
  // render FriendsView (see ChannelLayout render below).
  useEffect(() => {
    if (path === ROUTES.channels) {
      const last = prefs?.last_dm_peer_id;
      if (last && user?.id) {
        navigate(dmPath(user.id, last), true);
        return;
      }
      navigate(ROUTES.messages, true);
    }
  }, [path]);

  const handleSelectGuild = (gid) => {
    navigate(channelPath(gid));
  };

  const handleDMs = () => {
    const last = prefs?.last_dm_peer_id;
    if (last && user?.id) {
      navigate(dmPath(user.id, last));
      return;
    }
    navigate(ROUTES.messages);
  };

  const handleReorderGuilds = (ordered) => {
    setGuilds(ordered);
  };

  // Membership-change callbacks are navigation-only. The guild list
  // self-syncs via useGuilds → useServerList (subscribes to guild_list
  // WS events internally). No refresh/handler wiring needed here.
  const handleGuildCreated = (guild) => {
    if (guild?.id) navigate(channelPath(guild.id));
  };

  const handleGuildJoined = (guildId) => {
    if (guildId) navigate(channelPath(guildId));
  };

  useEffect(() => {
    const onCreate = () => setShowCreateGuild(true);
    const onJoin = () => setShowJoinGuild(true);
    window.addEventListener('openCreateGuild', onCreate);
    window.addEventListener('openJoinGuild', onJoin);
    return () => {
      window.removeEventListener('openCreateGuild', onCreate);
      window.removeEventListener('openJoinGuild', onJoin);
    };
  }, []);

  // When the server drops a guild from our list (leave/ban/delete),
  // we observe the guilds array changing and clean up per-guild caches +
  // navigate away if we're currently viewing the dropped guild. This
  // reacts to the authoritative guildList event instead of a local
  // CustomEvent hop from the modal — same trigger source whether you
  // left, got banned, or the guild was deleted.
  const prevGuildIdsRef = React.useRef(new Set(guilds.map(g => g.id)));
  useEffect(() => {
    const currentIds = new Set(guilds.map(g => g.id));
    const dropped = [];
    prevGuildIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) dropped.push(id);
    });
    prevGuildIdsRef.current = currentIds;
    if (dropped.length === 0) return;
    for (const leftId of dropped) {
      invalidateByPrefix(`channels:${leftId}`);
      invalidateByPrefix(`categories:${leftId}`);
      invalidateByPrefix(`roles:${leftId}`);
      if (activeGuildId === leftId) {
        navigate(ROUTES.messages, true);
      }
    }
  }, [guilds, activeGuildId, navigate]);

  return (
    <div className="h-[100dvh] flex bg-[var(--bg-base)] text-white overflow-hidden select-none">
      <CreateGuildModal
        isOpen={showCreateGuild}
        onClose={() => setShowCreateGuild(false)}
        onCreated={handleGuildCreated}
      />
      <JoinByInviteModal
        isOpen={showJoinGuild}
        onClose={() => { setShowJoinGuild(false); setJoinInviteCode(''); }}
        onJoined={handleGuildJoined}
        initialCode={joinInviteCode}
      />
      <BotInviteModal
        isOpen={!!botInviteClientID}
        onClose={() => { setBotInviteClientID(''); setBotInvitePermBits(0n); }}
        clientID={botInviteClientID}
        permissionsBits={botInvitePermBits}
      />
      <CreateInviteModal
        isOpen={!!inviteGuild}
        onClose={() => setInviteGuild(null)}
        guildId={inviteGuild?.id}
      />
      <TransferOwnershipModal />
      <GuildSettingsModal
        isOpen={!!settingsGuild}
        onClose={() => setSettingsGuild(null)}
        guild={settingsGuild}
        user={user}
        defaultTab={settingsTab}
        onUpdated={(g) => { setSettingsGuild(g); }}
        onDeleted={() => { setSettingsGuild(null); }}
        onLeft={() => { setSettingsGuild(null); }}
      />
      <GuildSelector
        variant="desktop"
        activeGuildId={activeGuildId}
        isDMActive={isDMActive}
        onSelect={handleSelectGuild}
        onDMs={handleDMs}
        onSelectDM={(peerId) => navigate(`/messages/${user.id}/${peerId}`)}
        onReorderGuilds={handleReorderGuilds}
        guildUnread={notif.guildUnread}
        guildMentions={notif.guildMentions}
        dmEntries={dmEntries}
        user={user}
      />
      <VoiceProvider user={user}>
        {isDMPath ? (
          <FriendsLayout
            user={user}
            navigate={navigate}
            onLogout={onLogout}
            setUser={setUser}
            path={path}
          />
        ) : (
          <ChannelLayout
            user={user}
            navigate={navigate}
            onLogout={onLogout}
            path={path}
            setUser={setUser}
            guildId={activeGuildId}
            notif={notif}
          />
        )}
        <GlobalVoicePanel navigate={navigate} />
        <div
          className="hidden lg:block fixed bottom-0 left-0 z-30"
          style={{ width: `calc(72px + ${sidebarWidth}px)` }}
        >
          <UserBar
            user={user}
            onLogout={onLogout}
            navigate={navigate}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>
      </VoiceProvider>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} setUser={setUser} />
    </div>
  );
}

function GlobalVoicePanel({ navigate }) {
  const voice = useVoiceCtx();
  if (!voice?.channelId) return null;
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.endsWith(`/${voice.channelId}`)) return null;
  }
  const onOpen = () => {
    if (!voice.channelGuildId) return;
    navigate(`/channels/${voice.channelGuildId}/${voice.channelId}`);
  };
  return (
    <VoiceFloatingPanel voice={voice} onOpenChannel={onOpen} />
  );
}