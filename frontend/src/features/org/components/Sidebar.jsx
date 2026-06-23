import { NavLink } from 'react-router-dom';
import { useOrgAuth } from '../context/OrgAuthContext';

const everyoneNavItems = [
  { to: '/org/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/org/leads', label: 'Leads', icon: LeadIcon },
];

const adminOnlyNavItems = [
  { to: '/org/teams', label: 'Teams', icon: TeamIcon },
  { to: '/org/roles', label: 'Roles', icon: RoleIcon },
  { to: '/org/users', label: 'Users', icon: UserIcon },
  { to: '/org/modules', label: 'Modules', icon: ModuleIcon },
];

export function Sidebar({ isOpen, onClose }) {
  const { organization, user } = useOrgAuth();
  // Leads is open to every org user (Module 3); team/role/user management
  // stays admin-only to match the backend's requireOrgAdmin guard — hiding
  // it here is just a UX courtesy, the real enforcement is server-side.
  const navItems = user?.isOrgAdmin ? [...everyoneNavItems, ...adminOnlyNavItems] : everyoneNavItems;

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
          <div className="min-w-0">
            <div className="truncate font-display text-xl text-paper">{organization?.name || 'Organization Console'}</div>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 flex-shrink-0 rounded-lg p-1 text-slate-light hover:bg-ink-soft hover:text-paper lg:hidden" aria-label="Close menu">
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

function DashboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.2" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.2" />
    </svg>
  );
}

function LeadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V8l8-5 8 5v11" strokeLinejoin="round" />
      <path d="M9 19v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

function TeamIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 20c.2-2.3 1.8-4 3.8-4.4" strokeLinecap="round" />
    </svg>
  );
}

function RoleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L14.5 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
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
