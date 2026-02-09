import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';

export default function RoomCard({ room, nights = 1 }) {
  const { isInWishlist, toggleWishlist, searchParams } = useBooking();
  const inWishlist = isInWishlist(room.id);
  const total = room.pricePerNight * nights;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg transition-shadow hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={room.image}
          alt={room.name}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggleWishlist(room.id); }}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow hover:bg-white"
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span className="text-lg">{inWishlist ? '❤️' : '🤍'}</span>
        </button>
        <span className="absolute left-3 top-3 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
          {room.type}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-foreground text-lg">{room.name}</h3>
        <p className="text-sm text-muted-foreground">{room.hotelName}, {room.location}</p>
        <div className="mt-2 flex items-center gap-1">
          <span className="text-accent">★</span>
          <span className="font-medium text-foreground">{room.rating}</span>
          <span className="text-sm text-muted-foreground">({room.reviewCount} reviews)</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {room.amenities.slice(0, 4).map((a) => (
            <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{a}</span>
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground text-lg">₱{room.pricePerNight}</span> / night
            </p>
            {nights > 1 && (
              <p className="text-xs text-muted-foreground">₱{total} total for {nights} nights</p>
            )}
          </div>
          <Link
            to={`/rooms/${room.id}`}
            state={{ checkIn: searchParams.checkIn, checkOut: searchParams.checkOut, guests: searchParams.guests }}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
