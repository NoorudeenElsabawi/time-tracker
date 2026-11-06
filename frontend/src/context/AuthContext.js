import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();
const STORAGE_KEY = 'timeTrackerUser';

// Keep the user logged in after a page refresh (technicians keep the app open all day).
const loadUser = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadUser);

  const login = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch {
      // Storage unavailable (e.g. private mode): stay logged in for this session only
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Where each role lands after logging in
export const homePathFor = (role) => (role === 'admin' ? '/admin/jobs' : '/my-jobs');