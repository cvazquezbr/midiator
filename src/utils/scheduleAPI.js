import fetchWithAuth from './fetchWithAuth';

export const createSchedule = async (scheduleData) => {
    const response = await fetchWithAuth('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'createSchedule',
            payload: scheduleData,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'Failed to create schedule.');
        } catch (e) {
            // If parsing fails, the response was not JSON.
            throw new Error(`Failed to create schedule. Server returned non-JSON response: ${errorText}`);
        }
    }

    return await response.json();
};

export const getSchedulesForUser = async () => {
    const response = await fetchWithAuth('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSchedules' }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get schedules.');
    }

    return await response.json();
};

export const getSchedule = async (id) => {
    const response = await fetchWithAuth('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'getSchedule',
            payload: { id },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get schedule details.');
    }

    return await response.json();
};

export const updateSchedule = async (id, newScheduledAt) => {
    const response = await fetchWithAuth('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'updateSchedule',
            payload: { id, scheduledAt: newScheduledAt },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update schedule.');
    }

    return await response.json();
};

export const deleteSchedule = async (id) => {
    const response = await fetchWithAuth('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'deleteSchedule',
            payload: { id },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete schedule.');
    }

    return await response.json();
};
