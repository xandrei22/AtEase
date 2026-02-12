import { apiRequest } from './client';

export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return data;
}

export async function loginWithGoogle(credential) {
  const data = await apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
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

export async function forgotPassword(email, role, currentPassword = null) {
  const payload = { email: email.trim().toLowerCase(), role };
  if (currentPassword) payload.currentPassword = currentPassword;
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(token, password) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function changePassword(authToken, currentPassword, newPassword) {
  const { apiRequestWithAuth } = await import('./client');
  return apiRequestWithAuth(
    '/auth/change-password',
    authToken,
    {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }
  );
}

export async function updateProfile(authToken, name, email) {
  const { apiRequestWithAuth } = await import('./client');
  return apiRequestWithAuth(
    '/auth/profile',
    authToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ name, email }),
    }
  );
}
