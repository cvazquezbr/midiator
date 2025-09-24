import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { startDate, endDate, campaignIds } = req.query;
        const userId = req.user.id;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Os parâmetros startDate e endDate são obrigatórios.' });
        }

        const campaignIdArray = campaignIds ? campaignIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];

        const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
        const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

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
                COALESCE(SUM(la.impression_count), 0) AS total_impressions,
                COALESCE(SUM(la.click_count), 0) AS total_clicks,
                COALESCE(SUM(la.like_count), 0) AS total_likes,
                COALESCE(SUM(la.comment_count), 0) AS total_comments,
                COALESCE(SUM(la.share_count), 0) AS total_shares,
                COALESCE(SUM(la.like_count + la.comment_count + la.share_count), 0) as total_engagement_actions,
                COALESCE(AVG(la.engagement), 0) AS avg_engagement_rate,
                COALESCE(SUM(la.click_count) * 100.0 / NULLIF(SUM(la.impression_count), 0), 0) AS avg_ctr
            FROM
                latest_analytics la
            LEFT JOIN
                campaigns c ON la.campaign_id = c.id
            WHERE
                la.rn = 1
                ${campaignFilter}
        `;

        const { rows } = await query(finalQuery, queryParams);

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(200).json({
                total_impressions: 0,
                total_clicks: 0,
                total_likes: 0,
                total_comments: 0,
                total_shares: 0,
                total_engagement_actions: 0,
                avg_engagement_rate: 0,
                avg_ctr: 0,
            });
        }

    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);
