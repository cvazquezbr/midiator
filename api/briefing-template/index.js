import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

// Helper to parse the request body stream, as Vercel might not do it automatically.
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

const handler = async (req, res) => {
  // withAuth middleware places the user's JWT payload (including id) in req.user.
  // The user ID from the JWT is in the 'sub' claim.
  const userId = req.user.sub;

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT template_data FROM briefing_templates WHERE user_id = $1',
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Nenhum modelo de briefing encontrado para este usuário.' });
      }

      return res.status(200).json(rows[0].template_data);
    } catch (error) {
      console.error(`[GET /api/briefing-template] Erro ao buscar modelo para o usuário ${userId}:`, error);
      return res.status(500).json({ error: 'Erro interno do servidor ao buscar modelo.' });
    }
  } else if (req.method === 'PUT') {
    try {
        const { template_data } = await parseBody(req);

        if (!template_data) {
            return res.status(400).json({ error: 'O objeto template_data é obrigatório.' });
        }

        const { rows } = await query(
            `INSERT INTO briefing_templates (user_id, template_data)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET template_data = EXCLUDED.template_data, updated_at = NOW()
             RETURNING id;`,
            [userId, template_data]
        );

        return res.status(200).json({ message: 'Modelo de briefing salvo com sucesso.', id: rows[0].id });
    } catch (error) {
        console.error(`[PUT /api/briefing-template] Erro ao salvar modelo para o usuário ${userId}:`, error);
        return res.status(500).json({ error: 'Erro interno do servidor ao salvar o modelo.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Wrap the handler with the authentication middleware
export default withAuth(handler);