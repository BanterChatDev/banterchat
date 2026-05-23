import React from 'react';

export default function SpotifyEmbed({ src }) {
  return (
    <div className="mt-1.5 max-w-[400px]">
      <iframe
        src={src}
        className="w-full rounded-xl border-0"
        height="152"
        allow="encrypted-media"
        loading="lazy"
      />
    </div>
  );
}