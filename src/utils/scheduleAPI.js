export const createSchedule = async (scheduleData) => {
    const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'createSchedule',
            payload: scheduleData,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
        throw new Error(`Failed to create schedule via proxy: ${errorData.message || 'Unknown error'}`);
    }

    return await response.json();
};
