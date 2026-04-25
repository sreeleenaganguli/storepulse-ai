import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock API endpoint for login
const mockLoginApi = async (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'admin' && password === 'admin') {
        resolve({
          id: 1,
          name: 'Admin User',
          email: 'admin@company.com',
          role: 'ADMIN',
          token: 'mock-token-admin-123'
        });
      } else if (email === 'guest' && password === 'guest') {
        resolve({
          id: 2,
          name: 'Guest User',
          email: 'guest@company.com',
          role: 'GUEST',
          token: 'mock-token-guest-456'
        });
      } else {
        reject(new Error('Invalid credentials. Use admin/admin'));
      }
    }, 600);
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('storepulse_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const userData = await mockLoginApi(email, password);
      setUser(userData);
      localStorage.setItem('storepulse_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const loginAsGuest = async () => {
    try {
      const userData = await mockLoginApi('guest', 'guest');
      setUser(userData);
      localStorage.setItem('storepulse_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('storepulse_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
