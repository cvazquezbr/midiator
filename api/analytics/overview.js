import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { startDate, endDate, campaignIds } = req.query;
        const userId = req.user?.id;

        if (!userId || isNaN(parseInt(userId, 10))) {
            return res.status(401).json({ error: 'Usuário não autenticado ou inválido.' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Os parâmetros startDate e endDate são obrigatórios.' });
        }

        const campaignIdArray = campaignIds ? campaignIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];

        const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
        const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

        const queryParams = [parseInt(userId, 10), formattedStartDate, formattedEndDate];

        let campaignFilter = '';
        if (campaignIdArray.length > 0) {
            campaignFilter = `AND c.id = ANY($${queryParams.length + 1}::int[])`;
            queryParams.push(campaignIdArray);
        }

        const finalQuery = `
            WITH latest_snapshots AS (
                SELECT DISTINCT ON (lpa.publication_id)
                    lpa.*
                FROM
                    linkedin_post_analytics lpa
                ORDER BY
                    lpa.publication_id, lpa.snapshot_date DESC
            )
            SELECT
                COALESCE(SUM(lsnp.impression_count), 0) AS total_impressions,
                COALESCE(SUM(lsnp.click_count), 0) AS total_clicks,
                COALESCE(SUM(lsnp.like_count), 0) AS total_likes,
                COALESCE(SUM(lsnp.comment_count), 0) AS total_comments,
                COALESCE(SUM(lsnp.share_count), 0) AS total_shares,
                COALESCE(SUM(lsnp.like_count + lsnp.comment_count + lsnp.share_count), 0) as total_engagement_actions,
                COALESCE(AVG(lsnp.engagement), 0) AS avg_engagement_rate,
                COALESCE(SUM(lsnp.click_count) * 100.0 / NULLIF(SUM(lsnp.impression_count), 0), 0) AS avg_ctr
            FROM
                linkedin_schedules ls
            JOIN
                latest_snapshots lsnp ON ls.id = lsnp.publication_id
            LEFT JOIN
                campaigns c ON ls.campaign_id = c.id
            WHERE
                ls.user_id = $1
                AND lsnp.snapshot_date BETWEEN $2 AND $3
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
