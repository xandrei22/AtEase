import { getApiUrl, authHeader } from './client';

/**
 * Upload an image file. Returns { url } where url is e.g. /uploads/room-123.jpg
 * Admin auth required.
 */
export async function uploadImage(token, file) {
  const formData = new FormData();
  formData.append('image', file);
  const url = getApiUrl('/upload');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader(token),
      // Do not set Content-Type; browser sets multipart/form-data with boundary
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 404
        ? 'Upload service not found. Start the backend (npm start in the backend folder) and try again.'
        : (data.error || res.statusText || 'Upload failed');
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
