const TIMEZONE_KEY = 'user_timezone';

export const saveTimezone = (timezone) => {
  if (typeof timezone !== 'string') {
    console.error('Timezone must be a string.');
    return;
  }
  try {
    localStorage.setItem(TIMEZONE_KEY, timezone);
  } catch (error) {
    console.error('Failed to save timezone to localStorage', error);
  }
};

export const getTimezone = () => {
  try {
    return localStorage.getItem(TIMEZONE_KEY);
  } catch (error) {
    console.error('Failed to get timezone from localStorage', error);
    return null;
  }
};
