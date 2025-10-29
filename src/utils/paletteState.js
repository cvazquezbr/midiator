import fetchWithAuth from './fetchWithAuth';
import { toast } from 'sonner';

/**
 * A helper function to handle API responses.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<any>} The response JSON data.
 * @throws {Error} If the response is not ok.
 */
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }
  return data;
};

/**
 * Fetches all palettes for the current user.
 * @returns {Promise<Array>} A list of palettes.
 */
export const getPalettes = async () => {
  const response = await fetchWithAuth('/api/palettes');
  return handleResponse(response);
};

/**
 * Fetches a single palette by its ID.
 * @param {number} id - The ID of the palette to fetch.
 * @returns {Promise<object>} The palette object.
 */
export const getPaletteById = async (id) => {
  const response = await fetchWithAuth(`/api/palettes/${id}`);
  return handleResponse(response);
};

/**
 * Saves a new palette to the database.
 * @param {string} name - The name of the new palette.
 * @param {Array<object>} colors - An array of color objects, each with hex, name, role, etc.
 * @param {string} harmony - The name of the color harmony.
 * @param {string} harmony_justification - The justification for the harmony.
 * @returns {Promise<object>} The newly created palette object.
 */
export const savePalette = async (name, colors, harmony, harmony_justification) => {
  const response = await fetchWithAuth('/api/palettes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, colors, harmony, harmony_justification }),
  });
  return handleResponse(response);
};

/**
 * Updates an existing palette.
 * @param {number} id - The ID of the palette to update.
 * @param {string} name - The new name for the palette.
 * @param {Array<object>} colors - The new array of color objects.
 * @param {string} harmony - The name of the color harmony.
 * @param {string} harmony_justification - The justification for the harmony.
 * @returns {Promise<object>} The updated palette object.
 */
export const updatePalette = async (id, name, colors, harmony, harmony_justification) => {
  const response = await fetchWithAuth(`/api/palettes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, colors, harmony, harmony_justification }),
  });
  return handleResponse(response);
};

/**
 * Deletes a palette by its ID.
 * @param {number} id - The ID of the palette to delete.
 */
export const deletePalette = async (id) => {
  try {
    const response = await fetchWithAuth(`/api/palettes/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  } catch (error) {
    // Catch the error to show a toast, then re-throw it for the caller to handle.
    toast.error(`Falha ao excluir paleta: ${error.message}`);
    throw error;
  }
};
