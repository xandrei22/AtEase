import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import RoomCard from '../components/rooms/RoomCard';

function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.ceil((b - a) / (24 * 60 * 60 * 1000)));
}

export default function FavoritesPage() {
  const { wishlist, getRoomById, rooms, searchParams, refreshRooms, roomsLoading } = useBooking();

  const checkIn = searchParams.checkIn || '';
  const checkOut = searchParams.checkOut || '';
  const nights = getNights(checkIn, checkOut);

  const favoritedRooms = wishlist
    .map((id) => getRoomById(id))
    .filter(Boolean);

  useEffect(() => {
    if (wishlist.length > 0) {
      refreshRooms();
    }
  }, [wishlist.length, refreshRooms]);

  const missingIds = wishlist.filter(
    (id) => !rooms.some((r) => String(r.id) === String(id))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Favorites</h1>
        <p className="text-muted-foreground">
          {favoritedRooms.length} {favoritedRooms.length === 1 ? 'room' : 'rooms'} saved
        </p>
      </div>

      {roomsLoading && favoritedRooms.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center text-muted-foreground">
          Loading…
        </div>
      ) : favoritedRooms.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No favorites yet. Browse rooms and tap the heart to add them here.
          </p>
          <Link
            to="/rooms"
            className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90"
          >
            Browse Rooms
          </Link>
        </div>
      ) : (
        <>
          {missingIds.length > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              Some favorited rooms may no longer be available.
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {favoritedRooms.map((room) => (
              <RoomCard key={room.id} room={room} nights={nights} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
