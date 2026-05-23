let permissionState = 'default';
let permissionChecked = false;

export function initDesktopNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  permissionState = Notification.permission;
  permissionChecked = true;
  return permissionState;
}

export function requestDesktopPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return Promise.resolve('unsupported');
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    permissionState = Notification.permission;
    return Promise.resolve(permissionState);
  }
  return Notification.requestPermission().then(p => {
    permissionState = p;
    return p;
  }).catch(() => 'denied');
}

export function getDesktopPermission() {
  if (!permissionChecked) initDesktopNotifications();
  return permissionState;
}

export function fireDesktopNotification({ title, body, icon, tag, onClick }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;
  if (document.visibilityState === 'visible' && document.hasFocus()) return null;
  try {
    const n = new Notification(title || 'Banter', {
      body: (body || '').slice(0, 200),
      icon: icon || '/media/landing/logo.webp',
      tag: tag || undefined,
      silent: false,
    });
    if (onClick) {
      n.onclick = () => {
        try { window.focus(); } catch {}
        try { onClick(); } catch {}
        n.close();
      };
    }
    setTimeout(() => { try { n.close(); } catch {} }, 7000);
    return n;
  } catch {
    return null;
  }
}