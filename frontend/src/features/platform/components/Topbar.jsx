import { usePlatformAuth } from '../context/PlatformAuthContext';

export function Topbar({ title, onMenuClick }) {
  const { admin, logout } = usePlatformAuth();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-paper-raised px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex-shrink-0 rounded-lg p-1.5 text-ink hover:bg-paper lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <h1 className="truncate font-display text-xl text-ink sm:text-2xl">{title}</h1>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-ink">{admin?.name}</div>
          <div className="text-xs text-slate">{admin?.email}</div>
        </div>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft font-display text-sm text-ink">
          {admin?.name?.[0]?.toUpperCase() || 'A'}
        </div>
        <button
          onClick={logout}
          className="whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium text-slate hover:bg-paper hover:text-ink sm:px-3"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function MenuIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" strokeLinecap="round" />
    </svg>
  );
}
