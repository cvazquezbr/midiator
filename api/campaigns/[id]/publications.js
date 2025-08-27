import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

async function handler(req, res) {
  const { id: campaignId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rows } = await query(
      `SELECT id, campaign_id, scheduled_at, status, linkedin_post_url, post_content
       FROM linkedin_schedules
       WHERE campaign_id = $1 AND status = 'published' AND linkedin_post_url IS NOT NULL
       ORDER BY scheduled_at DESC`,
      [campaignId]
    );

    if (!rows) {
      return res.status(404).json({ error: 'No publications found for this campaign.' });
    }

    // The URN is the last part of the post URL.
    const publications = rows.map(row => {
        // Use a regex to robustly find the URN, which can be either a share or ugcPost.
        const match = row.linkedin_post_url.match(/(urn:li:(?:share|ugcPost):\d+)/);
        const urn = match ? match[0] : null;
        return {
            ...row,
            post_content: typeof row.post_content === 'string' ? JSON.parse(row.post_content) : row.post_content,
            urn: urn
        }
    }).filter(p => p.urn !== null); // Filter out any publications where a URN couldn't be found.

    res.status(200).json(publications);
  } catch (error) {
    console.error('Error fetching campaign publications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withAuth(handler);
