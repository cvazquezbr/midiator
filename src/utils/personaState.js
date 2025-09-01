import fetchWithAuth from './fetchWithAuth';
import { toast } from 'sonner';

/**
 * This module provides functions for interacting with the persona API endpoints.
 * It abstracts the fetch calls and handles authentication and basic error reporting.
 */

/**
 * Fetches all personas for the currently authenticated user.
 * @returns {Promise<Array>} A promise that resolves to an array of persona objects.
 * @throws {Error} If the fetch request fails.
 */
export const getPersonas = async () => {
  const res = await fetchWithAuth('/api/personas');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch personas.');
  }
  return res.json();
};

/**
 * Loads a single persona by its ID.
 * @param {string|number} id - The ID of the persona to fetch.
 * @returns {Promise<object>} A promise that resolves to the persona object.
 * @throws {Error} If the fetch request fails.
 */
export const loadPersona = async (id) => {
  const res = await fetchWithAuth(`/api/personas/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load persona.');
  }
  return res.json();
};

/**
 * Creates a new persona.
 * @param {string} name - The name of the new persona.
 * @param {object} personaData - The detailed data object for the persona.
 * @returns {Promise<object>} A promise that resolves to the newly created persona object.
 * @throws {Error} If the creation fails.
 */
export const savePersona = async (name, personaData) => {
  try {
    const requestBody = JSON.stringify({ name, persona_data: personaData });

    const createRes = await fetchWithAuth('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      throw new Error(`Failed to create persona. Server says: ${errorBody}`);
    }

    const result = await createRes.json();
    return result;
  } catch (error) {
    toast.error(`Save failed: ${error.message}`);
    throw error;
  }
};

/**
 * Updates an existing persona.
 * @param {string|number} id - The ID of the persona to update.
 * @param {string} name - The updated name of the persona.
 * @param {object} personaData - The updated detailed data object for the persona.
 * @returns {Promise<object>} A promise that resolves to the updated persona object.
 * @throws {Error} If the update fails.
 */
export const updatePersona = async (id, name, personaData) => {
    try {
        const requestBody = JSON.stringify({ name, persona_data: personaData });

        const res = await fetchWithAuth(`/api/personas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Failed to update persona. Server says: ${errorBody}`);
        }

        const result = await res.json();
        return result;
    } catch (error) {
        toast.error(`Update failed: ${error.message}`);
        throw error;
    }
};

/**
 * Deletes a persona by its ID.
 * @param {string|number} id - The ID of the persona to delete.
 * @returns {Promise<object>} A promise that resolves to the confirmation message from the API.
 * @throws {Error} If the deletion fails.
 */
export const deletePersona = async (id) => {
  try {
    const res = await fetchWithAuth(`/api/personas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Handle the specific 409 conflict error
      if (res.status === 409) {
        toast.error(err.error || 'This persona is in use and cannot be deleted.');
      } else {
        toast.error(err.error || 'Failed to delete persona.');
      }
      throw new Error(err.error || 'Failed to delete persona.');
    }
    // The success toast is now handled in the component to avoid duplication
    // toast.success('Persona deleted successfully!');
    return res.json();
  } catch (error) {
    // The toast is already shown for !res.ok cases, so we just re-throw
    // for the component to catch and handle loading states etc.
    throw error;
  }
};
