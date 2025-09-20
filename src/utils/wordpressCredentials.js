const WORDPRESS_CONFIG_KEY = 'wordpressConfig';

/**
 * Salva a configuração do WordPress no armazenamento local.
 * @param {object} config - O objeto de configuração.
 */
export const saveWordpressConfig = (config) => {
  try {
    const configString = JSON.stringify(config);
    localStorage.setItem(WORDPRESS_CONFIG_KEY, configString);
  } catch (error) {
    console.error('Erro ao salvar a configuração do WordPress:', error);
  }
};

/**
 * Obtém a configuração do WordPress do armazenamento local.
 * @returns {object|null} O objeto de configuração ou nulo se não for encontrado.
 */
export const getWordpressConfig = () => {
  try {
    const configString = localStorage.getItem(WORDPRESS_CONFIG_KEY);
    if (configString) {
      return JSON.parse(configString);
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter a configuração do WordPress:', error);
    return null;
  }
};

/**
 * Remove a configuração do WordPress do armazenamento local.
 */
export const removeWordpressConfig = () => {
  try {
    localStorage.removeItem(WORDPRESS_CONFIG_KEY);
  } catch (error) {
    console.error('Erro ao remover a configuração do WordPress:', error);
  }
};
