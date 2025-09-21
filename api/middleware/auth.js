import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * A higher-order function to protect API routes.
 * It verifies the JWT from the 'auth_token' cookie.
 * If valid, it attaches the user payload to req.user and calls the handler.
 * Otherwise, it sends a 401 Unauthorized response.
 *
 * @param {Function} handler The original API route handler.
 * @returns {Function} The wrapped handler with authentication check.
 */
export const withAuth = (handler) => {
  return async (req, res) => {
    if (!JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET environment variable is not set for auth middleware.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
      // Vercel might not have req.headers.cookie in all runtimes, so we check
      const cookiesHeader = req.headers.get ? req.headers.get('cookie') : req.headers.cookie;
      const cookies = parse(cookiesHeader || '');
      const token = cookies.auth_token;

      if (!token) {
        return res.status(401).json({ error: 'Authentication required. No token found.' });
      }

      // Verify the token. This will throw an error if the token is invalid or expired.
      const decoded = jwt.verify(token, JWT_SECRET);

      // Attach user information to the request object.
      req.user = decoded;

      // Proceed to the original handler
      return handler(req, res);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        // This catches invalid signatures, expired tokens, etc.
        return res.status(401).json({ error: `Invalid or expired token. ${error.message}` });
      }

      console.error('Auth Middleware Error:', error);
      return res.status(500).json({ error: 'Internal Server Error during authentication.' });
    }
  };
};

/**
 * A higher-order function to protect API routes that require admin privileges.
 * It verifies the JWT and checks if the user has the 'admin' role.
 *
 * @param {Function} handler The original API route handler.
 * @returns {Function} The wrapped handler with admin authentication check.
 */
export const withAdminAuth = (handler) => {
  // We can reuse the withAuth middleware and chain the admin check.
  const authenticatedHandler = withAuth(async (req, res) => {
    // By the time we get here, withAuth has already run successfully.
    // req.user is guaranteed to be populated.
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Administrator access required.' });
    }
    // If the user is an admin, proceed to the original handler.
    return handler(req, res);
  });

  return authenticatedHandler;
};
