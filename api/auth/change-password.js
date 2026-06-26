import { query } from '../db.js';
import bcrypt from 'bcryptjs';
import { withAuth } from '../middleware/auth.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { oldPassword, newPassword, confirmPassword } = await parseBody(req);
    const userId = req.user.sub; // from withAuth middleware

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    // 1. Get the current user's password hash
    const { rows: users } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];

    // This handles users who signed up via Google and don't have a password yet.
    // They should use the "Forgot Password" flow to create one.
    if (!user.password_hash) {
      return res.status(400).json({ error: 'You do not have a password set. Please use the "Forgot Password" feature to create one.' });
    }

    // 2. Compare the old password with the stored hash
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect old password.' });
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 4. Update the user's password in the database
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Protect the endpoint, only logged-in users can change their password
export default withAuth(handler);
