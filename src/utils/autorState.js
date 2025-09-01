import fetchWithAuth from './fetchWithAuth';
import { toast } from 'sonner';

/**
 * This module provides functions for interacting with the autor API endpoints.
 * It abstracts the fetch calls and handles authentication and basic error reporting.
 */

/**
 * Fetches all autores for the currently authenticated user.
 * @returns {Promise<Array>} A promise that resolves to an array of autor objects.
 * @throws {Error} If the fetch request fails.
 */
export const getAutores = async () => {
  const res = await fetchWithAuth('/api/autores');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch autores.');
  }
  return res.json();
};

/**
 * Loads a single autor by its ID.
 * @param {string|number} id - The ID of the autor to fetch.
 * @returns {Promise<object>} A promise that resolves to the autor object.
 * @throws {Error} If the fetch request fails.
 */
export const loadAutor = async (id) => {
  const res = await fetchWithAuth(`/api/autores/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load autor.');
  }
  return res.json();
};

/**
 * Creates a new autor.
 * @param {string} name - The name of the new autor.
 * @param {object} autorData - The detailed data object for the autor.
 * @returns {Promise<object>} A promise that resolves to the newly created autor object.
 * @throws {Error} If the creation fails.
 */
export const saveAutor = async (name, autorData) => {
  try {
    const requestBody = JSON.stringify({ name, autor_data: autorData });

    const createRes = await fetchWithAuth('/api/autores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      throw new Error(`Failed to create autor. Server says: ${errorBody}`);
    }

    const result = await createRes.json();
    return result;
  } catch (error) {
    toast.error(`Save failed: ${error.message}`);
    throw error;
  }
};

/**
 * Updates an existing autor.
 * @param {string|number} id - The ID of the autor to update.
 * @param {string} name - The updated name of the autor.
 * @param {object} autorData - The updated detailed data object for the autor.
 * @returns {Promise<object>} A promise that resolves to the updated autor object.
 * @throws {Error} If the update fails.
 */
export const updateAutor = async (id, name, autorData) => {
    try {
        const requestBody = JSON.stringify({ name, autor_data: autorData });

        const res = await fetchWithAuth(`/api/autores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Failed to update autor. Server says: ${errorBody}`);
        }

        const result = await res.json();
        return result;
    } catch (error) {
        toast.error(`Update failed: ${error.message}`);
        throw error;
    }
};

/**
 * Deletes an autor by its ID.
 * @param {string|number} id - The ID of the autor to delete.
 * @returns {Promise<object>} A promise that resolves to the confirmation message from the API.
 * @throws {Error} If the deletion fails.
 */
export const deleteAutor = async (id) => {
  try {
    const res = await fetchWithAuth(`/api/autores/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Handle the specific 409 conflict error
      if (res.status === 409) {
        toast.error(err.error || 'This autor is in use and cannot be deleted.');
      } else {
        toast.error(err.error || 'Failed to delete autor.');
      }
      throw new Error(err.error || 'Failed to delete autor.');
    }
    // The success toast is now handled in the component to avoid duplication
    // toast.success('Autor deleted successfully!');
    return res.json();
  } catch (error) {
    // The toast is already shown for !res.ok cases, so we just re-throw
    // for the component to catch and handle loading states etc.
    throw error;
  }
};
