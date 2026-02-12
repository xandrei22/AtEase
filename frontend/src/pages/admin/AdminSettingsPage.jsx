import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth';
import PasswordInput from '../../components/PasswordInput';

const PASSWORD_HINT = 'At least 8 characters with uppercase, lowercase, number, and symbol.';

export default function AdminSettingsPage() {
  const { user, token, setUser } = useAuth();
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password and new password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(token, currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.data?.error || err?.message || 'Failed to change password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!editName.trim() || !editEmail.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    try {
      const updated = await authApi.updateProfile(token, editName, editEmail);
      setUser({ ...user, name: updated.name, email: updated.email });
      setIsEditingProfile(false);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.data?.error || err?.message || 'Failed to update profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Profile */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg">Account profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your admin account information.</p>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => {
                setEditName(user?.name || '');
                setEditEmail(user?.email || '');
                setIsEditingProfile(true);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} className="mt-6 max-w-md space-y-4">
            {message.text && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-700'
                }`}
                role="alert"
              >
                {message.text}
              </div>
            )}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="rounded-lg border border-border px-5 py-2.5 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="mt-1 text-foreground">{user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-foreground">{user?.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Role</dt>
              <dd className="mt-1 text-foreground capitalize">{user?.role || '—'}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="font-bold text-foreground text-lg">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your password regularly for security. {PASSWORD_HINT}
        </p>
        <form onSubmit={handleChangePassword} className="mt-4 max-w-md space-y-4">
          {message.text && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-700'
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-foreground">
              Current password
            </label>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
              New password
            </label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter new password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Confirm new password"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="font-bold text-foreground text-lg">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage account security and recovery options.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>• Use a strong, unique password and change it periodically.</li>
          <li>• Don’t share your login details with anyone.</li>
          <li>• Sign out when using a shared or public computer.</li>
        </ul>
        <p className="mt-4">
          <Link
            to="/admin/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password? Request a reset link
          </Link>
        </p>
      </section>
    </div>
  );
}
