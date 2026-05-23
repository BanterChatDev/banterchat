const SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 28, 40, 72];

let styleEl = null;

function buildCss(scale) {
  return SIZES.map(px => {
    const target = (px * scale).toFixed(2);
    return `[data-text-scale] .text-\\[${px}px\\] { font-size: ${target}px !important; }`;
  }).join('\n');
}

export function applyTextScale(scale) {
  const root = document.documentElement;
  const s = typeof scale === 'number' && scale > 0 ? scale : 1;
  root.style.setProperty('--a11y-text-scale', String(s));
  if (s <= 1.0001) {
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }
    delete root.dataset.textScale;
    return;
  }
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'a11y-text-scale-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildCss(s);
  root.dataset.textScale = String(s);
}