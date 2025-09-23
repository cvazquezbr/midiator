import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useUserAuth } from './UserAuthContext';
import {
  loadSettingsFromDb,
  saveSettingsToDb,
  gatherCredentials,
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
      // loadSettingsFromDb applies the DB settings to localStorage.
      const dbSettings = await loadSettingsFromDb();
      // gatherCredentials reads all settings from localStorage.
      const allSettings = gatherCredentials();

      // We merge them to ensure the context has the full picture.
      // The settings from the database (dbSettings) should take precedence
      // in case of any overlap, as they are the persisted truth.
      setSettings({ ...allSettings, ...dbSettings });
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

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // The single source of truth is the `settings` state in this context.
      await saveSettingsToDb(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
      throw error; // Re-throw to be caught by the caller if needed
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

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
