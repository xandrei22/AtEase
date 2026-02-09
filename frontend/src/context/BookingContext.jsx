import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchRooms } from '../api/rooms';
import { MOCK_ROOMS } from '../data/mockRooms';
import { createBooking, getMyBookings } from '../api/bookings';
import { createPayment } from '../api/payments';
import { useAuth } from './AuthContext';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
  });
  const [wishlist, setWishlist] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [roomsFallback, setRoomsFallback] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkoutDates, setCheckoutDates] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [lastConfirmation, setLastConfirmation] = useState(null);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', postalCode: '', country: '' },
  });

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    setRoomsError(null);
    setRoomsFallback(false);
    fetchRooms(false)
      .then((list) => {
        if (!cancelled) {
          setRooms(list);
          setRoomsFallback(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRooms(MOCK_ROOMS);
          setRoomsError(null);
          setRoomsFallback(true);
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token || !user?.id) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    setBookingsLoading(true);
    getMyBookings(token, user.id)
      .then((list) => {
        if (!cancelled) setBookings(list || []);
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, user?.id]);

  const submitSearch = useCallback((params) => {
    setSearchParams(params);
  }, []);

  const toggleWishlist = useCallback((roomId) => {
    setWishlist((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  }, []);

  const isInWishlist = useCallback(
    (roomId) => wishlist.includes(roomId),
    [wishlist]
  );

  const getRoomById = useCallback(
    (id) => rooms.find((r) => r.id === String(id)),
    [rooms]
  );

  const addBooking = useCallback(
    async (payload) => {
      if (!token || !user?.id) {
        throw new Error('You must be signed in to book.');
      }
      const room = payload.room || selectedRoom;
      const checkIn = payload.checkIn || checkoutDates.checkIn;
      const checkOut = payload.checkOut || checkoutDates.checkOut;
      if (!room?.id || !checkIn || !checkOut) {
        throw new Error('Missing room or dates.');
      }
      const check_in_date = checkIn.includes('T') ? checkIn.slice(0, 10) : checkIn;
      const check_out_date = checkOut.includes('T') ? checkOut.slice(0, 10) : checkOut;
      const booking = await createBooking(token, {
        check_in_date,
        check_out_date,
        room_ids: [Number(room.id)],
      });
      const confirmation = {
        id: booking.id,
        status: booking.status || 'Confirmed',
        createdAt: booking.created_at,
        checkIn: check_in_date,
        checkOut: check_out_date,
        total: parseFloat(booking.total_price),
        room_ids: booking.room_ids,
        ...payload,
      };
      setBookings((prev) => [confirmation, ...prev]);
      setLastConfirmation(confirmation);
      if (payload.total != null && payload.total > 0) {
        try {
          await createPayment(token, {
            booking_id: booking.id,
            amount: payload.total,
            payment_method: 'card',
          });
        } catch (_) {
          // payment optional for confirmation display
        }
      }
      return confirmation;
    },
    [token, user?.id, selectedRoom, checkoutDates]
  );

  const cancelBooking = useCallback((bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: 'Cancelled' } : b))
    );
  }, []);

  const refreshRooms = useCallback(() => {
    setRoomsFallback(false);
    fetchRooms(false)
      .then((list) => {
        setRooms(list);
        setRoomsFallback(false);
      })
      .catch(() => {
        setRooms(MOCK_ROOMS);
        setRoomsError(null);
        setRoomsFallback(true);
      });
  }, []);

  const getFilteredRooms = useCallback(
    (filters = {}) => {
      let list = [...rooms];
      if (searchParams.location) {
        const loc = searchParams.location.toLowerCase();
        list = list.filter(
          (r) =>
            (r.location || '').toLowerCase().includes(loc) ||
            (r.hotelName || '').toLowerCase().includes(loc) ||
            (r.name || '').toLowerCase().includes(loc)
        );
      }
      if (filters.priceMin != null) list = list.filter((r) => r.pricePerNight >= filters.priceMin);
      if (filters.priceMax != null) list = list.filter((r) => r.pricePerNight <= filters.priceMax);
      if (filters.roomTypes?.length) list = list.filter((r) => filters.roomTypes.includes(r.type));
      if (filters.amenities?.length)
        list = list.filter((r) => filters.amenities.every((a) => (r.amenities || []).includes(a)));
      if (filters.minRating != null) list = list.filter((r) => (r.rating || 0) >= filters.minRating);
      if (filters.guests != null) list = list.filter((r) => (r.capacity || 0) >= filters.guests);
      return list;
    },
    [rooms, searchParams.location]
  );

  const value = {
    searchParams,
    setSearchParams,
    submitSearch,
    wishlist,
    toggleWishlist,
    isInWishlist,
    bookings,
    bookingsLoading,
    addBooking,
    cancelBooking,
    selectedRoom,
    setSelectedRoom,
    checkoutDates,
    setCheckoutDates,
    lastConfirmation,
    setLastConfirmation,
    userProfile,
    setUserProfile,
    getRoomById,
    getFilteredRooms,
    rooms,
    roomsLoading,
    roomsError,
    roomsFallback,
    refreshRooms,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
