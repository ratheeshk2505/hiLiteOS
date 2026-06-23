import { useEffect } from 'react';

/**
 * Keeps the browser tab title in sync with whatever page is showing.
 * Pages that render through AppShell get this for free since AppShell
 * calls it with the same title it passes to the page heading; standalone
 * pages (login, landing, 404) call it directly with their own label.
 */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · HiLite Sales OS` : 'HiLite Sales OS';
  }, [title]);
}
