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
  const [isSaving, setIsSaving] = useState(false);
  const [models, setModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [errorModels, setErrorModels] = useState(null);
  const { user } = useUserAuth();

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setErrorModels(null);
    setModels([]);
    setImageModels([]);

    try {
      const headers = {};
      if (settings.gemini_api_key) {
        headers['x-gemini-api-key'] = settings.gemini_api_key;
      }

      const [textResponse, imageResponse] = await Promise.all([
        fetch('/api/google/models/text', { headers }),
        fetch('/api/google/models/image', { headers })
      ]);

      if (!textResponse.ok) {
        const errorData = await textResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch text models: ${textResponse.status}`);
      }
      if (!imageResponse.ok) {
        const errorData = await imageResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch image models: ${imageResponse.status}`);
      }

      const textData = await textResponse.json();
      const imageData = await imageResponse.json();

      const textModels = (textData.models || []).sort((a, b) => a.displayName.localeCompare(b.displayName));
      const imageModels = (imageData.models || []).sort((a, b) => a.displayName.localeCompare(b.displayName));

      setModels(textModels);
      setImageModels(imageModels);

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
      console.log('[SettingsContext] Loading settings from DB...');
      const dbSettings = await loadSettingsFromDb();
      console.log('[SettingsContext] DB Settings received:', dbSettings ? Object.keys(dbSettings) : 'null');

      const allSettings = gatherCredentials();
      console.log('[SettingsContext] Local Credentials gathered:', Object.keys(allSettings));

      const mergedSettings = { ...allSettings, ...dbSettings };
      console.log('[SettingsContext] Merged Settings keys:', Object.keys(mergedSettings));

      setSettings(mergedSettings);
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
    setSettings(prev => {
      console.log(`[SettingsContext] Updating setting: ${key} =`, value);
      const newSettings = { ...prev, [key]: value };
      // Se a chave da API Gemini for atualizada e tiver um valor,
      // busca os modelos imediatamente.
      if (key === 'gemini_api_key' && value) {
        fetchModels();
      }
      return newSettings;
    });
  }, [fetchModels]);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
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
      setIsSaving(false);
    }
  }, [settings, fetchModels]);

  const value = {
    settings,
    isLoading,
    isSaving,
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
