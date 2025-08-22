import fetchWithAuth from './fetchWithAuth';

/**
 * Checks if the user's session is active. If the session is expired (401),
 * it attempts to refresh the token. If refreshing fails, it redirects to login.
 * @returns {Promise<boolean>} True if the session is active or was successfully renewed.
 * @throws {Error} If an unrecoverable error occurs.
 */
export const checkAuthStatus = async () => {
  try {
    console.log('[checkAuthStatus] Checking /api/auth/me...');
    const res = await fetchWithAuth('/api/auth/me');

    if (res.ok) {
      console.log('[checkAuthStatus] Session is active.');
      return true; // User is authenticated
    }

    if (res.status === 401) {
      console.log('[checkAuthStatus] Session expired (401). Attempting token refresh...');

      const refreshRes = await fetchWithAuth('/api/auth/refresh-google-token', { method: 'POST' });

      if (refreshRes.ok) {
        console.log('[checkAuthStatus] Token refresh successful. Auth status is now valid.');
        // The cookie is automatically set by the server. The context will re-sync on the next page load or API call.
        // For immediate UI updates, a more complex state management approach would be needed,
        // but this ensures subsequent requests from this point on will be authenticated.
        return true;
      } else {
        console.error('[checkAuthStatus] Token refresh failed. Redirecting to login.');
        window.location.href = '/login?session_expired=true';
        throw new Error('Session expired and refresh failed.');
      }
    }

    // Handle other non-ok statuses (e.g., 500)
    const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response.' }));
    throw new Error(errorData.error || `Failed to verify authentication status: ${res.statusText}`);

  } catch (error) {
    console.error('An unhandled error occurred during auth check:', error.message);
    // For network errors etc., we can also redirect.
    window.location.href = '/login?error=auth_check_failed';
    throw error;
  }
};
