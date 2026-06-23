import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgAuth } from '../context/OrgAuthContext';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { usePageTitle } from '../../../hooks/usePageTitle';

export default function Login() {
  usePageTitle('Sign In');
  const { login } = useOrgAuth();
  const navigate = useNavigate();
  const [organizationCode, setOrganizationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(organizationCode, email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate(result.user.mustChangePassword ? '/org/change-password' : '/org/dashboard');
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl text-paper">Organization Console</div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-paper-raised p-7 shadow-xl">
          <h1 className="font-display text-xl text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-slate">Manage your teams, roles and users.</p>

          {error && <div className="mt-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

          <label className="mt-5 block text-sm font-medium text-ink">
            Organization code
            <input
              required
              value={organizationCode}
              onChange={(e) => setOrganizationCode(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-ink"
              placeholder="hilite-builders"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              placeholder="you@yourcompany.com"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              placeholder="••••••••"
            />
          </label>

          <Button type="submit" disabled={isSubmitting} className="mt-6 w-full">
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Sign in
          </Button>

          <p className="mt-4 text-center text-xs text-slate">
            Your organization code and a temporary password were shared by your platform admin when your account was created.
          </p>
        </form>
      </div>
    </div>
  );
}
