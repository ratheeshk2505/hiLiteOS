import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Landing() {
  usePageTitle('Welcome');

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="font-display text-4xl text-paper">
          Hi<span className="lite-mark">Lite</span> Sales OS
        </div>
        <p className="mt-2 text-sm text-slate-light">Choose which console you need.</p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ConsoleCard
            to="/platform/login"
            title="Platform Console"
            description="For HiLITE OS admins — onboard organizations and manage module access."
          />
          <ConsoleCard
            to="/org/login"
            title="Organization Console"
            description="For organization admins — manage your teams, roles and users."
          />
        </div>
      </div>
    </div>
  );
}

function ConsoleCard({ to, title, description }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-ink-soft bg-ink-soft/40 p-6 text-left transition-colors hover:bg-ink-soft"
    >
      <div className="font-display text-lg text-paper">{title}</div>
      <p className="mt-1.5 text-sm text-slate-light">{description}</p>
      <div className="mt-4 text-sm font-medium text-gold">Sign in →</div>
    </Link>
  );
}
