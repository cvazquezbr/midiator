import { query } from '../db.js';
import { withAdminAuth } from '../middleware/auth.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  const body = await parseBody(req);
  // withAdminAuth has already verified the user is an admin.
  // req.user is available.
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await query('SELECT * FROM prompts WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error fetching prompt with id ${id}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, description, prompt_text } = body;
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
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error updating prompt with id ${id}:`, error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A prompt with this name already exists.' });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { rowCount } = await query('DELETE FROM prompts WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      return res.status(200).json({ message: 'Prompt deleted successfully' });
    } catch (error) {
      console.error(`Error deleting prompt with id ${id}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAdminAuth(handler);
