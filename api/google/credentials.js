import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const userId = req.user.sub;

    const { rows } = await query('SELECT google_access_token, google_refresh_token FROM users WHERE id = $1', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.google_refresh_token) {
      return res.status(403).json({ error: 'Google integration not authorized. No refresh token found.' });
    }

    client.setCredentials({
      refresh_token: user.google_refresh_token,
    });

    const { token: newAccessToken } = await client.getAccessToken();

    if (!newAccessToken) {
        throw new Error('Failed to refresh access token from Google.');
    }

    if (newAccessToken !== user.google_access_token) {
      await query('UPDATE users SET google_access_token = $1 WHERE id = $2', [newAccessToken, userId]);
    }

    res.status(200).json({ accessToken: newAccessToken });

  } catch (error) {
    console.error('Failed to get Google access token:', error.response ? error.response.data : error.message);
    if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
        return res.status(403).json({ error: 'Google authorization has been revoked. Please log in again.' });
    }
    res.status(500).json({ error: 'Failed to retrieve Google access token.' });
  }
};

export default withAuth(handler);
