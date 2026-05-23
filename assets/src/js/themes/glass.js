const CSS = `
@property --glass-drift {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --glass-shine {
  syntax: '<percentage>';
  initial-value: -50%;
  inherits: true;
}

@keyframes glassDrift {
  0%   { --glass-drift: 0; }
  100% { --glass-drift: 360; }
}
@keyframes glassShine {
  0%   { --glass-shine: -50%; }
  100% { --glass-shine: 150%; }
}

html[data-theme="glass"] {
  animation: glassDrift 45s linear infinite;
}

html[data-theme="glass"] body {
  background:
    radial-gradient(ellipse at calc(20% + var(--glass-drift) * 0.05%) 30%, hsla(calc(220 + var(--glass-drift) * 0.3), 55%, 30%, 0.6) 0%, transparent 60%),
    radial-gradient(ellipse at calc(80% - var(--glass-drift) * 0.05%) 70%, hsla(calc(245 + var(--glass-drift) * 0.2), 50%, 26%, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 50%, hsla(calc(265 + var(--glass-drift) * 0.15), 45%, 24%, 0.45) 0%, transparent 70%),
    linear-gradient(135deg, hsl(220, 28%, 13%) 0%, hsl(230, 28%, 15%) 50%, hsl(220, 28%, 13%) 100%) !important;
  background-attachment: fixed !important;
}

html[data-theme="glass"] .glass-shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 0%, transparent var(--glass-shine), rgba(255,255,255,0.14) calc(var(--glass-shine) + 6%), rgba(255,255,255,0.05) calc(var(--glass-shine) + 12%), transparent calc(var(--glass-shine) + 18%), transparent 100%);
  animation: glassShine 14s ease-in-out infinite;
  z-index: 0;
}

@media (prefers-reduced-motion: reduce) {
  html[data-theme="glass"] { animation: none; }
  html[data-theme="glass"] [data-glass-panel]::before { animation: none; }
}
`;

let styleEl = null;

export default {
  id: 'glass',
  name: 'Glass',
  backdropBlur: 16,
  backdropSaturate: 180,
  surfaceSeed: {
    color: 'hsl(225, 35%, 32%)',
    alpha: 0.78,
  },
  onActivate() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-glass-styles';
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
    }
    document.documentElement.dataset.theme = 'glass';
  },
  onDeactivate() {
    if (document.documentElement.dataset.theme === 'glass') {
      delete document.documentElement.dataset.theme;
    }
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }
  },
  vars: {
    accent: '#9cb8ff',
    accent_hover: '#7a9af0',
    accent_success: '#7adf9d',
    accent_danger: '#ff8a96',
    accent_info: '#9cb8ff',
    accent_warning: '#ffd078',
    text_primary: '#f0f2f5',
    text_code: '#ffc88a',
    text_mention: '#c8d4ff',
    content_base: '240 242 245',
    border_subtle: 'rgba(255,255,255,0.1)',
    border_default: 'rgba(255,255,255,0.18)',
    border_medium: 'rgba(255,255,255,0.26)',
    border_strong: 'rgba(255,255,255,0.34)',
    border_focus: 'rgba(255,255,255,0.5)',
    scroll_track: 'rgba(255,255,255,0.06)',
    scroll_thumb: 'rgba(255,255,255,0.2)',
    scroll_hover: 'rgba(255,255,255,0.32)',
    accent_rgb: '156 184 255',
    accent_hover_rgb: '122 154 240',
    accent_success_rgb: '122 223 157',
    accent_danger_rgb: '255 138 150',
    accent_info_rgb: '156 184 255',
    accent_warning_rgb: '255 208 120',
    bg_base_rgb: '156 184 255',
    bg_secondary_rgb: '156 184 255',
    bg_tertiary_rgb: '156 184 255',
    bg_deepest_rgb: '156 184 255',
    mention_bg: 'rgba(156,184,255,0.18)',
    mention_bg_hover: 'rgba(156,184,255,0.28)',
    mention_border: 'rgba(156,184,255,0.6)',
    media_accent: '#9cb8ff',
    media_accent_rgb: '156 184 255',
  }
};