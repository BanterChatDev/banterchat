import React from 'react';
import { SettingsIcon, LockIcon } from '../icons';
import { t } from '../../lang/apply';

export const getSettingsTabs = () => [
  { id: 'general', label: t('settings_tabs_inner.general'), icon: <SettingsIcon className="w-4 h-4" /> },
  { id: 'permissions', label: t('settings_tabs_inner.permissions'), flush: true, icon: <LockIcon className="w-4 h-4" /> },
];