import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext();

const TOKEN_REFRESH_MARGIN = 20 * 60 * 1000; // refresh when less than 20 minutes remain

// Read the expiry (ms since epoch) from a JWT's payload; null if it can't be parsed
const getTokenExpiry = (jwt) => {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Check localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedRememberMe = localStorage.getItem('rememberMe') === 'true';
    const lastActivityTime = localStorage.getItem('lastActivityTime');
    
    // Check if session has expired (only if rememberMe is false)
    if (storedToken && storedUser && !storedRememberMe && lastActivityTime) {
      const now = Date.now();
      const lastActivity = parseInt(lastActivityTime);
      if (now - lastActivity > SESSION_TIMEOUT) {
        // Session expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivityTime');
        setIsLoading(false);
        return;
      }
    }
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setRememberMe(storedRememberMe);
      // Update last activity time
      localStorage.setItem('lastActivityTime', Date.now().toString());
    }
    setIsLoading(false);
  }, []);

  // Set up session timeout check
  useEffect(() => {
    if (!token || rememberMe) return; // Skip if not logged in or if rememberMe is enabled
    
    const sessionTimeout = setInterval(() => {
      const lastActivityTime = localStorage.getItem('lastActivityTime');
      if (lastActivityTime) {
        const now = Date.now();
        const lastActivity = parseInt(lastActivityTime);
        if (now - lastActivity > SESSION_TIMEOUT) {
          // Auto-logout
          logout();
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(sessionTimeout);
  }, [token, rememberMe]);

  // Update activity time on user interaction
  useEffect(() => {
    if (!token) return;
    
    const updateActivityTime = () => {
      localStorage.setItem('lastActivityTime', Date.now().toString());
    };
    
    window.addEventListener('mousemove', updateActivityTime);
    window.addEventListener('keypress', updateActivityTime);
    window.addEventListener('click', updateActivityTime);
    
    return () => {
      window.removeEventListener('mousemove', updateActivityTime);
      window.removeEventListener('keypress', updateActivityTime);
      window.removeEventListener('click', updateActivityTime);
    };
  }, [token]);

  const login = (newToken, newUser, saveLogin = false) => {
    setToken(newToken);
    setUser(newUser);
    setRememberMe(saveLogin);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('rememberMe', saveLogin.toString());
    localStorage.setItem('lastActivityTime', Date.now().toString());
  };

  // Keeps a long-running page (e.g. an exam) signed in: counts as activity for the
  // idle timeout and swaps the token for a fresh one before it expires.
  const refreshSession = useCallback(async () => {
    localStorage.setItem('lastActivityTime', Date.now().toString());
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return;
    const expiresAt = getTokenExpiry(currentToken);
    if (expiresAt && expiresAt - Date.now() > TOKEN_REFRESH_MARGIN) return;
    try {
      const response = await api.post('/token/refresh');
      const newToken = response.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    setRememberMe(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('lastActivityTime');
  };

  const value = {
    token,
    user,
    login,
    logout,
    refreshSession,
    isLoading,
    rememberMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
