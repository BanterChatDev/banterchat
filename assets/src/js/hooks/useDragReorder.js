import { useState, useRef, useCallback } from 'react';

export function useDragReorder(items, onReorder) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragNode = useRef(null);

  const onDragStart = useCallback((e, idx) => {
    dragNode.current = e.currentTarget;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = '0.4'; }, 0);
  }, []);

  const onDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(prev => prev === idx ? prev : idx);
  }, []);

  const onDragEnd = useCallback(() => {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const reordered = [...items];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(overIdx, 0, moved);
      const updated = reordered.map((item, i) => ({ ...item, position: i + 1 }));
      onReorder(updated);
    }
    setDragIdx(null);
    setOverIdx(null);
    dragNode.current = null;
  }, [dragIdx, overIdx, items, onReorder]);

  const dragProps = useCallback((idx) => ({
    draggable: true,
    onDragStart: (e) => onDragStart(e, idx),
    onDragOver: (e) => onDragOver(e, idx),
    onDragEnd,
  }), [onDragStart, onDragOver, onDragEnd]);

  const isOver = useCallback((idx) => overIdx === idx && dragIdx !== null && dragIdx !== idx, [overIdx, dragIdx]);

  return { dragProps, isOver, isDragging: dragIdx !== null };
}