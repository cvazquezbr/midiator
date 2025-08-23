import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

/**
 * API handler to get the profile of the currently authenticated user.
 * This handler is wrapped with the `withAuth` middleware.
 * It now fetches the latest user data from the database to ensure all
 * information, especially the Google Access Token, is up-to-date.
 */
const meHandler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // The user's UUID is in the JWT payload attached by withAuth
    const userUuid = req.user.uuid;
    if (!userUuid) {
      return res.status(400).json({ error: 'User identifier not found in token.' });
    }

    // Fetch the latest user data from the database
    const { rows } = await query('SELECT id, uuid, name, email, role, google_access_token FROM users WHERE uuid = $1', [userUuid]);
    const user = rows[0];

    if (!user) {
      // This case should be rare if the JWT is valid, but it's a good safeguard
      return res.status(404).json({ error: 'User not found.' });
    }

    // Return the fresh user profile
    const userProfile = {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role,
      googleAccessToken: user.google_access_token,
    };

    return res.status(200).json(userProfile);

  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'An error occurred while fetching user profile.' });
  }
};

// Wrap the handler with the withAuth middleware to protect this route
export default withAuth(meHandler);
