import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

// Automatically attach the CSRF token from cookie to state-changing requests.
// The server sets `csrf_token` cookie on first load (readable by JS since httpOnly=false).
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method ?? '');
  if (isStateChanging) {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf_token='))
      ?.split('=')?.[1];
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
  }
  return config;
});
