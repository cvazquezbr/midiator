import { query } from '../db.js';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { parseBody } from '../utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { token, password, confirmPassword } = await parseBody(req);

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Token, password, and confirmation are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // 1. Hash the incoming token to match the one in the database
    const hashedToken = createHash('sha256').update(token).digest('hex');

    // 2. Find the user with the matching token that has not expired
    const { rows: users } = await query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [hashedToken]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const user = users[0];

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Update the user's password and clear the reset token fields
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
