import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const handler = async (req, res) => {
  const userId = req.user.sub;

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        `SELECT c.id, c.name, c.updated_at, c.campaign_data, u.email as owner_email
         FROM campaigns c
         JOIN campaign_shares cs ON c.id = cs.campaign_id
         JOIN users u ON c.user_id = u.id
         WHERE cs.shared_with_user_id = $1
         ORDER BY c.updated_at DESC`,
        [userId]
      );

      const campaignsWithPages = rows.map(campaign => {
        const pageUrls = campaign.campaign_data?.generatedPagesData?.map(page => page.url).filter(Boolean) || [];
        const { campaign_data, ...rest } = campaign;
        return { ...rest, pageUrls };
      });

      return res.status(200).json(campaignsWithPages);
    } catch (error) {
      console.error(`[GET /api/campaigns/shared-with-me] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
