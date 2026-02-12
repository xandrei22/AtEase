import { apiRequestWithAuth } from './client';

export async function createPayment(token, { booking_id, amount, payment_method = 'card' }) {
  return apiRequestWithAuth('/payments', token, {
    method: 'POST',
    body: JSON.stringify({ booking_id, amount, payment_method }),
  });
}

export async function refundPayment(token, { booking_id, amount }) {
  return apiRequestWithAuth('/payments/refund', token, {
    method: 'POST',
    body: JSON.stringify({ booking_id, amount }),
  });
}

export async function getPaymentSummary(token, bookingId) {
  return apiRequestWithAuth(`/payments/summary/${bookingId}`, token, { method: 'GET' });
}
