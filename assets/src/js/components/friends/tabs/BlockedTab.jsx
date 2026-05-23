import React, { useState } from 'react';
import FriendRow from '../FriendRow';
import ActionBtn from '../ActionBtn';
import { CheckIcon } from '../tabicons';
import BlockUserModal from '../BlockUserModal';
import { useT } from '../../../hooks/useT';

export default function BlockedTab({ blocks, unblock, acting }) {
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
      <div className="flex items-center justify-between pt-4 pb-2 px-0.5">
        <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider">
          {t('friends.blocked_tab.header').replace('{n}', blocks.length)}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="tw-btn-accent rounded-md px-3 py-1 text-[12px]"
        >
          {t('friends.blocked_tab.block_button')}
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[14px] text-white/25 font-medium mt-2">{t('friends.blocked_tab.empty')}</p>
          <p className="text-[12px] text-white/15">{t('friends.blocked_tab.empty_hint')}</p>
        </div>
      ) : (
        blocks.map(b => (
          <FriendRow
            key={b.id}
            avatar={b.user?.avatar_id}
            username={b.user?.username || t('friends.blocked_tab.unknown_user')}
            subtext={t('friends.blocked_tab.subtext')}
            online={false}
            actions={
              <ActionBtn onClick={() => unblock(b.user?.username)} disabled={acting === b.user?.username} title={t('friends.blocked_tab.action_unblock')}>
                <CheckIcon />
              </ActionBtn>
            }
          />
        ))
      )}

      <BlockUserModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}