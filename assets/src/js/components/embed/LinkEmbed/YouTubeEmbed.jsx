import React, { useEffect, useState } from 'react';
import { fetchOEmbed } from '../../../api/linkmeta';
import { EmbedCard, EmbedHeader, PlayerEmbed } from './shared';

export default function YouTubeEmbed({ videoId, url }) {
  const [data, setData] = useState(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolved(false);
    setData(null);
    fetchOEmbed(`https://www.youtube.com/oembed?url=https://youtu.be/${videoId}&format=json`)
      .then(d => { if (!cancelled) { if (d) setData(d); setResolved(true); } })
      .catch(() => { if (!cancelled) setResolved(true); });
    return () => { cancelled = true; };
  }, [videoId]);

  const title = data?.title || url;
  const author = data?.author_name;

  return (
    <EmbedCard accent="#ff0000">
      {!resolved && !data ? (
        <div className="px-3 py-2"><div className="h-4 w-48 bg-white/5 rounded animate-pulse" /></div>
      ) : (
        <EmbedHeader siteName="YouTube" siteColor="rgba(255,0,0,0.6)" title={title} url={url} author={author} />
      )}
      <PlayerEmbed src={`https://www.youtube-nocookie.com/embed/${videoId}`} width={480} height={270} />
    </EmbedCard>
  );
}