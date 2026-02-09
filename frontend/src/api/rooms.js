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
    rating: null,
    reviewCount: 0,
    capacity: r.capacity,
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    image: r.image || '',
    images: Array.isArray(r.images) ? r.images : r.image ? [r.image] : [],
    description: r.description || '',
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    cancellationPolicy: r.cancellation_policy || '',
    checkIn: r.check_in_time || '3:00 PM',
    checkOut: r.check_out_time || '11:00 AM',
    is_available: r.is_available,
    room_number: r.room_number,
  };
}

export async function fetchRooms(availableOnly = false) {
  const query = availableOnly ? '?available=true' : '';
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
