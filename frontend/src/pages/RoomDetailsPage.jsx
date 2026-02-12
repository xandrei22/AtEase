import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';

function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.ceil((b - a) / (24 * 60 * 60 * 1000)));
}

export default function RoomDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getRoomById, setSelectedRoom, setCheckoutDates, isInWishlist, toggleWishlist, searchParams } = useBooking();
  const [mainImage, setMainImage] = useState(0);

  const room = getRoomById(id);
  const state = location.state || {};
  const initialCheckIn = state.checkIn || searchParams.checkIn || '';
  const initialCheckOut = state.checkOut || searchParams.checkOut || '';
  const initialGuests = state.guests ?? searchParams.guests ?? 1;
  
  const [editCheckIn, setEditCheckIn] = useState(initialCheckIn);
  const [editCheckOut, setEditCheckOut] = useState(initialCheckOut);
  const [editGuests, setEditGuests] = useState(String(initialGuests));

  const checkIn = editCheckIn;
  const checkOut = editCheckOut;
  const editableGuests = Number(editGuests) || 1;
  const nights = getNights(checkIn, checkOut);
  const subtotal = room ? room.pricePerNight * nights : 0;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax;
  const inWishlist = room ? isInWishlist(room.id) : false;

  if (!room) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Room not found.</p>
        <button
          type="button"
          onClick={() => navigate('/rooms')}
          className="mt-4 text-primary hover:underline"
        >
          Back to rooms
        </button>
      </div>
    );
  }

  const handleProceedToCheckout = () => {
    if (!editCheckIn || !editCheckOut) {
      alert('Please select your check-in and check-out dates.');
      return;
    }
    setSelectedRoom(room);
    setCheckoutDates({ checkIn: editCheckIn, checkOut: editCheckOut, guests: editableGuests });
    navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {location.state?.missingDates && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Please set your check-in and check-out dates using the search on the <button type="button" onClick={() => navigate('/rooms')} className="font-medium underline hover:no-underline">Rooms</button> or <button type="button" onClick={() => navigate('/')} className="font-medium underline hover:no-underline">Home</button> page, then open this room again and click Book.
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-primary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => toggleWishlist(room.id)}
          className="ml-auto rounded-full p-2 hover:bg-muted"
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {inWishlist ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl bg-muted">
            <img
              src={room.images?.[mainImage] || room.image}
              alt={room.name}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {(room.images || [room.image]).map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMainImage(i)}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${mainImage === i ? 'border-primary' : 'border-transparent'}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-8">
            <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
            <p className="mt-1 text-muted-foreground">{room.hotelName} • {room.location}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-accent">★</span>
              <span className="font-medium">{room.rating}</span>
              <span className="text-muted-foreground">({room.reviewCount} reviews)</span>
            </div>
            <p className="mt-4 text-foreground">{room.description}</p>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground">Amenities</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {room.amenities.map((a) => (
                <span key={a} className="rounded bg-muted px-3 py-2 text-sm">{a}</span>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground">Highlights</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              {room.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground">Policies</h2>
            <p className="mt-2 text-sm text-muted-foreground">{room.cancellationPolicy}</p>
            <p className="mt-2 text-sm text-muted-foreground">Check-in: {room.checkIn} • Check-out: {room.checkOut}</p>
          </div>
          {room.reviews?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-foreground">Guest reviews</h2>
              <div className="mt-4 space-y-4">
                {room.reviews.slice(0, 4).map((rev, i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rev.name}</span>
                      <span className="text-sm text-muted-foreground">{rev.date}</span>
                    </div>
                    <div className="mt-1 flex gap-1 text-accent">{'★'.repeat(rev.rating)}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{rev.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-background p-6 shadow-lg">
            <p className="text-2xl font-bold text-foreground">₱{room.pricePerNight} <span className="text-base font-normal text-muted-foreground">/ night</span></p>
            {editCheckIn && editCheckOut && (
              <>
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Check-in</label>
                    <input
                      type="date"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Check-out</label>
                    <input
                      type="date"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={editGuests}
                      onChange={(e) => setEditGuests(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''} • {editableGuests} guest{editableGuests !== 1 ? 's' : ''}</p>
                <div className="mt-4 space-y-1 border-t border-border pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (₱{room.pricePerNight} × {nights})</span>
                    <span>₱{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes & fees</span>
                    <span>₱{tax}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2">
                    <span>Total</span>
                    <span>₱{total}</span>
                  </div>
                </div>
              </>
            )}
            {(!editCheckIn || !editCheckOut) && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Please select check-in and check-out dates using the search on the <button type="button" onClick={() => navigate('/rooms')} className="font-medium underline hover:no-underline">Rooms</button> or <button type="button" onClick={() => navigate('/')} className="font-medium underline hover:no-underline">Home</button> page.
              </div>
            )}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={!editCheckIn || !editCheckOut}
              className={`mt-6 w-full rounded-lg py-3 font-semibold text-white ${
                !editCheckIn || !editCheckOut
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={() => navigate('/rooms')}
              className="mt-2 w-full text-center text-sm text-primary hover:underline"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
