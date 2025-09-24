import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { period = '30d', campaignIds } = req.query;
        const userId = req.user.id;

        const campaignIdArray = campaignIds ? campaignIds.split(',').map(id => parseInt(id.trim(), 10)) : [];

        // Calculate start date based on period
        const startDate = new Date();
        const periodMatch = period.match(/(\d+)([d|m|y])/);
        if (periodMatch) {
            const amount = parseInt(periodMatch[1]);
            const unit = periodMatch[2];
            if (unit === 'd') {
                startDate.setDate(startDate.getDate() - amount);
            } else if (unit === 'm') {
                startDate.setMonth(startDate.getMonth() - amount);
            } else if (unit === 'y') {
                startDate.setFullYear(startDate.getFullYear() - amount);
            }
        } else {
            // Default to 30 days if period format is invalid
            startDate.setDate(startDate.getDate() - 30);
        }

        const baseQuery = `
            FROM
                linkedin_post_analytics lpa
            JOIN
                linkedin_schedules ls ON lpa.publication_id = ls.id
            JOIN
                campaigns c ON ls.campaign_id = c.id
            WHERE
                c.user_id = $1
                AND lpa.snapshot_date >= $2
        `;

        const queryParams = [userId, startDate.toISOString().split('T')[0]];

        let campaignFilter = '';
        if (campaignIdArray.length > 0) {
            campaignFilter = `AND c.id = ANY($${queryParams.length + 1}::int[])`;
            queryParams.push(campaignIdArray);
        }

        const finalQuery = `
            SELECT
                COALESCE(SUM(lpa.impression_count), 0) AS total_impressions,
                COALESCE(SUM(lpa.click_count), 0) AS total_clicks,
                COALESCE(SUM(lpa.like_count), 0) AS total_likes,
                COALESCE(SUM(lpa.comment_count), 0) AS total_comments,
                COALESCE(SUM(lpa.share_count), 0) AS total_shares,
                COALESCE(SUM(lpa.like_count + lpa.comment_count + lpa.share_count), 0) as total_engagement_actions,
                COALESCE(AVG(lpa.engagement), 0) AS avg_engagement_rate,
                CASE
                    WHEN SUM(lpa.impression_count) > 0 THEN
                        COALESCE(SUM(lpa.click_count) * 100.0 / SUM(lpa.impression_count), 0)
                    ELSE
                        0
                END AS avg_ctr
            ${baseQuery}
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

export default authenticate(handler);
