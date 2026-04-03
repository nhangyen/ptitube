import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '@/services/api';

interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'authToken';
const USER_KEY = 'user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadStoredAuth();
  }, []);

  const persistAuth = async (nextToken: string | null, nextUser: User | null) => {
    setToken(nextToken);
    setUser(nextUser);
    api.setAuthToken(nextToken);

    if (nextToken && nextUser) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, nextToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return;
    }

    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  };

  const updateLocalUser = async (updates: Partial<User>) => {
    setUser((current) => {
      if (!current) {
        return current;
      }
      const nextUser = { ...current, ...updates };
      void AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const refreshProfile = async () => {
    if (!api.getAuthToken()) {
      return;
    }

    try {
      const profile = await api.getMyProfile();
      setUser((current) => {
        const nextUser: User = {
          id: profile.id || current?.id || '',
          username: profile.username || current?.username || '',
          email: profile.email || current?.email,
          avatarUrl: profile.avatarUrl || current?.avatarUrl,
          bio: profile.bio || current?.bio,
          role: current?.role,
        };
        void AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        return nextUser;
      });
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.setAuthToken(storedToken);
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await api.login(username, password);
    const nextUser: User = {
      id: response.id || '',
      username: response.username,
      email: response.email,
      avatarUrl: response.avatarUrl,
      role: response.role,
    };

    await persistAuth(response.token, nextUser);
    await refreshProfile();
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await api.register(username, email, password);
    const nextUser: User = {
      id: response.id || '',
      username: response.username,
      email: response.email || email,
      avatarUrl: response.avatarUrl,
      role: response.role,
    };

    await persistAuth(response.token, nextUser);
    await refreshProfile();
  };

  const logout = async () => {
    await persistAuth(null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        updateLocalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
