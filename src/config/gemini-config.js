// src/config/gemini-config.js

/**
 * @typedef {Object} GeminiModel
 * @property {string} id - O identificador único para a API do Google (ex: 'gemini-1.5-flash').
 * @property {string} displayName - O nome amigável para exibição na UI (ex: 'Gemini 1.5 Flash').
 * @property {('text'|'image')} type - O tipo de modelo.
 * @property {boolean} [isDefault] - Se este é o modelo padrão para o seu tipo.
 */

/** @type {GeminiModel[]} */
export const GEMINI_MODELS = [
  // Modelos de Texto
  { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', type: 'text', isDefault: true },
  { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', type: 'text' },
  { id: 'gemini-1.0-pro', displayName: 'Gemini 1.0 Pro', type: 'text' },

  // Modelos de Imagem
  { id: 'imagen-4.0-generate', displayName: 'Imagen 4.0 Generate', type: 'image', isDefault: true },
  { id: 'imagen-3.0-generate', displayName: 'Imagen 3.0 Generate', type: 'image' },
];

export const DEFAULT_TEXT_MODEL_ID = GEMINI_MODELS.find(m => m.type === 'text' && m.isDefault)?.id || 'gemini-1.5-flash';
export const DEFAULT_IMAGE_MODEL_ID = GEMINI_MODELS.find(m => m.type === 'image' && m.isDefault)?.id || 'imagen-4.0-generate';
