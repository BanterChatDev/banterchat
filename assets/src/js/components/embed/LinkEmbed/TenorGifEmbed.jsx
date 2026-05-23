import React from 'react';
import ImagePreview from '../../media/imagePreview';
import { useGifFavorites } from '../../../hooks/useGifFavorites';

export default function TenorGifEmbed({ url, tenorId }) {
  const { isFavorited, toggle } = useGifFavorites();
  const saved = isFavorited(tenorId);

  const onToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggle({ tenorId, url, previewUrl: url });
  };

  return (
    <div className="mt-1 inline-block relative group/tgif max-w-xs">
      <ImagePreview src={url} alt="" />
      <button
        onClick={onToggle}
        className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm transition-all duration-150 flex items-center justify-center text-[14px] shadow-lg ${saved ? 'text-yellow-300 opacity-100' : 'text-white/90 opacity-0 group-hover/tgif:opacity-100 hover:bg-black/80 hover:text-yellow-300'}`}
        title={saved ? 'Remove from favorites' : 'Save to favorites'}
        aria-pressed={saved}
      >
        ★
      </button>
    </div>
  );
}