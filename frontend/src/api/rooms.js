import { apiRequest, apiRequestWithAuth } from './client';

/**
 * Map backend room to frontend shape (pricePerNight, type, hotelName, etc.)
 */
export function mapRoomFromApi(r) {
  return {
    id: String(r.id),
    name: r.name || r.room_number,
    type: r.room_type,
    hotelName: 'AtEase',
    location: '',
    address: '',
    pricePerNight: r.price_per_night,
    rating: r.avg_rating != null ? Number(r.avg_rating) : (r.avgRating != null ? Number(r.avgRating) : null),
    reviewCount: Number(r.review_count ?? r.reviewCount ?? 0),
    capacity: r.capacity,
    amenities: (() => {
      if (Array.isArray(r.amenities)) return r.amenities;
      if (typeof r.amenities === 'string') {
        try {
          const p = JSON.parse(r.amenities);
          return Array.isArray(p) ? p : [];
        } catch { return []; }
      }
      return [];
    })(),
    image: r.image || '',
    images: (() => {
      if (Array.isArray(r.images)) return r.images;
      if (typeof r.images === 'string') {
        try {
          const p = JSON.parse(r.images);
          return Array.isArray(p) ? p : r.image ? [r.image] : [];
        } catch { return r.image ? [r.image] : []; }
      }
      return r.image ? [r.image] : [];
    })(),
    description: r.description || '',
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    cancellationPolicy: r.cancellation_policy || '',
    checkIn: r.check_in_time || '3:00 PM',
    checkOut: r.check_out_time || '11:00 AM',
    is_available: r.is_available,
    room_number: r.room_number,
  };
}

export async function fetchRooms(availableOnly = false, checkIn = null, checkOut = null) {
  const params = new URLSearchParams();
  if (availableOnly) params.set('available', 'true');
  if (checkIn) params.set('check_in', checkIn);
  if (checkOut) params.set('check_out', checkOut);
  const query = params.toString() ? `?${params.toString()}` : '';
  const list = await apiRequest(`/rooms${query}`);
  return list.map(mapRoomFromApi);
}

export async function fetchRoomById(id) {
  const r = await apiRequest(`/rooms/${id}`);
  return mapRoomFromApi(r);
}

export async function createRoom(token, body) {
  const r = await apiRequestWithAuth('/rooms', token, {
    method: 'POST',
    body: JSON.stringify({
      room_number: body.room_number,
      name: body.name,
      room_type: body.room_type,
      price_per_night: body.price_per_night,
      capacity: body.capacity,
      is_available: body.is_available !== false,
      description: body.description,
      amenities: body.amenities,
      image: body.image,
      images: body.images,
      highlights: body.highlights,
      cancellation_policy: body.cancellation_policy,
      check_in_time: body.check_in_time,
      check_out_time: body.check_out_time,
    }),
  });
  return mapRoomFromApi(r);
}

export async function updateRoom(token, id, body) {
  const r = await apiRequestWithAuth(`/rooms/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      room_number: body.room_number,
      name: body.name,
      room_type: body.room_type,
      price_per_night: body.price_per_night,
      capacity: body.capacity,
      is_available: body.is_available,
      description: body.description,
      amenities: body.amenities,
      image: body.image,
      images: body.images,
      highlights: body.highlights,
      cancellation_policy: body.cancellation_policy,
      check_in_time: body.check_in_time,
      check_out_time: body.check_out_time,
    }),
  });
  return mapRoomFromApi(r);
}

export async function fetchRoomReviews(id) {
  const list = await apiRequest(`/rooms/${id}/reviews`);
  return Array.isArray(list) ? list.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id || r.userId || ''),
    bookingId: String(r.booking_id || r.bookingId || ''),
    rating: Number(r.rating || 0),
    comment: r.comment || '',
    createdAt: r.created_at || r.createdAt,
    userName: r.user_name || r.userName || '',
  })) : [];
}

export async function submitRoomReview(token, roomId, { bookingId, rating, comment }) {
  const payload = { booking_id: bookingId, rating, comment };
  const r = await apiRequestWithAuth(`/rooms/${roomId}/reviews`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return r;
}
