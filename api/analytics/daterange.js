import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const userId = req.user.id;

        const dateRangeQuery = `
            SELECT
                MIN(lpa.snapshot_date) AS min_date,
                MAX(lpa.snapshot_date) AS max_date
            FROM
                linkedin_post_analytics lpa
            JOIN
                linkedin_schedules ls ON lpa.publication_id = ls.id
            JOIN
                campaigns c ON ls.campaign_id = c.id
            WHERE
                c.user_id = $1;
        `;

        const { rows } = await query(dateRangeQuery, [userId]);

        if (rows.length > 0 && rows[0].min_date) {
            res.status(200).json(rows[0]);
        } else {
            // Se não houver dados, retorna nulo para que o frontend possa usar o padrão.
            res.status(200).json({ min_date: null, max_date: null });
        }

    } catch (error) {
        console.error('Error fetching analytics date range:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);