import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page Not Found');

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-paper text-center">
      <div className="font-display text-4xl text-ink">404</div>
      <p className="mt-2 text-sm text-slate">This page doesn't exist.</p>
      <Link to="/" className="mt-4 text-sm text-ink underline">
        Back to home
      </Link>
    </div>
  );
}
