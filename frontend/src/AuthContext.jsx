import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock API endpoint for login
const mockLoginApi = async (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'DevOpsEng' && password === 'pass') {
        resolve({
          id: 1,
          name: 'DevOps Engineer',
          email: 'devops@company.com',
          role: 'DevOpsEng',
          token: 'mock-token-devops-123'
        });
      } else if (email === 'StoreManager' && password === 'pass') {
        resolve({
          id: 2,
          name: 'Store Manager',
          email: 'storemanager@company.com',
          role: 'StoreManager',
          token: 'mock-token-storemanager-456'
        });
      } else {
        reject(new Error('Invalid credentials. Use DevOpsEng or StoreManager / pass'));
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


  const logout = () => {
    setUser(null);
    localStorage.removeItem('storepulse_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
