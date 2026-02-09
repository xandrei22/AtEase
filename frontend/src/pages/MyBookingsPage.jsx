import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  Confirmed: 'bg-green-100 text-green-800',
  Pending: 'bg-blue-100 text-blue-800',
  Completed: 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export default function MyBookingsPage() {
  const { bookings, cancelBooking, userProfile, getRoomById } = useBooking();
  const { user } = useAuth();
  const [tab, setTab] = useState('Upcoming');
  const [detailId, setDetailId] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);

  const filtered = bookings.filter((b) => {
    const status = (b.status || '').toLowerCase();
    if (tab === 'All') return true;
    if (tab === 'Upcoming') return ['confirmed', 'pending', 'paid'].includes(status);
    if (tab === 'Completed') return status === 'completed';
    if (tab === 'Cancelled') return status === 'cancelled';
    return true;
  });

  const handleCancel = (id) => {
    cancelBooking(id);
    setCancelConfirmId(null);
    setDetailId(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
      <p className="text-muted-foreground">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
      <div className="mt-6 flex gap-2 border-b border-border">
        {['Upcoming', 'Completed', 'Cancelled', 'All'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 font-medium ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
            <p className="text-muted-foreground">No bookings in this tab.</p>
            <Link to="/" className="mt-4 inline-block font-medium text-primary hover:underline">Start booking</Link>
          </div>
        ) : (
          filtered.map((b) => {
            const room = b.room_ids?.length ? getRoomById(b.room_ids[0]) : null;
            const checkIn = b.check_in_date || b.checkIn;
            const checkOut = b.check_out_date || b.checkOut;
            const total = b.total_price ?? b.total;
            const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (24 * 60 * 60 * 1000))) : null;
            return (
            <div key={b.id} className="rounded-xl border border-border bg-background p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  {room?.image && <img src={room.image} alt="" className="h-24 w-28 rounded-lg object-cover" />}
                  <div>
                    <p className="font-semibold text-foreground">{room?.name || `Booking #${b.id}`}</p>
                    <p className="text-sm text-muted-foreground">{room?.hotelName || 'AtEase'}</p>
                    <p className="text-sm text-muted-foreground">{checkIn} – {checkOut}</p>
                    <p className="text-sm text-muted-foreground">Booking #{b.id}</p>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[(b.status || '').toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailId(detailId === b.id ? null : b.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    View Details
                  </button>
                  {['confirmed', 'pending'].includes((b.status || '').toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => setCancelConfirmId(b.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel Booking
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    Download Invoice
                  </button>
                </div>
              </div>
              {detailId === b.id && (
                <div className="mt-4 border-t border-border pt-4 text-sm">
                  <p><strong>Guest:</strong> {user?.name}</p>
                  <p><strong>Contact:</strong> {user?.email}</p>
                  <p><strong>Nights:</strong> {nights ?? '—'} • <strong>Total:</strong> ₱{total ?? b.total_price}</p>
                </div>
              )}
            </div>
          );
          })
        )}
      </div>
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl bg-background p-6 shadow-xl max-w-sm w-full">
            <p className="font-semibold text-foreground">Cancel this booking?</p>
            <p className="mt-2 text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => handleCancel(cancelConfirmId)}
                className="flex-1 rounded-lg bg-red-600 py-2 font-medium text-white hover:bg-red-700"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirmId(null)}
                className="flex-1 rounded-lg border border-border py-2 font-medium hover:bg-muted"
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="mt-12 rounded-xl border border-border p-6">
        <h2 className="font-bold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">{userProfile.name || '—'}</p>
        <p className="text-sm text-muted-foreground">{userProfile.email || '—'}</p>
        <p className="text-sm text-muted-foreground">{userProfile.phone || '—'}</p>
        <button type="button" className="mt-2 text-sm font-medium text-primary hover:underline">Edit profile</button>
      </section>
    </div>
  );
}
