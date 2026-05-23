import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  apiGifSearch, apiGifTrending,
  apiListGifTabs, apiCreateGifTab, apiRenameGifTab, apiDeleteGifTab,
  apiListGifFavorites, apiAddGifFavorite, apiDeleteGifFavorite, apiMoveGifFavorite,
} from '../../api/gifs';
import { CloseIcon, PlusIcon } from '../icons';
import { usePermEvents } from '../../hooks/usePermEvents';
import { createGifHandlers } from '../../broadcasts';
import { useT } from '../../hooks/useT';

const TRENDING_TAB = '__trending';
const FAVORITES_TAB = 'default';

const PICKER_WIDTH = 400;
const PICKER_MAX_HEIGHT = 480;
const PICKER_MIN_HEIGHT = 320;
const GAP = 10;
const EDGE = 8;
const MOBILE_BREAKPOINT = 640;

export default function GifPicker({ onPick, onClose, anchorRef }) {
  const t = useT();
  const [activeTab, setActiveTab] = useState(TRENDING_TAB);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingTab, setCreatingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [renamingTab, setRenamingTab] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingMenuFor, setSavingMenuFor] = useState(null);
  const debounceRef = useRef(0);
  const searchRef = useRef(null);

  useEffect(() => {
    apiListGifTabs().then(setTabs).catch(() => setTabs([]));
  }, []);

  const reloadFavorites = useCallback((tabId) => {
    setLoading(true);
    apiListGifFavorites(tabId === FAVORITES_TAB ? '' : tabId)
      .then((rows) => { setFavorites(Array.isArray(rows) ? rows : []); setLoading(false); })
      .catch(() => { setFavorites([]); setLoading(false); });
  }, []);

  useEffect(() => {
    if (activeTab === TRENDING_TAB) return;
    reloadFavorites(activeTab);
  }, [activeTab, reloadFavorites]);

  useEffect(() => {
    if (activeTab !== TRENDING_TAB) return;
    setLoading(true);
    setError('');
    clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      apiGifTrending().then(r => {
        setResults(r?.results || []);
        setLoading(false);
      }).catch((err) => {
        const detail = err?.data?.detail || err?.message || '';
        setError(detail ? `${t('gifs.error_trending_failed')}: ${detail}` : t('gifs.error_trending_failed'));
        setLoading(false);
      });
      return;
    }
    debounceRef.current = setTimeout(() => {
      apiGifSearch(query.trim()).then(r => {
        setResults(r?.results || []);
        setLoading(false);
      }).catch((err) => {
        const detail = err?.data?.detail || err?.message || '';
        setError(detail ? `${t('gifs.error_search_failed')}: ${detail}` : t('gifs.error_search_failed'));
        setLoading(false);
      });
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab]);

  usePermEvents(createGifHandlers({
    onTabCreate: (tab) => setTabs(prev => prev.some(t => t.id === tab.id) ? prev : [...prev, tab]),
    onTabRename: ({ id, name }) => setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t)),
    onTabDelete: ({ id }) => {
      setTabs(prev => prev.filter(t => t.id !== id));
      if (activeTab === id) setActiveTab(FAVORITES_TAB);
    },
    onFavoriteAdd: () => { if (activeTab !== TRENDING_TAB) reloadFavorites(activeTab); },
    onFavoriteDelete: ({ id }) => setFavorites(prev => prev.filter(f => f.id !== id)),
    onFavoriteMove: () => { if (activeTab !== TRENDING_TAB) reloadFavorites(activeTab); },
  }));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
  const popRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const measure = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (isMobile) {
      const w = Math.min(vw - 16, PICKER_WIDTH);
      const h = Math.min(vh - 16, PICKER_MAX_HEIGHT);
      setCoords({ left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h });
      return;
    }
    const w = Math.min(PICKER_WIDTH, vw - EDGE * 2);
    const h = Math.min(PICKER_MAX_HEIGHT, Math.max(PICKER_MIN_HEIGHT, vh - EDGE * 2));
    const anchor = anchorRef?.current;
    let left, top;
    if (anchor) {
      const a = anchor.getBoundingClientRect();
      top = a.top - GAP - h;
      if (top < EDGE) top = a.bottom + GAP;
      left = a.right - w;
      if (left < EDGE) left = EDGE;
      if (left + w > vw - EDGE) left = vw - EDGE - w;
      if (top + h > vh - EDGE) top = Math.max(EDGE, vh - EDGE - h);
    } else {
      left = (vw - w) / 2;
      top = (vh - h) / 2;
    }
    setCoords({ left, top, width: w, height: h });
  }, [anchorRef, isMobile]);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [measure]);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const onPickGif = useCallback((gif) => {
    onPick({ url: gif.url, description: gif.description || '' });
    onClose();
  }, [onPick, onClose]);

  const onSaveGif = useCallback(async (gif, tabId) => {
    try {
      await apiAddGifFavorite({
        tab_id: tabId || '',
        tenor_id: gif.id || gif.tenor_id || '',
        url: gif.url,
        preview_url: gif.preview_url,
        width: gif.width || 0,
        height: gif.height || 0,
        description: gif.description || '',
      });
      setSavingMenuFor(null);
    } catch {}
  }, []);

  const onUnsave = useCallback(async (favId) => {
    try { await apiDeleteGifFavorite(favId); } catch {}
  }, []);

  const onMoveFavorite = useCallback(async (favId, targetTabId) => {
    try { await apiMoveGifFavorite(favId, targetTabId); } catch {}
  }, []);

  const onCreateTab = useCallback(async () => {
    const name = newTabName.trim();
    if (!name) { setCreatingTab(false); return; }
    try {
      const tab = await apiCreateGifTab(name);
      setActiveTab(tab.id);
    } catch {}
    setNewTabName('');
    setCreatingTab(false);
  }, [newTabName]);

  const onRenameSubmit = useCallback(async (tabId) => {
    const name = renameValue.trim();
    if (!name) { setRenamingTab(null); return; }
    try { await apiRenameGifTab(tabId, name); } catch {}
    setRenamingTab(null);
  }, [renameValue]);

  const onDeleteTab = useCallback(async (tabId) => {
    try { await apiDeleteGifTab(tabId); } catch {}
  }, []);

  const showingFavorites = activeTab !== TRENDING_TAB;
  const grid = showingFavorites ? favorites : results;
  const allTabs = [
    { id: TRENDING_TAB, name: t('gifs.tab_trending') },
    { id: FAVORITES_TAB, name: `★ ${t('gifs.tab_favorites')}` },
    ...tabs,
  ];

  return (
    <div
      ref={popRef}
      style={coords ? {
        position: 'fixed',
        left: coords.left,
        top: coords.top,
        width: coords.width,
        height: coords.height,
      } : { position: 'fixed', left: -9999, top: -9999, width: PICKER_WIDTH, opacity: 0 }}
      className="bg-[var(--bg-popover)] border border-[var(--border-default)] rounded-md shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] z-[9999] animate-popover-in flex flex-col overflow-hidden min-h-[20rem] max-h-[min(85vh,30rem)]"
    >
      <div className="flex items-center gap-2 px-2.5 pt-2 pb-1.5 border-b border-[var(--border-default)] flex-shrink-0">
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveTab(TRENDING_TAB); }}
          placeholder={t('gifs.search_placeholder')}
          className="flex-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[rgb(var(--content-base)/0.20)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
        />
        <button onClick={onClose} className="p-1 rounded-md text-[rgb(var(--content-base)/0.40)] hover:text-[rgb(var(--content-base)/0.95)] hover:bg-[var(--bg-float)] transition-colors" aria-label={t('common.close')}>
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border-default)] overflow-x-auto scrollbar-thin flex-shrink-0">
        {allTabs.map((tab) => {
          const active = activeTab === tab.id;
          const isCustom = tab.id !== TRENDING_TAB && tab.id !== FAVORITES_TAB;
          if (renamingTab === tab.id) {
            return (
              <input
                key={tab.id}
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => onRenameSubmit(tab.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onRenameSubmit(tab.id); if (e.key === 'Escape') setRenamingTab(null); }}
                className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-full px-3 py-1 text-[11px] text-[var(--text-primary)] outline-none flex-shrink-0 w-24"
                maxLength={32}
              />
            );
          }
          return (
            <div key={tab.id} className="group/tab relative flex-shrink-0">
              <button
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={isCustom ? () => { setRenamingTab(tab.id); setRenameValue(tab.name); } : undefined}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[rgb(var(--accent-rgb)/0.18)] text-[var(--text-primary)]'
                    : 'text-[rgb(var(--content-base)/0.55)] hover:bg-[var(--bg-float)] hover:text-[rgb(var(--content-base)/0.95)]'
                } ${isCustom ? 'pr-6' : ''}`}
                aria-label={isCustom ? t('gifs.tab_rename_hint_template').replace('{name}', tab.name) : tab.name}
              >
                {tab.name}
              </button>
              {isCustom && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteTab(tab.id); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-[rgb(var(--content-base)/0.30)] hover:text-red-400 hover:bg-[var(--bg-float)] opacity-0 group-hover/tab:opacity-100 transition-opacity"
                  aria-label={t('gifs.tab_delete')}
                >
                  <CloseIcon className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
        {creatingTab ? (
          <input
            autoFocus
            type="text"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onBlur={onCreateTab}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreateTab(); if (e.key === 'Escape') { setCreatingTab(false); setNewTabName(''); } }}
            placeholder={t('gifs.tab_name_placeholder')}
            className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-full px-3 py-1 text-[11px] text-[var(--text-primary)] outline-none flex-shrink-0 w-24"
            maxLength={32}
          />
        ) : (
          <button
            onClick={() => setCreatingTab(true)}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[rgb(var(--content-base)/0.40)] hover:text-[rgb(var(--content-base)/0.85)] hover:bg-[var(--bg-float)] transition-colors"
            aria-label={t('gifs.tab_new')}
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-2 min-h-0 scrollbar-thin">
        {error && <div className="text-[11px] text-red-400 px-2 py-2">{error}</div>}
        <div className="text-[9px] uppercase tracking-wider text-[rgb(var(--content-base)/0.30)] px-2 pb-1.5 text-right">via Tenor</div>
        {loading && grid.length === 0 ? (
          <div className="text-center text-[12px] text-[rgb(var(--content-base)/0.30)] py-8">{t('gifs.loading')}</div>
        ) : grid.length === 0 ? (
          <div className="text-center text-[12px] text-[rgb(var(--content-base)/0.30)] py-8">
            {showingFavorites ? t('gifs.empty_favorites') : t('gifs.empty_search')}
          </div>
        ) : (
          <div className="columns-2 gap-2 [column-fill:_balance]">
            {grid.map((g) => (
              <GifCell
                key={g.id || g.tenor_id}
                gif={g}
                isFavorite={showingFavorites}
                onClick={() => onPickGif(showingFavorites ? { url: g.url, description: g.description } : g)}
                onSaveOpen={() => setSavingMenuFor(g.id || g.tenor_id)}
                onUnsave={showingFavorites ? () => onUnsave(g.id) : null}
                saveMenuOpen={savingMenuFor === (g.id || g.tenor_id)}
                closeSaveMenu={() => setSavingMenuFor(null)}
                tabs={tabs}
                onSaveTo={(tabId) => onSaveGif(g, tabId)}
                showingTabId={showingFavorites ? activeTab : null}
                onMoveTo={showingFavorites ? (targetTabId) => onMoveFavorite(g.id, targetTabId) : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GifCell({ gif, isFavorite, onClick, onSaveOpen, onUnsave, saveMenuOpen, closeSaveMenu, tabs, onSaveTo, showingTabId, onMoveTo }) {
  const t = useT();
  return (
    <div className="relative group/gif mb-2 break-inside-avoid">
      <button
        onClick={onClick}
        className="w-full block overflow-hidden rounded-md bg-[var(--bg-float)] hover:ring-2 hover:ring-[var(--accent)] transition-all"
        style={gif.width && gif.height ? { aspectRatio: `${gif.width} / ${gif.height}` } : undefined}
      >
        <img
          src={gif.preview_url}
          alt={gif.description || ''}
          loading="lazy"
          decoding="async"
          width={gif.width || undefined}
          height={gif.height || undefined}
          className="w-full h-auto block"
        />
      </button>
      {!isFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onSaveOpen(); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white/90 opacity-0 group-hover/gif:opacity-100 hover:bg-black/80 hover:text-yellow-300 transition-all duration-150 flex items-center justify-center text-[14px] shadow-lg"
          aria-label={t('gifs.action_save')}
        >
          ★
        </button>
      )}
      {isFavorite && onUnsave && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnsave(); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-yellow-300 opacity-0 group-hover/gif:opacity-100 hover:bg-black/80 transition-all duration-150 flex items-center justify-center text-[14px] shadow-lg"
          aria-label={t('gifs.action_unsave')}
        >
          ★
        </button>
      )}
      {isFavorite && onMoveTo && (
        <button
          onClick={(e) => { e.stopPropagation(); onSaveOpen(); }}
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white/90 opacity-0 group-hover/gif:opacity-100 hover:bg-black/80 transition-all duration-150 flex items-center justify-center text-[12px] shadow-lg"
          aria-label={t('gifs.action_move')}
        >
          ⇄
        </button>
      )}
      {saveMenuOpen && (
        <div
          onMouseLeave={closeSaveMenu}
          className={`absolute top-9 z-10 min-w-[140px] bg-[var(--bg-popover)] border border-[var(--border-default)] rounded-md shadow-xl py-1 ${isFavorite ? 'left-1.5' : 'right-1.5'}`}
        >
          <div className="text-[9px] uppercase tracking-wider text-[rgb(var(--content-base)/0.40)] px-2 pt-1 pb-0.5">{isFavorite ? t('gifs.menu_move_to') : t('gifs.menu_save_to')}</div>
          <button
            onClick={() => {
              if (isFavorite && onMoveTo) onMoveTo(''); else onSaveTo('');
              closeSaveMenu();
            }}
            disabled={isFavorite && showingTabId === 'default'}
            className="w-full text-left px-2 py-1 text-[11px] text-[rgb(var(--content-base)/0.80)] hover:bg-[var(--bg-float)] disabled:opacity-30"
          >
            ★ Favorites
          </button>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => {
                if (isFavorite && onMoveTo) onMoveTo(t.id); else onSaveTo(t.id);
                closeSaveMenu();
              }}
              disabled={isFavorite && showingTabId === t.id}
              className="w-full text-left px-2 py-1 text-[11px] text-[rgb(var(--content-base)/0.80)] hover:bg-[var(--bg-float)] truncate disabled:opacity-30"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}