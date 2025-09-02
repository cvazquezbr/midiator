import { query } from '../db';
import { auth } from '../middleware/auth';

export default async function handler(req, res) {
  // Ensure the user is authenticated and is an admin
  try {
    await auth(req, res);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only admins can manage prompts.' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await query('SELECT * FROM prompts WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error fetching prompt with id ${id}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, description, prompt_text } = req.body;
      if (!name || !prompt_text) {
        return res.status(400).json({ error: 'Name and prompt text are required' });
      }
      const { rows } = await query(
        'UPDATE prompts SET name = $1, description = $2, prompt_text = $3 WHERE id = $4 RETURNING *',
        [name, description, prompt_text, id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      res.status(200).json(rows[0]);
    } catch (error)
    {
        console.error(`Error updating prompt with id ${id}:`, error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A prompt with this name already exists.' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { rowCount } = await query('DELETE FROM prompts WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      res.status(200).json({ message: 'Prompt deleted successfully' });
    } catch (error) {
      console.error(`Error deleting prompt with id ${id}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
