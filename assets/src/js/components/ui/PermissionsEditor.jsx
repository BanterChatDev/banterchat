import React, { useMemo } from 'react';
import PermissionToggleList from './PermissionToggleList';
import RoleSidebar, { RolePills, RoleSidebarItem, RoleHeader } from './RoleSidebar';
import { getChannelPermissions, toBig } from '../../permissions';
import Spinner from './Spinner';
import { useT } from '../../hooks/useT';

export async function saveAllOverrides(overrides, roles, saveFn) {
  for (const roleId of Object.keys(overrides)) {
    const ov = overrides[roleId];
    await saveFn(roleId, Number(toBig(ov.allow)), Number(toBig(ov.deny)));
  }
  for (const role of roles) {
    if (!overrides[role.id]) {
      await saveFn(role.id, 0, 0);
    }
  }
}

export function usePermEditor({ overrides, setOverrides }) {
  const getPermState = (roleId, bit) => {
    const ov = overrides[roleId];
    if (!ov) return 'neutral';
    const b = toBig(bit);
    if ((toBig(ov.allow) & b) !== 0n) return 'allow';
    if ((toBig(ov.deny) & b) !== 0n) return 'deny';
    return 'neutral';
  };

  const setPermState = (roleId, bit, state) => {
    setOverrides(prev => {
      const current = prev[roleId] || { allow: 0n, deny: 0n };
      const b = toBig(bit);
      let allow = toBig(current.allow);
      let deny = toBig(current.deny);
      allow &= ~b;
      deny &= ~b;
      if (state === 'allow') allow |= b;
      if (state === 'deny') deny |= b;
      return { ...prev, [roleId]: { allow, deny } };
    });
  };

  return { getPermState, setPermState };
}

export default function PermissionsEditor({ roles, overrides, setOverrides, permLoading, permSaving, onSave, onClose, channelType }) {
  const t = useT();
  const PERMS = useMemo(() => getChannelPermissions(channelType), [channelType]);
  const [selectedRoleId, setSelectedRoleId] = React.useState(null);
  const { getPermState, setPermState } = usePermEditor({ overrides, setOverrides });

  React.useEffect(() => {
    if (roles.length > 0 && (!selectedRoleId || !roles.find(r => r.id === selectedRoleId))) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  if (permLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="md" /></div>;
  }

  if (roles.length === 0) {
    return <div className="flex items-center justify-center h-full"><p className="text-sm text-white/30">{t('ui.permissions_editor_no_roles')}</p></div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <RolePills roles={roles} selectedRoleId={selectedRoleId} onSelect={setSelectedRoleId} />

      <div className="flex flex-1 min-h-0">
        <RoleSidebar header={<span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{t('ui.permissions_editor_roles_template').replace('{n}', roles.length)}</span>}>
          {roles.map(role => (
            <RoleSidebarItem key={role.id} role={role} isSelected={selectedRoleId === role.id} onClick={() => setSelectedRoleId(role.id)} />
          ))}
        </RoleSidebar>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {selectedRole && (
            <>
              <RoleHeader role={selectedRole} label={t('ui.permissions_editor_role_header_label')} />
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <PermissionToggleList
                  permissions={PERMS}
                  getState={(bit) => getPermState(selectedRole.id, bit)}
                  onToggle={(bit, state) => setPermState(selectedRole.id, bit, state)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 sm:px-5 py-3 flex gap-3 shrink-0">
        <button type="button" onClick={onClose} className="flex-1 tw-btn-secondary">{t('common.cancel')}</button>
        <button type="button" onClick={onSave} disabled={permSaving} className="flex-1 tw-btn-primary">{permSaving ? t('common.saving') : t('ui.permissions_editor_save')}</button>
      </div>
    </div>
  );
}