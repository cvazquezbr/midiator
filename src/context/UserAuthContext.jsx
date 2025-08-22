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

export const UserAuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [loading, setLoading] = useState(true); // True initially to check for session

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setGoogleAccessToken(userData.googleAccessToken);
      } else {
        // This is an expected case if the user is not logged in
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
  }, []);

  useEffect(() => {
    // On initial load, try to fetch the user to see if a session exists
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
