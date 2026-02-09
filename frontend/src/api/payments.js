import { apiRequestWithAuth } from './client';

export async function createPayment(token, { booking_id, amount, payment_method = 'card' }) {
  return apiRequestWithAuth('/payments', token, {
    method: 'POST',
    body: JSON.stringify({ booking_id, amount, payment_method }),
  });
}
