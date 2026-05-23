import { t as tBare } from '../lang/apply';

export function parseUA(ua) {
  if (!ua) return tBare('settings_security.devices.unknown_device');
  const browser = /Chrome|Firefox|Safari|Edge|Opera/i.exec(ua)?.[0] || '';
  const os = /Windows|Mac OS|Linux|Android|iPhone|iPad/i.exec(ua)?.[0] || '';
  return [browser, os].filter(Boolean).join(tBare('settings_security.devices.ua_join')) || ua.slice(0, 40);
}