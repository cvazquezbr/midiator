import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const UserAuthContext = createContext(null);

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === null) {
    throw new Error('useUserAuth must be used within a UserAuthContextProvider');
  }
  return context;
};

export const UserAuthContextProvider = ({ children, initialUser = null, initialToken = null }) => {
  const [user, setUser] = useState(initialUser);
  const [googleAccessToken, setGoogleAccessToken] = useState(initialToken);
  const [loading, setLoading] = useState(!initialUser); // If a user is provided, we are not loading.

  const fetchUser = useCallback(async () => {
    // If we have an initial user, don't fetch.
    if (initialUser) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setGoogleAccessToken(userData.googleAccessToken);
      } else {
        setUser(null);
        setGoogleAccessToken(null);
      }
    } catch (error) {
      console.error('Could not fetch user session:', error);
      setUser(null);
      setGoogleAccessToken(null);
      toast.error('Could not connect to the server to verify your session.');
    } finally {
      setLoading(false);
    }
  }, [initialUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setGoogleAccessToken(data.user.googleAccessToken);
        toast.success('Login successful!');
        return true;
      } else {
        toast.error(data.error || 'Login failed.');
        return false;
      }
    } catch (error) {
      toast.error('An error occurred during login.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Signup successful! Please log in.');
        return true;
      } else {
        toast.error(data.error || 'Signup failed.');
        return false;
      }
    } catch (error) {
      toast.error('An error occurred during signup.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (code) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setGoogleAccessToken(data.user.googleAccessToken);
        toast.success('Successfully signed in with Google!');
        return true;
      } else {
        toast.error(data.error || 'Google Sign-In failed.');
        return false;
      }
    } catch (error) {
      toast.error('An error occurred during Google Sign-In.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        setGoogleAccessToken(null);
        toast.info('You have been logged out.');
      } else {
        toast.error('Logout request failed.');
      }
    } catch (error) {
      toast.error('An error occurred during logout.');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    googleAccessToken,
    setGoogleAccessToken,
    login,
    signup,
    logout,
    googleLogin,
    fetchUser, // Expose fetchUser to allow components to trigger a manual refresh
  };

  // Render children only after the initial loading is complete
  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};
