import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/common/AppShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { changePassword, updateProfile } from '../services/authService.js';
import { validateEmail, validateName, validatePassword, validateConfirmPassword } from '../utils/validation.js';

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    const nameErr = validateName(profile.fullName);
    const emailErr = validateEmail(profile.email);
    if (nameErr || emailErr) {
      setError(nameErr || emailErr);
      return;
    }
    setSaving(true);
    setError('');
    setProfileMsg('');
    try {
      const updated = await updateProfile(profile);
      updateUser(updated || profile);
      setProfileMsg('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    const pErr = validatePassword(passwords.newPassword);
    const cErr = validateConfirmPassword(passwords.newPassword, passwords.confirmPassword);
    if (!passwords.currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (pErr || cErr) {
      setError(pErr || cErr);
      return;
    }
    setSaving(true);
    setError('');
    setPasswordMsg('');
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswordMsg('Password changed.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800 dark:bg-brand-900 dark:text-accent-400">
            {initials(profile.fullName || profile.username)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold">{profile.fullName || 'Your profile'}</h1>
            <p className="text-sm text-slate-500">@{profile.username || 'username'}</p>
            {user?.createdAt && (
              <p className="text-xs text-slate-400">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        {error && <p className="alert-error">{error}</p>}
        <form className="card space-y-4" onSubmit={onSaveProfile}>
          <h2 className="font-semibold">Edit profile</h2>
          <div>
            <label htmlFor="fullName" className="label">Full name</label>
            <input id="fullName" className="input" value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="username" className="label">Username</label>
            <input id="username" className="input" value={profile.username} disabled />
            <p className="mt-1 text-xs text-slate-400">Username changes depend on backend support.</p>
          </div>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" className="input" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          </div>
          {profileMsg && <p className="alert-info">{profileMsg}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>Save profile</button>
        </form>
        <form className="card space-y-4" onSubmit={onChangePassword}>
          <h2 className="font-semibold">Change password</h2>
          <div>
            <label htmlFor="currentPassword" className="label">Current password</label>
            <input id="currentPassword" type="password" className="input" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="newPassword" className="label">New password</label>
            <input id="newPassword" type="password" className="input" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label">Confirm new password</label>
            <input id="confirmPassword" type="password" className="input" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
          {passwordMsg && <p className="alert-info">{passwordMsg}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>Update password</button>
        </form>
        <section className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Session</h2>
            <p className="text-sm text-slate-500">Log out clears the in-memory session and the auth token.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onLogout}>Log out</button>
        </section>
      </div>
    </AppShell>
  );
}
