import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { query } from '../db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const parseBody = async (req) => {
  let body = '';
  for await (const chunk of req) {
    body += new TextDecoder().decode(chunk);
  }
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

/**
 * Issues a JWT for the user and sets it in a secure cookie.
 * @param {object} res - The response object.
 * @param {object} user - The user object from the database.
 */
const issueJwtAndSetCookie = (res, user) => {
  const tokenPayload = {
    sub: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role: user.role,
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

  // Return the user profile, which is the same as the token payload
  res.status(200).json({ message: 'Logged in successfully.', user: tokenPayload });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
    console.error('Server configuration error: Google Client ID or JWT Secret is missing.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const { credential } = await parseBody(req);
    if (!credential) {
      return res.status(400).json({ error: 'Google credential not provided.' });
    }

    // Verify the ID token from Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload.' });
    }

    const { sub: googleId, email, name, picture } = payload;

    // 1. Check if user exists with this Google ID
    let { rows } = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user = rows[0];

    if (user) {
      // User exists and is linked to Google, log them in
      return issueJwtAndSetCookie(res, user);
    }

    // 2. If no user with that google_id, check by email
    ({ rows } = await query('SELECT * FROM users WHERE email = $1', [email]));
    user = rows[0];

    if (user) {
      // User with this email exists, but no google_id. Link the account.
      const { rows: updatedRows } = await query(
        'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
        [googleId, user.id]
      );
      user = updatedRows[0];
      return issueJwtAndSetCookie(res, user);
    }

    // 3. No user found, create a new one
    const { rows: newRows } = await query(
      'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *',
      [name, email, googleId]
    );
    user = newRows[0];
    return issueJwtAndSetCookie(res, user);

  } catch (error) {
    console.error('Google Auth Error:', error);
    // Be generic in the error message to the client
    return res.status(401).json({ error: 'Google authentication failed. The token might be invalid or expired.' });
  }
}
