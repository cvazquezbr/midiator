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
  const [loading, setLoading] = useState(true); // Always start as loading to check session

  const fetchUser = useCallback(async () => {
    // If we have an initial user, don't fetch.
    if (initialUser) {
      setUser(initialUser);
      setGoogleAccessToken(initialToken);
      setLoading(false);
      return;
    }
    console.log('Checking user...');
    try {
      const res = await fetch('/api/auth/me');
      console.log('User check response:', res.status);
      if (res.ok) {
        const userData = await res.json();
        console.log('User data:', userData);
        setUser(userData);
        setGoogleAccessToken(userData.googleAccessToken);
      } else {
        console.log('User not logged in.');
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
        toast.success('Login successful!');
        setLoading(false); // Update loading state before user state
        setUser(data.user);
        setGoogleAccessToken(data.user.googleAccessToken);
        return true;
      } else {
        toast.error(data.error || 'Login failed.');
        setLoading(false);
        return false;
      }
    } catch (error) {
      toast.error('An error occurred during login.');
      setLoading(false);
      return false;
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
        toast.success('Successfully signed in with Google!');
        setLoading(false); // Update loading state before user state
        setUser(data.user);
        setGoogleAccessToken(data.user.googleAccessToken);
        return true;
      } else {
        toast.error(data.error || 'Google Sign-In failed.');
        setLoading(false);
        return false;
      }
    } catch (error) {
      toast.error('An error occurred during Google Sign-In.');
      setLoading(false);
      return false;
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to request password reset.' };
      }
    } catch (error) {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  const resetPassword = async (token, password, confirmPassword) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to reset password.' };
      }
    } catch (error) {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  const changePassword = async (oldPassword, newPassword, confirmPassword) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to change password.' };
      }
    } catch (error) {
      return { success: false, error: 'An error occurred. Please try again.' };
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
    requestPasswordReset,
    resetPassword,
    changePassword,
    fetchUser, // Expose fetchUser to allow components to trigger a manual refresh
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};
