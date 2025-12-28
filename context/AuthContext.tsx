import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (creds: LoginCredentials) => Promise<void>;
  register: (creds: RegisterCredentials) => Promise<void>;
  logout: () => void;
  usersCache: User[]; // Cache of all users for UI display
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usersCache, setUsersCache] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await api.checkSession();
        setUser(currentUser);
        
        // Load other users for UI lookups
        const allUsers = await api.getUsers();
        setUsersCache(allUsers);
        
      } catch (err) {
        console.error("Session check failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (creds: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await api.login(creds);
      setUser(response.user);
      const allUsers = await api.getUsers();
      setUsersCache(allUsers);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (creds: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await api.register(creds);
      setUser(response.user);
      const allUsers = await api.getUsers();
      setUsersCache(allUsers);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      register, 
      logout,
      usersCache 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};