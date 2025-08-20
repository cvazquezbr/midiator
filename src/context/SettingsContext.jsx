import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { loadSettingsFromDb, saveSettingsToDb } from '../utils/credentialsManager';

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

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await loadSettingsFromDb();
      setSettings(loadedSettings || {});
    } catch (error) {
      toast.error(`Failed to load settings: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
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
