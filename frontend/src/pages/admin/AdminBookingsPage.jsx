import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllBookings, cancelBooking as apiCancelBooking, modifyBooking as apiModifyBooking } from '../../api/bookings';
import { getPaymentSummary } from '../../api/payments';
import { formatDateTimeDisplay } from '../../utils/format';
import { fetchRooms as fetchRoomsApi } from '../../api/rooms';

const statusColors = {
  confirmed: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
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

  const [rooms, setRooms] = useState([]);
  const [availableRoomIds, setAvailableRoomIds] = useState(new Set());

  const filtered = bookings.filter((b) => {
    const matchStatus = !statusFilter || (b.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchSearch = !search || (b.user_name && b.user_name.toLowerCase().includes(search.toLowerCase())) || (b.user_email && b.user_email.toLowerCase().includes(search.toLowerCase())) || (b.id && String(b.id).includes(search));
    return matchStatus && matchSearch;
  });

  const selected = detailId ? bookings.find((b) => b.id === detailId) : null;
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyForm, setModifyForm] = useState({ check_in_date: '', check_out_date: '', room_ids: [], guests: 1 });
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ percent: 50, amount: 0, netPaid: 0 });

  // When modifying dates, fetch available rooms for those dates and mark which rooms are selectable
  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      try {
        const list = await fetchRoomsApi(false);
        if (cancelled) return;
        setRooms(list);
      } catch (err) {
        if (!cancelled) setRooms([]);
      }
    }
    if (modifyOpen) loadRooms();
    return () => { cancelled = true; };
  }, [modifyOpen]);

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
    if (modifyOpen) loadAvailable();
    return () => { cancelled = true; };
  }, [modifyForm.check_in_date, modifyForm.check_out_date, modifyOpen]);

  return (
    <div className="p-6 md:p-8">
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
          <option value="partial">50% paid</option>
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
                <th className="p-4 font-medium">Charges</th>
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
                    <td className="p-4">{formatDateTimeDisplay(b.check_in_date)}</td>
                    <td className="p-4">{formatDateTimeDisplay(b.check_out_date)}</td>
                    <td className="p-4">
                      <div className="text-sm">₱{Number(b.total_price ?? b.total ?? 0).toLocaleString()}</div>
                      {b.net_paid != null && (
                        <div className="text-xs text-muted-foreground">Net: ₱{Number(b.net_paid).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const total = Number(b.total_price ?? b.total ?? 0);
                        const subtotal = Number(b.subtotal ?? Math.round(total / 1.12));
                        const tax = Math.round((total - subtotal) * 100) / 100;
                        const paid = Number(b.total_paid ?? 0);
                        const balance = Math.round((total - paid) * 100) / 100;
                        return (
                          <div>
                            <div className="text-sm">Taxes & fees: ₱{tax.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {balance > 0 ? <span className="text-amber-600">Due: ₱{balance.toLocaleString()}</span> : balance < 0 ? <span className="text-rose-600">Refund due: ₱{Math.abs(balance).toLocaleString()}</span> : <span className="text-green-600">Settled</span>}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4"><span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[(b.status || '').toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>{(b.status || '').toLowerCase() === 'partial' ? '50% paid' : b.status}</span></td>
                    <td className="p-4">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setDetailId(b.id)} className="text-primary hover:underline">View</button>
                            {((b.status || '').toLowerCase() !== 'cancelled') && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    // fetch payment summary to suggest refund amounts
                                    const summary = await getPaymentSummary(token, b.id);
                                    const netPaid = summary.net_paid || 0;
                                    // default percent: if fully paid, suggest 50% (admin can change); if paid 50% suggest 0%
                                    let defaultPercent = 0;
                                    const paidRatio = summary.total_paid && summary.total_price ? (summary.total_paid / summary.total_price) : 0;
                                    if (paidRatio >= 1) defaultPercent = 50;
                                    else if (paidRatio >= 0.5) defaultPercent = 0;
                                    else defaultPercent = 0;
                                    setRefundForm({ percent: defaultPercent, amount: Math.round(netPaid * (defaultPercent / 100) * 100) / 100, netPaid });
                                    setRefundOpen(true);
                                    setDetailId(b.id);
                                  } catch (err) {
                                    alert('Failed to load payment summary: ' + (err.message || err));
                                  }
                                }}
                                className="text-red-600 hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                  setModifyForm({
                                    check_in_date: b.check_in_date ? b.check_in_date.slice(0,10) : '',
                                    check_out_date: b.check_out_date ? b.check_out_date.slice(0,10) : '',
                                    room_ids: (b.room_ids || []).map((x) => Number(x)),
                                    guests: b.guests || 1,
                                  });
                                  setModifyOpen(true);
                                  setDetailId(b.id);
                                }}
                              className="text-amber-600 hover:underline"
                            >
                              Modify
                            </button>
                          </div>
                        </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground">Booking #{selected.id}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p><strong>Guest:</strong> {selected.user_name}</p>
              <p><strong>Email:</strong> {selected.user_email}</p>
              <p><strong>Check-in:</strong> {formatDateTimeDisplay(selected.check_in_date)}</p>
              <p><strong>Check-out:</strong> {formatDateTimeDisplay(selected.check_out_date)}</p>
              <p><strong>Total:</strong> ₱{selected.total_price}</p>
              <p><strong>Status:</strong> {selected.status}</p>
              <p><strong>Created:</strong> {formatDateTimeDisplay(selected.created_at)}</p>
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

      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Cancel booking #{detailId} — Refund</h2>
            <p className="text-sm text-muted-foreground">Net paid: ₱{refundForm.netPaid}</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const refundAmount = parseFloat(refundForm.amount) || 0;
                try {
                  // perform cancellation (admin path) and pass refund_amount for server-side processing
                  await apiCancelBooking(token, detailId, { refund_amount: refundAmount });
                  setBookings((prev) => prev.map((b) => (b.id === detailId ? { ...b, status: 'cancelled' } : b)));
                  setRefundOpen(false);
                  setDetailId(null);
                } catch (err) {
                  alert('Failed to cancel or refund: ' + (err.message || err));
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground">Refund percent</label>
                <div className="mt-1 flex gap-2">
                  {[100,75,50,0].map((p) => (
                    <label key={p} className="inline-flex items-center gap-2">
                      <input type="radio" name="refundPercent" checked={refundForm.percent === p} onChange={() => setRefundForm((f) => ({ ...f, percent: p, amount: Math.round(f.netPaid * (p/100) * 100) / 100 }))} />
                      <span className="text-sm">{p}%</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Refund amount (₱)</label>
                <input type="number" step="0.01" min="0" value={refundForm.amount} onChange={(e) => setRefundForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-red-600 py-2 text-white">Confirm cancel & refund</button>
                <button type="button" onClick={() => setRefundOpen(false)} className="flex-1 rounded-lg border border-border">Keep booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Modify booking #{detailId}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const payload = {
                  check_in_date: modifyForm.check_in_date,
                  check_out_date: modifyForm.check_out_date,
                  room_ids: Array.isArray(modifyForm.room_ids) ? modifyForm.room_ids.map((x) => Number(x)) : [],
                  guests: Number(modifyForm.guests || 1),
                };

                // If dates are missing (admin only wants to change rooms), fall back to original booking dates
                if (!payload.check_in_date || !payload.check_out_date) {
                  const booking = bookings.find((b) => b.id === detailId);
                  if (booking) {
                    payload.check_in_date = payload.check_in_date || (booking.check_in_date || '').toString();
                    payload.check_out_date = payload.check_out_date || (booking.check_out_date || '').toString();
                  }
                }

                // Validate availability if we have an available set
                if (availableRoomIds.size > 0) {
                  const invalid = payload.room_ids.find((id) => !availableRoomIds.has(Number(id)));
                  if (invalid) {
                    alert('One or more selected rooms are not available for the chosen dates. Please update your selection.');
                    return;
                  }
                }

                try {
                  const resp = await apiModifyBooking(token, detailId, payload);
                  setBookings((prev) => prev.map((b) => (b.id === detailId ? { ...b, check_in_date: payload.check_in_date, check_out_date: payload.check_out_date, total_price: resp.new_total ?? resp.total_price ?? b.total_price, status: 'confirmed', room_ids: payload.room_ids } : b)));
                  setModifyOpen(false);
                  setDetailId(null);
                  if (resp.delta && resp.delta > 0) alert(`Additional charge due: ₱${resp.delta}`);
                  else if (resp.delta && resp.delta < 0) alert(`Refund due: ₱${Math.abs(resp.delta)}`);
                } catch (err) {
                  alert('Failed to modify booking: ' + (err.message || err));
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground">Check-in</label>
                <input type="date" value={modifyForm.check_in_date} onChange={(e) => setModifyForm((f) => ({ ...f, check_in_date: e.target.value }))} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Check-out</label>
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
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-2 text-white">Save changes</button>
                <button type="button" onClick={() => setModifyOpen(false)} className="flex-1 rounded-lg border border-border">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
