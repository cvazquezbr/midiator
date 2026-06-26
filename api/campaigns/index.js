import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  const userId = req.user.sub;

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, updated_at, campaign_data FROM campaigns WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      const campaignsWithPages = rows.map(campaign => {
        const pageUrls = campaign.campaign_data?.generatedPagesData?.map(page => page.url).filter(Boolean) || [];
        // We don't want to send the full, potentially large, campaign_data object
        // in the list view. So we extract what we need and return the rest.
        const { campaign_data, ...rest } = campaign;
        return { ...rest, pageUrls };
      });

      return res.status(200).json(campaignsWithPages);
    } catch (error) {
      console.error(`[GET /api/campaigns] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, campaign_data, autor_id, persona_id, palette_id } = await parseBody(req);
      if (!name || !campaign_data) {
        return res.status(400).json({ error: 'Campaign name and data are required.' });
      }
      // Convert empty strings or "custom" to null for foreign key fields
      const final_autor_id = autor_id === '' ? null : autor_id;
      const final_persona_id = persona_id === '' ? null : persona_id;
      const final_palette_id = (palette_id === '' || palette_id === 'custom') ? null : palette_id;

      const { rows } = await query(
        'INSERT INTO campaigns (user_id, name, campaign_data, autor_id, persona_id, palette_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, updated_at, autor_id, persona_id, palette_id',
        [userId, name, campaign_data, final_autor_id, final_persona_id, final_palette_id]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/campaigns] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
