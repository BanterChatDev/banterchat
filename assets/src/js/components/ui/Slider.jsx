import React from 'react';

export default function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step,
  className = '',
  trackClassName = '',
  thumbClassName = '',
  ariaLabel,
  disabled = false,
}) {
  const handleChange = (e) => {
    const next = step != null && Number.isInteger(step) ? parseInt(e.target.value, 10) : Number(e.target.value);
    onChange?.(next);
  };
  const trackBase = 'h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--accent)]';
  const thumbBase = '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0';
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${trackBase} ${trackClassName} ${thumbBase} ${thumbClassName} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    />
  );
}