import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';
import { DASH_ALERT_KEY } from './utils/alert';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Where each role lands after logging in. */
export const homeFor = (role) => (role === 'Collector' ? '/assignments' : '/dashboard');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  // On first load, if a token exists, ask the API who we are.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await api.post('/logout'); } catch { /* token may already be gone */ }
    localStorage.removeItem('token');
    sessionStorage.removeItem(DASH_ALERT_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
