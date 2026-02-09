import { apiRequest } from './client';

export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return data;
}

export async function register(name, email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
  });
  return data;
}

export async function getMe(token) {
  const { apiRequestWithAuth } = await import('./client');
  return apiRequestWithAuth('/auth/me', token, { method: 'GET' });
}
