const listeners = {};

export function toEventKey(backendType) {
  return backendType.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function emit(key, data) {
  const fns = listeners[key];
  if (fns) for (const fn of fns) fn(data);
}

export function on(key, fn) {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(fn);
  return () => { listeners[key] = listeners[key].filter(f => f !== fn); };
}
