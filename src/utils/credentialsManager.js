import CryptoJS from 'crypto-js';
import { getGeminiApiKey, saveGeminiApiKey } from './geminiCredentials';
import { getGoogleCloudTTSCredentials, saveGoogleCloudTTSCredentials } from './googleCloudTTSCredentials';
import { getLinkedinConfig, saveLinkedinConfig } from './linkedinCredentials';
import { getWordpressConfig, saveWordpressConfig } from './wordpressCredentials';

const CREDENTIAL_KEYS = {
  GEMINI: 'gemini_api_key',
  GOOGLE_DRIVE_API_KEY: 'google_drive_api_key',
  GOOGLE_DRIVE_CLIENT_ID: 'google_drive_client_id',
  GOOGLE_TTS: 'googleCloudTTSCredentials',
  LINKEDIN: 'linkedinConfig',
  WORDPRESS: 'wordpressConfig',
};

/**
 * Gathers all known credentials from localStorage.
 * @returns {object} An object containing all the credentials.
 */
const gatherCredentials = () => {
  const credentials = {};

  // Gemini
  const geminiApiKey = getGeminiApiKey();
  if (geminiApiKey) {
    credentials[CREDENTIAL_KEYS.GEMINI] = geminiApiKey;
  }

  // Google Drive
  const googleDriveApiKey = localStorage.getItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY);
  if (googleDriveApiKey) {
    credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY] = googleDriveApiKey;
  }
  const googleDriveClientId = localStorage.getItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID);
  if (googleDriveClientId) {
    credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID] = googleDriveClientId;
  }

  // Google Cloud TTS
  const googleTts = getGoogleCloudTTSCredentials();
  if (googleTts) {
    credentials[CREDENTIAL_KEYS.GOOGLE_TTS] = googleTts;
  }

  // LinkedIn
  const linkedin = getLinkedinConfig();
  if (linkedin && linkedin.clientId) { // Check for a meaningful value
    credentials[CREDENTIAL_KEYS.LINKEDIN] = linkedin;
  }

  // WordPress
  const wordpress = getWordpressConfig();
  if (wordpress) {
    credentials[CREDENTIAL_KEYS.WORDPRESS] = wordpress;
  }

  return credentials;
};

/**
 * Encrypts and triggers a download of the credentials file.
 * @param {string} password - The password to encrypt the file.
 */
export const saveCredentialsToFile = (password) => {
  return new Promise((resolve, reject) => {
    try {
      const credentials = gatherCredentials();
      if (Object.keys(credentials).length === 0) {
        reject(new Error('Nenhuma credencial encontrada para salvar.'));
        return;
      }

      const jsonString = JSON.stringify(credentials);
      const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();

      const blob = new Blob([encrypted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'credentials.midiatorsetup';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      reject(error);
    }
  });
};

/**
 * Loads and decrypts a credentials file, then saves them to localStorage.
 * @param {File} file - The file to load.
 * @param {string} password - The password to decrypt the file.
 */
export const loadCredentialsFromFile = (file, password) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const encryptedData = event.target.result;
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, password);
        const decryptedJson = decryptedBytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedJson) {
          throw new Error('Senha incorreta ou arquivo corrompido.');
        }

        const credentials = JSON.parse(decryptedJson);

        // Save credentials back to localStorage
        if (credentials[CREDENTIAL_KEYS.GEMINI]) {
          saveGeminiApiKey(credentials[CREDENTIAL_KEYS.GEMINI]);
        }
        if (credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY]) {
          localStorage.setItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY, credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY]);
        }
        if (credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID]) {
          localStorage.setItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID, credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID]);
        }
        if (credentials[CREDENTIAL_KEYS.GOOGLE_TTS]) {
          saveGoogleCloudTTSCredentials(credentials[CREDENTIAL_KEYS.GOOGLE_TTS]);
        }
        if (credentials[CREDENTIAL_KEYS.LINKEDIN]) {
          saveLinkedinConfig(credentials[CREDENTIAL_KEYS.LINKEDIN]);
        }
        if (credentials[CREDENTIAL_KEYS.WORDPRESS]) {
          saveWordpressConfig(credentials[CREDENTIAL_KEYS.WORDPRESS]);
        }

        resolve();
      } catch (error) {
        console.error('Erro ao carregar credenciais:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};
