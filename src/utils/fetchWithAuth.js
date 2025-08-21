const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Unauthorized. Redirect to login page.
    // You might want to clear any stored user data here as well.
    // Adding a query parameter to show a message on the login page.
    window.location.href = '/login?session_expired=true';
    // Throw an error to prevent further processing in the original call stack.
    throw new Error('Session expired. Redirecting to login.');
  }

  return response;
};

export default fetchWithAuth;
