import { useCallback, useRef } from 'react';
import { useChannelNotifications } from './useChannelNotifications';
import { channelPath } from '../routes';
import { apiGetChannel } from '../api/channels';

// useSwitchChannel returns a function switchChannel(channelId [, guildId])
// that every component uses to navigate into a channel. Centralizing
// this fixes two problems:
//
// 1. Callers no longer need to know the channel's guild to navigate to
//    it. Clicks on <#channelId> mention tokens, search results, jump
//    buttons, etc. all just pass the channel id.
// 2. The URL shape is always /channels/:guildId/:channelId — pushing a
//    bare /channels/:channelId (as the old MentionText did) made
//    parseChannelPath read the channel id as a guild id, which is what
//    caused the "clicking # link glitches everything" bug.
//
// Guild resolution order:
//   a. explicit `guildId` arg (cheapest; caller already knows)
//   b. UnreadProvider.chanToGuild map (populated live from every
//      incoming channel_message and from /api/reads on boot)
//   c. GET /api/channels/:id (fallback — one network call; result is
//      cached in an in-memory ref so subsequent clicks on the same
//      channel skip it)
//
// Navigation uses raw history.pushState + a synthetic popstate event
// rather than useRouter(). useRouter() creates a NEW local path state
// per call — calling it from a hook produces a detached router that
// updates its own state but not the one App.jsx actually renders from.
// That caused the "channel clicks do nothing" bug: URL bar changed but
// the app stayed on the old page because App.jsx's router never saw it.
// pushState + popstate dispatch routes through the real router's
// existing listener, matching the pattern already used in
// UserProfileModal.jsx, UserActions.jsx, and InviteEmbed.jsx.
//
// DMs are not supported here — they use /messages/:userId/:peerId,
// not /channels/:guildId/:channelId. If the resolved guild_id is empty
// (the channel is a DM), the helper no-ops. Callers that need DM
// navigation already have dedicated helpers in routes.js.
function pushRoute(url, replace) {
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useSwitchChannel() {
  const { chanToGuild } = useChannelNotifications();
  const resolveCacheRef = useRef({});

  return useCallback(async (channelId, guildId, opts) => {
    if (!channelId) return;
    const replace = !!opts?.replace;

    if (guildId) {
      pushRoute(channelPath(guildId, channelId), replace);
      return;
    }

    const mapped = chanToGuild?.[channelId];
    if (mapped) {
      pushRoute(channelPath(mapped, channelId), replace);
      return;
    }

    const cached = resolveCacheRef.current[channelId];
    if (cached !== undefined) {
      if (cached) pushRoute(channelPath(cached, channelId), replace);
      return;
    }

    try {
      const ch = await apiGetChannel(channelId);
      const gid = ch?.guild_id || '';
      resolveCacheRef.current[channelId] = gid;
      if (gid) pushRoute(channelPath(gid, channelId), replace);
    } catch {
      resolveCacheRef.current[channelId] = '';
    }
  }, [chanToGuild]);
}