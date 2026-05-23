import React, { useEffect, useRef } from 'react';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';

const BASE_FAVICON = '/media/landing/logo.webp';

function buildFaviconWithDot(baseSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const r = 14;
      ctx.beginPath();
      ctx.arc(size - r, size - r, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ed4245';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#111214';
      ctx.stroke();
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = baseSrc;
  });
}

function setFavicon(href) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = href;
}

export default function TabIndicator() {
  const { mentions, unread } = useChannelNotifications();
  const baseTitleRef = useRef(document.title || 'Banter');
  const baseFaviconRef = useRef(null);
  const dotFaviconRef = useRef(null);

  useEffect(() => {
    baseFaviconRef.current = BASE_FAVICON;
    buildFaviconWithDot(BASE_FAVICON).then(dataUrl => {
      dotFaviconRef.current = dataUrl;
    });
  }, []);

  useEffect(() => {
    const totalMentions = Object.values(mentions || {}).reduce((a, b) => a + b, 0);
    const totalUnread = Object.values(unread || {}).reduce((a, b) => a + b, 0);
    const base = baseTitleRef.current.replace(/^(\(\d+\)|\u2022)\s*/, '');
    if (totalMentions > 0) {
      document.title = `(${totalMentions > 99 ? '99+' : totalMentions}) ${base}`;
      if (dotFaviconRef.current) setFavicon(dotFaviconRef.current);
    } else if (totalUnread > 0) {
      document.title = `\u2022 ${base}`;
      if (dotFaviconRef.current) setFavicon(dotFaviconRef.current);
    } else {
      document.title = base;
      if (baseFaviconRef.current) setFavicon(baseFaviconRef.current);
    }
  }, [mentions, unread]);

  return null;
}