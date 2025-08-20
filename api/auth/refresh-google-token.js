import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const userId = req.user.sub;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token.' });
    }

    const { rows } = await query('SELECT google_refresh_token FROM users WHERE id = $1', [userId]);
    const user = rows[0];

    if (!user || !user.google_refresh_token) {
      return res.status(403).json({ error: 'No refresh token found for this user. Please re-authenticate with Google.' });
    }

    client.setCredentials({
      refresh_token: user.google_refresh_token,
    });

    const { credentials } = await client.refreshAccessToken();
    const { access_token } = credentials;

    if (!access_token) {
      return res.status(500).json({ error: 'Failed to refresh access token.' });
    }

    // Update the new access token in the database
    await query('UPDATE users SET google_access_token = $1 WHERE id = $2', [access_token, userId]);

    // Return the new access token
    res.status(200).json({ googleAccessToken: access_token });

  } catch (error) {
    console.error('Google Token Refresh Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while refreshing the Google token.' });
  }
}

export default withAuth(handler);
