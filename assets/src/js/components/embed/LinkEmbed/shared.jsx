import React from 'react';
import { u as U } from '../../../api/routes';

export const URL_RE = /https?:\/\/[^\s<]+/;
const YT_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
const SPOTIFY_RE = /open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;
const INVITE_RE = /\/invite\/([A-Za-z0-9_-]+)$/;
const TENOR_RE = /^https?:\/\/(?:media\d*\.tenor\.com|c\.tenor\.com|tenor\.com)\/([A-Za-z0-9_-]+)/i;

export function getTenorId(url) {
  const m = TENOR_RE.exec(url || '');
  return m ? m[1] : null;
}

export function extractUrl(content) {
  if (!content) return null;
  const m = URL_RE.exec(content);
  if (!m) return null;
  return m[0].replace(/[).,;:!?"'>]+$/, '');
}

export function getYouTubeId(url) {
  const m = YT_RE.exec(url);
  return m ? m[1] : null;
}

export function getSpotifyEmbed(url) {
  const m = SPOTIFY_RE.exec(url);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

export function ownDomainInviteCode(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== window.location.hostname) return null;
    const m = INVITE_RE.exec(u.pathname);
    return m ? m[1] : null;
  } catch { return null; }
}

export function ownDomainBotInviteClientID(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== window.location.hostname) return null;
    if (u.pathname !== '/oauth2/authorize') return null;
    const cid = u.searchParams.get('client_id');
    return cid || null;
  } catch { return null; }
}

export function imgSrc(url) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  try {
    // local `u` shadows the imported `U` helper — intentional, scoped to this try.
    const u = new URL(url);
    if (u.hostname === window.location.hostname) return u.pathname + u.search;
  } catch {}
  return U.proxy(url);
}

export function EmbedCard({ accent, children }) {
  const style = accent ? { borderLeftColor: accent } : {};
  return (
    <div className="mt-1.5 max-w-[480px] rounded overflow-hidden bg-[var(--bg-secondary)] border border-white/[0.06] border-l-4 border-l-white/10" style={style}>
      {children}
    </div>
  );
}

export function EmbedHeader({ siteName, siteColor, title, url, author, favicon }) {
  return (
    <div className="px-3 py-2">
      {siteName && (
        <div className="flex items-center gap-1.5 mb-0.5">
          {favicon && (
            <img src={imgSrc(favicon)} alt="" className="w-3.5 h-3.5 rounded-sm" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          )}
          <p className="text-[10px] font-semibold" style={{ color: siteColor || 'rgba(255,255,255,0.3)' }}>{siteName}</p>
        </div>
      )}
      {title && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--accent-info)] hover:underline font-semibold leading-snug line-clamp-2 block">{title}</a>
      )}
      {author && (
        <p className="text-[11px] text-white/30 mt-0.5">{author}</p>
      )}
    </div>
  );
}

export function PlayerEmbed({ src, width, height }) {
  const w = parseInt(width, 10) || 480;
  const h = parseInt(height, 10) || 270;
  const aspect = ((h / w) * 100).toFixed(2);
  return (
    <div className="mt-1 relative w-full max-w-[480px] rounded overflow-hidden" style={{ paddingBottom: `${aspect}%` }}>
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}