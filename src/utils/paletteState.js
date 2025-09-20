import fetchWithAuth from './fetchWithAuth';
import { toast } from 'sonner';

/**
 * This module provides functions for interacting with the palette API endpoints.
 * It abstracts the fetch calls and handles authentication and basic error reporting.
 */

/**
 * Fetches all palettes for the currently authenticated user.
 * @returns {Promise<Array>} A promise that resolves to an array of palette objects.
 * @throws {Error} If the fetch request fails.
 */
export const getPalettes = async () => {
  const res = await fetchWithAuth('/api/palettes');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch palettes.');
  }
  return res.json();
};

/**
 * Loads a single palette by its ID.
 * @param {string|number} id - The ID of the palette to fetch.
 * @returns {Promise<object>} A promise that resolves to the palette object.
 * @throws {Error} If the fetch request fails.
 */
export const loadPalette = async (id) => {
  const res = await fetchWithAuth(`/api/palettes/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load palette.');
  }
  return res.json();
};

/**
 * Creates a new palette.
 * @param {string} name - The name of the new palette.
 * @param {Array<string>} colors - An array of hex color strings.
 * @returns {Promise<object>} A promise that resolves to the newly created palette object.
 * @throws {Error} If the creation fails.
 */
export const savePalette = async (name, colors) => {
  try {
    const requestBody = JSON.stringify({ name, colors });

    const createRes = await fetchWithAuth('/api/palettes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      throw new Error(`Failed to create palette. Server says: ${errorBody}`);
    }

    const result = await createRes.json();
    return result;
  } catch (error) {
    toast.error(`Save failed: ${error.message}`);
    throw error;
  }
};

/**
 * Updates an existing palette.
 * @param {string|number} id - The ID of the palette to update.
 * @param {string} name - The updated name of the palette.
 * @param {Array<string>} colors - The updated array of hex color strings.
 * @returns {Promise<object>} A promise that resolves to the updated palette object.
 * @throws {Error} If the update fails.
 */
export const updatePalette = async (id, name, colors) => {
    try {
        const requestBody = JSON.stringify({ name, colors });

        const res = await fetchWithAuth(`/api/palettes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Failed to update palette. Server says: ${errorBody}`);
        }

        const result = await res.json();
        return result;
    } catch (error) {
        toast.error(`Update failed: ${error.message}`);
        throw error;
    }
};

/**
 * Deletes a palette by its ID.
 * @param {string|number} id - The ID of the palette to delete.
 * @returns {Promise<object>} A promise that resolves to the confirmation message from the API.
 * @throws {Error} If the deletion fails.
 */
export const deletePalette = async (id) => {
  try {
    const res = await fetchWithAuth(`/api/palettes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Handle the specific 409 conflict error
      if (res.status === 409) {
        toast.error(err.error || 'This palette is in use and cannot be deleted.');
      } else {
        toast.error(err.error || 'Failed to delete palette.');
      }
      throw new Error(err.error || 'Failed to delete palette.');
    }
    // The success toast is now handled in the component to avoid duplication
    // toast.success('Palette deleted successfully!');
    return res.json();
  } catch (error) {
    // The toast is already shown for !res.ok cases, so we just re-throw
    // for the component to catch and handle loading states etc.
    throw error;
  }
};
