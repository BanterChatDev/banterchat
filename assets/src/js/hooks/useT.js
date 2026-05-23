import { useMemo } from 'react';
import { useUIPrefs } from './useUIPrefs';
import { translateFrom, t as tBare } from '../lang/apply';
import { getLangById } from '../lang';

export function useT() {
  let currentLang = null;
  try {
    currentLang = useUIPrefs().currentLang;
  } catch {
  }

  const strings = currentLang?.strings || getLangById('en_us').strings;
  return useMemo(() => (key) => translateFrom(strings, key), [strings]);
}

export { tBare };