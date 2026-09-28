// The only place in the app that talks to the backend.
// Every service calls apiRequest(), so the token, JSON and error handling live here.

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. Copy .env.example to .env and set it.');
}

const TOKEN_KEY = 'token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Thrown for every failed request. `errors` holds the backend's field errors, if any.
export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// AuthProvider registers a function here, so a 401 from any request ends the session.
let handleUnauthorized = () => {};

export function onUnauthorized(handler) {
  handleUnauthorized = handler;
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = tokenStorage.get();
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Please try again.', 0);
  }

  // Our API always returns JSON, but a proxy error page might not.
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    // The token we sent was rejected (expired or invalid), so the session is over.
    if (response.status === 401 && token) {
      handleUnauthorized();
    }

    throw new ApiError(
      result?.message || 'Something went wrong. Please try again.',
      response.status,
      result?.errors
    );
  }

  return result.data;
}
