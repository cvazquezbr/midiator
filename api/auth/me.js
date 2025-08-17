import { withAuth } from '../middleware/auth.js';

/**
 * API handler to get the profile of the currently authenticated user.
 * This handler is wrapped with the `withAuth` middleware, so it will only
 * be executed if a valid JWT is provided in the 'auth_token' cookie.
 */
const meHandler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // The user object (JWT payload) is attached to the request by the withAuth middleware.
  // We can send it back to the client.
  // It's good practice to filter out JWT-specific fields like 'iat' and 'exp'.
  const {
    sub, // subject (user id), we can filter this if uuid is the primary public id
    iat, // issued at
    exp, // expiration time
    ...userProfile // the rest of the user data (uuid, name, email, role)
  } = req.user;

  return res.status(200).json(userProfile);
};

// Wrap the handler with the withAuth middleware to protect this route
export default withAuth(meHandler);
