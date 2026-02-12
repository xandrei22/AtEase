import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllBookings } from '../../api/bookings';
import { formatDateDisplay } from '../../utils/format';

const NOTIFICATIONS_SEEN_KEY = 'atease_admin_last_seen_notification';

function getLastSeenId() {
  try {
    return localStorage.getItem(NOTIFICATIONS_SEEN_KEY) || '0';
  } catch {
    return '0';
  }
}

function setLastSeenId(id) {
  try {
    localStorage.setItem(NOTIFICATIONS_SEEN_KEY, String(id));
  } catch (_) {}
}

export default function AdminNotifications() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSeenId, setLastSeenIdState] = useState(() => getLastSeenId());
  const containerRef = useRef(null);

  const cancelled = (s) => (s || '').toLowerCase() === 'cancelled';
  const recent = (bookings || []).filter((b) => !cancelled(b.status)).slice(0, 10);
  const newCount = recent.filter((b) => Number(b.id) > Number(lastSeenId)).length;

  const clearNotifications = useCallback(() => {
    const ids = (bookings || []).filter((b) => !(b.status || '').toLowerCase().includes('cancelled')).map((b) => Number(b.id)).filter((n) => n > 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    setLastSeenId(maxId);
    setLastSeenIdState(String(maxId));
  }, [bookings]);

  useEffect(() => {
    setLastSeenIdState(getLastSeenId());
  }, [open]);

  useEffect(() => {
    if (open && token) {
      setLoading(true);
      getAllBookings(token)
        .then((list) => setBookings(list || []))
        .catch(() => setBookings([]))
        .finally(() => setLoading(false));
    }
  }, [open, token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={newCount > 0 ? `${newCount} new notification(s)` : 'Notifications'}
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {newCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {newCount > 9 ? '9+' : newCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold text-foreground text-sm">Reservations & bookings</h3>
            {recent.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No bookings yet</div>
            ) : (
              <ul>
                {recent.map((b) => {
                  const isNew = Number(b.id) > Number(lastSeenId);
                  return (
                    <li key={b.id}>
                      <Link
                        to="/admin/bookings"
                        onClick={() => setOpen(false)}
                        className={`block border-b border-border px-4 py-3 text-left hover:bg-muted ${isNew ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground text-sm truncate">{b.user_name || b.user_email || 'Guest'}</p>
                            <p className="text-muted-foreground text-xs truncate">{b.room_name || 'Room'}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatDateDisplay(b.check_in_date)} – {formatDateDisplay(b.check_out_date)}
                            </p>
                          </div>
                          {isNew && (
                            <span className="shrink-0 rounded-full bg-primary h-2 w-2 mt-1.5" aria-hidden />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-border px-4 py-2">
            <Link
              to="/admin/bookings"
              onClick={() => setOpen(false)}
              className="block text-center text-primary text-sm font-medium hover:underline"
            >
              View all bookings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
