import axios from 'axios';
import { error as alertError, errorList, toast, warning as alertWarning } from './utils/alert';

// One axios instance for the whole app.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
});

// Attach the Sanctum token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling. `err.handled = true` means a popup was already shown,
// so pages should not show a second one (see showError below).
let sessionAlertOpen = false;
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;

    if (!err.response) {
      // Server down / no internet.
      err.handled = true;
      toast.error('Cannot reach the server. Check your connection.');
    } else if (status === 401 && !window.location.pathname.startsWith('/login')) {
      // Token expired / invalid => tell the user, then back to the login page.
      localStorage.removeItem('token');
      err.handled = true;
      if (!sessionAlertOpen) {
        sessionAlertOpen = true;
        alertWarning('Session expired', 'Please sign in again to continue.', {
          confirmButtonText: 'Sign in', allowOutsideClick: false, allowEscapeKey: false,
        }).then(() => { sessionAlertOpen = false; window.location.href = '/login'; });
      }
    } else if (status === 403) {
      err.handled = true;
      toast.warning("You don't have permission to do that.");
    } else if (status >= 500) {
      err.handled = true;
      toast.error('Server error. Please try again in a moment.');
    }
    return Promise.reject(err);
  }
);

/** Turns a Laravel error response (validation errors or message) into one readable string. */
export function errMsg(err) {
  const data = err.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || 'Something went wrong. Please try again.';
}

/**
 * Shows a failed request as a SweetAlert popup. Validation errors become a bullet list,
 * anything else shows the server message. Skips errors the interceptor already announced.
 */
export function showError(err, title = 'Something went wrong') {
  if (err?.handled) return;
  const errors = err?.response?.data?.errors;
  if (errors) return errorList('Please check the form', Object.values(errors).flat());
  return alertError(title, errMsg(err));
}

export default api;
