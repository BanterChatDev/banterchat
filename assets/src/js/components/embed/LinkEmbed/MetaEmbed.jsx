import React, { useEffect, useState, useCallback } from 'react';
import { fetchLinkMeta } from '../../../api/linkmeta';
import { PlayIcon } from '../../icons';
import { EmbedCard, EmbedHeader, PlayerEmbed, imgSrc } from './shared';
import VideoPlayer from '../../media/VideoPlayer';

export default function MetaEmbed({ url }) {
  const [meta, setMeta] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLinkMeta(url).then(data => { if (!cancelled && data) setMeta(data); });
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => { setShowPlayer(false); }, [url]);

  const handlePlayClick = useCallback(() => setShowPlayer(true), []);

  if (!meta) return null;

  const isVideoType = meta.video_type && meta.video_type.includes('video/') && !meta.video_type.includes('text/html');
  const hasPlayer = meta.player && (meta.player.startsWith('https://') || meta.player.startsWith('http://'));

  if (hasPlayer && !isVideoType) {
    return (
      <EmbedCard accent={meta.theme_color}>
        <EmbedHeader siteName={meta.site_name} title={meta.title} url={url} favicon={meta.favicon} />
        {showPlayer ? (
          <PlayerEmbed src={meta.player} width={meta.video_width} height={meta.video_height} />
        ) : meta.image ? (
          <div className="relative cursor-pointer group" onClick={handlePlayClick}>
            <img src={imgSrc(meta.image)} alt="" className="w-full aspect-video object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <PlayIcon className="w-5 h-5 text-black ml-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <PlayerEmbed src={meta.player} width={meta.video_width} height={meta.video_height} />
        )}
      </EmbedCard>
    );
  }

  if (meta.video && isVideoType) {
    return (
      <EmbedCard accent={meta.theme_color}>
        <EmbedHeader siteName={meta.site_name} title={meta.title} url={url} favicon={meta.favicon} />
        <div className="px-3 pb-2.5">
          <VideoPlayer src={meta.video} />
        </div>
      </EmbedCard>
    );
  }

  return (
    <EmbedCard accent={meta.theme_color}>
      {meta.image && !meta.site_name?.toLowerCase().includes('twitter') && (
        <img src={imgSrc(meta.image)} alt="" className="w-full max-h-[200px] object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
      )}
      <EmbedHeader siteName={meta.site_name} title={meta.title} url={url} favicon={meta.favicon} />
      {meta.description && (
        <p className="text-[13px] text-white/60 leading-relaxed px-3 pb-2.5 -mt-0.5 line-clamp-3">{meta.description}</p>
      )}
    </EmbedCard>
  );
}