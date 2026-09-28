import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { onUnauthorized, tokenStorage } from '../services/api';
import * as authService from '../services/authService';

const USER_KEY = 'user';

// After a page refresh, restore the logged-in user from localStorage.
function readSavedUser() {
  if (!tokenStorage.get()) {
    return null;
  }
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // A 401 from any API call (expired or invalid token) logs the user out.
  // ProtectedRoute then redirects to /login, which shows "Session expired".
  useEffect(() => {
    onUnauthorized(() => {
      logout();
      setSessionExpired(true);
    });
  }, [logout]);

  function startSession({ token, user: loggedInUser }) {
    tokenStorage.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    setSessionExpired(false);
  }

  async function login(credentials) {
    startSession(await authService.login(credentials));
  }

  async function register(details) {
    startSession(await authService.register(details));
  }

  const value = { user, sessionExpired, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
