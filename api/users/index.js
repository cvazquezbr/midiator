import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

/**
 * API handler for fetching all users.
 * This route is protected and requires the user to be an administrator.
 */
const usersHandler = async (req, res) => {
  // The withAuth middleware has already run, so req.user is available.
  // We perform an additional check to ensure the user is an admin.
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Access is restricted to administrators.' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch all users from the database.
      // It's crucial to exclude sensitive fields like the password hash.
      const { rows } = await query(`
        SELECT id, uuid, name, email, role, google_id, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `);
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Admin - Failed to fetch users:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Wrap the handler with the withAuth middleware.
// The handler itself performs the admin role check.
export default withAuth(usersHandler);
