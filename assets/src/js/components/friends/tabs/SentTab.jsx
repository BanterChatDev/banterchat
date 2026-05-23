import React from 'react';
import FriendRow from '../FriendRow';
import ActionBtn from '../ActionBtn';
import { XIcon } from '../tabicons';
import { useT } from '../../../hooks/useT';

export default function SentTab({ outgoing, cancel, acting }) {
  const t = useT();
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
      {outgoing.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[14px] text-white/25 font-medium mt-2">{t('friends.sent_tab.empty')}</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider pt-4 pb-1 px-0.5">
            {t('friends.sent_tab.header').replace('{n}', outgoing.length)}
          </p>
          {outgoing.map(r => (
            <FriendRow
              key={r.id}
              avatar={r.to.avatar_id}
              username={r.to.username}
              subtext={t('friends.sent_tab.subtext')}
              online={false}
              actions={
                <ActionBtn onClick={() => cancel(r.id)} disabled={acting === r.id} title={t('common.cancel')} danger><XIcon /></ActionBtn>
              }
            />
          ))}
        </>
      )}
    </div>
  );
}