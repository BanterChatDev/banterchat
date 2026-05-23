import { useState } from 'react';
import { apiListRoles } from '../api/roles';
import { saveAllOverrides } from '../components/ui/PermissionsEditor';

export default function usePermOverrides(getPermsFn, setPermFn, entityId, guildId) {
  const [roles, setRoles] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const loadPerms = (id) => {
    if (!guildId) return;
    apiListRoles(guildId).then(r => setRoles(Array.isArray(r) ? r : []));
    setPermLoading(true);
    getPermsFn(id).then(perms => {
      const map = {};
      for (const p of (perms || [])) {
        map[p.role_id] = { allow: p.allow || 0, deny: p.deny || 0 };
      }
      setOverrides(map);
      setPermLoading(false);
    }).catch(() => setPermLoading(false));
  };

  const savePerms = async (id, onDone) => {
    setPermSaving(true);
    try {
      await saveAllOverrides(overrides, roles, (roleId, allow, deny) => setPermFn(id, roleId, allow, deny));
      onDone?.();
    } catch {}
    setPermSaving(false);
  };

  return { roles, overrides, setOverrides, permLoading, permSaving, loadPerms, savePerms };
}