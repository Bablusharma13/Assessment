import { apiRequest } from './api';

// Both return { token, user }.

export function register(details) {
  return apiRequest('/api/auth/register', { method: 'POST', body: details });
}

export function login(credentials) {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials });
}
