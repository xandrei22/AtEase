import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { fetchRooms as fetchRoomsApi, submitRoomReview } from '../api/rooms';
import { useAuth } from '../context/AuthContext';
import { modifyBooking as apiModifyBooking } from '../api/bookings';
import { formatDateDisplay, formatDateTimeDisplay } from '../utils/format';
import html2canvas from 'html2canvas';

const statusColors = {
  confirmed: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  pending: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function MyBookingsPage() {
  const {
    bookings = [],
    bookingsLoading,
    cancelBooking,
    userProfile,
    setUserProfile,
    getRoomById,
    rooms,
  } = useBooking();
  const { user, token } = useAuth();
  const [tab, setTab] = useState('Upcoming');
  const [detailId, setDetailId] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [modifyForm, setModifyForm] = useState({ check_in_date: '', check_out_date: '', room_ids: [], guests: 1 });
  const [availableRoomIds, setAvailableRoomIds] = useState(new Set());
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const filtered = (Array.isArray(bookings) ? bookings : []).filter((b) => {
    const status = (b.status || '').toLowerCase();
    if (tab === 'All') return true;
    // Treat pending modification/cancellation requests as still upcoming until approved
    if (tab === 'Upcoming') return ['confirmed', 'pending', 'paid', 'partial', 'cancellation_requested', 'modification_requested'].includes(status);
    if (tab === 'Completed') return status === 'completed';
    if (tab === 'Cancelled') return status === 'cancelled';
    return true;
  });

  const handleCancel = (id) => {
    cancelBooking(id);
    setCancelConfirmId(null);
    setDetailId(null);
  };

  const openProfileModal = () => {
    setProfileForm({
      name: userProfile.name || user?.name || '',
      email: userProfile.email || user?.email || '',
      phone: userProfile.phone || user?.phone || '',
    });
    setProfileModalOpen(true);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    const next = {
      ...userProfile,
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
    };
    setUserProfile(next);
    setProfileModalOpen(false);
  };

  const handleRequestModifySubmit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!modifyTarget) return;
    const checkIn = modifyForm.check_in_date?.trim();
    const checkOut = modifyForm.check_out_date?.trim();
    const roomIds = Array.isArray(modifyForm.room_ids) ? modifyForm.room_ids : [];
    if (roomIds.length === 0) {
      alert('Please select at least one room.');
      return;
    }

    // If dates are missing (user only wants to change rooms), fall back to original booking dates
    let useCheckIn = checkIn;
    let useCheckOut = checkOut;
    if (!useCheckIn || !useCheckOut) {
      const booking = (Array.isArray(bookings) ? bookings : []).find((b) => String(b.id) === String(modifyTarget));
      if (booking) {
        useCheckIn = useCheckIn || (booking.check_in_date || booking.checkIn || '').toString();
        useCheckOut = useCheckOut || (booking.check_out_date || booking.checkOut || '').toString();
      }
    }

    // If availability was previously fetched for the modal (availableRoomIds non-empty), validate selection.
    if (availableRoomIds.size > 0) {
      const invalid = roomIds.find((id) => !availableRoomIds.has(Number(id)));
      if (invalid) {
        alert('One or more selected rooms are not available for the chosen dates. Please update your selection.');
        return;
      }
    }
    try {
      await apiModifyBooking(token, modifyTarget, { check_in_date: useCheckIn, check_out_date: useCheckOut, room_ids: roomIds, guests: Number(modifyForm.guests || 1) }, { requestOnly: true });
      alert('Modification requested');
      setModifyModalOpen(false);
      setModifyTarget(null);
      // reload bookings to show pending state
      window.location.reload();
    } catch (err) {
      alert('Failed to request modification: ' + (err?.message || err));
    }
  };

  // When modifying dates, fetch available rooms for those dates and mark which rooms are selectable
  useEffect(() => {
    let cancelled = false;
    async function loadAvailable() {
      const ci = modifyForm.check_in_date?.trim();
      const co = modifyForm.check_out_date?.trim();
      if (!ci || !co) {
        setAvailableRoomIds(new Set());
        return;
      }
      try {
        const list = await fetchRoomsApi(true, ci, co);
        if (cancelled) return;
        const ids = new Set((list || []).map((r) => Number(r.id)));
        setAvailableRoomIds(ids);
      } catch (err) {
        if (!cancelled) setAvailableRoomIds(new Set());
      }
    }
    if (modifyModalOpen) loadAvailable();
    return () => { cancelled = true; };
  }, [modifyForm.check_in_date, modifyForm.check_out_date, modifyModalOpen]);

  const downloadInvoice = async (booking) => {
    const room = booking.room_ids?.length ? getRoomById(booking.room_ids[0]) : null;
    const checkIn = booking.check_in_date || booking.checkIn;
    const checkOut = booking.check_out_date || booking.checkOut;
    const total = Number(booking.total_price ?? booking.total ?? 0);
    const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (24 * 60 * 60 * 1000))) : 1;
    const subtotal = Number(booking.subtotal ?? (total ? Math.round(total / 1.12) : 0));
    const tax = Number(booking.tax ?? (total ? total - subtotal : 0));

    const guestName = booking.guestName || userProfile.name || user?.name || 'N/A';
    const contactEmail = booking.email || userProfile.email || user?.email || 'N/A';
    const contactPhone = booking.phone || userProfile.phone || user?.phone || '';

    // Only include image if same-origin or data URL to avoid CORS tainting canvas
    let imageHtml = '';
    if (room?.image) {
      try {
        const u = new URL(room.image, window.location.href);
        if (u.protocol === 'data:' || u.origin === window.location.origin) {
          imageHtml = `<div style="text-align:center;margin-bottom:12px;"><img src="${room.image}" style="max-width:100%;height:auto;"/></div>`;
        }
      } catch (_) { imageHtml = ''; }
    }

    const fmt = (n) => Number(n || 0).toLocaleString();
    const invoiceHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 700px; margin: 0 auto; color: #222; background: #fff;">
        <div style="text-align: center; margin-bottom: 18px;">
          <h1 style="color: #00a6d6; margin: 0;">AtEase</h1>
          <p style="color: #666; margin: 5px 0;">Hotel Booking Receipt</p>
        </div>
        <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 12px;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">${room?.hotelName || 'AtEase'}</p>
          <p style="color: #666; margin: 5px 0; font-size: 12px;">${room?.address || 'Hotel booking service'}</p>
          <p style="color: #666; margin: 5px 0; font-size: 12px;">Booking Reference: <strong>#${booking.id}</strong></p>
          ${booking.created_at || booking.createdAt ? `<p style="color: #666; margin: 5px 0; font-size: 12px;">Date: ${formatDateTimeDisplay(booking.created_at || booking.createdAt)}</p>` : ''}
        </div>
        ${imageHtml}
        <div style="margin-bottom: 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #666; width: 40%;">Check-in:</td>
              <td style="padding: 6px 0; font-weight: bold;">${checkIn ? formatDateTimeDisplay(checkIn) : 'N/A'} • ${room?.checkIn || '3:00 PM'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Check-out:</td>
              <td style="padding: 6px 0; font-weight: bold;">${checkOut ? formatDateTimeDisplay(checkOut) : 'N/A'} • ${room?.checkOut || '11:00 AM'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Room:</td>
              <td style="padding: 6px 0; font-weight: bold;">${room?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Nights:</td>
              <td style="padding: 6px 0; font-weight: bold;">${nights}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Guest:</td>
              <td style="padding: 6px 0; font-weight: bold;">${guestName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Contact:</td>
              <td style="padding: 6px 0; font-weight: bold;">${contactEmail}${contactPhone ? `<br/>${contactPhone}` : ''}</td>
            </tr>
            ${booking.payment_method ? `<tr><td style="padding: 6px 0; color: #666;">Payment method:</td><td style="padding: 6px 0; font-weight: bold; text-transform: capitalize;">${booking.payment_method}</td></tr>` : ''}
          </table>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${subtotal > 0 ? `<tr><td style="padding: 6px 0; color: #666;">Subtotal:</td><td style="padding: 6px 0; text-align: right;">₱${fmt(subtotal)}</td></tr>` : ''}
            ${tax > 0 ? `<tr><td style="padding: 6px 0; color: #666;">Taxes & fees:</td><td style="padding: 6px 0; text-align: right;">₱${fmt(tax)}</td></tr>` : ''}
            <tr style="border-top: 1px solid #333;">
              <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">Total paid:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 16px;">₱${fmt(total)}</td>
            </tr>
          </table>
        </div>
        ${booking.status ? `<div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee;"><p style="color: #666; margin: 0;">Status: <strong style="text-transform: capitalize;">${booking.status}</strong></p></div>` : ''}
        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 11px;">
          <p style="margin: 5px 0;">Questions? Contact support at support@atease.com</p>
        </div>
      </div>
    `;

    // Render invoice and try to create an image using html2canvas. If that fails (often due to CORS on images), fall back to opening a printable window.
    const container = document.createElement('div');
    container.innerHTML = invoiceHTML;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Canvas toBlob failed')); }, 'image/png');
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AtEase_Invoice_${booking.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      document.body.removeChild(container);
    } catch (err) {
      // Fallback: open printable HTML in a new tab so user can Save as PDF
      console.warn('html2canvas invoice failed, falling back to printable window:', err);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice #${booking.id}</title></head><body>${invoiceHTML}</body></html>`);
        win.document.close();
        // Give the new window a moment to render then call print so user can save as PDF
        setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 500);
      } else {
        alert('Failed to generate invoice. Please allow popups or try a different browser.');
      }
      if (container.parentNode) document.body.removeChild(container);
    }
  };

  const openReviewModal = (booking) => {
    setReviewTarget(booking);
    setReviewForm({ rating: 5, comment: '' });
    setReviewModalOpen(true);
  };

  const submitReview = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!reviewTarget) return;
    const roomId = reviewTarget.room_ids?.[0];
    if (!roomId) return alert('No room to review on this booking.');
    try {
      await submitRoomReview(token, roomId, { bookingId: reviewTarget.id, rating: Number(reviewForm.rating), comment: reviewForm.comment });
      alert('Thanks — your review has been submitted.');
      setReviewModalOpen(false);
      setReviewTarget(null);
      // Refresh rooms data to pick up updated aggregates
      try { if (typeof window !== 'undefined') { window.location.reload(); } } catch (_) {}
    } catch (err) {
      alert('Failed to submit review: ' + (err?.message || err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
      {bookingsLoading ? (
        <p className="text-muted-foreground">Loading bookings…</p>
      ) : (
        <p className="text-muted-foreground">{(Array.isArray(bookings) ? bookings : []).length} booking{(Array.isArray(bookings) ? bookings : []).length !== 1 ? 's' : ''} total</p>
      )}
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
      {bookingsLoading ? (
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">Loading your bookings…</p>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="mt-8 rounded-xl border border-border bg-muted/30 p-12 text-center">
              <p className="text-muted-foreground">No bookings in this tab.</p>
              <Link to="/" className="mt-4 inline-block font-medium text-primary hover:underline">Start booking</Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-1">
            {filtered.map((b) => {
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
                    <p className="text-sm text-muted-foreground">{formatDateDisplay(checkIn)} – {formatDateDisplay(checkOut)}</p>
                    <p className="text-sm text-muted-foreground">Booking #{b.id}</p>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[(b.status || '').toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
                      {(b.status || '').toLowerCase() === 'partial' ? '50% paid' : b.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['confirmed', 'pending', 'partial'].includes((b.status || '').toLowerCase()) && ((b.status || '').toLowerCase() !== 'modification_requested') && ((b.status || '').toLowerCase() !== 'cancellation_requested') && (
                    <button
                      type="button"
                      onClick={() => {
                        setModifyForm({ check_in_date: b.check_in_date ? b.check_in_date.slice(0,10) : '', check_out_date: b.check_out_date ? b.check_out_date.slice(0,10) : '', room_ids: (b.room_ids || []).map((x) => Number(x)), guests: b.guests || 1 });
                        setModifyTarget(b.id);
                        setModifyModalOpen(true);
                      }}
                      className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50"
                    >
                      Request Modify
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDetailId(detailId === b.id ? null : b.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    View Details
                  </button>
                  {['confirmed', 'pending', 'partial'].includes((b.status || '').toLowerCase()) && (
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
                    onClick={() => downloadInvoice(b)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    Download Invoice
                  </button>
                  {/* Leave review if checkout is in the past */}
                  {(() => {
                    const co = b.check_out_date || b.checkOut;
                    if (!co) return null;
                    try {
                      const coDate = new Date(co);
                      if (!isNaN(coDate.getTime()) && coDate < new Date()) {
                        return (
                          <button
                            type="button"
                            onClick={() => openReviewModal(b)}
                            className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                          >
                            Leave Review
                          </button>
                        );
                      }
                    } catch (_) { return null; }
                    return null;
                  })()}
                </div>
              </div>
              {detailId === b.id && (
                <div className="mt-4 border-t border-border pt-4 text-sm">
                      <p><strong>Guest:</strong> {userProfile.name || user?.name}</p>
                      <p><strong>Contact:</strong> {userProfile.email || user?.email}</p>
                      <p><strong>Nights:</strong> {nights ?? '—'}</p>
                      <p>
                        <strong>Total:</strong> ₱{total ?? b.total_price}
                        {b.net_paid != null && (
                          <span className="ml-2 text-sm text-muted-foreground">(Net: ₱{Number(b.net_paid).toLocaleString()})</span>
                        )}
                      </p>
                      <p>
                        <strong>Charges (Taxes & fees):</strong>{' '}
                        {(() => {
                          const t = Number(total ?? 0);
                          const subtotal = Number(b.subtotal ?? Math.round(t / 1.12));
                          const tax = Math.round((t - subtotal) * 100) / 100;
                          const paid = Number(b.total_paid ?? 0);
                          const bal = Math.round((t - paid) * 100) / 100;
                          return (
                            <span>
                              <span className="text-sm">₱{tax.toLocaleString()}</span>
                              <span className="ml-3 text-xs text-muted-foreground">{bal > 0 ? <span className="text-amber-600">Due: ₱{bal.toLocaleString()}</span> : bal < 0 ? <span className="text-rose-600">Refund due: ₱{Math.abs(bal).toLocaleString()}</span> : <span className="text-green-600">Settled</span>}</span>
                            </span>
                          );
                        })()}
                      </p>
                </div>
              )}
            </div>
          );
          })}
            </div>
          )}
        </>
      )}
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
      {reviewModalOpen && reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Leave a review</h2>
            <p className="text-sm text-muted-foreground mt-1">Share your experience for {getRoomById(reviewTarget.room_ids?.[0])?.name || `Booking #${reviewTarget.id}`}</p>
            <form className="mt-4 space-y-4" onSubmit={submitReview}>
              <div>
                <label className="block text-sm font-medium text-foreground">Rating</label>
                <select value={reviewForm.rating} onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))} className="mt-1 w-32 rounded-md border border-border px-3 py-2 text-sm">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Comments (optional)</label>
                <textarea value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" rows={4} />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-2 text-white">Submit Review</button>
                <button type="button" onClick={() => { setReviewModalOpen(false); setReviewTarget(null); }} className="flex-1 rounded-lg border border-border">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Request Modification</h2>
            <form className="mt-4 space-y-4" onSubmit={handleRequestModifySubmit}>
              <div>
                <label className="block text-sm font-medium text-foreground">Arrival</label>
                <input type="date" value={modifyForm.check_in_date} onChange={(e) => setModifyForm((f) => ({ ...f, check_in_date: e.target.value }))} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Departure</label>
                <input type="date" value={modifyForm.check_out_date} onChange={(e) => setModifyForm((f) => ({ ...f, check_out_date: e.target.value }))} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Choose rooms</label>
                <div className="mt-2 grid grid-cols-1 gap-2 max-h-48 overflow-auto border border-border rounded p-2">
                  {(Array.isArray(rooms) ? rooms : []).map((r) => {
                    const idNum = Number(r.id);
                    const available = availableRoomIds.size === 0 ? true : availableRoomIds.has(idNum);
                    return (
                      <label key={r.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={modifyForm.room_ids.includes(idNum)} disabled={!available} onChange={() => {
                          setModifyForm((f) => {
                            const has = f.room_ids.includes(idNum);
                            return { ...f, room_ids: has ? f.room_ids.filter((x) => x !== idNum) : [...f.room_ids, idNum] };
                          });
                        }} />
                        <span>{r.id} — {r.name || r.room_number} {r.pricePerNight ? `• ₱${r.pricePerNight}` : ''} {!available && <span className="ml-2 text-xs text-rose-600">(unavailable)</span>}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Number of guests</label>
                <input type="number" min="1" value={modifyForm.guests} onChange={(e) => setModifyForm((f) => ({ ...f, guests: Math.max(1, Number(e.target.value || 1)) }))} className="mt-1 w-32 rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-2 text-white">Request</button>
                <button type="button" onClick={() => { setModifyModalOpen(false); setModifyTarget(null); }} className="flex-1 rounded-lg border border-border">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <section className="mt-12 rounded-xl border border-border p-6">
        <h2 className="font-bold text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {userProfile.name || user?.name || '—'}
        </p>
        <p className="text-sm text-muted-foreground">
          {userProfile.email || user?.email || '—'}
        </p>
        <p className="text-sm text-muted-foreground">
          {userProfile.phone || user?.phone || '—'}
        </p>
        <button
          type="button"
          onClick={openProfileModal}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          Edit profile
        </button>
      </section>

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Edit profile</h2>
            <form className="mt-4 space-y-4" onSubmit={handleProfileSave}>
              <div>
                <label className="block text-sm font-medium text-foreground" htmlFor="profile-name">
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground" htmlFor="profile-email">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground" htmlFor="profile-phone">
                  Phone
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
