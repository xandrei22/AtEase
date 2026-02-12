import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllBookings } from '../../api/bookings';
import { formatDateDisplay } from '../../utils/format';

function isDateInRange(date, checkIn, checkOut) {
  if (!checkIn || !checkOut) return false;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return d >= start && d < end;
}

function getBookingsForDate(bookings, date) {
  const cancelled = (s) => (s || '').toLowerCase() === 'cancelled';
  return bookings.filter(
    (b) => !cancelled(b.status) && isDateInRange(date, b.check_in_date, b.check_out_date)
  );
}

export default function AdminCalendar() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const containerRef = useRef(null);

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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="View reservation calendar"
        title="Reservation calendar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-background p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Previous month">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="font-semibold text-foreground text-sm">{monthLabel}</span>
            <button type="button" onClick={nextMonth} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Next month">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1 font-medium text-muted-foreground">{d}</div>
                ))}
                {days.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />;
                  const dayBookings = getBookingsForDate(bookings, date);
                  const hasReservation = dayBookings.length > 0;
                  const isHovered = hoveredDate && hoveredDate.getTime() === date.getTime();
                  return (
                    <div
                      key={date.getTime()}
                      className="relative"
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                    >
                      <div
                        className={`flex h-8 w-full items-center justify-center rounded ${
                          hasReservation
                            ? 'bg-primary/20 text-primary font-medium'
                            : 'text-foreground'
                        } ${isHovered ? 'ring-2 ring-primary' : ''}`}
                      >
                        {date.getDate()}
                      </div>
                      {isHovered && dayBookings.length > 0 && (
                        <div className="absolute left-1/2 bottom-full z-10 mb-1 -translate-x-1/2 rounded-lg border border-border bg-background px-3 py-2 text-left shadow-lg min-w-[200px]">
                          {dayBookings.map((b) => (
                            <div key={b.id} className="text-xs py-1.5 border-b border-border last:border-0 last:pb-0 first:pt-0">
                              <p className="font-medium text-foreground">{b.user_name || b.user_email || 'Guest'}</p>
                              <p className="text-muted-foreground">{b.room_name || 'Room'}</p>
                              <p className="text-muted-foreground">
                                {formatDateDisplay(b.check_in_date)} – {formatDateDisplay(b.check_out_date)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Hover over highlighted dates to see reservation details</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
