import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/notificationApi';
import { Spinner } from '../../../components/ui/Spinner';

const POLL_INTERVAL_MS = 30000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refreshUnreadCount();
    // Polling rather than a push channel — fine for an unread badge at
    // this scale; real-time delivery (Socket.io/SSE) is the documented
    // upgrade path once that's worth the added infrastructure.
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function refreshUnreadCount() {
    try {
      setUnreadCount(await notificationApi.unreadCount());
    } catch {
      // Silent — a failed badge refresh shouldn't surface as a user-facing error.
    }
  }

  async function openPanel() {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const { rows } = await notificationApi.list({ pageSize: 10 });
      setNotifications(rows);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.is_read) {
      try {
        await notificationApi.markAsRead(notification.id);
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Navigate regardless — a failed read-receipt shouldn't block the click.
      }
    }
    setIsOpen(false);
    if (notification.lead_id) navigate(`/org/leads/${notification.lead_id}`);
  }

  async function handleMarkAllRead() {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Leave state as-is on failure; the next poll will reconcile it.
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-slate hover:bg-paper hover:text-ink"
        aria-label="Notifications"
      >
        <BellIcon className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-medium text-paper">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-line bg-paper-raised shadow-xl sm:w-80">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-sm font-medium text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs font-medium text-ink hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="h-5 w-5 text-slate" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate">You're all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={
                      'block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-paper ' +
                      (n.is_read ? '' : 'bg-gold-soft/40')
                    }
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />}
                      <div className={n.is_read ? 'pl-3.5' : ''}>
                        <div className="text-sm font-medium text-ink">{n.title}</div>
                        {n.body && <div className="mt-0.5 text-xs text-slate">{n.body}</div>}
                        <div className="mt-1 text-xs text-slate">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BellIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
    </svg>
  );
}
