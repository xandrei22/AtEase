import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { lastConfirmation } = useBooking();
  const [booking, setBooking] = useState(lastConfirmation);

  useEffect(() => {
    if (!lastConfirmation && !booking) navigate('/bookings');
    else setBooking(lastConfirmation || booking);
  }, [lastConfirmation, booking, navigate]);

  if (!booking) return null;

  const copyConfirmation = () => {
    navigator.clipboard.writeText(booking.id);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <div className="rounded-2xl border border-border bg-background p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 text-3xl text-secondary">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Booking Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">A confirmation email has been sent to your email address.</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="rounded-lg bg-muted px-4 py-2 font-mono font-bold text-foreground">{booking.id}</span>
          <button
            type="button"
            onClick={copyConfirmation}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Copy
          </button>
        </div>
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-6 text-left">
          <h2 className="font-bold text-foreground">Booking details</h2>
          <p className="mt-1 font-medium text-foreground">{booking.room?.hotelName}</p>
          <p className="text-sm text-muted-foreground">{booking.room?.address}</p>
          <div className="mt-4 grid gap-2 text-sm">
            <p><span className="text-muted-foreground">Check-in:</span> {booking.checkIn} • {booking.room?.checkIn || '3:00 PM'}</p>
            <p><span className="text-muted-foreground">Check-out:</span> {booking.checkOut} • {booking.room?.checkOut || '11:00 AM'}</p>
            <p><span className="text-muted-foreground">Room:</span> {booking.room?.name}</p>
            <p><span className="text-muted-foreground">Guest:</span> {booking.guestName}</p>
            <p><span className="text-muted-foreground">Contact:</span> {booking.email} • {booking.phone}</p>
            <p><span className="text-muted-foreground">Total paid:</span> ₱{booking.total}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/bookings" className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white hover:bg-primary/90">
            View Booking
          </Link>
          <Link to="/" className="rounded-lg border border-border px-6 py-2.5 font-medium hover:bg-muted">
            Book Another Room
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Questions? Contact support at support@atease.com or call 1-800-AT-EASE.
        </p>
      </div>
    </div>
  );
}
