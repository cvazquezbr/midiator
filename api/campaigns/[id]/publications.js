import { withAuth } from '../../../middleware/auth';
import { query } from '../../../db';

async function handler(req, res) {
  const { id: campaignId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rows } = await query(
      `SELECT id, campaign_id, scheduled_at, status, linkedin_post_url, post_content
       FROM schedules
       WHERE campaign_id = $1 AND status = 'published' AND linkedin_post_url IS NOT NULL
       ORDER BY scheduled_at DESC`,
      [campaignId]
    );

    if (!rows) {
      return res.status(404).json({ error: 'No publications found for this campaign.' });
    }

    // The URN is the last part of the post URL.
    const publications = rows.map(row => {
        const urlParts = row.linkedin_post_url.split('/');
        const urn = urlParts[urlParts.length - 2];
        return {
            ...row,
            post_content: typeof row.post_content === 'string' ? JSON.parse(row.post_content) : row.post_content,
            urn: `urn:li:share:${urn}`
        }
    });

    res.status(200).json(publications);
  } catch (error) {
    console.error('Error fetching campaign publications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withAuth(handler);
