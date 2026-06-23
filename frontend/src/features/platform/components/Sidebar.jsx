import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/platform/organizations', label: 'Organizations', icon: BuildingIcon },
  { to: '/platform/modules', label: 'Modules', icon: ModuleIcon },
];

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={onClose} />}
      <aside
        className={
          'fixed inset-y-0 left-0 z-50 flex h-full w-60 flex-shrink-0 flex-col bg-ink text-paper ' +
          'transition-transform duration-200 ease-out lg:static lg:translate-x-0 ' +
          (isOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="flex items-start justify-between px-6 pt-7 pb-6">
          <div>
            <div className="font-display text-xl">
              HiLite
            </div>
            <div className="mt-0.5 text-xs uppercase tracking-wider text-slate-light">Platform Console</div>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 rounded-lg p-1 text-slate-light hover:bg-ink-soft hover:text-paper lg:hidden" aria-label="Close menu">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
                (isActive ? 'bg-ink-soft text-gold' : 'text-slate-light hover:bg-ink-soft hover:text-paper')
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-5 text-xs text-slate-light">
          © {new Date().getFullYear()} HiLite Sales OS
        </div>
      </aside>
    </>
  );
}

function CloseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 21v-4h6v4M9 7h1M9 11h1M14 7h1M14 11h1" strokeLinecap="round" />
    </svg>
  );
}

function ModuleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.2" />
    </svg>
  );
}
