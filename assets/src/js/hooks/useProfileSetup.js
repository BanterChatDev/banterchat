import { useState, useCallback } from 'react';
import { apiUpdateUser } from '../api/users';
import { DEFAULT_ROLE_COLOR } from '../constants';
import { t as tBare } from '../lang/apply';

export function useProfileSetup({ user, setUser, dirtyRef }) {
  const [bio, setBio] = useState(user.bio || '');
  const [newUsername, setNewUsername] = useState(user.username || '');
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  const bioChanged = bio.trim() !== (user.bio || '');
  const usernameChanged = newUsername.trim() !== user.username && newUsername.trim().length >= 3;
  const displayNameChanged = displayName.trim() !== (user.display_name || '');
  const isDirty = bioChanged || usernameChanged || displayNameChanged;

  if (dirtyRef) dirtyRef.current = isDirty;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setUsernameError('');
    setDisplayNameError('');
    const patch = {};
    const trimmedName = newUsername.trim();
    const trimmedDN = displayName.trim();
    const trimmedBio = bio.trim();
    if (trimmedName !== user.username) {
      if (trimmedName.length < 3 || trimmedName.length > 20) {
        setUsernameError(tBare('profile_validation.username_length'));
        setSaving(false);
        return false;
      }
      patch.username = trimmedName;
    }
    if (trimmedDN !== (user.display_name || '')) {
      if ([...trimmedDN].length > 32) {
        setDisplayNameError(tBare('profile_validation.display_name_too_long'));
        setSaving(false);
        return false;
      }
      patch.display_name = trimmedDN;
    }
    if (trimmedBio !== (user.bio || '')) {
      patch.bio = trimmedBio;
    }
    if (Object.keys(patch).length === 0) {
      setSaving(false);
      return true;
    }
    try {
      const resp = await apiUpdateUser(patch);
      setUser(prev => ({ ...prev, ...resp }));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [bio, newUsername, displayName, setUser, user.bio, user.username, user.display_name]);

  const handleReset = useCallback(() => {
    setNewUsername(user.username || '');
    setDisplayName(user.display_name || '');
    setBio(user.bio || '');
    setError('');
    setUsernameError('');
    setDisplayNameError('');
  }, [user.bio, user.username, user.display_name]);

  return {
    user,
    setUser,
    bio,
    setBio,
    newUsername,
    setNewUsername,
    displayName,
    setDisplayName,
    displayUsername: displayName.trim() || newUsername.trim() || user.username,
    saving,
    error,
    usernameError,
    displayNameError,
    isDirty,
    fallbackTint: DEFAULT_ROLE_COLOR,
    handleSave,
    handleReset,
  };
}