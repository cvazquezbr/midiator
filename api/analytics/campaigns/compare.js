import { query } from '../../db.js';
import { withAuth } from '../../middleware/auth.js';

const ALLOWED_METRICS = {
    total_impressions: 'SUM(lpa.impression_count)',
    total_clicks: 'SUM(lpa.click_count)',
    total_likes: 'SUM(lpa.like_count)',
    total_comments: 'SUM(lpa.comment_count)',
    total_shares: 'SUM(lpa.share_count)',
    total_engagement_actions: 'SUM(lpa.like_count + lpa.comment_count + lpa.share_count)',
    avg_engagement_rate: 'AVG(lpa.engagement)',
    avg_ctr: 'CASE WHEN SUM(lpa.impression_count) > 0 THEN SUM(lpa.click_count) * 100.0 / SUM(lpa.impression_count) ELSE 0 END'
};

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { startDate, endDate, campaignIds, metric = 'total_impressions' } = req.query;
        const userId = req.user.id;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Os parâmetros startDate e endDate são obrigatórios.' });
        }

        if (!Object.keys(ALLOWED_METRICS).includes(metric)) {
            return res.status(400).json({ error: 'Invalid metric specified.' });
        }

        const campaignIdArray = campaignIds ? campaignIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];

        const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
        const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

        const queryParams = [parseInt(userId, 10), formattedStartDate, formattedEndDate];

        let campaignFilter = '';
        // if (campaignIdArray.length > 0) {
        //     campaignFilter = `AND c.id = ANY($${queryParams.length + 1}::int[])`;
        //     queryParams.push(campaignIdArray);
        // }

        const metricAggregation = ALLOWED_METRICS[metric];

        const finalQuery = `
            SELECT
                c.id AS campaign_id,
                c.name AS campaign_name,
                COALESCE(${metricAggregation}, 0) AS value
            FROM
                linkedin_post_analytics lpa
            JOIN
                linkedin_schedules ls ON lpa.publication_id = ls.id
            LEFT JOIN
                campaigns c ON ls.campaign_id = c.id
            WHERE
                ls.user_id = $1
                AND lpa.snapshot_date BETWEEN $2 AND $3
                ${campaignFilter}
            GROUP BY
                c.id, c.name
            ORDER BY
                value DESC;
        `;

        const { rows } = await query(finalQuery, queryParams);

        res.status(200).json(rows);

    } catch (error) {
        console.error('Error fetching campaign comparison:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);
