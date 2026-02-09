import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllBookings } from '../../api/bookings';

const statusColors = {
  confirmed: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminBookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAllBookings(token)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = bookings.filter((b) => {
    const matchStatus = !statusFilter || (b.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchSearch = !search || (b.user_name && b.user_name.toLowerCase().includes(search.toLowerCase())) || (b.user_email && b.user_email.toLowerCase().includes(search.toLowerCase())) || (b.id && String(b.id).includes(search));
    return matchStatus && matchSearch;
  });

  const selected = detailId ? bookings.find((b) => b.id === detailId) : null;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground">Bookings management</h1>
      <div className="mt-6 flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search by guest or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-4 py-2 md:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border pl-4 pr-12 py-2"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? (
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">Loading bookings…</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-4 font-medium">Booking ID</th>
                <th className="p-4 font-medium">Guest</th>
                <th className="p-4 font-medium">Check-in</th>
                <th className="p-4 font-medium">Check-out</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No bookings match filters</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4 font-mono">{b.id}</td>
                    <td className="p-4">{b.user_name}<br /><span className="text-muted-foreground text-xs">{b.user_email}</span></td>
                    <td className="p-4">{b.check_in_date}</td>
                    <td className="p-4">{b.check_out_date}</td>
                    <td className="p-4">₱{b.total_price}</td>
                    <td className="p-4"><span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[(b.status || '').toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>{b.status}</span></td>
                    <td className="p-4">
                      <button type="button" onClick={() => setDetailId(b.id)} className="text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground">Booking #{selected.id}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p><strong>Guest:</strong> {selected.user_name}</p>
              <p><strong>Email:</strong> {selected.user_email}</p>
              <p><strong>Check-in:</strong> {selected.check_in_date}</p>
              <p><strong>Check-out:</strong> {selected.check_out_date}</p>
              <p><strong>Total:</strong> ₱{selected.total_price}</p>
              <p><strong>Status:</strong> {selected.status}</p>
              <p><strong>Created:</strong> {selected.created_at}</p>
            </div>
            <button
              type="button"
              onClick={() => setDetailId(null)}
              className="mt-6 w-full rounded-lg border border-border py-2 font-medium hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
