import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('camponu_token') || null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('camponu_token');
      if (savedToken) {
        try {
          const res = await fetch('/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
              'Accept': 'application/json',
            },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(savedToken);
          } else {
            // Invalid or expired session
            localStorage.removeItem('camponu_token');
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          console.error("Auth check failed:", err);
          localStorage.removeItem('camponu_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (identifier, password, rememberMe = false) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ identifier, password, remember_me: rememberMe }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.detail || 'Authentication failed');
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('camponu_token', data.token);
    return data.user;
  };

  const register = async (registrationData) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.detail || 'Registration failed');
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('camponu_token', data.token);
    return data.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      localStorage.removeItem('camponu_token');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
