import { useState, useEffect, useCallback, useRef } from 'react';

async function probePermission(permName) {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return null;
  }
  try {
    const status = await navigator.permissions.query({ name: permName });
    return status.state;
  } catch {
    return null;
  }
}

export function useMediaDevices(kind, permName, mediaConstraints) {
  const [devices, setDevices] = useState([]);
  const [permState, setPermState] = useState('unknown');
  const watcherRef = useRef(null);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setDevices([]);
      setPermState('unsupported');
      return [];
    }
    let list = [];
    try {
      list = await navigator.mediaDevices.enumerateDevices();
    } catch {
      setDevices([]);
      return [];
    }
    const inputs = list.filter(d => d.kind === kind);
    setDevices(inputs);

    const queried = await probePermission(permName);
    if (queried === 'granted' || queried === 'denied' || queried === 'prompt') {
      setPermState(queried);
    } else if (inputs.length > 0 && inputs.some(d => !!d.label)) {
      setPermState('granted');
    } else {
      setPermState('prompt');
    }
    return inputs;
  }, [kind, permName]);

  const requestPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      await refresh();
      return true;
    } catch {
      setPermState('denied');
      return false;
    }
  }, [refresh, mediaConstraints]);

  useEffect(() => {
    refresh();
    const md = navigator.mediaDevices;
    if (md && md.addEventListener) {
      const onChange = () => refresh();
      md.addEventListener('devicechange', onChange);
      watcherRef.current = onChange;
    }
    let permStatus = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: permName }).then(status => {
        permStatus = status;
        const onPermChange = () => refresh();
        try { status.addEventListener('change', onPermChange); } catch {}
      }).catch(() => {});
    }
    return () => {
      if (md && md.removeEventListener && watcherRef.current) {
        md.removeEventListener('devicechange', watcherRef.current);
      }
      if (permStatus) {
        try { permStatus.removeEventListener('change', refresh); } catch {}
      }
    };
  }, [refresh, permName]);

  const hasPermission = permState === 'granted';
  const isDenied = permState === 'denied';
  const isUnsupported = permState === 'unsupported';

  return { devices, hasPermission, isDenied, isUnsupported, permState, refresh, requestPermission };
}