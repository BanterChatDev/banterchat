import React, { useMemo } from 'react';
import ChannelView from '../channels/ChannelView';
import { t as tBare } from '../../lang/apply';

const DM_PERMS = (1 << 0) | (1 << 6) | (1 << 7) | (1 << 9);

export default function DMView({ peerId, peerInfo, user, convId, peerOnline }) {
  const dmChannel = useMemo(() => ({
    id: convId,
    name: peerInfo?.peer_username || tBare('friends.layout.dm_peer_fallback'),
    description: '',
    permission_overrides: [],
    _dm: true,
    _peerInfo: peerInfo,
    _peerOnline: peerOnline,
  }), [convId, peerInfo, peerOnline]);

  const dmUser = useMemo(() => ({
    ...user,
    permissions: DM_PERMS,
  }), [user]);

  const channels = useMemo(() => [dmChannel], [dmChannel]);

  return (
    <ChannelView
      channelId={convId}
      channels={channels}
      categories={[]}
      user={dmUser}
      dm={dmChannel}
    />
  );
}