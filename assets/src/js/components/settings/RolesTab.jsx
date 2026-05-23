import React, { useState, useEffect } from 'react';
import { apiListRoles, apiCreateRole, apiDeleteRole, apiUpdateRole } from '../../api/roles';
import { DEFAULT_ROLE_COLOR } from '../../constants';
import { usePermEvents } from '../../hooks/usePermEvents';
import { PlusIcon, ArrowLeftIcon } from '../icons';
import ColorPicker from './ColorPicker';
import RoleMemberManager from './RoleMemberManager';
import RoleList from './RoleList';

import { ADMIN_ROLE_ID, DEFAULT_ROLE_ID, ALL_PERMISSIONS } from '../../config';
import Spinner from '../ui/Spinner';
import PermissionToggleList from '../ui/PermissionToggleList';
import TriStateToggle from '../ui/TriStateToggle';
import RoleSidebar, { RoleHeader } from '../ui/RoleSidebar';
import { getTopRolePosition, toBig } from '../../permissions';
import { useGuildMe } from '../../hooks/useGuildMe';
import { useT } from '../../hooks/useT';
const PRESET_IDS = [ADMIN_ROLE_ID, DEFAULT_ROLE_ID];
const isPreset = (role) => PRESET_IDS.includes(role.id);

export default function RolesTab({ user, guildId }) {
  const t = useT();
  const { data: guildMe } = useGuildMe(guildId, user?.id);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_ROLE_COLOR);
  const [newDesc, setNewDesc] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(DEFAULT_ROLE_COLOR);
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState('');
  const [editPerms, setEditPerms] = useState(0n);
  const [editDeny, setEditDeny] = useState(0n);
  const [editMentionable, setEditMentionable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState('permissions');

  const fetchRoles = () => {
    if (!guildId) { setLoading(false); return; }
    apiListRoles(guildId).then(r => { setRoles(r || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRoles(); }, [guildId]);

  usePermEvents({
    roleCreate: (role) => setRoles(prev => Array.isArray(prev) && prev.some(r => r.id === role.id) ? prev : [...(Array.isArray(prev) ? prev : []), role]),
    roleUpdate: (role) => {
      setRoles(prev => prev.map(r => r.id === role.id ? role : r).sort((a, b) => (a.position || 0) - (b.position || 0)));
      setSelectedRole(prev => prev && prev.id === role.id ? role : prev);
    },
    roleDelete: ({ id }) => {
      setRoles(prev => prev.filter(r => r.id !== id));
      setSelectedRole(prev => prev && prev.id === id ? null : prev);
    },
  });

  const userTopPos = getTopRolePosition(guildMe);
  const isOwner = !!guildMe?.is_owner;

  // Owner can edit anything. For non-owners, a role is "above" them if its
  // position is ≤ their topmost role's position (lower number = higher rank).
  const isAboveUser = (role) => !isOwner && !isPreset(role) && role.position <= userTopPos;

  const openEditor = (role) => {
    if (isAboveUser(role)) return;
    setSelectedRole(role);
    setEditName(role.name);
    setEditColor(role.color);
    setEditDesc(role.description);
    setEditPerms(toBig(role.permissions));
    setEditDeny(toBig(role.deny));
    setEditMentionable(role.mentionable || false);
    setEditError('');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const trimmed = editName.trim().toLowerCase();
    if (trimmed.length < 2 || trimmed.length > 30) { setEditError(t('common.name_validation').replace('{min}', 2).replace('{max}', 30)); return; }
    setEditError('');
    setSaving(true);
    try {
      const updated = await apiUpdateRole(selectedRole.id, { name: trimmed, color: editColor, description: editDesc.trim(), permissions: Number(editPerms), deny: Number(editDeny), mentionable: editMentionable });
      setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedRole(updated);
    } catch (err) { setEditError(err.message); }
    setSaving(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim().toLowerCase();
    if (trimmed.length < 2 || trimmed.length > 30) { setError(t('common.name_validation').replace('{min}', 2).replace('{max}', 30)); return; }
    setError('');
    setCreating(true);
    try {
      const role = await apiCreateRole(guildId, trimmed, newColor, newDesc.trim(), 0, 0, 100);
      setRoles(prev => prev.some(r => r.id === role.id) ? prev : [...prev, role]);
      setNewName('');
      setNewColor(DEFAULT_ROLE_COLOR);
      setNewDesc('');
      setShowCreate(false);
      openEditor(role);
    } catch (err) { setError(err.message); }
    setCreating(false);
  };

  const handleDelete = async (role) => {
    if (isPreset(role)) return;
    try {
      await apiDeleteRole(role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
      if (selectedRole && selectedRole.id === role.id) setSelectedRole(null);
    } catch {}
  };

  const handleReorder = (updatedCustom) => {
    setRoles(prev => {
      const presets = prev.filter(r => isPreset(r));
      return [...presets, ...updatedCustom].sort((a, b) => (a.position || 0) - (b.position || 0));
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const preset = selectedRole ? isPreset(selectedRole) : false;

  const createForm = showCreate && (
    <form onSubmit={handleCreate} className="tw-card rounded-lg p-3 space-y-3 mb-1.5">
      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9-_ ]/g, ''))} placeholder={t('settings_roles.name_placeholder')} className="w-full tw-input px-2.5 py-2 text-xs" maxLength={30} />
      <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t('settings_roles.description_placeholder')} className="w-full tw-input px-2.5 py-2 text-xs" maxLength={256} />
      <ColorPicker value={newColor} onChange={setNewColor} />
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setShowCreate(false)} className="flex-1 tw-btn-secondary text-[10px] py-1.5">{t('common.cancel')}</button>
        <button type="submit" disabled={!newName.trim() || creating} className="flex-1 tw-btn-primary text-[10px] py-1.5">{creating ? t('settings_roles.creating_short') : t('settings_roles.create')}</button>
      </div>
    </form>
  );

  const sidebarHeader = (
    <div className="flex items-center justify-between w-full">
      <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{(roles.length === 1 ? t('settings_roles.count_one') : t('settings_roles.count_other')).replace('{n}', roles.length)}</span>
      <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] rounded px-2 py-1 transition-colors">
        <PlusIcon className="w-2.5 h-2.5" /> {t('settings_roles.new')}
      </button>
    </div>
  );

  const editorTabs = [
    { id: 'permissions', label: t('settings_roles.tab_permissions') },
    { id: 'settings', label: t('settings_roles.tab_settings') },
    { id: 'members', label: t('settings_roles.tab_members') },
  ];

  const editorContent = selectedRole ? (
    <div className="flex flex-col h-full min-h-0">
      {!preset && isAboveUser(selectedRole) ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-white/25">{t('settings_roles.above_rank')}</p>
        </div>
      ) : (
        <>
          <div className="flex border-b border-[var(--border-default)] shrink-0 px-2 sm:px-4">
            {editorTabs.map(tab => (
              <button key={tab.id} onClick={() => setEditorTab(tab.id)} className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${editorTab === tab.id ? 'border-white/80 text-white/90' : 'border-transparent text-white/30 hover:text-white/50'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {editorTab === 'permissions' && (
              <PermissionToggleList
                permissions={ALL_PERMISSIONS}
                getState={(bit) => {
                  const b = toBig(bit);
                  if ((editDeny & b) !== 0n) return 'deny';
                  if ((editPerms & b) !== 0n) return 'allow';
                  return 'neutral';
                }}
                onToggle={(bit, state) => {
                  const b = toBig(bit);
                  setEditPerms(prev => state === 'allow' ? prev | b : prev & ~b);
                  setEditDeny(prev => state === 'deny' ? prev | b : prev & ~b);
                }}
              />
            )}
            {editorTab === 'settings' && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="tw-label mb-2">{t('settings_roles.field_name')}</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value.toLowerCase().replace(/[^a-z0-9-_ ]/g, ''))} className="w-full tw-input px-3 py-2.5" maxLength={30} />
                  </div>
                  <div>
                    <label className="tw-label mb-2">{t('settings_roles.field_color')}</label>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  </div>
                </div>
                <div>
                  <label className="tw-label mb-2">{t('settings_roles.field_description')}</label>
                  <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder={t('settings_roles.description_input_placeholder')} className="w-full tw-input px-3 py-2.5" maxLength={256} />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm text-white/70 font-medium">{t('settings_roles.mentionable_label')}</div>
                    <div className="text-[11px] text-white/25 mt-0.5">{t('settings_roles.mentionable_hint')}</div>
                  </div>
                  <TriStateToggle value={editMentionable ? 'allow' : 'neutral'} onChange={(s) => setEditMentionable(s === 'allow')} />
                </div>
                {editError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><p className="text-xs text-red-400">{editError}</p></div>}
              </div>
            )}
            {editorTab === 'members' && (
              <div className="p-4 sm:p-5">
                <RoleMemberManager role={selectedRole} />
              </div>
            )}
          </div>
          {!preset && (
            <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 sm:px-5 py-3 flex gap-3 shrink-0">
              <button type="button" onClick={() => setSelectedRole(null)} className="flex-1 tw-btn-secondary">{t('common.cancel')}</button>
              <button type="button" onClick={handleEdit} disabled={!editName.trim() || saving} className="flex-1 tw-btn-primary">{saving ? t('common.saving') : t('common.save_changes')}</button>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="hidden sm:flex flex-1 min-h-0">
        <RoleSidebar header={sidebarHeader}>
          {createForm}
          <RoleList roles={roles} selectedRole={selectedRole} onSelect={openEditor} onDelete={handleDelete} onRolesReorder={handleReorder} userTopPosition={userTopPos} isOwner={isOwner} />
        </RoleSidebar>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {selectedRole ? (
            <>
              <RoleHeader role={selectedRole} label={preset ? t('settings_roles.system_role_header') : t('settings_roles.edit_role_header')} />
              <div className="flex-1 flex flex-col min-h-0">
                {editorContent}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-white/20">{t('settings_roles.select_to_edit')}</p>
            </div>
          )}
        </div>
      </div>
      <div className="sm:hidden flex-1 flex flex-col min-h-0">
        {selectedRole ? (
          <div className="flex-1 flex flex-col min-h-0">
            <button onClick={() => setSelectedRole(null)} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors px-4 py-3 shrink-0">
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              {t('settings_roles.back')}
            </button>
            {editorContent}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{(roles.length === 1 ? t('settings_roles.count_one') : t('settings_roles.count_other')).replace('{n}', roles.length)}</p>
              <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] rounded px-2 py-1 transition-colors">
                <PlusIcon className="w-2.5 h-2.5" /> {t('settings_roles.new')}
              </button>
            </div>
            {createForm}
            <RoleList roles={roles} selectedRole={selectedRole} onSelect={openEditor} onDelete={handleDelete} onRolesReorder={handleReorder} userTopPosition={userTopPos} isOwner={isOwner} />
          </div>
        )}
      </div>
    </div>
  );
}