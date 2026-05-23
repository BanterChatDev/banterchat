import React from 'react';
import { apiAdminAuditLog, apiAdminAuditLogExportURL } from '../../api/admin';
import { useT } from '../../hooks/useT';
import { AuditLogList, GLOBAL_ACTION_FILTERS } from '../auditlog';

export default function AdminAuditLogTab() {
  const t = useT();
  return (
    <AuditLogList
      title={t('auditlog.heading')}
      fetchPage={apiAdminAuditLog}
      actionFilters={GLOBAL_ACTION_FILTERS}
      showActorFilter
      showTargetFilter
      exportUrl={apiAdminAuditLogExportURL()}
    />
  );
}