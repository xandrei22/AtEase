import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBookingRequests, approveBookingRequest, rejectBookingRequest } from '../../api/bookings';
import { formatDateTimeDisplay } from '../../utils/format';

export default function AdminRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getBookingRequests(token).then(setRequests).catch(() => setRequests([])).finally(() => setLoading(false));
  }, [token]);

  // Poll for new requests so admins see customer requests shortly after they're created
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      getBookingRequests(token).then(setRequests).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [token]);

  const refresh = () => {
    if (!token) return;
    setLoading(true);
    getBookingRequests(token).then(setRequests).catch(() => setRequests([])).finally(() => setLoading(false));
  };

  const handleApprove = async (r) => {
    try {
      const body = r.request_type === 'cancel' ? { refund_amount: Number(refundAmount || 0) } : undefined;
      await approveBookingRequest(token, r.id, body);
      refresh();
    } catch (err) {
      alert('Approve failed: ' + (err.message || err));
    }
  };

  const handleReject = async (r) => {
    try {
      await rejectBookingRequest(token, r.id);
      refresh();
    } catch (err) {
      alert('Reject failed: ' + (err.message || err));
    }
  };

  const parsePayload = (payload) => {
    if (payload == null) return null;
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch (e) {
        return payload;
      }
    }
    return payload;
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold">Booking Requests</h1>
      {loading ? (
        <div className="mt-6 text-muted-foreground">Loading…</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background p-4">
          {requests.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">No requests</div>
          ) : (
            <div className="space-y-6">
              {['cancel', 'modify'].map((type) => {
                const list = requests.filter((x) => x.request_type === type);
                if (list.length === 0) return null;
                return (
                  <div key={type}>
                    <h3 className="mb-3 text-lg font-medium">{type === 'cancel' ? 'Cancellation Requests' : 'Modification Requests'}</h3>
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="p-3 font-medium">ID</th>
                          <th className="p-3 font-medium">Booking</th>
                          <th className="p-3 font-medium">Requested by</th>
                          <th className="p-3 font-medium">When</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => (
                          <tr key={r.id} className="border-b border-border">
                            <td className="p-3 font-mono">{r.id}</td>
                            <td className="p-3">#{r.booking_id} {r.booking_total ? `• ₱${Number(r.booking_total).toLocaleString()}` : ''}</td>
                            <td className="p-3">{r.requested_by_name || r.requested_by}</td>
                            <td className="p-3">{formatDateTimeDisplay(r.created_at)}</td>
                            <td className="p-3">{(r.status || 'pending').toLowerCase()}</td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setSelected(r)} className="text-primary hover:underline">View</button>
                                <button type="button" onClick={() => handleReject(r)} disabled={(r.status || '').toLowerCase() !== 'pending' } className="text-rose-600 hover:underline disabled:opacity-50">Reject</button>
                                <button type="button" onClick={() => { if (r.request_type === 'cancel') { setSelected(r); } else handleApprove(r); }} disabled={(r.status || '').toLowerCase() !== 'pending' } className="text-green-600 hover:underline disabled:opacity-50">Approve</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Request #{selected.id}</h2>
            <div className="mt-3 rounded bg-muted/20 p-3 text-sm overflow-auto">
              {(() => {
                const parsed = parsePayload(selected.payload);
                if (selected.request_type === 'cancel') {
                  const reason = parsed && parsed.reason != null ? parsed.reason : null;
                  return (
                    <div>
                      <div className="font-medium">Reason</div>
                      <div className="mt-1 text-sm text-muted-foreground">{reason || 'No reason available'}</div>
                    </div>
                  );
                }
                if (selected.request_type === 'modify') {
                  if (!parsed) return <div>No payload</div>;
                  return (
                    <div>
                      <div><strong>Arrival:</strong> {parsed.check_in_date}</div>
                      <div><strong>Departure:</strong> {parsed.check_out_date}</div>
                      <div className="mt-2"><strong>Rooms:</strong> {(Array.isArray(parsed.room_ids) ? parsed.room_ids.join(', ') : String(parsed.room_ids))}</div>
                      {parsed.guests != null && <div className="mt-1"><strong>Guests:</strong> {parsed.guests}</div>}
                    </div>
                  );
                }
                return <pre>{typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}</pre>;
              })()}
            </div>
            {selected.request_type === 'cancel' && (
              <div className="mt-4">
                <label className="block text-sm font-medium">Refund amount (₱)</label>
                <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => handleApprove(selected)} className="flex-1 rounded-lg bg-primary py-2 text-white">Approve</button>
              <button type="button" onClick={() => handleReject(selected)} className="flex-1 rounded-lg border border-border">Reject</button>
              <button type="button" onClick={() => setSelected(null)} className="flex-1 rounded-lg border border-border">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
