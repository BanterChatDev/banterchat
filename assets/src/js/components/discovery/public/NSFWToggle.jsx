import React, { useState, useEffect } from 'react';
import { useT } from '../../../hooks/useT';

function readCookie() {
  const m = document.cookie.match(/(?:^|; )nsfw_opt_in=([^;]*)/);
  return m ? decodeURIComponent(m[1]) === '1' : false;
}

export function useNSFWOptIn() {
  const [on, setOn] = useState(readCookie);
  useEffect(() => {
    const handler = () => setOn(readCookie());
    window.addEventListener('nsfw-changed', handler);
    return () => window.removeEventListener('nsfw-changed', handler);
  }, []);
  return on;
}

export default function NSFWToggle() {
  const t = useT();
  const [on, setOn] = useState(readCookie);

  const toggle = (next) => {
    setOn(next);
    document.cookie = `nsfw_opt_in=${next ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent('nsfw-changed'));
  };

  return (
    <label className="discovery-nsfw-toggle">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => toggle(e.target.checked)}
      />
      {t('discovery.public_nsfw_toggle')}
    </label>
  );
}