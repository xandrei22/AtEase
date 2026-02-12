import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
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
import { formatDateDisplay } from '../../utils/format';

const CHART_THEME = {
  primary: '#00a6d6',
  secondary: '#2db88f',
  accent: '#ff6b35',
  foreground: '#1a2947',
  muted: '#64748b',
};
const PIE_COLORS = [CHART_THEME.primary, CHART_THEME.secondary, CHART_THEME.accent, CHART_THEME.muted, CHART_THEME.foreground];

function normalizeBooking(b) {
  const checkIn = b.check_in_date || b.checkIn;
  const checkOut = b.check_out_date || b.checkOut;
  const start = checkIn ? new Date(checkIn) : null;
  const end = checkOut ? new Date(checkOut) : null;
  const nights = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())
    ? Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)))
    : null;
  // prefer net_paid (completed - refunded) when available so reports reflect refunds
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
    room: b.room ?? null,
    // expose payment breakdown if present
    total_paid: b.total_paid != null ? Number(b.total_paid) : undefined,
    total_refunded: b.total_refunded != null ? Number(b.total_refunded) : undefined,
    net_paid: b.net_paid != null ? Number(b.net_paid) : undefined,
  };
}

function formatDate(d) {
  if (!d) return '';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10);
}

function getStartEnd(range, startDate, endDate, month, year) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  if (range === 'all') {
    start = new Date(2000, 0, 1);
    end = new Date(2100, 11, 31);
  } else if (range === '7') {
    start.setDate(now.getDate() - 7);
  } else if (range === '30') {
    start.setDate(now.getDate() - 30);
  } else if (range === '90') {
    start.setDate(now.getDate() - 90);
  } else if (range === 'month' && year && month !== '') {
    start = new Date(Number(year), Number(month), 1);
    end = new Date(Number(year), Number(month) + 1, 0);
  } else if (range === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    if (start > end) [start, end] = [end, start];
  }
  return { start, end };
}

function filterByDateRange(bookings, start, end) {
  return bookings.filter((b) => {
    const d = b.checkIn ? new Date(b.checkIn) : (b.createdAt ? new Date(b.createdAt) : null);
    if (!d || isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  });
}

function isCancelled(status) {
  return (status || '').toLowerCase() === 'cancelled';
}

function buildReportCsv(bookings, totalRevenue, avgOccupancy, adr) {
  const headers = ['Booking ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status'];
  const rows = bookings.map((b) => [
    b.id,
    b.guestName || '',
    b.room?.name || '',
    formatDateDisplay(b.checkIn) || '',
    formatDateDisplay(b.checkOut) || '',
    b.nights ?? '',
    b.total ?? '',
    b.status || '',
  ]);
  const summary = [
    [],
    ['Summary', '', '', '', '', '', '', ''],
    ['Total Revenue', '', '', '', '', '', totalRevenue, ''],
    ['Avg Occupancy %', '', '', '', '', '', avgOccupancy, ''],
    ['ADR', '', '', '', '', '', adr, ''],
    ['Total Bookings', '', '', '', '', '', bookings.length, ''],
  ];
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const toLine = (arr) => arr.map(escape).join(',');
  return [toLine(headers), ...rows.map((r) => toLine(r)), ...summary.map((r) => toLine(r))].join('\r\n');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printReportAsPdf(title, dateLabel, totalRevenue, avgOccupancy, adr, bookings) {
  const rows = bookings
    .map(
      (b) =>
        `<tr><td>${b.id}</td><td>${(b.guestName || '').replace(/</g, '&lt;')}</td><td>${(b.room?.name || '').replace(/</g, '&lt;')}</td><td>${formatDateDisplay(b.checkIn) || ''}</td><td>${formatDateDisplay(b.checkOut) || ''}</td><td>${b.nights ?? ''}</td><td>₱${b.total ?? 0}</td><td>${(b.status || '').replace(/</g, '&lt;')}</td></tr>`
    )
    .join('');
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { font-size: 18px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f5f5f5; }
    .summary { margin-top: 16px; }
  </style>
</head>
<body>
  <h1>AtEase – Reports &amp; analytics</h1>
  <p><strong>Date range:</strong> ${dateLabel}</p>
  <div class="summary">
    <p><strong>Total revenue:</strong> ₱${totalRevenue.toLocaleString()}</p>
    <p><strong>Avg occupancy:</strong> ${avgOccupancy}%</p>
    <p><strong>ADR:</strong> ₱${adr}</p>
    <p><strong>Bookings:</strong> ${bookings.length}</p>
  </div>
  <table>
    <thead><tr><th>Booking ID</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8">No bookings in range</td></tr>'}</tbody>
  </table>
</body>
</html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.print();
    w.onafterprint = () => w.close();
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear().toString());

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAllBookings(token)
      .then((list) => setBookings((list || []).map(normalizeBooking)))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [token]);

  const { start: startFromRange, end: endFromRange } = useMemo(
    () => getStartEnd(range, startDate, endDate, month, year),
    [range, startDate, endDate, month, year]
  );

  const { start, end } = useMemo(() => {
    if (range !== 'all') return { start: startFromRange, end: endFromRange };
    if (bookings.length === 0) {
      const now = new Date();
      const e = new Date(now);
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      return { start: s, end: e };
    }
    let min = new Date(bookings[0].checkIn || bookings[0].createdAt);
    let max = new Date(bookings[0].checkIn || bookings[0].createdAt);
    bookings.forEach((b) => {
      const d = b.checkIn ? new Date(b.checkIn) : (b.createdAt ? new Date(b.createdAt) : null);
      if (d && !isNaN(d.getTime())) {
        if (d < min) min = new Date(d.getTime());
        if (d > max) max = new Date(d.getTime());
      }
    });
    return { start: min, end: max };
  }, [range, bookings, startFromRange, endFromRange]);

  const filteredBookings = useMemo(
    () => filterByDateRange(bookings, start, end),
    [bookings, start, end]
  );

  // Revenue should reflect net amounts (payments - refunds) even for cancelled bookings
  const totalRevenue = filteredBookings.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const valid = filteredBookings.filter((b) => !isCancelled(b.status));
  const avgOccupancy = filteredBookings.length > 0
    ? Math.round((valid.length / Math.max(filteredBookings.length, 1)) * 100)
    : 0;
  const totalNights = valid.reduce((s, b) => s + (b.nights || 0), 0);
  const adr = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

  const reportChartData = useMemo(() => {
    const statusCounts = {};
    filteredBookings.forEach((b) => {
      const s = (b.status || 'other').toLowerCase();
      const name = s === 'paid' ? 'Paid' : s === 'confirmed' ? 'Confirmed' : s === 'pending' ? 'Pending' : s === 'cancelled' ? 'Cancelled' : 'Other';
      statusCounts[name] = (statusCounts[name] || 0) + 1;
    });
    const bookingsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const periodMs = end - start;
    const days = Math.max(1, Math.ceil(periodMs / (24 * 60 * 60 * 1000)));
    const useWeekly = days > 14;
    const buckets = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const bucketStart = new Date(cursor);
      const bucketEnd = useWeekly
        ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
        : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      // revenue over time should use net totals (including cancelled bookings)
      const rev = filteredBookings
        .filter((b) => {
          const d = b.checkIn ? new Date(b.checkIn) : (b.createdAt ? new Date(b.createdAt) : null);
          return d && d >= bucketStart && d < bucketEnd;
        })
        .reduce((s, b) => s + (Number(b.total) || 0), 0);
      const count = filteredBookings.filter((b) => {
        const d = b.checkIn ? new Date(b.checkIn) : (b.createdAt ? new Date(b.createdAt) : null);
        return d && d >= bucketStart && d < bucketEnd;
      }).length;
      buckets.push({
        label: useWeekly ? bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        revenue: rev,
        bookings: count,
      });
      if (useWeekly) cursor.setDate(cursor.getDate() + 7);
      else cursor.setDate(cursor.getDate() + 1);
    }
    return { revenueOverTime: buckets, bookingsByStatus };
  }, [filteredBookings, valid, start, end]);

  const dateLabel =
    range === 'all'
      ? 'All time'
      : range === '7'
        ? 'Last 7 days'
        : range === '30'
          ? 'Last 30 days'
          : range === '90'
            ? 'Last 90 days'
            : range === 'month' && month !== '' && year
              ? `${MONTHS[Number(month)]} ${year}`
              : range === 'custom' && startDate && endDate
                ? `${startDate} to ${endDate}`
                : 'All time';

  const handleDownloadCsv = () => {
    const csv = buildReportCsv(filteredBookings, totalRevenue, avgOccupancy, adr);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `AtEase-Report-${formatDate(start)}-to-${formatDate(end)}.csv`);
  };

  const handleDownloadExcel = () => {
    const csv = buildReportCsv(filteredBookings, totalRevenue, avgOccupancy, adr);
    const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadBlob(blob, `AtEase-Report-${formatDate(start)}-to-${formatDate(end)}.xls`);
  };

  const handleDownloadPdf = () => {
    printReportAsPdf(
      'AtEase Report',
      dateLabel,
      totalRevenue,
      avgOccupancy,
      adr,
      filteredBookings
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Date range</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-lg border border-border pl-4 pr-12 py-2"
          >
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="month">Specific month</option>
            <option value="custom">Custom date range</option>
          </select>
        </div>
        {range === 'month' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-border pl-4 pr-12 py-2"
              >
                <option value="">Select month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-lg border border-border pl-4 pr-12 py-2"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {range === 'custom' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border px-4 py-2"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total revenue</p>
          <p className="text-2xl font-bold text-foreground">₱{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Avg occupancy</p>
          <p className="text-2xl font-bold text-foreground">{avgOccupancy}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">ADR</p>
          <p className="text-2xl font-bold text-foreground">₱{adr}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Bookings</p>
          <p className="text-2xl font-bold text-foreground">{filteredBookings.length}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-4">Revenue over time ({dateLabel})</h2>
          <div className="h-72">
            {reportChartData.revenueOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportChartData.revenueOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_THEME.primary} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART_THEME.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${v}`} className="text-muted-foreground" />
                  <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Revenue']} labelFormatter={(l) => l} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_THEME.primary} fill="url(#reportRevenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No revenue data in this range</div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-4">Bookings by status ({dateLabel})</h2>
          <div className="h-72">
            {reportChartData.bookingsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportChartData.bookingsByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {reportChartData.bookingsByStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Bookings']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No bookings in this range</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="font-bold text-foreground">Summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Report for: <strong>{dateLabel}</strong>. Export using the buttons below.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Download to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
