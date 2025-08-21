import fetchWithAuth from './fetchWithAuth';

/**
 * Checks if the user's session is still active by making a lightweight API call.
 * The fetchWithAuth wrapper will handle the redirect on 401.
 * @returns {Promise<boolean>} True if the session is active, otherwise the function will throw and redirect.
 */
export const checkAuthStatus = async () => {
  try {
    const res = await fetchWithAuth('/api/auth/me');
    if (!res.ok) {
      // The fetchWithAuth wrapper handles 401s by redirecting.
      // For other errors (e.g., 500), we throw an error to be caught by the caller.
      const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response.' }));
      throw new Error(errorData.error || `Failed to verify authentication status: ${res.statusText}`);
    }
    // If the request succeeds with a 2xx status, the user is authenticated.
    return true;
  } catch (error) {
    // If fetchWithAuth redirected, this error might not even be thrown in the original context.
    // If it is (e.g., network error), we re-throw it so the calling function can handle it.
    console.error('Auth check failed:', error.message);
    throw error;
  }
};
