const LINKEDIN_CONFIG_KEY = 'linkedinConfig';

/**
 * Salva a configuração do LinkedIn no armazenamento local.
 * @param {object} config - O objeto de configuração.
 */
export const saveLinkedinConfig = (config) => {
  try {
    const existingConfig = getLinkedinConfig() || {};
    const newConfig = { ...existingConfig, ...config };
    // O clientSecret não é mais tratado aqui. Ele vive apenas como uma variável de ambiente no servidor.
    const configString = JSON.stringify(newConfig);
    localStorage.setItem(LINKEDIN_CONFIG_KEY, configString);
  } catch (error) {
    console.error('Erro ao salvar a configuração do LinkedIn:', error);
  }
};

/**
 * Obtém a configuração do LinkedIn do armazenamento local.
 * @returns {object|null} O objeto de configuração ou nulo se não for encontrado.
 */
export const getLinkedinConfig = () => {
  const defaultConfig = {
    clientId: '',
    accessToken: null,
    expiry: null,
    folderId: '', // Add default folderId
  };

  try {
    const configString = localStorage.getItem(LINKEDIN_CONFIG_KEY);
    if (configString) {
      const storedConfig = JSON.parse(configString);
      // Merge stored config with defaults to ensure all keys are present
      return { ...defaultConfig, ...storedConfig };
    }
    // Return defaults if nothing is stored
    return defaultConfig;
  } catch (error) {
    console.error('Erro ao obter a configuração do LinkedIn:', error);
    // Return defaults on error for robustness
    return defaultConfig;
  }
};

/**
 * Remove a configuração do LinkedIn do armazenamento local.
 */
export const removeLinkedinConfig = () => {
  try {
    localStorage.removeItem(LINKEDIN_CONFIG_KEY);
  } catch (error) {
    console.error('Erro ao remover a configuração do LinkedIn:', error);
  }
};
