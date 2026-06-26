import { query } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { parseBody } from '../utils.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // This should not happen in production if the environment variable is set.
  console.error('CRITICAL: JWT_SECRET environment variable is not set.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    if (!JWT_SECRET) {
      // Don't proceed if the secret is missing.
      return res.status(500).json({ error: 'Server configuration error: JWT secret is missing.' });
    }

    const { email, password } = await parseBody(req);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find the user by email
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      // Use a generic error message to prevent email enumeration attacks
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check if the user has a password (they might have signed up with a social provider)
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials. Please try a different sign-in method.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // User is authenticated, create JWT
    const tokenPayload = {
      sub: user.id, // 'sub' is the standard claim for subject (user ID)
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role,
      // Do not include sensitive information in the payload
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Set JWT in a secure, HttpOnly cookie
    const authTokenCookie = serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    res.setHeader('Set-Cookie', authTokenCookie);

    // Also return user data (without sensitive info) to the client
    res.status(200).json({
      message: 'Logged in successfully.',
      user: {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
