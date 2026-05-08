import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { ensureE2EEKeys } from '../utils/e2ee';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (stored && storedToken) {
      setUser(JSON.parse(stored));
      setToken(storedToken);
      ensureE2EEKeys(api).catch(() => {});
    }
    setLoading(false);
  }, []);

  // Email OTP bhejo
  const sendOtp = async (email) => {
    const res = await api.post('/auth/send-otp', { email });
    return res.data;
  };

  // OTP verify karke login
  const login = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    ensureE2EEKeys(api).catch(() => {});
    return res.data;
  };

  // Register (email + OTP + profile)
  const register = async (userData) => {
    const res = await api.post('/auth/register', userData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    ensureE2EEKeys(api).catch(() => {});
    return res.data;
  };

  // Logout — backend ko bhi token blacklist karne ke liye call karo
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, sendOtp, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
