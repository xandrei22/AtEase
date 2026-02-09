/**
 * Base URL for the backend API.
 * In dev we use '' so requests go to same origin and Vite proxies /api to the backend.
 * Set VITE_API_URL in production (e.g. https://api.yourapp.com).
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function getApiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}/api${p.startsWith('/api') ? p.replace(/^\/api/, '') : p}`;
}

export function authHeader(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest(path, options = {}) {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 404
        ? 'Server or API not found. Make sure the backend is running (npm start in the backend folder).'
        : res.status === 500
          ? (data.error || 'Backend or database error. Ensure the backend is running and MySQL is set up (see backend/database/README.md).')
          : (data.error || res.statusText || 'Request failed');
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiRequestWithAuth(path, token, options = {}) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...authHeader(token),
      ...options.headers,
    },
  });
}
