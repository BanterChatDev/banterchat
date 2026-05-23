import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { invertColor } from '../utils/accessibility/invertColor';
import { boostContrast } from '../utils/accessibility/hc';
import { parseTriplet } from '../utils/accessibility/_colorMath';
import { resolveSurfaceLayers } from '../themes/_surfaceLayers';
import { apiGetPrefs, apiUpdatePrefs, apiSetTheme, apiSetLang } from '../api/uiprefs';
import { getThemeById } from '../themes';
import { getLangById } from '../lang';
import { applyLanguage } from '../lang/apply';
import { on } from '../eventBus';

const DEFAULTS = {
  notification_sound_id: '',
  showMembers: true,
  dmSidebarOpen: true,
  dmSidebarWidth: 144,
  channelListWidth: 240,
  membersSidebarWidth: 208,
  collapsedCategories: {},
  lastChannelByGuild: {},
  mediaVolume: 1,
};

export const VAR_MAP = {
  bg_base: '--bg-base',
  bg_secondary: '--bg-secondary',
  bg_tertiary: '--bg-tertiary',
  bg_deepest: '--bg-deepest',
  bg_float: '--bg-float',
  bg_popover: '--bg-popover',
  bg_input: '--bg-input',
  accent: '--accent',
  accent_hover: '--accent-hover',
  accent_success: '--accent-success',
  accent_danger: '--accent-danger',
  accent_info: '--accent-info',
  accent_warning: '--accent-warning',
  text_primary: '--text-primary',
  text_code: '--text-code',
  text_mention: '--text-mention',
  content_base: '--content-base',
  border_subtle: '--border-subtle',
  border_default: '--border-default',
  border_medium: '--border-medium',
  border_strong: '--border-strong',
  border_focus: '--border-focus',
  scroll_track: '--scrollbar-track',
  scroll_thumb: '--scrollbar-thumb',
  scroll_hover: '--scrollbar-thumb-hover',
  accent_rgb: '--accent-rgb',
  accent_hover_rgb: '--accent-hover-rgb',
  accent_success_rgb: '--accent-success-rgb',
  accent_danger_rgb: '--accent-danger-rgb',
  accent_info_rgb: '--accent-info-rgb',
  accent_warning_rgb: '--accent-warning-rgb',
  bg_base_rgb: '--bg-base-rgb',
  bg_secondary_rgb: '--bg-secondary-rgb',
  bg_tertiary_rgb: '--bg-tertiary-rgb',
  bg_deepest_rgb: '--bg-deepest-rgb',
  mention_bg: '--mention-bg',
  mention_bg_hover: '--mention-bg-hover',
  mention_border: '--mention-border',
  media_accent: '--media-accent',
  media_accent_rgb: '--media-accent-rgb',
};

function resolveTheme(themeObj) {
  if (!themeObj) return null;
  if (themeObj.auto) {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return getThemeById(prefersDark ? 'dark' : 'light');
  }
  return themeObj;
}

let _autoMQ = null;
let _autoActive = false;

function ensureAutoListener(reapply) {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (_autoMQ) return;
  _autoMQ = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => { if (_autoActive) reapply(); };
  if (_autoMQ.addEventListener) _autoMQ.addEventListener('change', handler);
  else _autoMQ.addListener(handler);
}

let _activeTheme = null;
let _invertColors = false;
let _highContrast = false;

export function setHighContrast(value) {
  const next = !!value;
  if (_highContrast === next) return;
  _highContrast = next;
  if (_activeTheme) {
    applyTheme(_activeTheme);
  }
}

function tripletAvg(value) {
  const t = parseTriplet(value);
  if (!t) return 255;
  return (t.r + t.g + t.b) / 3;
}

const TRIPLET_KEYS = new Set([
  'content_base',
  'accent_rgb',
  'accent_hover_rgb',
  'accent_success_rgb',
  'accent_danger_rgb',
  'accent_info_rgb',
  'accent_warning_rgb',
  'bg_base_rgb',
  'bg_secondary_rgb',
  'bg_tertiary_rgb',
  'bg_deepest_rgb',
  'media_accent_rgb',
]);

export function setInvertColors(value) {
  const next = !!value;
  if (_invertColors === next) return;
  _invertColors = next;
  if (_activeTheme) {
    applyTheme(_activeTheme);
  }
}

export function applyTheme(themeObj) {
  if (!themeObj) return;
  _autoActive = !!themeObj.auto;
  ensureAutoListener(() => applyTheme(themeObj));
  const resolved = resolveTheme(themeObj);
  if (!resolved || !resolved.vars) return;
  if (resolved.surfaceSeed) {
    resolved.vars = resolveSurfaceLayers(resolved);
  }
  if (_activeTheme && _activeTheme !== themeObj && typeof _activeTheme.onDeactivate === 'function') {
    try { _activeTheme.onDeactivate(); } catch {}
  }
  _activeTheme = themeObj;
  const root = document.documentElement;
  if (!themeObj.cssOnly) {
    let darkText = true;
    if (_highContrast) {
      const cb = resolved.vars['content_base'] || '255 255 255';
      const cbAfter = _invertColors ? invertColor(cb, { isTriplet: true }) : cb;
      darkText = tripletAvg(cbAfter) < 128;
    }
    for (const [key, cssVar] of Object.entries(VAR_MAP)) {
      const raw = resolved.vars[key];
      if (raw == null) continue;
      const isTriplet = TRIPLET_KEYS.has(key);
      let value = raw;
      if (_invertColors) value = invertColor(value, { isTriplet });
      if (_highContrast) value = boostContrast(value, { isTriplet, darkText, amount: 0.45 });
      root.style.setProperty(cssVar, value);
    }
  } else {
    for (const [, cssVar] of Object.entries(VAR_MAP)) {
      root.style.removeProperty(cssVar);
    }
  }
  if (resolved.gradient) {
    const gradientValue = _invertColors
      ? resolved.gradient.replace(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g, (m) => invertColor(m))
      : resolved.gradient;
    root.style.setProperty('--bg-gradient', gradientValue);
    document.body.style.backgroundImage = `var(--bg-gradient)`;
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    root.style.removeProperty('--bg-gradient');
    document.body.style.backgroundImage = '';
    document.body.style.backgroundAttachment = '';
  }
  const blur = Number(resolved.backdropBlur) || 0;
  const sat = Number(resolved.backdropSaturate) || 100;
  if (blur > 0) {
    root.style.setProperty('--backdrop-blur', blur + 'px');
    root.style.setProperty('--backdrop-saturate', sat + '%');
    root.style.setProperty('--backdrop-filter', `blur(${blur}px) saturate(${sat}%)`);
  } else {
    root.style.removeProperty('--backdrop-blur');
    root.style.removeProperty('--backdrop-saturate');
    root.style.removeProperty('--backdrop-filter');
  }
  if (typeof themeObj.onActivate === 'function') {
    try { themeObj.onActivate(); } catch {}
  }
  try {
    localStorage.setItem('_themeId', themeObj.id);
    localStorage.setItem('_themeVars', JSON.stringify(resolved.vars));
    if (resolved.gradient) localStorage.setItem('_themeGradient', resolved.gradient);
    else localStorage.removeItem('_themeGradient');
    if (blur > 0) {
      localStorage.setItem('_themeBlur', String(blur));
      localStorage.setItem('_themeSaturate', String(sat));
    } else {
      localStorage.removeItem('_themeBlur');
      localStorage.removeItem('_themeSaturate');
    }
    localStorage.setItem('_themePanelRounded', resolved.panelRounded ? '1' : '0');
    localStorage.setItem('_themePanelGlow', resolved.panelGlow ? '1' : '0');
  } catch {}
}

const UIPrefsContext = createContext(null);

export function UIPrefsProvider({ initialTheme, initialLang, children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULTS }));

  useEffect(() => {
    let cancelled = false;
    apiGetPrefs().then((server) => {
      if (cancelled || !server) return;
      setPrefs(p => {
        const next = { ...p };
        for (const [k, v] of Object.entries(server)) {
          if (k !== 'theme_id' && k !== 'lang_id') next[k] = v;
        }
        return next;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (initialTheme && initialTheme.vars) {
      applyTheme(initialTheme);
      return initialTheme;
    }
    return null;
  });
  const [currentLang, setCurrentLang] = useState(() => {
    if (initialLang && initialLang.strings) {
      applyLanguage(initialLang);
      return initialLang;
    }
    return null;
  });
  const [themeSaving, setThemeSaving] = useState(false);
  const saveTimer = useRef(null);
  const pendingRef = useRef({});

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingRef.current = {};
    apiUpdatePrefs(pending).catch(() => {});
  }, []);

  useEffect(() => () => { clearTimeout(saveTimer.current); flush(); }, [flush]);

  const selectTheme = useCallback(async (themeId) => {
    setThemeSaving(true);
    try {
      const theme = getThemeById(themeId);
      applyTheme(theme);
      setCurrentTheme(theme);
      await apiSetTheme(themeId);
    } finally {
      setThemeSaving(false);
    }
  }, []);

  const selectLang = useCallback(async (langId) => {
    const lang = getLangById(langId);
    applyLanguage(lang);
    setCurrentLang(lang);
    await apiSetLang(langId);
  }, []);

  const IMMEDIATE_KEYS = new Set(['lastChannelByGuild', 'last_dm_peer_id']);

  const setPref = useCallback((key, value) => {
    if (key === 'theme_id') {
      void selectTheme(value).catch(() => {});
      return;
    }
    if (key === 'lang_id') {
      void selectLang(value).catch(() => {});
      return;
    }
    setPrefs(p => {
      const next = typeof value === 'function' ? value(p[key]) : value;
      if (p[key] === next) return p;
      pendingRef.current[key] = next;
      return { ...p, [key]: next };
    });
    clearTimeout(saveTimer.current);
    if (IMMEDIATE_KEYS.has(key)) {
      flush();
    } else {
      saveTimer.current = setTimeout(flush, 800);
    }
  }, [flush, selectTheme]);

  useEffect(() => {
    return on('prefsUpdate', (data) => {
      if (data.theme_id) {
        const theme = getThemeById(data.theme_id);
        applyTheme(theme);
        setCurrentTheme(theme);
      }
      if (data.lang_id) {
        const lang = getLangById(data.lang_id);
        applyLanguage(lang);
        setCurrentLang(lang);
      }
      setPrefs(p => {
        const next = { ...p };
        for (const [k, v] of Object.entries(data)) {
          if (k !== 'theme_id' && k !== 'theme' && k !== 'lang_id') next[k] = v;
        }
        return next;
      });
    });
  }, []);

  return React.createElement(
    UIPrefsContext.Provider,
    { value: { prefs, setPref, currentTheme, selectTheme, themeSaving, currentLang, selectLang } },
    children
  );
}

export function useUIPrefs() {
  const ctx = useContext(UIPrefsContext);
  if (!ctx) throw new Error('useUIPrefs must be inside UIPrefsProvider');
  return ctx;
}