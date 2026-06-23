import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { usePageTitle } from '../../../hooks/usePageTitle';

export default function Login() {
  usePageTitle('Sign In');
  const { login } = usePlatformAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@hilite.os');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate('/platform/organizations');
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl text-paper">
            Hi<span className="lite-mark">Lite</span>
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-slate-light">Platform Console</div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-paper-raised p-7 shadow-xl">
          <h1 className="font-display text-xl text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-slate">Manage organizations across the HiLITE Sales OS platform.</p>

          {error && (
            <div className="mt-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>
          )}

          <label className="mt-5 block text-sm font-medium text-ink">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              placeholder="you@hilite.os"
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
            Seeded admin: admin@hilite.os / ChangeMe123!
          </p>
        </form>
      </div>
    </div>
  );
}
