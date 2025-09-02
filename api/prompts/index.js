import { query } from '../db';
import { auth } from '../middleware/auth';

export default async function handler(req, res) {
  // Ensure the user is authenticated
  try {
    await auth(req, res);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.query;

  if (req.method === 'GET') {
    try {
      if (name) {
        // Fetch a single prompt by name
        const { rows } = await query('SELECT * FROM prompts WHERE name = $1', [name]);
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Prompt not found' });
        }
        res.status(200).json(rows[0]);
      } else {
        // Fetch all prompts
        const { rows } = await query('SELECT id, name, description FROM prompts ORDER BY name');
        res.status(200).json(rows);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Only admins can create prompts.' });
    }
    try {
      const { name, description, prompt_text } = req.body;
      if (!name || !prompt_text) {
        return res.status(400).json({ error: 'Name and prompt text are required' });
      }
      const { rows } = await query(
        'INSERT INTO prompts (name, description, prompt_text) VALUES ($1, $2, $3) RETURNING *',
        [name, description, prompt_text]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error creating prompt:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
          return res.status(409).json({ error: 'A prompt with this name already exists.' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
