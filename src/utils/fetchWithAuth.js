/**
 * A wrapper around fetch that includes credentials and handles authorization.
 * It no longer performs a hard redirect on 401, allowing the caller to handle it.
 */
const fetchWithAuth = async (url, options = {}) => {
  // By default, we always want to include credentials (like cookies)
  const defaultOptions = {
    ...options,
    credentials: 'include',
  };

  const response = await fetch(url, defaultOptions);

  // The caller is now responsible for handling the 401 response.
  // This allows for more flexible error handling, like token refresh.
  return response;
};

export default fetchWithAuth;
