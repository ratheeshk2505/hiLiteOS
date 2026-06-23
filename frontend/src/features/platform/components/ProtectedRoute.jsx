import { Navigate } from 'react-router-dom';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { Spinner } from '../../../components/ui/Spinner';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = usePlatformAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <Spinner className="h-6 w-6 text-ink" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/platform/login" replace />;
  }

  return children;
}
