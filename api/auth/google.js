import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, 'postmessage');

const issueJwtAndSetCookie = (res, user) => {
  const tokenPayload = {
    sub: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role: user.role,
    googleAccessToken: user.google_access_token, // Adicionado
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  const cookie = serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Logged in successfully.', user: tokenPayload });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!GOOGLE_CLIENT_ID || !JWT_SECRET || !GOOGLE_CLIENT_SECRET) {
    console.error('Server configuration error: Google credentials or JWT Secret is missing.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const { code } = await parseBody(req);
    if (!code) {
      return res.status(400).json({ error: 'Google authorization code not provided.' });
    }

    const { tokens } = await client.getToken(code);
    const { access_token, refresh_token, id_token } = tokens;

    if (!id_token) {
        return res.status(400).json({ error: 'ID token not received from Google.' });
    }

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload.' });
    }

    const { sub: googleId, email, name } = payload;

    let { rows } = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user = rows[0];

    if (user) {
      const updateQuery = refresh_token
        ? 'UPDATE users SET google_access_token = $1, google_refresh_token = $2 WHERE id = $3 RETURNING *'
        : 'UPDATE users SET google_access_token = $1 WHERE id = $2 RETURNING *';
      const params = refresh_token ? [access_token, refresh_token, user.id] : [access_token, user.id];
      const { rows: updatedRows } = await query(updateQuery, params);
      user = updatedRows[0];
      return issueJwtAndSetCookie(res, user);
    }

    ({ rows } = await query('SELECT * FROM users WHERE email = $1', [email]));
    user = rows[0];

    if (user) {
      const updateQuery = refresh_token
        ? 'UPDATE users SET google_id = $1, google_access_token = $2, google_refresh_token = $3 WHERE id = $4 RETURNING *'
        : 'UPDATE users SET google_id = $1, google_access_token = $2 WHERE id = $3 RETURNING *';
      const params = refresh_token ? [googleId, access_token, refresh_token, user.id] : [googleId, access_token, user.id];
      const { rows: updatedRows } = await query(updateQuery, params);
      user = updatedRows[0];
      return issueJwtAndSetCookie(res, user);
    }

    const { rows: newRows } = await query(
      'INSERT INTO users (name, email, google_id, google_access_token, google_refresh_token) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, googleId, access_token, refresh_token]
    );
    user = newRows[0];
    return issueJwtAndSetCookie(res, user);

  } catch (error) {
    console.error('Google Auth Error:', error.response ? error.response.data : error.message);
    const specificError = error.response?.data?.error_description || 'The token might be invalid, expired, or the server configuration is incorrect (e.g., redirect_uri).';
    return res.status(401).json({ error: `Google authentication failed: ${specificError}` });
  }
}
