import { query } from '../../db.js';
import { withAuth } from '../../middleware/auth.js';

// We are aggregating over the snapshots, so we use SUM for counts/rates
const ALLOWED_METRICS = {
    engagement: 'AVG(lpa.engagement)',
    impressions: 'SUM(lpa.impression_count)',
    clicks: 'SUM(lpa.click_count)',
    likes: 'SUM(lpa.like_count)',
    comments: 'SUM(lpa.comment_count)',
    shares: 'SUM(lpa.share_count)'
};

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { startDate, endDate, campaignIds, metric = 'engagement', limit = 10 } = req.query;
        const userId = req.user.id;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Os parâmetros startDate e endDate são obrigatórios.' });
        }

        if (!Object.keys(ALLOWED_METRICS).includes(metric)) {
            return res.status(400).json({ error: 'Invalid metric specified.' });
        }

        const parsedLimit = parseInt(limit, 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
            return res.status(400).json({ error: 'Invalid limit specified. Must be between 1 and 100.' });
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

        const metricAggregation = ALLOWED_METRICS[metric];

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
                ls.id AS post_id,
                COALESCE(ls.post_content->>'titulo', 'Publicação sem título') AS post_title,
                c.name AS campaign_name,
                ls.linkedin_post_url,
                COALESCE(${metricAggregation.replace(/lpa\./g, 'lsnp.')}, 0) AS value
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
            GROUP BY
                ls.id, c.name, ls.post_content, ls.linkedin_post_url
            ORDER BY
                value DESC
            LIMIT $${queryParams.length + 1};
        `;
        queryParams.push(parsedLimit);


        const { rows } = await query(finalQuery, queryParams);

        res.status(200).json(rows);

    } catch (error) {
        console.error('Error fetching top posts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);
