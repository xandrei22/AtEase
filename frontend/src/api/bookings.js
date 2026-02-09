import { apiRequestWithAuth } from './client';

export async function createBooking(token, { check_in_date, check_out_date, room_ids }) {
  return apiRequestWithAuth('/bookings', token, {
    method: 'POST',
    body: JSON.stringify({ check_in_date, check_out_date, room_ids }),
  });
}

export async function getMyBookings(token, userId) {
  return apiRequestWithAuth(`/bookings/user/${userId}`, token, { method: 'GET' });
}

export async function getAllBookings(token) {
  return apiRequestWithAuth('/bookings', token, { method: 'GET' });
}
