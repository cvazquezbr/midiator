import { fetchWithAuth } from './auth';

export const getPageSets = async () => {
    return fetchWithAuth('/api/page-sets');
};

export const loadPageSet = async (id) => {
    const pageSet = await fetchWithAuth(`/api/page-sets?id=${id}`, { method: 'PATCH' });
    // Simulate asset deserialization for now, as it's not part of the core bug fix
    return { ...pageSet, pendingAssets: {} };
};

export const savePageSet = async (name, page_set_data, pendingAssets) => {
    const pageSet = await fetchWithAuth('/api/page-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, page_set_data }),
    });
    return { pageSet, pendingAssets: {} };
};

export const updatePageSet = async (id, name, page_set_data, pendingAssets) => {
    const pageSet = await fetchWithAuth('/api/page-sets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, page_set_data }),
    });
    return { pageSet, pendingAssets: {} };
};

export const deletePageSet = async (id) => {
    return fetchWithAuth(`/api/page-sets?id=${id}`, { method: 'DELETE' });
};
