import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { createRoom, updateRoom } from '../../api/rooms';

const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Deluxe'];

export default function AdminRoomsPage() {
  const { rooms, roomsLoading, refreshRooms } = useBooking();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalRoom, setModalRoom] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    room_number: '',
    name: '',
    room_type: 'Double',
    price_per_night: '',
    capacity: '',
    is_available: true,
    description: '',
    amenities: [],
    image: '',
    cancellation_policy: '',
    check_in_time: '3:00 PM',
    check_out_time: '11:00 AM',
  });

  const filtered = rooms.filter((r) => {
    const matchSearch = !search || (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.hotelName || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const openAdd = () => {
    setForm({
      room_number: '',
      name: '',
      room_type: 'Double',
      price_per_night: '',
      capacity: '',
      is_available: true,
      description: '',
      amenities: [],
      image: '',
      cancellation_policy: '',
      check_in_time: '3:00 PM',
      check_out_time: '11:00 AM',
    });
    setModalRoom(null);
    setAddOpen(true);
    setError('');
  };

  const openEdit = (r) => {
    setForm({
      room_number: r.room_number || '',
      name: r.name || '',
      room_type: r.type || 'Double',
      price_per_night: r.pricePerNight ?? '',
      capacity: r.capacity ?? '',
      is_available: r.is_available !== false,
      description: r.description || '',
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      image: r.image || '',
      cancellation_policy: r.cancellationPolicy || '',
      check_in_time: r.checkIn || '3:00 PM',
      check_out_time: r.checkOut || '11:00 AM',
    });
    setModalRoom(r);
    setAddOpen(false);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.room_number?.trim() || form.price_per_night === '' || !form.capacity) {
      setError('Room number, price per night and capacity are required.');
      return;
    }
    setSaving(true);
    try {
      if (modalRoom) {
        await updateRoom(token, modalRoom.id, {
          room_number: form.room_number.trim(),
          name: form.name.trim() || null,
          room_type: form.room_type,
          price_per_night: Number(form.price_per_night),
          capacity: Number(form.capacity),
          is_available: form.is_available,
          description: form.description.trim() || null,
          amenities: form.amenities,
          image: form.image.trim() || null,
          cancellation_policy: form.cancellation_policy.trim() || null,
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
        });
      } else {
        await createRoom(token, {
          room_number: form.room_number.trim(),
          name: form.name.trim() || null,
          room_type: form.room_type,
          price_per_night: Number(form.price_per_night),
          capacity: Number(form.capacity),
          is_available: form.is_available,
          description: form.description.trim() || null,
          amenities: form.amenities,
          image: form.image.trim() || null,
          cancellation_policy: form.cancellation_policy.trim() || null,
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
        });
      }
      refreshRooms();
      setModalRoom(null);
      setAddOpen(false);
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalRoom(null);
    setAddOpen(false);
    setError('');
  };

  const amenitiesList = (r) => (Array.isArray(r.amenities) ? r.amenities.join(', ') : '');

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Room management</h1>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
        >
          Add new room
        </button>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-4 py-2 md:w-64"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border pl-4 pr-12 py-2"
        >
          <option value="">All types</option>
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      {roomsLoading ? (
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">Loading rooms…</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-4 font-medium">Room</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Capacity</th>
                <th className="p-4 font-medium">Price/night</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Amenities</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4">
                    <p className="font-medium">{r.name || r.room_number}</p>
                    <p className="text-muted-foreground text-xs">{r.hotelName || 'AtEase'}</p>
                  </td>
                  <td className="p-4">{r.type}</td>
                  <td className="p-4">{r.capacity}</td>
                  <td className="p-4">₱{r.pricePerNight}</td>
                  <td className="p-4">
                    <span className={`rounded px-2 py-0.5 ${r.is_available !== false ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {r.is_available !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="p-4 max-w-[120px] truncate text-muted-foreground">{amenitiesList(r)}</td>
                  <td className="p-4">
                    <button type="button" onClick={() => openEdit(r)} className="text-primary hover:underline mr-2">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(addOpen || modalRoom) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground">{modalRoom ? 'Edit room' : 'Add new room'}</h2>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium">Room number *</label>
                <input className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.room_number} onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))} placeholder="e.g. 101" />
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ocean View Suite" />
              </div>
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.room_type} onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))}>
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Price/night *</label>
                  <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Capacity *</label>
                  <input type="number" min="1" className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} />
                <span className="text-sm">Available</span>
              </label>
              <div>
                <label className="block text-sm font-medium">Image URL</label>
                <input className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea className="mt-1 w-full rounded-lg border border-border px-3 py-2" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={closeModal} className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
