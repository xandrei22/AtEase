import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getAllBookings } from '../../api/bookings';
import { fetchRooms } from '../../api/rooms';
import { formatDateDisplay } from '../../utils/format';

const CHART_THEME = {
  primary: '#00a6d6',
  primaryLight: 'rgba(0, 166, 214, 0.4)',
  secondary: '#2db88f',
  accent: '#ff6b35',
  foreground: '#1a2947',
  muted: '#64748b',
};
const PIE_COLORS = [CHART_THEME.primary, CHART_THEME.secondary, CHART_THEME.accent, CHART_THEME.muted, CHART_THEME.foreground];

function SectionHeader({ title, collapsed, onToggle }) {
  return (
    <header className={`flex items-center justify-between gap-2 ${collapsed ? '' : 'border-b border-border pb-4 mb-4'}`}>
      <h2 className="font-bold text-foreground text-lg">{title}</h2>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={collapsed ? 'Expand section' : 'Collapse section'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 15l-6-6-6 6" /></svg>
        )}
      </button>
    </header>
  );
}

function normalizeBooking(b) {
  const checkIn = b.check_in_date || b.checkIn;
  const checkOut = b.check_out_date || b.checkOut;
  const start = checkIn ? new Date(checkIn) : null;
  const end = checkOut ? new Date(checkOut) : null;
  const nights = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())
    ? Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)))
    : null;
  const totalVal = (b.net_paid != null && !isNaN(Number(b.net_paid))) ? Number(b.net_paid) : ((b.total_price != null && !isNaN(Number(b.total_price))) ? Number(b.total_price) : (b.total ?? 0));
  return {
    id: b.id,
    guestName: b.user_name || b.guestName,
    checkIn: checkIn ?? b.checkIn,
    checkOut: checkOut ?? b.checkOut,
    total: totalVal,
    status: b.status ?? '',
    createdAt: b.created_at ?? b.createdAt,
    nights,
    room: b.room ?? (b.room_name || b.room_number ? { name: b.room_name || b.room_number } : null),
    total_paid: b.total_paid != null ? Number(b.total_paid) : undefined,
    total_refunded: b.total_refunded != null ? Number(b.total_refunded) : undefined,
    net_paid: b.net_paid != null ? Number(b.net_paid) : undefined,
  };
}

const SECTION_KEYS = {
  recent: 'recent',
  revenueTrend: 'revenueTrend',
  bookingsByStatus: 'bookingsByStatus',
  bookingsPerMonth: 'bookingsPerMonth',
  roomsOverview: 'roomsOverview',
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});
  const setSectionCollapsed = (key, value) => setCollapsed((c) => ({ ...c, [key]: value }));
  const isCollapsed = (key) => !!collapsed[key];

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getAllBookings(token).then((list) => setBookings((list || []).map(normalizeBooking))),
      fetchRooms(false).then((list) => setRoomsCount(list?.length ?? 0)).catch(() => setRoomsCount(0)),
    ])
      .finally(() => setLoading(false));
  }, [token]);

  const cancelled = (s) => (s || '').toLowerCase() === 'cancelled';
  const nonCancelled = bookings.filter((b) => !cancelled(b.status));
  const confirmed = bookings.filter((b) => !cancelled(b.status) && ['pending', 'confirmed', 'paid', 'partial'].includes((b.status || '').toLowerCase()));
  // revenue should reflect net paid (payments - refunds) even for cancelled bookings
  const totalRevenue = bookings.reduce((s, b) => s + (Number(b.total) || 0), 0);
  // always show top 5 most recent bookings
  const recentBookings = bookings.slice(0, 5);
  const occupancy = roomsCount > 0 ? Math.min(100, Math.round((nonCancelled.length / roomsCount) * 30)) : 0;

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: d.getTime(), label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
    });
    const revenueByMonth = months.map(({ key, label }) => {
      const start = new Date(key);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      const rev = nonCancelled
        .filter((b) => {
          const d = b.checkIn ? new Date(b.checkIn) : (b.createdAt ? new Date(b.createdAt) : null);
          return d && d >= start && d <= end;
        })
        .reduce((s, b) => s + (Number(b.total) || 0), 0);
      const count = bookings.filter((b) => {
        const d = b.checkIn ? new Date(b.checkIn) : (b.createdAt ? new Date(b.createdAt) : null);
        return d && d >= start && d <= end;
      }).length;
      return { label, revenue: rev, bookings: count };
    });
    const statusCounts = {};
    bookings.forEach((b) => {
      const s = (b.status || 'other').toLowerCase();
      const name = s === 'paid' ? 'Paid' : s === 'partial' ? '50% paid' : s === 'confirmed' ? 'Confirmed' : s === 'pending' ? 'Pending' : s === 'cancelled' ? 'Cancelled' : 'Other';
      statusCounts[name] = (statusCounts[name] || 0) + 1;
    });
    const bookingsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const roomsSummary = [
      { name: 'Total rooms', value: roomsCount, fill: CHART_THEME.primaryLight },
      { name: 'Bookings (active)', value: nonCancelled.length, fill: CHART_THEME.primary },
    ].filter((d) => d.value > 0);
    return { revenueByMonth, bookingsByStatus, roomsSummary };
  }, [bookings, nonCancelled, roomsCount]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground">₱{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
          <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Occupancy (approx)</p>
          <p className="text-2xl font-bold text-foreground">{occupancy}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Pending Bookings</p>
          <p className="text-2xl font-bold text-foreground">{confirmed.length}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-background p-6 shadow-sm">
        <SectionHeader
          title="Recent bookings"
          collapsed={isCollapsed(SECTION_KEYS.recent)}
          onToggle={() => setSectionCollapsed(SECTION_KEYS.recent, !isCollapsed(SECTION_KEYS.recent))}
        />
        {!isCollapsed(SECTION_KEYS.recent) && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium">ID</th>
                <th className="pb-2 font-medium">Guest</th>
                <th className="pb-2 font-medium">Room</th>
                <th className="pb-2 font-medium">Check-in</th>
                <th className="pb-2 font-medium">Check-out</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No bookings yet</td></tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border">
                    <td className="py-3 font-mono">{b.id}</td>
                    <td className="py-3">{b.guestName}</td>
                    <td className="py-3">{b.room?.name || '—'}</td>
                    <td className="py-3">{formatDateDisplay(b.checkIn)}</td>
                    <td className="py-3">{formatDateDisplay(b.checkOut)}</td>
                    <td className="py-3">
                      <span className={`rounded px-2 py-0.5 ${(b.status || '').toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' : (b.status || '').toLowerCase() === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                        {(b.status || '').toLowerCase() === 'partial' ? '50% paid' : (b.status || '—')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <SectionHeader
            title="Revenue trend (last 6 months)"
            collapsed={isCollapsed(SECTION_KEYS.revenueTrend)}
          />
          {!isCollapsed(SECTION_KEYS.revenueTrend) && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_THEME.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_THEME.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${v}`} className="text-muted-foreground" />
                <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Revenue']} labelFormatter={(l) => `Month: ${l}`} />
                <Area type="monotone" dataKey="revenue" stroke={CHART_THEME.primary} fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <SectionHeader
            title="Bookings by status"
            collapsed={isCollapsed(SECTION_KEYS.bookingsByStatus)}
          />
          {!isCollapsed(SECTION_KEYS.bookingsByStatus) && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.bookingsByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {chartData.bookingsByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Bookings']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <SectionHeader
            title="Bookings per month"
            collapsed={isCollapsed(SECTION_KEYS.bookingsPerMonth)}
          />
          {!isCollapsed(SECTION_KEYS.bookingsPerMonth) && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip formatter={(value) => [value, 'Bookings']} labelFormatter={(l) => `Month: ${l}`} />
                <Bar dataKey="bookings" fill={CHART_THEME.primary} radius={[4, 4, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <SectionHeader
            title="Rooms & bookings overview"
            collapsed={isCollapsed(SECTION_KEYS.roomsOverview)}
          />
          {!isCollapsed(SECTION_KEYS.roomsOverview) && (
          <div className="h-64">
            {chartData.roomsSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.roomsSummary} layout="vertical" margin={{ top: 8, right: 8, left: 80, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} className="text-muted-foreground" />
                  <Tooltip formatter={(value) => [value, '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="">
                  {chartData.roomsSummary.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No room data yet</div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
