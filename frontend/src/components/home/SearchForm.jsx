import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';

export default function SearchForm() {
  const navigate = useNavigate();
  const { searchParams, submitSearch } = useBooking();
  const [location, setLocation] = useState(searchParams.location || '');
  const [roomType, setRoomType] = useState(searchParams.roomType || '');
  const [checkIn, setCheckIn] = useState(searchParams.checkIn || '');
  const [checkOut, setCheckOut] = useState(searchParams.checkOut || '');
  const [guests, setGuests] = useState(String(searchParams.guests || 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    const guestsNum = Number(guests) || 0;
    if (guestsNum < 1) {
      alert('Please enter at least 1 guest');
      return;
    }
    submitSearch({ location, roomType, checkIn, checkOut, guests: guestsNum });
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (roomType) params.set('roomType', roomType);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guestsNum) params.set('guests', guestsNum);
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 mx-auto w-full max-w-5xl overflow-visible rounded-2xl border border-border bg-background p-4 shadow-lg md:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end lg:gap-5">
        <div className="min-w-0 lg:col-span-2">
          <label htmlFor="roomType" className="mb-1 block text-sm font-medium text-foreground">
            Room
          </label>
          <input
            id="roomType"
            type="text"
            placeholder="Search room type or name"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="h-11 min-w-0 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="checkIn" className="mb-1 block text-sm font-medium text-foreground">
            Check-in
          </label>
          <input
            id="checkIn"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-background pl-4 pr-12 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="checkOut" className="mb-1 block text-sm font-medium text-foreground">
            Check-out
          </label>
          <input
            id="checkOut"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || new Date().toISOString().split('T')[0]}
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-background pl-4 pr-6 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="min-w-0 lg:col-span-1.5">
          <label htmlFor="guests" className="mb-1 block text-sm font-medium text-foreground">
            Guests
          </label>
          <input
            id="guests"
            type="text"
            placeholder="Minimum of 1"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="h-11 min-w-0 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-end lg:col-span-1.5 lg:pb-0.5">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg bg-primary px-6 py-2.5 text-center font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Search Rooms
          </button>
        </div>
      </div>
    </form>
  );
}
