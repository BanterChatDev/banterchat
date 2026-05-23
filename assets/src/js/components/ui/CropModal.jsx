import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Slider from './Slider';

export default function CropModal({ file, aspect, onCrop, onClose }) {
  const t = useT();
  const containerRef = useRef(null);
  const stateRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState({ x: 50, y: 50 });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePointerDown = (e) => {
    stateRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!stateRef.current.dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - stateRef.current.lastX;
    const dy = e.clientY - stateRef.current.lastY;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
    const sens = 100 / zoom;
    setFocus(prev => ({
      x: Math.min(100, Math.max(0, prev.x - (dx / rect.width) * sens)),
      y: Math.min(100, Math.max(0, prev.y - (dy / rect.height) * sens)),
    }));
  };

  const handlePointerUp = () => { stateRef.current.dragging = false; };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(1, z - e.deltaY * 0.002)));
  };

  const handleSave = () => {
    setSaving(true);
    const crop = { x: Math.round(focus.x * 10) / 10, y: Math.round(focus.y * 10) / 10, zoom: Math.round(zoom * 100) / 100 };
    onCrop(file, crop);
  };

  const imgStyle = {
    objectFit: 'cover',
    objectPosition: `${focus.x}% ${focus.y}%`,
    transform: zoom > 1 ? `scale(${zoom})` : undefined,
    transformOrigin: `${focus.x}% ${focus.y}%`,
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg-base)] rounded-xl border border-white/[0.08] shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white/90">{t('ui.crop_modal_title')}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div
            ref={containerRef}
            className="relative rounded-lg overflow-hidden bg-[var(--bg-tertiary)] border border-white/[0.06] cursor-grab active:cursor-grabbing touch-none"
            style={{ aspectRatio: aspect || 3 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full h-full pointer-events-none select-none" draggable={false} style={imgStyle} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <svg className="w-3.5 h-3.5 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
            <Slider
              min={100}
              max={300}
              value={zoom * 100}
              onChange={(v) => setZoom(v / 100)}
              trackClassName="flex-1"
            />
            <svg className="w-3.5 h-3.5 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
          </div>
          <p className="text-[10px] text-white/20 text-center">{t('ui.crop_modal_hint')}</p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/[0.06]">
          <button onClick={onClose} className="text-xs text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg px-4 py-2 transition-all">{t('common.cancel')}</button>
          <button onClick={handleSave} disabled={saving || !previewUrl} className="text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg px-4 py-2 transition-all disabled:opacity-40">
            {saving ? t('common.saving') : t('ui.crop_modal_apply')}
          </button>
        </div>
      </div>
    </div>
  );
}