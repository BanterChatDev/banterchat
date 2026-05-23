import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiListChannels } from '../../api/channels';
import { apiListCategories } from '../../api/categories';
import { useCache, guildCacheKey } from '../../hooks/useCache';
import { usePermEvents } from '../../hooks/usePermEvents';
import { createChannelListHandlers } from '../../broadcasts';
import { canViewChannel } from '../../permissions';
import { useGuildMe } from '../../hooks/useGuildMe';
import { channelPath, ROUTES } from '../../routes';
import { useSwitchChannel } from '../../hooks/useSwitchChannel';
import ChannelList from './ChannelList';
import ChannelView from './ChannelView';
import GuildSelector from '../guilds/GuildSelector';
import { PlusIcon } from '../icons';
import VoiceChannel from '../voice/VoiceChannel';

import { useVoiceCtx, useVoicePeers, useVoiceSpeakingMap } from '../../hooks/voice/VoiceProvider';
import CreateChannelModal from './CreateChannelModal';
import EditChannelModal from './EditChannelModal';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import CreateThreadModal from '../threads/CreateThreadModal';
import { useThread } from '../../hooks/useThreads';
import SettingsModal from '../settings/SettingsModal';
import { MenuIcon, HashIcon, CloseIcon, VolumeIcon } from '../icons';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import ResizeHandle from '../ui/ResizeHandle';
import { on } from '../../eventBus';
import Modal, { ModalHeader } from '../ui/Modal';
import UserBar from '../user/UserBar';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';

export default function ChannelLayout({ user, navigate, onLogout, path, setUser, guildId, notif }) {
  const t = useT();
  const switchChannel = useSwitchChannel();
  const { data: guildMe } = useGuildMe(guildId, user?.id);
  const { data: channels, loading: chLoading, setData: setChannels, refresh: refreshChannels } = useCache(
    guildId ? guildCacheKey('channels', guildId) : null,
    () => apiListChannels(guildId).then(r => Array.isArray(r) ? r : []),
    { initial: [] }
  );
  const { data: categories, loading: catLoading, setData: setCategories, refresh: refreshCategories } = useCache(
    guildId ? guildCacheKey('categories', guildId) : null,
    () => apiListCategories(guildId).then(r => Array.isArray(r) ? r : []),
    { initial: [] }
  );

  usePermEvents({
    guildMemberRoleUpdate: (payload) => {
      if (!guildId || payload?.guild_id !== guildId) return;
      if (payload?.user_id !== user?.id) return;
      refreshChannels();
      refreshCategories();
    },
  });
  const loading = chLoading || catLoading;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { prefs, setPref } = useUIPrefs();
  const dmSidebarOpen = prefs.dmSidebarOpen;
  const setDmSidebarOpen = (v) => {
    const val = typeof v === 'function' ? v(prefs.dmSidebarOpen) : v;
    setPref('dmSidebarOpen', val);
  };
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [editChannel, setEditChannel] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [descModal, setDescModal] = useState(null);
  const [threadModalParent, setThreadModalParent] = useState(null);
  const [threadModalParentMsg, setThreadModalParentMsg] = useState('');

  // New URL shape: /channels/:guildId/:channelId  →  channelId is index [3].
  const activeId = path.startsWith('/channels/') ? (path.split('/')[3] || null) : null;
  const { unread, mentions } = notif;
  const voice = useVoiceCtx();
  const voicePeers = useVoicePeers();
  const voiceSpeakingByUserId = useVoiceSpeakingMap();

  useEffect(() => {
    if (loading || activeId || !guildId || channels.length === 0) return;
    if (channels[0].guild_id !== guildId) return;
    const last = prefs.lastChannelByGuild?.[guildId];
    const target = channels.find(c => c.id === last) ? last : channels[0].id;
    switchChannel(target, guildId, { replace: true });
  }, [loading, activeId, channels, guildId, switchChannel]);

  useEffect(() => {
    if (!activeId || !guildId) return;
    setPref('lastChannelByGuild', (prev) => {
      const curr = prev || {};
      if (curr[guildId] === activeId) return curr;
      return { ...curr, [guildId]: activeId };
    });
  }, [activeId, guildId, setPref]);

  useEffect(() => {
    const onEditChannel = (e) => { setEditChannel(e.detail); };
    const onEditCategory = (e) => { setEditCategory(e.detail); };
    const onShowDesc = (e) => { setDescModal(e.detail); };
    const onCreateThreadFromMessage = (e) => {
      const { parentChannelId, messageId } = e.detail || {};
      if (!parentChannelId) return;
      setThreadModalParent(parentChannelId);
      setThreadModalParentMsg(messageId || '');
    };
    window.addEventListener('editChannel', onEditChannel);
    window.addEventListener('editCategory', onEditCategory);
    window.addEventListener('showChannelDescription', onShowDesc);
    window.addEventListener('createThreadFromMessage', onCreateThreadFromMessage);
    return () => {
      window.removeEventListener('editChannel', onEditChannel);
      window.removeEventListener('editCategory', onEditCategory);
      window.removeEventListener('showChannelDescription', onShowDesc);
      window.removeEventListener('createThreadFromMessage', onCreateThreadFromMessage);
    };
  }, []);
  usePermEvents(createChannelListHandlers({ setChannels, setCategories, navigate }));
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      <CreateChannelModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateChannelCategoryId(''); }}
        onCreated={(ch) => { if (guildId) switchChannel(ch.id, guildId); }}
        categoryId={createChannelCategoryId}
        guildId={guildId}
      />
      <EditChannelModal
        isOpen={!!editChannel}
        onClose={() => setEditChannel(null)}
        channel={editChannel}
        categories={categories}
        user={user}
      />
      <CreateCategoryModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        guildId={guildId}
      />
      <EditCategoryModal
        isOpen={!!editCategory}
        onClose={() => setEditCategory(null)}
        category={editCategory}
      />
    <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} setUser={setUser} />
      <Modal isOpen={!!descModal} onClose={() => setDescModal(null)} size="sm">
        {descModal && (
          <>
            <ModalHeader icon={<span className="text-base">#</span>} title={descModal.name} subtitle={t('channels.layout.description_modal_subtitle')} />
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap break-words">{descModal.description}</p>
          </>
        )}
      </Modal>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        style={{ width: 'var(--channel-list-w)', ['--channel-list-w']: `${prefs.channelListWidth}px` }}
        className={`
          flex flex-col flex-shrink-0 border-r border-white/[0.04] bg-[var(--bg-secondary)]
          fixed inset-y-0 left-0 z-40 w-[calc(56px+16rem)] transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:static lg:z-auto lg:transform-none lg:transition-none lg:w-[var(--channel-list-w)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-row flex-1 min-h-0">
          <GuildSelector
            variant="mobile"
            activeGuildId={guildId}
            isDMActive={!guildId}
            onSelect={(id) => { navigate(channelPath(id)); setSidebarOpen(false); }}
            onDMs={() => { navigate(ROUTES.messages); setSidebarOpen(false); }}
            guildUnread={notif.guildUnread}
            guildMentions={notif.guildMentions}
            user={user}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 min-h-0 overflow-hidden lg:pb-[52px]">
              <ChannelList
                channels={channels}
                categories={categories}
                activeId={activeId}
                unread={unread}
                mentions={mentions}
                onSelect={(id) => { if (guildId) switchChannel(id, guildId); setSidebarOpen(false); }}
                user={user}
                setChannels={setChannels}
                setCategories={setCategories}
                onShowCreate={(categoryId) => { setCreateChannelCategoryId(categoryId || ''); setShowCreate(true); }}
                onShowCreateCategory={() => setShowCreateCategory(true)}
                onCloseMobile={() => setSidebarOpen(false)}
                voicePeers={voicePeers}
                voiceSpeakingByUserId={voiceSpeakingByUserId}
                guildId={guildId}
                onCreateThread={(parentId) => { setThreadModalParent(parentId); setThreadModalParentMsg(''); }}
              />
            </div>
          </div>
        </div>
        <div className="lg:hidden">
          <UserBar user={user} onLogout={onLogout} navigate={navigate} onOpenSettings={() => setShowSettings(true)} />
        </div>
      </div>
      <ResizeHandle currentWidth={prefs.channelListWidth} onResize={(w) => setPref('channelListWidth', w)} min={160} max={360} className="hidden lg:flex" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 flex items-center px-4 border-b border-white/[0.06] flex-shrink-0 bg-[var(--bg-base)] lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="mr-3 text-white/40 hover:text-white/70 transition-colors">
            <MenuIcon className="w-5 h-5" />
          </button>
          {channels.find(c => c.id === activeId)?.type === 'voice' ? (
            <VolumeIcon className="w-4 h-4 text-white/20 mr-1" />
          ) : (
            <HashIcon className="w-4 h-4 text-white/20 mr-1" />
          )}
          <span className="text-[13px] font-semibold text-white/80 truncate">
            {channels.find(c => c.id === activeId)?.name || t('channels.layout.header_fallback')}
          </span>
          {(() => { const ch = channels.find(c => c.id === activeId); return ch && ch.description ? (
            <>
              <span className="mx-2 w-px h-3.5 bg-white/[0.08] flex-shrink-0" />
              <span
                className="text-[11px] text-white/20 truncate min-w-0 cursor-pointer hover:text-white/30 transition-colors"
                onClick={() => window.dispatchEvent(new CustomEvent('showChannelDescription', { detail: { name: ch.name, description: ch.description } }))}
              >{ch.description}</span>
            </>
          ) : null; })()}
          <button onClick={() => window.dispatchEvent(new CustomEvent('toggleMembersMobile'))} className="ml-auto text-white/20 hover:text-white/50 transition-colors p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
        </div>
        <ActiveChannelView activeId={activeId} channels={channels} categories={categories} guildMe={guildMe} user={user} guildId={guildId} voice={voice} switchChannel={switchChannel} t={t} />
      </div>
      <CreateThreadModal
        isOpen={!!threadModalParent}
        parentChannelId={threadModalParent || ''}
        parentMessageId={threadModalParentMsg}
        onClose={() => { setThreadModalParent(null); setThreadModalParentMsg(''); }}
        onCreated={(t) => { if (t?.id && guildId) switchChannel(t.id, guildId); }}
      />
    </div>
  );
}

function ActiveChannelView({ activeId, channels, categories, guildMe, user, guildId, voice, switchChannel, t }) {
  const ch = activeId ? channels.find(c => c.id === activeId) : null;
  const thread = useThread(ch ? null : activeId);

  if (ch) {
    if (!canViewChannel(guildMe, ch, categories)) return <EmptyState reason="invalid" activeId={activeId} channels={channels} guildId={guildId} switchChannel={switchChannel} t={t} />;
    if (ch.type === 'voice') return <VoiceChannel channelId={activeId} channel={ch} user={user} voice={voice} key={activeId} />;
    return <ChannelView channelId={activeId} channels={channels} categories={categories} user={user} guildId={guildId} key={activeId} />;
  }

  if (thread) {
    return <ChannelView channelId={activeId} channels={channels} categories={categories} user={user} guildId={guildId} thread={thread} key={activeId} />;
  }

  return <EmptyState reason={activeId ? 'loading' : 'select'} activeId={activeId} channels={channels} guildId={guildId} switchChannel={switchChannel} t={t} />;
}

function EmptyState({ reason, activeId, channels, guildId, switchChannel, t }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/20 text-sm">{reason === 'select' ? t('channels.layout.empty_select') : t('channels.layout.empty_invalid')}</p>
        {activeId && channels.length > 0 && reason !== 'loading' && (
          <button onClick={() => { if (guildId) switchChannel(channels[0].id, guildId); }} className="mt-2 text-xs text-white/30 hover:text-white/50 transition-colors">
            {t('channels.layout.go_to_template').replace('{name}', channels[0].name)}
          </button>
        )}
      </div>
    </div>
  );
}