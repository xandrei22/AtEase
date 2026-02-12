import { useState, useMemo, useRef, useEffect } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { createRoom, updateRoom } from '../../api/rooms';
import { uploadImage } from '../../api/upload';
import { ROOM_TYPES as PRESET_ROOM_TYPES, AMENITY_OPTIONS } from '../../data/mockRooms';

const ROOM_TYPE_NEW = '__new__';

export default function AdminRoomsPage() {
  const { rooms, roomsLoading, refreshRooms } = useBooking();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalRoom, setModalRoom] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customRoomType, setCustomRoomType] = useState('');
  const [newAmenityInput, setNewAmenityInput] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
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
  const [quantity, setQuantity] = useState(1);

  const allRoomTypes = useMemo(() => {
    const fromRooms = rooms.map((r) => r.type).filter(Boolean);
    return [...new Set([...PRESET_ROOM_TYPES, ...fromRooms])].sort();
  }, [rooms]);

  const filtered = rooms.filter((r) => {
    const matchSearch = !search || (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.hotelName || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || r.type === typeFilter;
    return matchSearch && matchType;
  });

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

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
    setCustomRoomType('');
    setNewAmenityInput('');
    setImageUploadError('');
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setModalRoom(null);
    setAddOpen(true);
    setQuantity(1);
    setError('');
  };

  const openEdit = (r) => {
    const existingType = r.type || 'Double';
    const typeInList = allRoomTypes.includes(existingType);
    setForm({
      room_number: r.room_number || '',
      name: r.name || '',
      room_type: typeInList ? existingType : ROOM_TYPE_NEW,
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
    setCustomRoomType(typeInList ? '' : existingType);
    setNewAmenityInput('');
    setImageUploadError('');
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setModalRoom(r);
    setAddOpen(false);
    setError('');
  };

  const resolvedRoomType = form.room_type === ROOM_TYPE_NEW ? customRoomType.trim() : form.room_type;

  const toggleAmenity = (amenity) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const addCustomAmenity = () => {
    const val = newAmenityInput.trim();
    if (!val) return;
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(val) ? f.amenities : [...f.amenities, val],
    }));
    setNewAmenityInput('');
  };

  const removeAmenity = (amenity) => {
    setForm((f) => ({ ...f, amenities: f.amenities.filter((a) => a !== amenity) }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setImageUploadError('');
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageUploading(true);
    try {
      const { url } = await uploadImage(token, file);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setForm((f) => ({ ...f, image: url }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImageUploadError(err?.message || 'Upload failed.');
    } finally {
      setImageUploading(false);
    }
  };

  const clearRoomImage = () => {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setForm((f) => ({ ...f, image: '' }));
    setImageUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  function parseRoomNumbers(input, qty) {
    const trimmed = String(input).trim();
    if (!trimmed) return [];

    // Comma-separated: "302, 410" or "302, 410, 411" → each gets own card
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Range: "410-415" or "410 to 415" or "410 - 415" → 410, 411, 412, 413, 414, 415
    const rangeMatch = trimmed.match(/^(\d+)\s*(?:-|to)\s*(\d+)$/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!isNaN(start) && !isNaN(end) && start <= end && end - start < 100) {
        return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
      }
    }

    // Single + quantity: "101" with qty 3 → 101, 102, 103
    const match = trimmed.match(/^(.+?)(\d+)$/);
    let prefix = '';
    let startNum = 0;
    if (match) {
      prefix = match[1];
      startNum = parseInt(match[2], 10);
    } else {
      startNum = parseInt(trimmed, 10);
      if (isNaN(startNum)) startNum = 1;
    }
    return Array.from({ length: qty }, (_, i) => `${prefix}${startNum + i}`);
  }

  const handleSave = async () => {
    setError('');
    if (!form.room_number?.trim() || form.price_per_night === '' || !form.capacity) {
      setError('Room number, price per night, and capacity are required.');
      return;
    }
    if (form.room_type === ROOM_TYPE_NEW && !resolvedRoomType) {
      setError('Please enter a room type or select an existing one.');
      return;
    }
    const qty = Math.max(1, Math.min(50, Number(quantity) || 1));
    if (modalRoom && qty > 1) {
      setError('Quantity applies only when adding new rooms, not when editing.');
      return;
    }
    const roomNumbers = modalRoom ? [form.room_number.trim()] : parseRoomNumbers(form.room_number.trim(), qty);
    if (roomNumbers.length === 0 || (roomNumbers.length === 1 && !roomNumbers[0])) {
      setError('Enter room number(s): e.g. "302, 410" or "410-415" or "101" with quantity.');
      return;
    }
    if (!modalRoom && roomNumbers.length > 50) {
      setError('Maximum 50 rooms at a time.');
      return;
    }
    setSaving(true);
    try {
      if (modalRoom) {
        await updateRoom(token, modalRoom.id, {
          room_number: form.room_number.trim(),
          name: form.name.trim() || null,
          room_type: resolvedRoomType,
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
        const basePayload = {
          name: form.name.trim() || null,
          room_type: resolvedRoomType,
          price_per_night: Number(form.price_per_night),
          capacity: Number(form.capacity),
          is_available: form.is_available,
          description: form.description.trim() || null,
          amenities: form.amenities,
          image: form.image.trim() || null,
          cancellation_policy: form.cancellation_policy.trim() || null,
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
        };
        for (let i = 0; i < roomNumbers.length; i++) {
          const roomName = roomNumbers.length > 1 && form.name?.trim()
            ? `${form.name.trim()} ${roomNumbers[i]}`
            : (form.name.trim() || null);
          await createRoom(token, {
            ...basePayload,
            room_number: roomNumbers[i],
            name: roomName,
          });
        }
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
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setModalRoom(null);
    setAddOpen(false);
    setError('');
  };

  const amenitiesList = (r) => (Array.isArray(r.amenities) ? r.amenities.join(', ') : '');

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
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
          {allRoomTypes.map((t) => (
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
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-background shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-cyan-500 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {modalRoom ? 'Edit room' : 'Add new room'}
              </h2>
              <button type="button" onClick={closeModal} className="rounded p-1 text-white hover:bg-white/20" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="p-6">
              {error && (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Room identification</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="room-number" className="block text-sm font-medium text-foreground">Room number <span className="text-red-600">*</span></label>
                      <input id="room-number" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.room_number} onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))} placeholder={modalRoom ? 'e.g. 101' : 'e.g. 302, 410 or 410-415'} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {!modalRoom && (
                          <>
                            Comma list: 302, 410 → separate cards. Range: 410-415 or 410 to 415. Or use quantity for 101, 102, 103.
                          </>
                        )}
                      </p>
                    </div>
                    {!modalRoom && (
                      <div>
                        <label htmlFor="room-quantity" className="block text-sm font-medium text-foreground">Quantity</label>
                        <input id="room-quantity" type="number" min={1} max={50} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={quantity} onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setQuantity(isNaN(v) ? 1 : Math.max(1, Math.min(50, v)));
                      }} placeholder="1" />
                        <p className="mt-1 text-xs text-muted-foreground">Used when entering a single number (e.g. 101 + 3 = 101, 102, 103)</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="room-name" className="block text-sm font-medium text-foreground">Display name</label>
                    <input id="room-name" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ocean View Suite" />
                  </div>
                  <div>
                    <label htmlFor="room-type" className="block text-sm font-medium text-foreground">Room category</label>
                    <select id="room-type" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-foreground" value={form.room_type} onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))}>
                      {allRoomTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value={ROOM_TYPE_NEW}>— Add new type —</option>
                    </select>
                    {form.room_type === ROOM_TYPE_NEW && (
                      <div className="mt-2">
                        <label htmlFor="custom-type" className="block text-xs font-medium text-muted-foreground">New room type name</label>
                        <input id="custom-type" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={customRoomType} onChange={(e) => setCustomRoomType(e.target.value)} placeholder="e.g. Premium Suite" />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rates & capacity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-foreground">Price per night (₱) <span className="text-red-600">*</span></label>
                    <input id="price" type="number" min="0" step="0.01" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: e.target.value }))} />
                  </div>
                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-foreground">Maximum occupancy <span className="text-red-600">*</span></label>
                    <input id="capacity" type="number" min="1" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
                  </div>
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Availability</h3>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} className="rounded border-border" />
                  <span className="text-sm font-medium text-foreground">Available for booking</span>
                </label>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Amenities</h3>
                <p className="mb-2 text-xs text-muted-foreground">Select from the list and/or add custom amenities below.</p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((a) => (
                    <label key={a} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm">
                      <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)} className="rounded border-border" />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.amenities.filter((a) => !AMENITY_OPTIONS.includes(a)).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-sm text-foreground">
                      {a}
                      <button type="button" onClick={() => removeAmenity(a)} className="rounded hover:bg-primary/25" aria-label={`Remove ${a}`}>×</button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={newAmenityInput}
                    onChange={(e) => setNewAmenityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                    placeholder="Add new amenity"
                  />
                  <button type="button" onClick={addCustomAmenity} className="shrink-0 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted">
                    Add
                  </button>
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Media & description</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Room image</label>
                    <div className="mt-1 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="sr-only"
                            disabled={imageUploading}
                            onChange={handleImageUpload}
                          />
                          {imageUploading ? 'Uploading…' : 'Upload image'}
                        </label>
                        <span className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP, max 5 MB</span>
                      </div>
                      <div className="mx-auto rounded-xl border border-border bg-muted/20 overflow-hidden" style={{ maxWidth: 320 }}>
                        {imagePreviewUrl || form.image ? (
                          <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-muted/20">
                            <img
                              src={imagePreviewUrl || form.image}
                              alt="Room preview"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button type="button" onClick={clearRoomImage} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-sm text-white hover:bg-black/80" aria-label="Remove image">Remove</button>
                          </div>
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center text-muted-foreground">
                            <span className="text-sm">No image — upload to preview</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {imageUploadError && <p className="mt-1 text-sm text-red-600">{imageUploadError}</p>}
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-foreground">Description</label>
                    <textarea id="description" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the room" />
                  </div>
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Policy & times</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="cancellation" className="block text-sm font-medium text-foreground">Cancellation policy</label>
                    <input id="cancellation" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.cancellation_policy} onChange={(e) => setForm((f) => ({ ...f, cancellation_policy: e.target.value }))} placeholder="e.g. Free cancellation 48h before check-in" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="check-in" className="block text-sm font-medium text-foreground">Check-in time</label>
                      <input id="check-in" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.check_in_time} onChange={(e) => setForm((f) => ({ ...f, check_in_time: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="check-out" className="block text-sm font-medium text-foreground">Check-out time</label>
                      <input id="check-out" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={form.check_out_time} onChange={(e) => setForm((f) => ({ ...f, check_out_time: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
