import { useState, useEffect } from 'react';

let pendingReturnPath = null;

export function rememberReturnPath(path) {
  pendingReturnPath = path || null;
}

export function consumeReturnPath() {
  const p = pendingReturnPath;
  pendingReturnPath = null;
  return p;
}

function stripQuery(p) {
  const q = p.indexOf('?');
  return q === -1 ? p : p.slice(0, q);
}

function extractQuery(p) {
  const q = p.indexOf('?');
  return q === -1 ? '' : p.slice(q);
}

export function useRouter() {
  const [path, setPath] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (newPath, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', newPath);
    } else {
      window.history.pushState({}, '', newPath);
    }
    setPath(stripQuery(newPath));
    setSearch(extractQuery(newPath));
  };

  const match = (pattern) => {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  };

  return { path, search, navigate, match };
}