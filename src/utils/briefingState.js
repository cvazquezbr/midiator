import fetchWithAuth from './fetchWithAuth';
import { toast } from 'sonner';

export const getBriefings = async () => {
  const res = await fetchWithAuth('/api/briefings');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch briefings.');
  }
  return res.json();
};

export const saveBriefing = async (name, briefingData) => {
  try {
    const requestBody = JSON.stringify({
      nomeBriefing: name,
      briefing_data: briefingData,
    });

    const createRes = await fetchWithAuth('/api/briefings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      throw new Error(`Failed to create briefing. Server says: ${errorBody}`);
    }

    const result = await createRes.json();
    return result;
  } catch (error) {
    toast.error(`Save failed: ${error.message}`);
    throw error;
  }
};

export const updateBriefing = async (id, name, briefingData) => {
    try {
        const requestBody = JSON.stringify({ name, briefing_data: briefingData });

        const res = await fetchWithAuth(`/api/briefings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Failed to update briefing. Server says: ${errorBody}`);
        }

        const result = await res.json();
        return result;
    } catch (error) {
        toast.error(`Update failed: ${error.message}`);
        throw error;
    }
};

export const deleteBriefing = async (id) => {
  try {
    const res = await fetchWithAuth(`/api/briefings/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to delete briefing.');
      throw new Error(err.error || 'Failed to delete briefing.');
    }
    return res.json();
  } catch (error) {
    throw error;
  }
};