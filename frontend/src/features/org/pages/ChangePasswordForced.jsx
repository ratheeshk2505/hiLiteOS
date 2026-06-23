import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgAuth } from '../context/OrgAuthContext';
import { orgApi } from '../api/orgApi';
import { getErrorMessage } from '../api/apiClient';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { usePageTitle } from '../../../hooks/usePageTitle';

export default function ChangePasswordForced() {
  usePageTitle('Set New Password');
  const { user, updateUser, logout } = useOrgAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await orgApi.changePassword(currentPassword, newPassword);
      updateUser({ mustChangePassword: false });
      navigate('/org/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl text-paper">Organization Console</div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-paper-raised p-7 shadow-xl">
          <h1 className="font-display text-xl text-ink">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate">
            Hi {user?.name?.split(' ')[0]} — you're signed in with a temporary password. Set your own before
            continuing.
          </p>

          {error && <div className="mt-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

          <label className="mt-5 block text-sm font-medium text-ink">
            Current (temporary) password
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
            New password
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
            Confirm new password
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </label>

          <Button type="submit" disabled={isSubmitting} className="mt-6 w-full">
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Set password and continue
          </Button>

          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full text-center text-sm text-slate hover:text-ink"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}
