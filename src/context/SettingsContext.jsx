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

    // Lista estática de modelos Imagen para garantir que eles apareçam.
    const hardcodedImageModels = [
      {
        name: 'models/imagen-4.0-generate-preview-06-06',
        displayName: 'Imagen 4.0 Generate Preview',
        supportedGenerationMethods: ['generateImage'],
      },
      {
        name: 'models/gemini-2.5-flash-image',
        displayName: 'Gemini 2.5 Flash Image',
        supportedGenerationMethods: ['generateImage'],
      },
    ];

    try {
      const response = await fetch('/api/google/models');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      let allModels = data.models || [];

      // Mesclar modelos da API com a lista codificada, removendo duplicatas.
      const modelMap = new Map();
      [...allModels, ...hardcodedImageModels].forEach(model => {
        modelMap.set(model.name, model);
      });
      allModels = Array.from(modelMap.values());

      // Filtrar modelos de imagem primeiro, com uma verificação robusta.
      const imgModels = allModels
        .filter(m =>
          (m.supportedGenerationMethods && (m.supportedGenerationMethods.includes('generateImage') || m.supportedGenerationMethods.includes('generateImages'))) ||
          (m.displayName && m.displayName.toLowerCase().includes('image'))
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      // Criar um conjunto de nomes de modelos de imagem para uma pesquisa eficiente.
      const imageModelNames = new Set(imgModels.map(m => m.name));

      // Filtrar modelos de texto, excluindo os que já foram classificados como de imagem.
      const textModels = allModels
        .filter(m =>
          !imageModelNames.has(m.name) &&
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes('generateContent')
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setModels(textModels);
      setImageModels(imgModels);
    } catch (e) {
      const errorMsg = `Failed to load models: ${e.message}`;
      setErrorModels(errorMsg);
      toast.error(errorMsg);
      console.error(e);
      // Se a API falhar, ainda mostramos os modelos de imagem codificados.
      setImageModels(hardcodedImageModels);
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
    setSettings(prev => {
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
