import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import FilterSidebar from '../components/rooms/FilterSidebar';
import RoomCard from '../components/rooms/RoomCard';

function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.ceil((b - a) / (24 * 60 * 60 * 1000)));
}

export default function RoomListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getFilteredRooms, searchParams: stored, submitSearch } = useBooking();
  const [filters, setFilters] = useState({});

  const checkIn = searchParams.get('checkIn') || stored.checkIn;
  const checkOut = searchParams.get('checkOut') || stored.checkOut;
  const guests = Number(searchParams.get('guests')) || stored.guests || 1;
  const location = searchParams.get('location') || stored.location;

  const [editLocation, setEditLocation] = useState(location || '');
  const [editCheckIn, setEditCheckIn] = useState(checkIn || '');
  const [editCheckOut, setEditCheckOut] = useState(checkOut || '');
  const [editGuests, setEditGuests] = useState(guests || 1);

  useEffect(() => {
    setEditLocation(location || '');
    setEditCheckIn(checkIn || '');
    setEditCheckOut(checkOut || '');
    setEditGuests(guests || 1);
  }, [location, checkIn, checkOut, guests]);

  const { roomsLoading, roomsError, roomsFallback } = useBooking();
  const rooms = useMemo(() => getFilteredRooms({ ...filters, guests: guests || undefined }), [getFilteredRooms, filters, guests]);
  const nights = getNights(checkIn, checkOut);

  const handleUpdateSearch = (e) => {
    e.preventDefault();
    const params = {
      location: editLocation.trim(),
      checkIn: editCheckIn || '',
      checkOut: editCheckOut || '',
      guests: editGuests || 1,
    };
    submitSearch(params);
    const q = new URLSearchParams();
    if (params.location) q.set('location', params.location);
    if (params.checkIn) q.set('checkIn', params.checkIn);
    if (params.checkOut) q.set('checkOut', params.checkOut);
    if (params.guests) q.set('guests', String(params.guests));
    setSearchParams(q, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Available Rooms</h1>
        <p className="text-muted-foreground">
          {roomsLoading ? 'Loading…' : roomsError ? roomsError : `${location ? `Results for "${location}"` : 'All rooms'} • ${rooms.length} room${rooms.length !== 1 ? 's' : ''} found`}
        </p>
        {roomsFallback && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Showing sample rooms. Start the backend and MySQL to load real data (see backend/database/README.md).
          </div>
        )}
      </div>

      <form onSubmit={handleUpdateSearch} className="mb-6 rounded-xl border border-border bg-muted/30 p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">Modify search</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="rooms-location" className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
            <input
              id="rooms-location"
              type="text"
              placeholder="City or hotel name"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="rooms-checkIn" className="mb-1 block text-xs font-medium text-muted-foreground">Check-in</label>
            <input
              id="rooms-checkIn"
              type="date"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="rooms-checkOut" className="mb-1 block text-xs font-medium text-muted-foreground">Check-out</label>
            <input
              id="rooms-checkOut"
              type="date"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              min={editCheckIn || new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="rooms-guests" className="mb-1 block text-xs font-medium text-muted-foreground">Guests</label>
            <select
              id="rooms-guests"
              value={editGuests}
              onChange={(e) => setEditGuests(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background pl-3 pr-10 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Update search
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0 lg:w-64">
          <FilterSidebar filters={filters} onFiltersChange={setFilters} />
        </div>
        <div className="min-w-0 flex-1">
          {roomsLoading && (
            <div className="rounded-xl border border-border bg-muted/30 p-12 text-center text-muted-foreground">Loading rooms…</div>
          )}
          {roomsError && !roomsLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{roomsError}</div>
          )}
          {!roomsLoading && !roomsError && (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} nights={nights} />
              ))}
            </div>
          )}
          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
              <p className="text-muted-foreground">No rooms match your filters. Try adjusting your search above or the filters on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
