import React, { useEffect, useState, useCallback } from 'react';
import { DownloadIcon, DocumentIcon, CloseIcon } from '../icons';
import { formatSize } from '../../utils/formatSize';
import Modal from '../ui/Modal';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

const EXT_MAP = {
  code: ['js','jsx','ts','tsx','go','py','rb','rs','c','cpp','h','java','kt','swift','php','sh','bash','css','scss','html','xml','json','yaml','yml','toml','sql','lua','zig'],
  doc: ['pdf','doc','docx','txt','md','rtf','odt','pages'],
  sheet: ['xls','xlsx','csv','ods','numbers'],
  archive: ['zip','tar','gz','bz2','rar','7z','xz','zst'],
  slide: ['ppt','pptx','key','odp'],
  font: ['ttf','otf','woff','woff2','eot'],
  exe: ['exe','msi','dmg','app','deb','rpm','appimage'],
};

const COLORS = {
  code: 'text-emerald-400/70',
  doc: 'text-blue-400/70',
  sheet: 'text-green-400/70',
  archive: 'text-amber-400/70',
  slide: 'text-orange-400/70',
  font: 'text-purple-400/70',
  exe: 'text-red-400/70',
  generic: 'text-white/30',
};

const COLLAPSED_LINES = 4;
const EXPANDED_LINES = 27;

function getCategory(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  for (const [cat, exts] of Object.entries(EXT_MAP)) {
    if (exts.includes(ext)) return cat;
  }
  return 'generic';
}

function Icon({ cat }) {
  const c = "w-6 h-6";
  switch (cat) {
    case 'code': return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
    case 'archive': return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
    case 'sheet': return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    case 'slide': return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>;
    case 'font': return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>;
    case 'exe': return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>;
    case 'doc': return <DocumentIcon className={c} />;
    default: return <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
  }
}

function ChevronDown({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
}
function ChevronUp({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
}
function ExpandIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></svg>;
}
function CodeBracketsIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
}

function CodeLines({ lines, startLine = 1, limit }) {
  const visible = typeof limit === 'number' ? lines.slice(0, limit) : lines;
  return (
    <pre className="text-[12.5px] leading-[1.55] font-mono whitespace-pre">
      {visible.map((ln, i) => (
        <div key={i} className="flex">
          <span className="select-none text-white/20 text-right pr-3 pl-3 w-12 flex-shrink-0">{startLine + i}</span>
          <span className="min-w-0 pr-4 text-white/80 select-text">{ln || '\u00A0'}</span>
        </div>
      ))}
    </pre>
  );
}

function useRawText(rawUrl, enabled) {
  const [state, setState] = useState({ status: 'idle', text: '' });
  useEffect(() => {
    if (!enabled || !rawUrl) return;
    let cancelled = false;
    setState({ status: 'loading', text: '' });
    fetch(rawUrl)
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.text();
      })
      .then(text => { if (!cancelled) setState({ status: 'ready', text }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', text: '' }); });
    return () => { cancelled = true; };
  }, [rawUrl, enabled]);
  return state;
}

function FullscreenModal({ filename, size, lines, rawSrc, onClose }) {
  const t = useT();
  return (
    <Modal isOpen onClose={onClose} size="xl" padding={false} heightClass="h-[85vh]">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
          <DocumentIcon className="w-5 h-5 text-white/40 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white/85 truncate">{filename || t('media.file_fallback')}</p>
            <p className="text-[11px] text-white/35">{formatSize(size)} · {(lines.length === 1 ? t('media.lines_one_template') : t('media.lines_other_template')).replace('{n}', lines.length)}</p>
          </div>
          <Tooltip text={t('media.download')}>
            <a href={rawSrc} download={filename || true} aria-label={t('media.download')} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
              <DownloadIcon className="w-4 h-4" />
            </a>
          </Tooltip>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors" aria-label={t('common.close')}>
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin bg-[var(--bg-deepest,#07080c)] py-2">
          <CodeLines lines={lines} />
        </div>
      </div>
    </Modal>
  );
}

function BinaryPill({ src, filename, size, cat, ext }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3.5 py-3 max-w-xs hover:bg-white/[0.06] transition-colors group">
      <div className={COLORS[cat] || COLORS.generic}>
        <Icon cat={cat} />
      </div>
      <div className="flex-1 min-w-0">
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-[12px] text-blue-400/80 hover:underline font-medium truncate block">{filename || t('media.file_fallback')}</a>
        <p className="text-[10px] text-white/25 mt-0.5">{ext} · {formatSize(size)}</p>
      </div>
      <Tooltip text={t('media.download')}>
        <a href={src} download={filename || true} aria-label={t('media.download')} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
          <DownloadIcon className="w-4 h-4" />
        </a>
      </Tooltip>
    </div>
  );
}

export default function FilePreview({ src, filename, size, isText = false }) {
  const t = useT();
  const cat = getCategory(filename);
  const ext = (filename || '').split('.').pop()?.toUpperCase() || 'FILE';
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const raw = useRawText(src, isText);

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);
  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);

  if (!isText) {
    return <BinaryPill src={src} filename={filename} size={size} cat={cat} ext={ext} />;
  }

  const lines = raw.status === 'ready' ? raw.text.split('\n') : [];
  const totalLines = lines.length;
  const limit = expanded ? EXPANDED_LINES : COLLAPSED_LINES;
  const hasMore = totalLines > limit;

  return (
    <>
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg overflow-hidden max-w-2xl">
        <div className="overflow-auto scrollbar-thin bg-black/25 py-1">
          {raw.status === 'loading' && (
            <div className="text-[11px] text-white/30 font-mono px-4 py-3">{t('media.file_loading')}</div>
          )}
          {raw.status === 'error' && (
            <div className="text-[11px] text-red-400/70 font-mono px-4 py-3">{t('media.file_preview_unavailable')}</div>
          )}
          {raw.status === 'ready' && (
            <CodeLines lines={lines} limit={limit} />
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.04] bg-white/[0.02]">
          {raw.status === 'ready' && hasMore && (
            <Tooltip text={expanded ? t('media.file_collapse') : t('media.file_expand')}>
              <button type="button" onClick={toggleExpanded} aria-label={expanded ? t('media.file_collapse') : t('media.file_expand')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors flex-shrink-0">
                {expanded ? <ChevronUp /> : <ChevronDown />}
              </button>
            </Tooltip>
          )}
          <div className="flex-1 min-w-0">
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-white/85 hover:text-white font-medium truncate block">{filename || t('media.file_fallback')}</a>
            <p className="text-[10.5px] text-white/30 mt-0.5">{formatSize(size)}{totalLines > 0 ? ` · ${(totalLines === 1 ? t('media.lines_one_template') : t('media.lines_other_template')).replace('{n}', totalLines)}` : ''}</p>
          </div>
          <Tooltip text={t('media.file_view_raw')}>
            <a href={src} target="_blank" rel="noopener noreferrer" aria-label={t('media.file_view_raw')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors flex-shrink-0">
              <CodeBracketsIcon />
            </a>
          </Tooltip>
          {raw.status === 'ready' && (
            <Tooltip text={t('media.file_view_whole')}>
              <button type="button" onClick={openFullscreen} aria-label={t('media.file_view_whole')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors flex-shrink-0">
                <ExpandIcon />
              </button>
            </Tooltip>
          )}
          <Tooltip text={t('media.download')}>
            <a href={src} download={filename || true} aria-label={t('media.download')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors flex-shrink-0">
              <DownloadIcon className="w-4 h-4" />
            </a>
          </Tooltip>
        </div>
      </div>
      {fullscreen && raw.status === 'ready' && (
        <FullscreenModal
          filename={filename}
          size={size}
          lines={lines}
          rawSrc={src}
          onClose={closeFullscreen}
        />
      )}
    </>
  );
}