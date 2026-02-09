import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { MOCK_ROOMS } from '../../data/mockRooms';

export default function AdminDashboardPage() {
  const { bookings } = useBooking();
  const confirmed = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Pending');
  const totalRevenue = bookings.filter((b) => b.status !== 'Cancelled').reduce((s, b) => s + (b.total || 0), 0);
  const recentBookings = bookings.slice(0, 10);
  const occupancy = MOCK_ROOMS.length > 0 ? Math.min(100, Math.round((bookings.filter((b) => b.status !== 'Cancelled').length / MOCK_ROOMS.length) * 30)) : 0;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="font-bold text-foreground mb-4">Recent bookings</h2>
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
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No bookings yet</td></tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border">
                    <td className="py-3 font-mono">{b.id}</td>
                    <td className="py-3">{b.guestName}</td>
                    <td className="py-3">{b.room?.name}</td>
                    <td className="py-3">{b.checkIn}</td>
                    <td className="py-3">{b.checkOut}</td>
                    <td className="py-3"><span className="rounded bg-green-100 px-2 py-0.5 text-green-800">{b.status}</span></td>
                    <td className="py-3">₱{b.total}</td>
                    <td className="py-3">
                      <Link to="/admin/bookings" className="text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <Link to="/admin/rooms" className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">Manage rooms</Link>
        <Link to="/admin/reports" className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted">View reports</Link>
      </div>
    </div>
  );
}
