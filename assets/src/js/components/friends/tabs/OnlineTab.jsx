import React from 'react';
import { SearchIcon, FriendIcon } from '../../icons';
import FriendRow from '../FriendRow';
import ActionBtn from '../ActionBtn';
import { MessageIcon, XIcon } from '../tabicons';
import { useT } from '../../../hooks/useT';

export default function OnlineTab({ friends, onlineOnly, search, setSearch, openDM, remove, acting }) {
  const t = useT();
  const visible = friends.filter(f => {
    const matchSearch = !search || f.user.username.toLowerCase().includes(search.toLowerCase());
    if (onlineOnly) return matchSearch && f.user.online;
    return matchSearch;
  });

  return (
    <>
      <div className="px-4 pt-4 pb-0 flex-shrink-0">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('friends.online_tab.search_placeholder')}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg pl-9 pr-4 py-2 text-[13px] text-white/70 placeholder-white/20 focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>
        <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mt-5 mb-1 px-0.5">
          {(onlineOnly ? t('friends.online_tab.header_online') : t('friends.online_tab.header_all')).replace('{n}', visible.length)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <FriendIcon />
            <p className="text-[14px] text-white/25 font-medium mt-2">
              {onlineOnly ? t('friends.online_tab.empty_online') : t('friends.online_tab.empty_all')}
            </p>
            <p className="text-[12px] text-white/15">
              {onlineOnly ? t('friends.online_tab.empty_online_hint') : t('friends.online_tab.empty_all_hint')}
            </p>
          </div>
        ) : visible.map(f => (
          <FriendRow
            key={f.id}
            avatar={f.user.avatar_id}
            username={f.user.username}
            subtext={f.user.online ? t('friends.online_tab.subtext_online') : t('friends.online_tab.subtext_offline')}
            online={f.user.online}
            actions={<>
              <ActionBtn onClick={() => openDM(f.user)} title={t('friends.online_tab.action_message')}><MessageIcon /></ActionBtn>
              <ActionBtn onClick={() => remove(f.id)} disabled={acting === f.id} title={t('friends.online_tab.action_remove')} danger><XIcon /></ActionBtn>
            </>}
          />
        ))}
      </div>
    </>
  );
}