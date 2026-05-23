const CSS = `
@property --lsd-hue {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-hue2 {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-hue3 {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-hue4 {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-pulse {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-sat1 {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-sat2 {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}
@property --lsd-sat3 {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}

@keyframes lsdHueA { 0% { --lsd-hue: 0; }   100% { --lsd-hue: 360; } }
@keyframes lsdHueB { 0% { --lsd-hue2: 0; }  100% { --lsd-hue2: 720; } }
@keyframes lsdHueC { 0% { --lsd-hue3: 0; }  100% { --lsd-hue3: 1080; } }
@keyframes lsdHueD { 0% { --lsd-hue4: 360; } 100% { --lsd-hue4: 0; } }
@keyframes lsdPulse { 0% { --lsd-pulse: 0; } 50% { --lsd-pulse: 30; } 100% { --lsd-pulse: 0; } }
@keyframes lsdSat1 { 0% { --lsd-sat1: -25; } 50% { --lsd-sat1: 25; } 100% { --lsd-sat1: -25; } }
@keyframes lsdSat2 { 0% { --lsd-sat2: 25; }  50% { --lsd-sat2: -25; } 100% { --lsd-sat2: 25; } }
@keyframes lsdSat3 { 0% { --lsd-sat3: -20; } 33% { --lsd-sat3: 25; } 66% { --lsd-sat3: -15; } 100% { --lsd-sat3: -20; } }

html[data-theme="lsd"] {
  animation:
    lsdHueA 3.5s linear infinite,
    lsdHueB 5.2s linear infinite,
    lsdHueC 2.7s linear infinite,
    lsdHueD 7.1s linear infinite,
    lsdPulse 1.8s ease-in-out infinite,
    lsdSat1 4.3s ease-in-out infinite,
    lsdSat2 6.1s ease-in-out infinite,
    lsdSat3 3.7s ease-in-out infinite;

  --accent: hsl(calc(var(--lsd-hue)), calc(95% + var(--lsd-sat1) * 0.2%), calc(65% + var(--lsd-pulse) * 0.3%));
  --accent-hover: hsl(calc(var(--lsd-hue3) + 30), calc(90% + var(--lsd-sat2) * 0.4%), calc(60% + var(--lsd-pulse) * 0.2%));
  --accent-success: hsl(calc(var(--lsd-hue) + 120 + var(--lsd-hue4) * 0.3), calc(95% + var(--lsd-sat3) * 0.2%), 60%);
  --accent-danger: hsl(calc(var(--lsd-hue2) + 180), calc(90% + var(--lsd-sat1) * 0.4%), 65%);
  --accent-info: hsl(calc(var(--lsd-hue3) + 200 + var(--lsd-hue2) * 0.2), calc(95% + var(--lsd-sat2) * 0.2%), 65%);
  --accent-warning: hsl(calc(var(--lsd-hue4) + 60), calc(90% + var(--lsd-sat3) * 0.4%), 65%);

  --bg-base: hsl(calc(var(--lsd-hue) + var(--lsd-hue2) * 0.3 + var(--lsd-hue3) * 0.15), calc(75% + var(--lsd-sat1) * 0.6%), calc(22% + var(--lsd-pulse) * 0.2%));
  --bg-secondary: hsl(calc(var(--lsd-hue2) + 90 + var(--lsd-hue4) * 0.4), calc(80% + var(--lsd-sat2) * 0.7%), 18%);
  --bg-tertiary: hsl(calc(var(--lsd-hue3) + 180 + var(--lsd-hue) * 0.25), calc(65% + var(--lsd-sat3) * 0.8%), 15%);
  --bg-deepest: hsl(calc(var(--lsd-hue4) + 270), calc(75% + var(--lsd-sat1) * 0.5%), calc(12% + var(--lsd-pulse) * 0.2%));
  --bg-float: hsl(calc(var(--lsd-hue) + 45 + var(--lsd-hue3) * 0.35), calc(85% + var(--lsd-sat2) * 0.5%), 25%);
  --bg-popover: hsl(calc(var(--lsd-hue2) + 135 + var(--lsd-hue4) * 0.45), calc(60% + var(--lsd-sat3) * 1%), 18%);
  --bg-input: hsl(calc(var(--lsd-hue3) + 225 + var(--lsd-hue) * 0.2), calc(70% + var(--lsd-sat1) * 0.8%), 20%);
  --user-card-bg: hsl(calc(var(--lsd-hue4) + 315 + var(--lsd-hue2) * 0.25), calc(80% + var(--lsd-sat2) * 0.6%), 22%);

  --text-primary: hsl(calc(var(--lsd-hue) + 60), calc(50% + var(--lsd-pulse) * 1% + var(--lsd-sat1) * 0.3%), 96%);
  --text-code: hsl(calc(var(--lsd-hue3) + 90 + var(--lsd-hue2) * 0.2), calc(90% + var(--lsd-sat3) * 0.4%), 80%);
  --text-mention: hsl(calc(var(--lsd-hue4) + 270), 100%, 90%);

  --mention-bg: hsla(calc(var(--lsd-hue)), calc(90% + var(--lsd-sat2) * 0.4%), 60%, calc(0.35 + var(--lsd-pulse) * 0.005));
  --mention-bg-hover: hsla(calc(var(--lsd-hue2)), 100%, 60%, 0.5);
  --mention-border: hsla(calc(var(--lsd-hue3) + 200), 100%, 65%, 1);

  --border-subtle: hsla(calc(var(--lsd-hue) + 60), calc(85% + var(--lsd-sat1) * 0.6%), 60%, 0.3);
  --border-default: hsla(calc(var(--lsd-hue2) + 120), calc(90% + var(--lsd-sat2) * 0.4%), 65%, 0.45);
  --border-medium: hsla(calc(var(--lsd-hue3) + 180), calc(95% + var(--lsd-sat3) * 0.2%), 65%, 0.55);
  --border-strong: hsla(calc(var(--lsd-hue4) + 240), 100%, 70%, 0.7);
  --border-focus: hsla(calc(var(--lsd-hue) + var(--lsd-hue3) + 300), 100%, 70%, calc(0.9 - var(--lsd-pulse) * 0.01));

  --scrollbar-track: hsla(calc(var(--lsd-hue2)), calc(85% + var(--lsd-sat1) * 0.5%), 50%, 0.2);
  --scrollbar-thumb: hsla(calc(var(--lsd-hue3) + 180), calc(90% + var(--lsd-sat2) * 0.4%), 60%, 0.6);
  --scrollbar-hover: hsla(calc(var(--lsd-hue4) + 90), 100%, 65%, 0.9);
}

html[data-theme="lsd"] body {
  background:
    radial-gradient(circle at calc(20% + var(--lsd-hue2) * 0.15%) 30%, hsla(var(--lsd-hue), calc(70% + var(--lsd-sat1) * 0.6%), 30%, 0.6) 0%, transparent 55%),
    radial-gradient(circle at calc(80% - var(--lsd-hue2) * 0.1%) 70%, hsla(calc(var(--lsd-hue) + 180), calc(70% + var(--lsd-sat2) * 0.6%), 30%, 0.6) 0%, transparent 55%),
    radial-gradient(circle at 50% calc(50% + var(--lsd-hue2) * 0.1%), hsla(calc(var(--lsd-hue) + 90), calc(70% + var(--lsd-sat3) * 0.6%), 35%, 0.5) 0%, transparent 65%),
    hsl(calc(var(--lsd-hue) + 60), 70%, 14%) !important;
  background-attachment: fixed !important;
}

@media (prefers-reduced-motion: reduce) {
  html[data-theme="lsd"] { animation: none; }
}
`;

let styleEl = null;

export default {
  id: 'lsd',
  name: 'LSD',
  cssOnly: true,
  onActivate() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-lsd-styles';
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
    }
    document.documentElement.dataset.theme = 'lsd';
  },
  onDeactivate() {
    if (document.documentElement.dataset.theme === 'lsd') {
      delete document.documentElement.dataset.theme;
    }
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }
  },
  vars: {
    bg_base: 'hsl(0, 100%, 22%)',
    bg_secondary: 'hsl(90, 100%, 18%)',
    bg_tertiary: 'hsl(180, 100%, 15%)',
    bg_deepest: 'hsl(270, 100%, 12%)',
    bg_float: 'hsl(45, 100%, 25%)',
    bg_popover: 'hsl(135, 100%, 18%)',
    bg_input: 'hsl(225, 100%, 20%)',
    user_card_bg: 'hsl(315, 100%, 22%)',
    accent: 'hsl(0, 100%, 60%)',
    accent_hover: 'hsl(30, 100%, 60%)',
    accent_success: 'hsl(120, 100%, 55%)',
    accent_danger: 'hsl(180, 100%, 60%)',
    accent_info: 'hsl(200, 100%, 60%)',
    accent_warning: 'hsl(60, 100%, 60%)',
    text_primary: 'hsl(60, 100%, 96%)',
    text_code: 'hsl(90, 100%, 80%)',
    text_mention: 'hsl(270, 100%, 90%)',
    content_base: '255 255 255',
    border_subtle: 'hsla(60, 100%, 60%, 0.3)',
    border_default: 'hsla(120, 100%, 65%, 0.45)',
    border_medium: 'hsla(180, 100%, 65%, 0.55)',
    border_strong: 'hsla(240, 100%, 70%, 0.7)',
    border_focus: 'hsla(300, 100%, 70%, 0.9)',
    scroll_track: 'hsla(0, 100%, 50%, 0.2)',
    scroll_thumb: 'hsla(180, 100%, 60%, 0.6)',
    scroll_hover: 'hsla(90, 100%, 65%, 0.9)',
    accent_rgb: '255 0 0',
    accent_hover_rgb: '255 128 0',
    accent_success_rgb: '0 255 0',
    accent_danger_rgb: '0 255 255',
    accent_info_rgb: '0 200 255',
    accent_warning_rgb: '255 255 0',
    bg_base_rgb: '178 0 0',
    bg_secondary_rgb: '128 178 0',
    bg_tertiary_rgb: '0 142 142',
    bg_deepest_rgb: '99 0 127',
    mention_bg: 'hsla(0, 100%, 60%, 0.35)',
    mention_bg_hover: 'hsla(0, 100%, 60%, 0.5)',
    mention_border: 'hsla(200, 100%, 65%, 1)',
    media_accent: 'hsl(0, 100%, 60%)',
    media_accent_rgb: '255 0 0',
  }
};