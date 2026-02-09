import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authApi from '../api/auth';

const AUTH_KEY = 'atease_auth';

const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAuth(data) {
  if (data) localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  else localStorage.removeItem(AUTH_KEY);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);
  const user = auth ? { id: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role?.toLowerCase() } : null;

  useEffect(() => {
    saveAuth(auth);
  }, [auth]);

  const login = useCallback(async (email, password, role = 'customer') => {
    try {
      const data = await authApi.login(email, password);
      const apiRole = (data.user?.role || '').toUpperCase();
      if (role === 'admin' && apiRole !== 'ADMIN') {
        return { success: false, error: 'Invalid admin email or password.' };
      }
      if (role === 'customer' && apiRole !== 'CUSTOMER') {
        return { success: false, error: 'Invalid email or password.' };
      }
      setAuth({ token: data.token, user: data.user });
      return { success: true };
    } catch (err) {
      const message = err?.data?.error || err?.message || 'Login failed.';
      return { success: false, error: message };
    }
  }, []);

  const signup = useCallback(async ({ firstName, lastName, email, password, age, address, gender }) => {
    const name = [firstName, lastName].filter(Boolean).map((s) => (s || '').trim()).join(' ') || email;
    if (!name.trim()) return { success: false, error: 'Name is required.' };
    if (!(email || '').trim()) return { success: false, error: 'Email is required.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())) return { success: false, error: 'Invalid email address.' };
    if (!password) return { success: false, error: 'Password is required.' };
    try {
      const data = await authApi.register(name, email, password);
      setAuth({ token: data.token, user: data.user });
      return { success: true };
    } catch (err) {
      const message = err?.data?.error || err?.message || 'Sign up failed.';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
  }, []);

  const value = {
    user,
    token: auth?.token,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isAdmin: user?.role === 'admin',
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
