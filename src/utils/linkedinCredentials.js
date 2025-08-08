const LINKEDIN_CONFIG_KEY = 'linkedinConfig';

/**
 * Salva a configuração do LinkedIn no armazenamento local.
 * @param {object} config - O objeto de configuração.
 */
export const saveLinkedinConfig = (newConfig) => {
  try {
    const existingConfig = getLinkedinConfig() || {};

    // Mescla a configuração existente com a nova
    const mergedConfig = { ...existingConfig, ...newConfig };

    // Se um novo accessToken está sendo salvo, remova o clientSecret por segurança.
    if (newConfig.accessToken) {
      delete mergedConfig.clientSecret;
    }

    const configString = JSON.stringify(mergedConfig);
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
  try {
    const configString = localStorage.getItem(LINKEDIN_CONFIG_KEY);
    if (configString) {
      return JSON.parse(configString);
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter a configuração do LinkedIn:', error);
    return null;
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
