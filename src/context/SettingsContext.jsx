import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useUserAuth } from './UserAuthContext';
import {
  loadSettingsFromDb,
  saveSettingsToDb,
} from '../utils/credentialsManager';

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserAuth();

  const loadSettings = useCallback(async () => {
    // Only attempt to load settings if the user is authenticated.
    if (!user) {
      setSettings({}); // Clear settings if user logs out
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('User is authenticated, loading settings from database...');
      const loadedSettings = await loadSettingsFromDb();
      setSettings(loadedSettings || {});
    } catch (error) {
      // Avoid showing an error toast if the user just hasn't saved any settings yet.
      // The API should return a 404 or empty object in that case, which is handled above.
      // This toast is for actual server errors.
      if (!error.message.includes('Failed to load settings')) {
          toast.error(`Failed to load settings: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Dependency on `user` ensures this re-runs on login/logout.

  useEffect(() => {
    loadSettings();
  }, [user, loadSettings]);

  const updateSetting = (key, value) => {
    // Update the context's state directly.
    // Persistence will only happen when the user explicitly saves.
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // The 'settings' object from the context state is now the single source of truth.
      await saveSettingsToDb(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
      throw error; // Re-throw to be caught by the caller if needed
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    settings,
    isLoading,
    loadSettings,
    updateSetting,
    saveSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
