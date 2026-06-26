import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  // Auth and admin checks
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Access is restricted to administrators.' });
  }

  // Vercel populates req.query with the dynamic path parameter
  const { id } = req.query;
  const loggedInAdminId = req.user.sub;

  if (req.method === 'PUT') {
    try {
      const { name, email, role } = await parseBody(req);

      // Basic validation
      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required.' });
      }
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: "Role must be either 'admin' or 'user'." });
      }

      // Prevent an admin from accidentally changing their own role from admin
      if (Number(id) === loggedInAdminId && req.user.role === 'admin' && role !== 'admin') {
        return res.status(403).json({ error: "Admins cannot remove their own admin status." });
      }

      const { rows } = await query(
        'UPDATE users SET name = $1, email = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING id, uuid, name, email, role',
        [name, email, role, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Failed to update user ${id}:`, error);
      // Handle potential unique constraint violation for email
      if (error.code === '23505') {
          return res.status(409).json({ error: 'Another user with this email already exists.' });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Prevent an admin from deleting their own account
      if (Number(id) === loggedInAdminId) {
        return res.status(403).json({ error: 'Admins cannot delete their own account.' });
      }

      const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      console.error(`Failed to delete user ${id}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
