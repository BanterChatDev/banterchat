import React from 'react';
import { extractUrl, ownDomainInviteCode, ownDomainBotInviteClientID, getYouTubeId, getSpotifyEmbed, getTenorId } from './shared';
import ImagePreview from '../../media/imagePreview';
import InviteEmbed from './InviteEmbed';
import BotInviteEmbed from './BotInviteEmbed';
import YouTubeEmbed from './YouTubeEmbed';
import TenorGifEmbed from './TenorGifEmbed';
import { u } from '../../../api/routes';
import SpotifyEmbed from './SpotifyEmbed';
import MetaEmbed from './MetaEmbed';

const ATTACHMENT_RE = /^https?:\/\/[^/]+\/(?:api\/)?attachments\/([a-f0-9]+)(?:\?|$)/i;
const DIRECT_IMG_RE = /\.(?:gif|webp|png|jpe?g)(?:\?|$)/i;

export default function LinkEmbed({ content }) {
  const url = extractUrl(content);
  if (!url) return null;

  const attMatch = ATTACHMENT_RE.exec(url);
  if (attMatch && typeof window !== 'undefined' && url.includes(window.location.host)) {
    return <div className="mt-1 max-w-xs"><ImagePreview src={`${u.attachment(attMatch[1])}?raw=1`} alt="" /></div>;
  }

  const tenorId = getTenorId(url);
  if (tenorId) {
    return <TenorGifEmbed url={url} tenorId={tenorId} />;
  }

  if (DIRECT_IMG_RE.test(url)) {
    return <div className="mt-1 max-w-xs"><ImagePreview src={url} alt="" /></div>;
  }

  const inviteCode = ownDomainInviteCode(url);
  if (inviteCode) return <InviteEmbed code={inviteCode} />;

  const botClientID = ownDomainBotInviteClientID(url);
  if (botClientID) return <BotInviteEmbed clientID={botClientID} url={url} />;

  const ytId = getYouTubeId(url);
  if (ytId) return <YouTubeEmbed videoId={ytId} url={url} />;

  const spotifySrc = getSpotifyEmbed(url);
  if (spotifySrc) return <SpotifyEmbed src={spotifySrc} />;

  return <MetaEmbed url={url} />;
}