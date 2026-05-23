import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { apiGetAccessibilityPrefs, apiUpdateAccessibilityPrefs } from '../api/accessibilityprefs';
import { on } from '../eventBus';
import { setInvertColors, setHighContrast } from './useUIPrefs';
import { applyTextScale } from '../utils/accessibility/textScale';

const DEFAULTS = {
  largerTextScale: 1,
  highContrast: false,
  invertColors: false,
};

function applyToRoot(prefs) {
  if (typeof document === 'undefined') return;
  const scale = typeof prefs.largerTextScale === 'number' ? prefs.largerTextScale : 1;
  applyTextScale(scale);
  setHighContrast(!!prefs.highContrast);
  setInvertColors(!!prefs.invertColors);
}

const AccessibilityPrefsContext = createContext(null);

export function AccessibilityPrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const saveTimer = useRef(null);
  const pendingRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    apiGetAccessibilityPrefs().then((server) => {
      if (cancelled) return;
      const merged = { ...DEFAULTS, ...(server || {}) };
      setPrefs(merged);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    applyToRoot(prefs);
  }, [prefs]);

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingRef.current = {};
    apiUpdateAccessibilityPrefs(pending).catch(() => {});
  }, []);

  useEffect(() => () => { clearTimeout(saveTimer.current); flush(); }, [flush]);

  const setPref = useCallback((key, value) => {
    setPrefs(p => {
      const next = typeof value === 'function' ? value(p[key]) : value;
      if (p[key] === next) return p;
      pendingRef.current[key] = next;
      return { ...p, [key]: next };
    });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 800);
  }, [flush]);

  useEffect(() => {
    return on('accessibilityPrefsUpdate', (data) => {
      if (!data) return;
      setPrefs(p => ({ ...p, ...data }));
    });
  }, []);

  return React.createElement(
    AccessibilityPrefsContext.Provider,
    { value: { prefs, setPref } },
    children
  );
}

export function useAccessibilityPrefs() {
  const ctx = useContext(AccessibilityPrefsContext);
  if (!ctx) throw new Error('useAccessibilityPrefs must be inside AccessibilityPrefsProvider');
  return ctx;
}