import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useUserAuth } from './UserAuthContext';
import {
  loadSettingsFromDb,
  saveSettingsToDb,
  gatherCredentials,
} from '../utils/credentialsManager';
import { GEMINI_MODELS } from '../config/gemini-config';

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

  // Simplificado para usar a configuração estática.
  const fetchModels = useCallback(() => {
    setLoadingModels(true);
    try {
      const textModels = GEMINI_MODELS.filter(m => m.type === 'text');
      const imgModels = GEMINI_MODELS.filter(m => m.type === 'image');
      setModels(textModels);
      setImageModels(imgModels);
    } catch (e) {
      const errorMsg = `Failed to load models: ${e.message}`;
      setErrorModels(errorMsg);
      toast.error(errorMsg);
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
