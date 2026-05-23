import React, { useState } from 'react';
import { apiAcceptFriend, apiDeclineFriend } from '../../api/friends';
import { useFriends } from '../../hooks/useFriends';
import { useBlocks } from '../../hooks/useBlocks';
import { MenuIcon, FriendIcon } from '../icons';
import Spinner from '../ui/Spinner';
import AddFriendModal from './AddFriendModal';
import OnlineTab from './tabs/OnlineTab';
import PendingTab from './tabs/PendingTab';
import SentTab from './tabs/SentTab';
import { dmPath } from '../../routes';
import BlockedTab from './tabs/BlockedTab';
import { useT } from '../../hooks/useT';

export default function FriendsView({ navigate, user, onMobileMenu }) {
  const t = useT();
  const { data } = useFriends();
  const loading = false;
  const TABS = [
    { id: 'online', label: t('friends.view.tab_online') },
    { id: 'all',    label: t('friends.view.tab_all') },
    { id: 'pending', label: t('friends.view.tab_pending') },
    { id: 'sent',   label: t('friends.view.tab_sent') },
    { id: 'blocked', label: t('friends.view.tab_blocked') },
  ];
  const [addOpen, setAddOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const [activeTab, setActiveTab] = useState('online');
  const [search, setSearch] = useState('');
  const { blocks, unblock: unblockUser } = useBlocks();

  const accept = async (id) => {
    setActing(id);
    try { await apiAcceptFriend(id); } catch {} finally { setActing(null); }
  };
  const declineOrRemove = async (id) => {
    setActing(id);
    try { await apiDeclineFriend(id); } catch {} finally { setActing(null); }
  };
  const unblock = async (username) => {
    setActing(username);
    try { await unblockUser(username); } catch {} finally { setActing(null); }
  };
  const openDM = (friendUser) => {
    if (navigate && user?.id && friendUser?.id) {
      navigate(dmPath(user.id, friendUser.id));
    }
  };

  const pendingTotal = data.incoming.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)]">
      <div className="h-12 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 border-b border-white/[0.06] flex-shrink-0">
        {onMobileMenu && (
          <button onClick={onMobileMenu} className="lg:hidden text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
            <MenuIcon className="w-5 h-5" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/[0.06] text-white/40 flex-shrink-0">
          <FriendIcon />
          <span className="text-[14px] font-semibold text-white/80">{t('friends.view.header')}</span>
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto scrollbar-thin">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`relative px-3 py-1.5 rounded-md text-[13px] font-medium transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
              {tab.id === 'pending' && pendingTotal > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                  {pendingTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="tw-btn-accent rounded-md px-3 sm:px-4 py-1.5 text-[12px] sm:text-[13px] flex-shrink-0"
        >
          {t('friends.view.add_button')}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : (
        <>
          {(activeTab === 'online' || activeTab === 'all') && (
            <OnlineTab
              friends={data.friends}
              onlineOnly={activeTab === 'online'}
              search={search}
              setSearch={setSearch}
              openDM={openDM}
              remove={declineOrRemove}
              acting={acting}
            />
          )}
          {activeTab === 'pending' && (
            <PendingTab incoming={data.incoming} accept={accept} decline={declineOrRemove} acting={acting} />
          )}
          {activeTab === 'sent' && (
            <SentTab outgoing={data.outgoing} cancel={declineOrRemove} acting={acting} />
          )}
          {activeTab === 'blocked' && (
            <BlockedTab blocks={blocks} unblock={unblock} acting={acting} />
          )}
        </>
      )}

      <AddFriendModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}