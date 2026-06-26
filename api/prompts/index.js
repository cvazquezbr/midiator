import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  const body = await parseBody(req);
  // withAuth HOC has already run, so req.user is available.
  const { name } = req.query;

  if (req.method === 'GET') {
    try {
      if (name) {
        // Fetch a single prompt by name
        const { rows } = await query('SELECT * FROM prompts WHERE name = $1', [name]);
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Prompt not found' });
        }
        return res.status(200).json(rows[0]);
      } else {
        // Fetch all prompts for the list view
        const { rows } = await query('SELECT id, name, description FROM prompts ORDER BY name');
        return res.status(200).json(rows);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    // Additional check to ensure the user is an admin for this method
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only admins can create prompts.' });
    }
    try {
      const { name: newName, description, prompt_text } = body;
      if (!newName || !prompt_text) {
        return res.status(400).json({ error: 'Name and prompt text are required' });
      }
      const { rows } = await query(
        'INSERT INTO prompts (name, description, prompt_text) VALUES ($1, $2, $3) RETURNING *',
        [newName, description, prompt_text]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error creating prompt:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A prompt with this name already exists.' });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
