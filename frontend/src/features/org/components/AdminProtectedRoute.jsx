import { Navigate } from 'react-router-dom';
import { useOrgAuth } from '../context/OrgAuthContext';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * Wraps ProtectedRoute with an additional isOrgAdmin check, for the
 * Module 2 pages (Teams/Roles/Users) the backend restricts to admins.
 * This is a UX courtesy, not the actual security boundary — a non-admin
 * hitting these URLs directly still gets a clean redirect instead of a
 * page full of 403 errors, but the real enforcement is requireOrgAdmin
 * on the API itself.
 */
export function AdminProtectedRoute({ children }) {
  return (
    <ProtectedRoute>
      <RequireAdmin>{children}</RequireAdmin>
    </ProtectedRoute>
  );
}

function RequireAdmin({ children }) {
  const { user } = useOrgAuth();
  if (!user?.isOrgAdmin) {
    return <Navigate to="/org/dashboard" replace />;
  }
  return children;
}
