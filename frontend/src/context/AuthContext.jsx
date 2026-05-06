import { createContext, useContext, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import api from '../services/api';
import logger from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.debug('AuthProvider mounted');
    
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        logger.info('User session restored from localStorage', {
          userId: parsedUser.id,
          email: parsedUser.email
        });
      } catch (error) {
        logger.error('Failed to parse saved user data', {
          error: error.message
        });
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
      logger.debug('No saved user session found');
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      logger.info('Login attempt', { email });
      
      const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      logger.info('Login successful', {
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin
      });
      
      logger.logUserAction('login', { userId: user.id, email: user.email });
      
      return { success: true };
    } catch (error) {
      logger.error('Login failed', {
        email,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      logger.info('Registration attempt', {
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name
      });
      
      const response = await api.post(API_ENDPOINTS.REGISTER, userData);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      logger.info('Registration successful', {
        userId: user.id,
        email: user.email
      });
      
      logger.logUserAction('register', { userId: user.id, email: user.email });
      
      return { success: true };
    } catch (error) {
      logger.error('Registration failed', {
        email: userData.email,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    const userId = user?.id;
    const email = user?.email;
    
    try {
      logger.info('Logout attempt', { userId, email });
      await api.post(API_ENDPOINTS.LOGOUT);
      logger.info('Logout API call successful');
    } catch (error) {
      logger.error('Logout API error', {
        error: error.message,
        userId,
        email
      });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      logger.info('User logged out', { userId, email });
      logger.logUserAction('logout', { userId, email });
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Made with Bob
