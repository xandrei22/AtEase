import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { formatDateDisplay, formatDateTimeDisplay } from '../utils/format';
import html2canvas from 'html2canvas';

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { lastConfirmation } = useBooking();
  const [booking, setBooking] = useState(lastConfirmation);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef(null);

  useEffect(() => {
    if (!lastConfirmation && !booking) navigate('/bookings');
    else setBooking(lastConfirmation || booking);
  }, [lastConfirmation, booking, navigate]);

  if (!booking) return null;

  const downloadReceipt = async () => {
    if (!receiptRef.current) {
      setDownloading(false);
      return;
    }

    setDownloading(true);
    // Clone the visible receipt and inline computed styles so capture matches on-screen
    try {
      const original = receiptRef.current;
      const clone = original.cloneNode(true);

      // Inline computed styles for root
      const inlineComputed = (sourceEl, targetEl) => {
        const cs = window.getComputedStyle(sourceEl);
        try { targetEl.style.cssText = cs.cssText; } catch (_) {
          // Fallback: copy important properties
          targetEl.style.font = cs.font;
          targetEl.style.color = cs.color;
          targetEl.style.background = cs.background;
        }
      };

      inlineComputed(original, clone);

      const srcAll = Array.from(original.querySelectorAll('*'));
      const dstAll = Array.from(clone.querySelectorAll('*'));
      for (let i = 0; i < srcAll.length; i += 1) {
        const s = srcAll[i];
        const d = dstAll[i];
        if (!d) continue;
        inlineComputed(s, d);
      }

      // Place clone off-screen with same width to preserve layout
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '16px';
      // Force width to match original to avoid reflow differences
      const origWidth = original.getBoundingClientRect().width || original.offsetWidth || 800;
      clone.style.width = `${origWidth}px`;
      container.appendChild(clone);
      document.body.appendChild(container);

      const scale = Math.max(1, window.devicePixelRatio || 1);
      const canvas = await html2canvas(clone, { scale, useCORS: true, backgroundColor: '#ffffff' });
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Canvas toBlob failed')); }, 'image/png');
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AtEase_Receipt_${booking.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (container.parentNode) document.body.removeChild(container);
    } catch (err) {
      console.error('Receipt capture failed:', err);
      // fallback: open printable window of the current receipt HTML
      try {
        const html = receiptRef.current.outerHTML;
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt #${booking.id}</title></head><body>${html}</body></html>`);
          win.document.close();
          setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 500);
        } else {
          alert('Failed to generate receipt. Please allow popups or try a different browser.');
        }
      } catch (err2) {
        console.error('Printable fallback failed:', err2);
        alert('Failed to download receipt. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <div className="rounded-2xl border border-border bg-background p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 text-3xl text-secondary">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Booking Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">A confirmation email has been sent to your email address.</p>

        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-6 text-left" ref={receiptRef}>
          <h2 className="font-bold text-foreground mb-4">Booking Receipt</h2>
          <div className="mb-4 border-b border-border pb-3">
            <p className="font-semibold text-foreground text-lg">{booking.room?.hotelName || 'AtEase'}</p>
            <p className="text-sm text-muted-foreground">{booking.room?.address || 'Hotel booking service'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Booking Reference: <span className="font-mono font-semibold">{booking.id}</span></p>
            {booking.createdAt && (
              <p className="mt-1 text-xs text-muted-foreground">Date: {formatDateTimeDisplay(booking.createdAt)}</p>
            )}
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Check-in:</span>
              <span className="font-medium text-foreground">{formatDateDisplay(booking.checkIn) || 'N/A'} • {booking.room?.checkIn || '3:00 PM'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Check-out:</span>
              <span className="font-medium text-foreground">{formatDateDisplay(booking.checkOut) || 'N/A'} • {booking.room?.checkOut || '11:00 AM'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Room:</span>
              <span className="font-medium text-foreground">{booking.room?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Nights:</span>
              <span className="font-medium text-foreground">{booking.nights || 1}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Guest:</span>
              <span className="font-medium text-foreground">{booking.guestName || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Contact:</span>
              <span className="font-medium text-foreground text-right">{booking.email || 'N/A'}<br />{booking.phone || ''}</span>
            </div>
            {booking.payment_method && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment method:</span>
                <span className="font-medium text-foreground capitalize">{booking.payment_method}</span>
              </div>
            )}
            <div className="mt-3 border-t border-border pt-3">
              {booking.subtotal != null && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium text-foreground">₱{booking.subtotal}</span>
                </div>
              )}
              {booking.tax != null && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Taxes & fees:</span>
                  <span className="font-medium text-foreground">₱{booking.tax}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-border mt-2 pt-2">
                <span className="font-bold text-foreground">Total:</span>
                <span className="font-bold text-foreground">₱{booking.total || 0}</span>
              </div>
              {booking.downpayment != null && booking.downpayment > 0 && (
                <>
                  <div className="flex justify-between py-1 text-green-700">
                    <span className="text-muted-foreground">Paid today (50% downpayment):</span>
                    <span className="font-medium">₱{booking.downpayment}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Balance due at check-in:</span>
                    <span className="font-medium text-foreground">₱{booking.balanceDue ?? (booking.total ? Math.round(booking.total - booking.downpayment) : 0)}</span>
                  </div>
                </>
              )}
            </div>
            {booking.status && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium text-foreground capitalize">{booking.status}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={downloadReceipt}
            disabled={downloading}
            className="rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {downloading ? 'Generating Receipt…' : 'Download Receipt'}
          </button>
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
