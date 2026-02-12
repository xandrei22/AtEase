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

export async function getMyBookingRequests(token) {
  return apiRequestWithAuth('/bookings/requests/mine', token, { method: 'GET' });
}

export async function cancelBooking(token, bookingId, body) {
  return apiRequestWithAuth(`/bookings/${bookingId}/cancel`, token, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

export async function modifyBooking(token, bookingId, { check_in_date, check_out_date, room_ids }, options = {}) {
  const body = { check_in_date, check_out_date, room_ids };
  if (options.requestOnly) body.requestOnly = true;
  return apiRequestWithAuth(`/bookings/${bookingId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getBookingRequests(token) {
  return apiRequestWithAuth('/bookings/requests', token, { method: 'GET' });
}

export async function approveBookingRequest(token, requestId, body) {
  return apiRequestWithAuth(`/bookings/requests/${requestId}/approve`, token, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

export async function rejectBookingRequest(token, requestId) {
  return apiRequestWithAuth(`/bookings/requests/${requestId}/reject`, token, { method: 'PATCH' });
}
