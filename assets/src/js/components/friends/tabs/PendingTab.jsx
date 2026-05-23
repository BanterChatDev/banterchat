import React from 'react';
import FriendRow from '../FriendRow';
import ActionBtn from '../ActionBtn';
import { CheckIcon, XIcon } from '../tabicons';
import { useT } from '../../../hooks/useT';

export default function PendingTab({ incoming, accept, decline, acting }) {
  const t = useT();
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
      {incoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[14px] text-white/25 font-medium mt-2">{t('friends.pending_tab.empty')}</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider pt-4 pb-1 px-0.5">
            {t('friends.pending_tab.header').replace('{n}', incoming.length)}
          </p>
          {incoming.map(r => (
            <FriendRow
              key={r.id}
              avatar={r.from.avatar_id}
              username={r.from.username}
              subtext={t('friends.pending_tab.subtext')}
              online={false}
              actions={<>
                <ActionBtn onClick={() => accept(r.id)} disabled={acting === r.id} title={t('friends.pending_tab.action_accept')}><CheckIcon /></ActionBtn>
                <ActionBtn onClick={() => decline(r.id)} disabled={acting === r.id} title={t('friends.pending_tab.action_ignore')} danger><XIcon /></ActionBtn>
              </>}
            />
          ))}
        </>
      )}
    </div>
  );
}