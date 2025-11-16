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
  const [models, setModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [errorModels, setErrorModels] = useState(null);
  const { user } = useUserAuth();

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setErrorModels(null);
    try {
      const response = await fetch('/api/google/models');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const allModels = data.models || [];
      const textModels = allModels
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      const imgModels = allModels
        .filter(m => m.name.includes('imagen'))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      setModels(textModels);
      setImageModels(imgModels);
    } catch (e) {
      const errorMsg = `Failed to load models: ${e.message}`;
      setErrorModels(errorMsg);
      toast.error(errorMsg);
      console.error(e);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const dbSettings = await loadSettingsFromDb();
      const allSettings = gatherCredentials();
      setSettings({ ...allSettings, ...dbSettings });
      if (dbSettings.gemini_api_key) {
        fetchModels();
      }
    } catch (error) {
       if (!error.message.includes('Failed to load settings')) {
          toast.error(`Failed to load settings: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchModels]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await saveSettingsToDb(settings);
      toast.success('Settings saved successfully!');
      if (settings.gemini_api_key) {
        fetchModels();
      }
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [settings, fetchModels]);

  const value = {
    settings,
    isLoading,
    loadSettings,
    updateSetting,
    saveSettings,
    models,
    imageModels,
    loadingModels,
    errorModels,
    fetchModels,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
