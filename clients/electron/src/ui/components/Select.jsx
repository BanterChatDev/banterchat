import { useEffect, useRef, useState } from 'react';

export function Select({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-app-bg-2 border border-app-border focus:border-app-accent outline-none rounded-md px-3 py-1.5 text-[12px] text-white text-left flex items-center justify-between"
      >
        <span>{selected ? selected.label : '—'}</span>
        <span className="text-app-text-muted ml-2">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-full max-h-[240px] overflow-y-auto bg-app-bg border border-app-border rounded-md shadow-xl z-50 py-1">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${o.value === value ? 'bg-app-accent/20 text-white' : 'text-app-text hover:bg-app-bg-3'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}