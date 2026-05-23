import { useState, useRef, useCallback } from 'react';
import { apiUpdateChannel, apiReorderChannels } from '../api/channels';
import { apiUpdateCategory, apiReorderCategories } from '../api/categories';

export function useChannelDrag({ channels, categories, setChannels, setCategories, guildId }) {
  const [dropTarget, setDropTarget] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  const cleanup = useCallback(() => {
    dragRef.current = null;
    setDropTarget(null);
    setDragging(false);
    document.querySelectorAll('[draggable]').forEach(el => { el.style.opacity = ''; });
  }, []);

  const onDragEnd = useCallback(() => cleanup(), [cleanup]);

  const initDrag = (e, type, item) => {
    dragRef.current = { type, item };
    setDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    requestAnimationFrame(() => { e.target.style.opacity = '0.3'; });
  };

  const onChannelDragStart = useCallback((e, ch) => initDrag(e, 'channel', ch), []);

  const onChannelDragOver = useCallback((e, target) => {
    if (!dragRef.current || dragRef.current.type !== 'channel') return;
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current.item.id === target.id) return;
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ type: 'channel', id: target.id });
  }, []);

  const onChannelDrop = useCallback(async (e, target) => {
    if (!dragRef.current || dragRef.current.type !== 'channel') return;
    e.preventDefault();
    e.stopPropagation();
    const src = dragRef.current.item;
    if (src.id === target.id) { cleanup(); return; }
    const newCatId = target.category_id || '';
    const srcIdx = channels.findIndex(c => c.id === src.id);
    const tgtIdx = channels.findIndex(c => c.id === target.id);
    const movingDown = srcIdx < tgtIdx;
    const updated = channels.filter(c => c.id !== src.id);
    const idx = updated.findIndex(c => c.id === target.id);
    updated.splice(movingDown ? idx + 1 : idx, 0, { ...src, category_id: newCatId });
    const reposed = updated.map((c, i) => ({ ...c, position: i + 1 }));
    setChannels(reposed);
    try {
      const affected = reposed.filter(c => {
        const orig = channels.find(o => o.id === c.id);
        return !orig || orig.position !== c.position || (orig.category_id || '') !== (c.category_id || '');
      });
      if (affected.length > 0) {
        await apiReorderChannels(guildId, affected.map(c => ({ id: c.id, position: c.position, category_id: c.category_id || '' })));
      }
    } catch {}
    cleanup();
  }, [channels, setChannels, cleanup]);

  const onCategoryDragStart = useCallback((e, cat) => initDrag(e, 'category', cat), []);

  const onCategoryHeaderDragOver = useCallback((e, target) => {
    e.preventDefault();
    e.stopPropagation();
    const drag = dragRef.current;
    if (!drag) return;
    e.dataTransfer.dropEffect = 'move';
    if (drag.type === 'category') {
      if (drag.item.id !== target.id) {
        setDropTarget({ type: 'category', id: target.id });
      }
    } else if (drag.type === 'channel') {
      setDropTarget({ type: 'category-zone', id: target.id });
    }
  }, []);

  const onCategoryBodyDragOver = useCallback((e, target) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (drag.type === 'channel') {
      setDropTarget({ type: 'category-zone', id: target.id });
    } else if (drag.type === 'category' && drag.item.id !== target.id) {
      setDropTarget({ type: 'category', id: target.id });
    }
  }, []);

  const onCategoryDrop = useCallback(async (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    const drag = dragRef.current;
    if (!drag) { cleanup(); return; }
    if (drag.type === 'category' && drag.item.id !== target.id) {
      const cats = [...(categories || [])];
      const srcIdx = cats.findIndex(c => c.id === drag.item.id);
      const tgtIdx = cats.findIndex(c => c.id === target.id);
      const movingDown = srcIdx < tgtIdx;
      const [moved] = cats.splice(srcIdx, 1);
      const insertIdx = movingDown ? tgtIdx : tgtIdx;
      cats.splice(insertIdx, 0, moved);
      const reposed = cats.map((c, i) => ({ ...c, position: i + 1 }));
      setCategories(reposed);
      const affected = reposed.filter(c => {
        const orig = categories.find(o => o.id === c.id);
        return !orig || orig.position !== c.position;
      });
      if (affected.length > 0) {
        try { await apiReorderCategories(guildId, affected.map(c => ({ id: c.id, position: c.position }))); } catch {}
      }
    } else if (drag.type === 'channel') {
      const src = drag.item;
      if ((src.category_id || '') === target.id) { cleanup(); return; }
      const updated = channels.map(c => c.id === src.id ? { ...c, category_id: target.id } : c);
      setChannels(updated);
      try { await apiUpdateChannel(src.id, { category_id: target.id }); } catch {}
    }
    cleanup();
  }, [categories, channels, setCategories, setChannels, cleanup]);

  const onUncategorizedDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current && dragRef.current.type === 'channel') {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget({ type: 'uncategorized' });
    }
  }, []);

  const onUncategorizedDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.type !== 'channel') { cleanup(); return; }
    const src = drag.item;
    if (!src.category_id) { cleanup(); return; }
    const updated = channels.map(c => c.id === src.id ? { ...c, category_id: '' } : c);
    setChannels(updated);
    try { await apiUpdateChannel(src.id, { category_id: '' }); } catch {}
    cleanup();
  }, [channels, setChannels, cleanup]);

  return {
    dropTarget,
    dragging,
    dragRef,
    onChannelDragStart,
    onChannelDragOver,
    onChannelDrop,
    onCategoryDragStart,
    onCategoryHeaderDragOver,
    onCategoryBodyDragOver,
    onCategoryDrop,
    onUncategorizedDragOver,
    onUncategorizedDrop,
    onDragEnd,
  };
}