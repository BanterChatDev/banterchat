import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_ROLE_COLOR } from '../../constants';
import { useT } from '../../hooks/useT';

function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}


function hexToHsv(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return { h: 0, s: 0, v: 0.6 };
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6 * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

const PRESETS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#99aab5'];

export default function ColorPicker({ value, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value || DEFAULT_ROLE_COLOR));
  const [hexInput, setHexInput] = useState(value || DEFAULT_ROLE_COLOR);
  const ref = useRef(null);
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const dragging = useRef(null);

  useEffect(() => {
  setHsv(hexToHsv(value || DEFAULT_ROLE_COLOR));
  setHexInput(value || DEFAULT_ROLE_COLOR);
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyColor = useCallback((h, s, v) => {
    const hex = hsvToHex(h, s, v);
    setHsv({ h, s, v });
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleSv = useCallback((e) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const s = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (cy - rect.top) / rect.height));
    applyColor(hsv.h, s, v);
  }, [hsv.h, applyColor]);

  const handleHue = useCallback((e) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const h = Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * 360;
    applyColor(h, hsv.s, hsv.v);
  }, [hsv.s, hsv.v, applyColor]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      if (dragging.current === 'sv') handleSv(e);
      if (dragging.current === 'hue') handleHue(e);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [handleSv, handleHue]);

  const handleHexChange = (e) => {
    const v = e.target.value;
    setHexInput(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      setHsv(hexToHsv(v));
      onChange(v);
    }
  };

  const pick = (c) => { onChange(c); setHsv(hexToHsv(c)); setHexInput(c); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 bg-[var(--bg-deepest)] border-white/[0.08] rounded-lg px-3 py-2 hover:border-white/[0.15] transition-colors w-full sm:w-auto"
      >
        <div className="w-5 h-5 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: value }} />
        <span className="text-sm text-white/60 font-mono">{value}</span>
        <svg className={`w-3 h-3 text-white/20 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-[var(--bg-popover)] border border-white/[0.08] rounded-xl p-3 shadow-2xl w-72 max-w-[calc(100vw-2rem)]">
          <div
            ref={svRef}
            className="relative w-full h-40 rounded-lg cursor-crosshair mb-3 overflow-hidden touch-none"
            style={{ backgroundColor: hsvToHex(hsv.h, 1, 1) }}
            onMouseDown={(e) => { dragging.current = 'sv'; handleSv(e); }}
            onTouchStart={(e) => { dragging.current = 'sv'; handleSv(e); }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
            <div
              className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_1px_rgba(0,0,0,0.3)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>
          <div
            ref={hueRef}
            className="relative w-full h-3.5 rounded-full cursor-pointer mb-3 touch-none"
            style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f00)' }}
            onMouseDown={(e) => { dragging.current = 'hue'; handleHue(e); }}
            onTouchStart={(e) => { dragging.current = 'hue'; handleHue(e); }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full border-2 border-white shadow-[0_0_1px_rgba(0,0,0,0.3)] pointer-events-none"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
            />
          </div>
          <div className="flex gap-1.5 mb-3">
            {PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${value === c ? 'border-white/60 scale-110' : 'border-transparent hover:border-white/20'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : value }} />
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              placeholder={t('settings_color_picker.hex_placeholder')}
              className="flex-1 bg-[var(--bg-deepest)] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-white/70 font-mono focus:outline-none focus:border-white/20"
              maxLength={7}
            />
          </div>
        </div>
      )}
    </div>
  );
}