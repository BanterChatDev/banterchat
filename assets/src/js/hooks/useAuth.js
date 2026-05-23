import { useState, useEffect } from 'react';
import { fetchCSRF } from '../api/client';
import { setAvatar } from '../utils/avatarStore';
import { apiMe, apiLogin, apiRegister, apiLogout, apiVerifyKeyfile } from '../api/auth';
import { clearCache } from '../cache';

function clearAllSessionState() {
  clearCache();
  try { delete window.__currentUserId; } catch {}
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await fetchCSRF();
        const me = await apiMe();
        if (me) {
          setAvatar(me.id, me.avatar_id);
          setUser(me);
        }
      } catch {}
      setLoading(false);
    }
    init();
  }, []);

  const login = async (username, password) => {
    const u = await apiLogin(username, password);
    if (u && u.requires_keyfile) {
      const err = new Error(u.message || '');
      err.requiresKeyfile = true;
      err.username = u.username || username;
      throw err;
    }
    const me = await apiMe();
    setUser(me || u);
    return me || u;
  };

  const verifyKeyfile = async (username, keyfileHex) => {
    await apiVerifyKeyfile(username, keyfileHex);
    const me = await apiMe();
    setUser(me);
    return me;
  };

  const register = async (username, password) => {
    await apiRegister(username, password);
    const me = await apiMe();
    setUser(me);
    return me;
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    clearAllSessionState();
    setUser(null);
  };

  return { user, loading, login, register, logout, setUser, verifyKeyfile, clearAllSessionState };
}