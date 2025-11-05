import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const isInitialMount = useRef(true);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('User is authenticated, loading settings from database...');
      const dbSettings = await loadSettingsFromDb();
      const allSettings = gatherCredentials();
      setSettings({ ...allSettings, ...dbSettings });
    } catch (error) {
      if (!error.message.includes('Failed to load settings')) {
          toast.error(`Failed to load settings: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const persistSettings = useCallback(async (settingsToSave) => {
    try {
      await saveSettingsToDb(settingsToSave);
    } catch (error) {
      toast.error(`Failed to auto-save settings: ${error.message}`);
    }
  }, []);


  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await saveSettingsToDb(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
      throw error;
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
