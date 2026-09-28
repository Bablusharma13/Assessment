import { createContext, useContext } from 'react';

// Holds { user, sessionExpired, login, register, logout }. Filled in by AuthProvider.
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}
