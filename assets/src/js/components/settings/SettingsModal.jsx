import React, { useRef, useCallback, useMemo } from 'react';
import { UserIcon, ColorIcon, LanguageIcon, ShieldIcon, BellIcon, EyeIcon, KeyIcon, LockIcon, DesktopIcon, ListIcon } from '../icons';
import { useT } from '../../hooks/useT';
import ProfileTab from './ProfileTab';
import ThemesTab from './ThemesTab';
import LanguageTab from './LanguageTab';
import NotificationsTab from './NotificationsTab';
import AccessibilityTab from './AccessibilityTab';
import KeyfileTab from './security/KeyfileTab';
import PasswordTab from './security/PasswordTab';
import DevicesTab from './security/DevicesTab';
import SecurityLogTab from './security/SecurityLogTab';
import FullscreenLayout from '../ui/FullscreenLayout';

export default function SettingsModal({ isOpen, onClose, user, setUser }) {
  const profileDirtyRef = useRef(false);
  const onBeforeLeave = useCallback(() => !profileDirtyRef.current, []);
  const t = useT();

  const tabs = useMemo(() => [
    { id: 'profile', label: t('settings.tabs.profile'), icon: <UserIcon className="w-4 h-4" />, group: 'general', groupLabel: t('settings.group.general') },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: <BellIcon className="w-4 h-4" />, group: 'general', groupLabel: t('settings.group.general') },
    { id: 'themes', label: t('settings.tabs.themes'), icon: <ColorIcon className="w-4 h-4" />, group: 'general', groupLabel: t('settings.group.general') },
    { id: 'language', label: t('settings.tabs.language'), icon: <LanguageIcon className="w-4 h-4" />, group: 'general', groupLabel: t('settings.group.general') },
    { id: 'accessibility', label: t('settings.tabs.accessibility'), icon: <EyeIcon className="w-4 h-4" />, group: 'general', groupLabel: t('settings.group.general') },
    { id: 'keyfile', label: t('settings.tabs.keyfile'), icon: <KeyIcon className="w-4 h-4" />, group: 'security', groupLabel: t('settings.group.security') },
    { id: 'password', label: t('settings.tabs.password'), icon: <LockIcon className="w-4 h-4" />, group: 'security', groupLabel: t('settings.group.security') },
    { id: 'devices', label: t('settings.tabs.devices'), icon: <DesktopIcon className="w-4 h-4" />, group: 'security', groupLabel: t('settings.group.security') },
    { id: 'security_log', label: t('settings.tabs.security_log'), icon: <ListIcon className="w-4 h-4" />, group: 'security', groupLabel: t('settings.group.security') },
  ], [t]);

  if (!isOpen) return null;

  return (
    <FullscreenLayout title={t('settings.title')} tabs={tabs} onClose={onClose} defaultTab="profile" onBeforeLeave={onBeforeLeave}>
      {(tab) => (
        <>
          {tab === 'profile' && <ProfileTab user={user} setUser={setUser} dirtyRef={profileDirtyRef} />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'themes' && <ThemesTab />}
          {tab === 'language' && <LanguageTab />}
          {tab === 'accessibility' && <AccessibilityTab />}
          {tab === 'keyfile' && <KeyfileTab user={user} setUser={setUser} />}
          {tab === 'password' && <PasswordTab user={user} />}
          {tab === 'devices' && <DevicesTab />}
          {tab === 'security_log' && <SecurityLogTab />}
        </>
      )}
    </FullscreenLayout>
  );
}