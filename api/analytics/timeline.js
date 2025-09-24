import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';

const ALLOWED_METRICS = [
    'impression_count',
    'click_count',
    'like_count',
    'comment_count',
    'share_count',
    'engagement'
];

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const {
            startDate: startDateStr,
            endDate: endDateStr,
            campaignIds,
            metric = 'impression_count'
        } = req.query;
        const userId = req.user.id;

        if (!ALLOWED_METRICS.includes(metric)) {
            return res.status(400).json({ error: 'Invalid metric specified.' });
        }

        const campaignIdArray = campaignIds ? campaignIds.split(',').map(id => parseInt(id.trim(), 10)) : [];

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(endDate.getDate() - 30));

        const queryParams = [];

        let campaignFilter = '';
        // if (campaignIdArray.length > 0) {
        //     campaignFilter = `AND c.id = ANY($${queryParams.length + 1}::int[])`;
        //     queryParams.push(campaignIdArray);
        // }

        const finalQuery = `
            WITH latest_analytics AS (
                SELECT
                    lpa.*,
                    ls.campaign_id,
                    ROW_NUMBER() OVER(PARTITION BY lpa.publication_id ORDER BY lpa.snapshot_date DESC) as rn
                FROM
                    linkedin_post_analytics lpa
                JOIN
                    linkedin_schedules ls ON lpa.publication_id = ls.id
                -- WHERE
                    -- ls.user_id = $1
                    -- AND lpa.snapshot_date BETWEEN $2 AND $3
            )
            SELECT
                la.snapshot_date AS date,
                SUM(la.${metric}) as value
            FROM
                latest_analytics la
            LEFT JOIN
                campaigns c ON la.campaign_id = c.id
            WHERE
                la.rn = 1
                ${campaignFilter}
            GROUP BY
                la.snapshot_date
            ORDER BY
                la.snapshot_date ASC;
        `;

        const { rows } = await query(finalQuery, queryParams);

        res.status(200).json(rows);

    } catch (error) {
        console.error('Error fetching analytics timeline:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);
