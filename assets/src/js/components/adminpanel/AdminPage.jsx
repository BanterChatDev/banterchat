import React from 'react';
import { ShieldIcon, UserIcon, HashIcon, CloseIcon, FlagIcon, StarIcon, DocumentIcon, LockIcon, BoltIcon } from '../icons';
import FullscreenLayout from '../ui/FullscreenLayout';
import AdminStats from './AdminStats';
import AdminUsersTab from './AdminUsersTab';
import AdminBotsTab from './AdminBotsTab';
import AdminGuildsTab from './AdminGuildsTab';
import AdminTerminationsTab from './AdminTerminationsTab';
import AdminReportsTab from './AdminReportsTab';
import AdminListingsTab from './AdminListingsTab';
import AdminAuditLogTab from './AdminAuditLogTab';
import AdminWarningsTab from './AdminWarningsTab';
import AdminVanityTab from './AdminVanityTab';
import { consumeReturnPath } from '../../router';
import { useT } from '../../hooks/useT';

export default function AdminPage({ user, navigate, path }) {
  const t = useT();
  if (!user?.is_site_admin) {
    window.location.href = '/404.html';
    return null;
  }
  
  const TABS = [
    { id: 'overview', label: t('adminpanel.tab_overview'), icon: <ShieldIcon className="w-4 h-4" /> },
    { id: 'reports', label: t('adminpanel.tab_reports'), icon: <FlagIcon className="w-4 h-4" /> },
    { id: 'users', label: t('adminpanel.tab_users'), icon: <UserIcon className="w-4 h-4" /> },
    { id: 'bots', label: t('adminpanel.tab_bots'), icon: <BoltIcon className="w-4 h-4" /> },
    { id: 'guilds', label: t('adminpanel.tab_guilds'), icon: <HashIcon className="w-4 h-4" /> },
    { id: 'listings', label: t('adminpanel.tab_listings'), icon: <StarIcon className="w-4 h-4" /> },
    { id: 'terminations', label: t('adminpanel.tab_terminations'), icon: <CloseIcon className="w-4 h-4" /> },
    { id: 'warnings', label: 'Warnings', icon: <ShieldIcon className="w-4 h-4" /> },
    { id: 'vanity', label: 'Vanity URLs', icon: <LockIcon className="w-4 h-4" /> },
    { id: 'auditlog', label: 'Audit Log', icon: <DocumentIcon className="w-4 h-4" />, flush: true },
  ];

  const initial = path?.split('/')[2] || 'overview';
  const defaultTab = TABS.find(tab => tab.id === initial) ? initial : 'overview';

  return (
    <FullscreenLayout
      title={t('adminpanel.page_title')}
      subtitle={user.username}
      tabs={TABS}
      defaultTab={defaultTab}
      onClose={() => navigate(consumeReturnPath() || '/channels')}
    >
      {(tab) => (
        <>
          {tab === 'overview' && <AdminStats />}
          {tab === 'reports' && <AdminReportsTab currentUserId={user.id} />}
          {tab === 'users' && <AdminUsersTab currentUserId={user.id} />}
          {tab === 'bots' && <AdminBotsTab currentUserId={user.id} />}
          {tab === 'guilds' && <AdminGuildsTab navigate={navigate} />}
          {tab === 'listings' && <AdminListingsTab />}
          {tab === 'terminations' && <AdminTerminationsTab />}
          {tab === 'warnings' && <AdminWarningsTab />}
          {tab === 'vanity' && <AdminVanityTab />}
          {tab === 'auditlog' && <AdminAuditLogTab />}
        </>
      )}
    </FullscreenLayout>
  );
}