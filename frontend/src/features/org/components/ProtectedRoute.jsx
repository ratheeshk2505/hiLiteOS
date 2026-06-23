import { Navigate, useLocation } from 'react-router-dom';
import { useOrgAuth } from '../context/OrgAuthContext';
import { Spinner } from '../../../components/ui/Spinner';

const FORCED_CHANGE_PATH = '/org/change-password';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useOrgAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <Spinner className="h-6 w-6 text-ink" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/org/login" replace />;
  }

  // A temp password (new account, or an admin-initiated reset) forces a
  // stop here before anything else in the console is reachable. This is
  // a client-side gate only — the actual password-changed state lives
  // server-side; nothing here blocks API calls directly, it just keeps
  // someone from wandering off without setting their own password first.
  if (user?.mustChangePassword && location.pathname !== FORCED_CHANGE_PATH) {
    return <Navigate to={FORCED_CHANGE_PATH} replace />;
  }

  return children;
}
