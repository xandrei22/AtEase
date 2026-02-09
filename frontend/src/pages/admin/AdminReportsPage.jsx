import { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';

function formatDate(d) {
  if (!d) return '';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10);
}

function getStartEnd(range, startDate, endDate, month, year) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  if (range === '7') {
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

function buildReportCsv(bookings, totalRevenue, avgOccupancy, adr) {
  const headers = ['Booking ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status'];
  const rows = bookings.map((b) => [
    b.id,
    b.guestName || '',
    b.room?.name || '',
    b.checkIn || '',
    b.checkOut || '',
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
        `<tr><td>${b.id}</td><td>${(b.guestName || '').replace(/</g, '&lt;')}</td><td>${(b.room?.name || '').replace(/</g, '&lt;')}</td><td>${b.checkIn || ''}</td><td>${b.checkOut || ''}</td><td>${b.nights ?? ''}</td><td>₱${b.total ?? 0}</td><td>${(b.status || '').replace(/</g, '&lt;')}</td></tr>`
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
  const { bookings } = useBooking();
  const [range, setRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear().toString());

  const { start, end } = useMemo(
    () => getStartEnd(range, startDate, endDate, month, year),
    [range, startDate, endDate, month, year]
  );

  const filteredBookings = useMemo(
    () => filterByDateRange(bookings, start, end),
    [bookings, start, end]
  );

  const valid = filteredBookings.filter((b) => b.status !== 'Cancelled');
  const totalRevenue = valid.reduce((s, b) => s + (b.total || 0), 0);
  const avgOccupancy = filteredBookings.length > 0
    ? Math.round((valid.length / Math.max(filteredBookings.length, 1)) * 100)
    : 0;
  const totalNights = valid.reduce((s, b) => s + (b.nights || 0), 0);
  const adr = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

  const dateLabel =
    range === '7'
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

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground">Reports & analytics</h1>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Date range</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-lg border border-border pl-4 pr-12 py-2"
          >
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
