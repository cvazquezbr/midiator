import fetchWithAuth from './fetchWithAuth';
import { toast } from 'sonner';

export const getPersonas = async () => {
  const res = await fetchWithAuth('/api/personas');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch personas.');
  }
  return res.json();
};

export const loadPersona = async (id) => {
  const res = await fetchWithAuth(`/api/personas/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load persona.');
  }
  return res.json();
};

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
    toast.success('Persona saved successfully!');
    return result;
  } catch (error) {
    toast.error(`Save failed: ${error.message}`);
    throw error;
  }
};

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
        toast.success('Persona updated successfully!');
        return result;
    } catch (error) {
        toast.error(`Update failed: ${error.message}`);
        throw error;
    }
};

export const deletePersona = async (id) => {
  try {
    const res = await fetchWithAuth(`/api/personas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete persona.');
    }
    toast.success('Persona deleted successfully!');
    return res.json();
  } catch (error) {
    toast.error(`Delete failed: ${error.message}`);
    throw error;
  }
};
