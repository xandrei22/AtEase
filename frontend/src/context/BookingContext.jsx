import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authApi from '../api/auth';
import { fetchRooms } from '../api/rooms';
import { ROOM_TYPES, AMENITY_OPTIONS } from '../data/mockRooms';
import { createBooking, getMyBookings, cancelBooking as apiCancelBooking, modifyBooking as apiModifyBooking } from '../api/bookings';
import { createPayment } from '../api/payments';
import { useAuth } from './AuthContext';

const BookingContext = createContext(null);

const PROFILE_STORAGE_KEY = 'atease_user_profile';
const WISHLIST_STORAGE_KEY = 'atease_wishlist';

function loadStoredWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveWishlist(ids) {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch (_) {}
}

const defaultProfile = {
  name: '',
  email: '',
  phone: '',
  address: { street: '', city: '', state: '', postalCode: '', country: '' },
};

function loadStoredProfile(userId = null) {
  try {
    const key = userId ? `${PROFILE_STORAGE_KEY}_${String(userId)}` : PROFILE_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw);
    return {
      ...defaultProfile,
      ...parsed,
      address: { ...defaultProfile.address, ...(parsed.address || {}) },
    };
  } catch {
    return defaultProfile;
  }
}

function saveProfile(profile, userId = null) {
  try {
    const key = userId ? `${PROFILE_STORAGE_KEY}_${String(userId)}` : PROFILE_STORAGE_KEY;
    if (profile && (profile.name || profile.email || profile.phone || (profile.address && Object.values(profile.address).some(Boolean)))) {
      localStorage.setItem(key, JSON.stringify(profile));
    } else {
      // remove empty profile for privacy
      localStorage.removeItem(key);
    }
  } catch (_) {}
}

export function BookingProvider({ children }) {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useState({
    location: '',
    roomType: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
  });
  const [wishlist, setWishlist] = useState(loadStoredWishlist);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [roomsFallback, setRoomsFallback] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkoutDates, setCheckoutDates] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [lastConfirmation, setLastConfirmation] = useState(null);
  const [userProfile, setUserProfileState] = useState(() => loadStoredProfile(user?.id));

  const setUserProfile = useCallback((next) => {
    setUserProfileState((prev) => {
      const merged = typeof next === 'function' ? next(prev) : next;
      const profile = {
        ...defaultProfile,
        ...merged,
        address: { ...defaultProfile.address, ...(merged.address || {}) },
      };
      saveProfile(profile, user?.id || null);
      return profile;
    });
  }, [user?.id]);

  // When auth token/user changes, prefer server-side profile data if available.
  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        if (!token) {
          // not authenticated — load anonymous profile (if any)
          setUserProfileState(loadStoredProfile(null));
          return;
        }
        const data = await authApi.getMe(token);
        if (!cancelled && data && data.user) {
          const profile = { name: data.user.name || '', email: data.user.email || '', phone: data.user.phone || '' };
          setUserProfile(profile);
        } else if (!cancelled) {
          setUserProfileState(loadStoredProfile(user?.id));
        }
      } catch (_) {
        if (!cancelled) setUserProfileState(loadStoredProfile(user?.id));
      }
    }
    fetchProfile();
    return () => { cancelled = true; };
  }, [token, user?.id, setUserProfile]);

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    setRoomsError(null);
    setRoomsFallback(false);
    const checkIn = searchParams.checkIn || '';
    const checkOut = searchParams.checkOut || '';
    fetchRooms(false, checkIn || undefined, checkOut || undefined)
      .then((list) => {
        if (!cancelled) {
          setRooms(list);
          setRoomsFallback(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRooms([]);
          setRoomsError(err && err.message ? err.message : 'Unable to load rooms from server.');
          setRoomsFallback(false);
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchParams.checkIn, searchParams.checkOut]);

  useEffect(() => {
    if (!token || !user?.id) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    setBookingsLoading(true);
    // fetch bookings and user's pending requests, then mark bookings with pending request statuses
    (async () => {
      try {
        const list = await getMyBookings(token, user.id);
        if (cancelled) return;
        let next = list || [];
        try {
          const { getMyBookingRequests } = await import('../api/bookings');
          const requests = await getMyBookingRequests(token);
          const pendingByBooking = {};
          (requests || []).forEach((r) => {
            if ((r.status || '').toLowerCase() === 'pending') pendingByBooking[r.booking_id] = r.request_type;
          });
          next = next.map((b) => ({ ...b, status: pendingByBooking[b.id] === 'cancel' ? 'cancellation_requested' : pendingByBooking[b.id] === 'modify' ? 'modification_requested' : b.status }));
        } catch (_) {
          // ignore request fetch errors — show bookings as-is
        }
        if (!cancelled) setBookings(next);
      } catch (_) {
        if (!cancelled) setBookings([]);
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user?.id]);

  const submitSearch = useCallback((params) => {
    // Ensure searchParams keeps expected shape and defaults
    setSearchParams((prev) => ({
      location: params.location != null ? params.location : prev.location,
      roomType: params.roomType != null ? params.roomType : prev.roomType || '',
      checkIn: params.checkIn != null ? params.checkIn : prev.checkIn,
      checkOut: params.checkOut != null ? params.checkOut : prev.checkOut,
      guests: params.guests != null ? params.guests : prev.guests,
    }));
  }, []);

  const toggleWishlist = useCallback((roomId) => {
    const id = String(roomId);
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id];
      saveWishlist(next);
      return next;
    });
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
      const downpaymentAmount = payload.downpayment != null && payload.downpayment > 0 ? payload.downpayment : (payload.total != null ? Math.round(payload.total * 0.5) : 0);
      const confirmation = {
        id: booking.id,
        status: booking.status || 'Confirmed',
        createdAt: booking.created_at,
        checkIn: check_in_date,
        checkOut: check_out_date,
        total: parseFloat(booking.total_price),
        downpayment: downpaymentAmount,
        balanceDue: payload.total != null ? Math.round(payload.total - downpaymentAmount) : 0,
        room_ids: booking.room_ids,
        ...payload,
      };
      setBookings((prev) => [confirmation, ...prev]);
      setLastConfirmation(confirmation);
      const amountToCharge = payload.downpayment != null && payload.downpayment > 0
        ? payload.downpayment
        : (payload.total != null && payload.total > 0 ? payload.total : 0);
      if (amountToCharge > 0) {
        try {
          await createPayment(token, {
            booking_id: booking.id,
            amount: amountToCharge,
            payment_method: payload.payment_method || 'card',
          });
        } catch (_) {
          // payment optional for confirmation display
        }
      }
      return confirmation;
    },
    [token, user?.id, selectedRoom, checkoutDates]
  );

  const cancelBooking = useCallback(async (bookingId) => {
    // optimistic update: assume cancellation requested by default for customers
    setBookings((prev) => prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: 'cancellation_requested' } : b)));
    try {
      const resp = await apiCancelBooking(token, bookingId);
      // if admin performed immediate cancel, reflect it
      if (resp && resp.status === 'cancelled') {
        setBookings((prev) => prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: 'cancelled' } : b)));
      } else if (resp && resp.message) {
        // keep request status
        setBookings((prev) => prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: 'cancellation_requested' } : b)));
      }
    } catch (err) {
      // revert on error
      setBookings((prev) => prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: b.status || 'confirmed' } : b)));
      throw err;
    }
  }, [token]);

  const modifyBooking = useCallback(async (bookingId, payload) => {
    const resp = await apiModifyBooking(token, bookingId, payload);
    // Update local bookings list with returned total (and assume confirmed)
    setBookings((prev) => prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, total_price: resp.new_total, status: 'confirmed' } : b)));
    return resp;
  }, [token]);

  const refreshRooms = useCallback(() => {
    setRoomsFallback(false);
    fetchRooms(false)
      .then((list) => {
        setRooms(list);
        setRoomsFallback(false);
        setRoomsError(null);
      })
      .catch((err) => {
        setRooms([]);
        setRoomsError(err && err.message ? err.message : 'Unable to load rooms from server.');
        setRoomsFallback(false);
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
      if (searchParams.roomType) {
        const rt = String(searchParams.roomType).trim().toLowerCase();
        if (rt) list = list.filter((r) => (r.type || '').toLowerCase().includes(rt) || (r.name || '').toLowerCase().includes(rt));
      }
      if (filters.priceMin != null) list = list.filter((r) => r.pricePerNight >= filters.priceMin);
      if (filters.priceMax != null) list = list.filter((r) => r.pricePerNight <= filters.priceMax);
      if (filters.roomTypeOthers) {
        list = list.filter((r) => r.type && !ROOM_TYPES.includes(r.type));
      } else if (filters.roomTypes?.length) {
        list = list.filter((r) => filters.roomTypes.includes(r.type));
      }
      if (filters.amenitiesOthers) {
        list = list.filter((r) => {
          const roomAmenities = r.amenities || [];
          return roomAmenities.some((a) => !AMENITY_OPTIONS.includes(a));
        });
      } else if (filters.amenities?.length) {
        list = list.filter((r) => filters.amenities.every((a) => (r.amenities || []).includes(a)));
      }
      if (filters.minRating != null) list = list.filter((r) => (r.rating || 0) >= filters.minRating);
      if (filters.guests != null) list = list.filter((r) => (r.capacity || 0) >= filters.guests);
      return list;
    },
    [rooms, searchParams.location, searchParams.roomType]
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
    modifyBooking,
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
