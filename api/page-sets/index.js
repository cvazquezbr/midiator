import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';

// Helper to safely parse the page_set_data field
const parsePageSetData = (pageSet) => {
    if (!pageSet) return null;

    let data = {};
    const rawData = pageSet.page_set_data;

    try {
        if (typeof rawData === 'string') {
            data = JSON.parse(rawData);
        } else if (rawData) {
            // It's already an object
            data = rawData;
        }
    } catch (e) {
        console.error(`Failed to parse page_set_data for pageSet ${pageSet.id}:`, e);
    }

    return { ...pageSet, page_set_data: data };
};


const handler = async (req, res) => {
    const userId = req.user.sub;

    try {
        if (req.method === 'GET') {
            const { rows } = await query('SELECT id, name, page_set_data FROM page_sets WHERE user_id = $1 ORDER BY name', [userId]);
            const parsedRows = rows.map(parsePageSetData);
            return res.status(200).json(parsedRows);
        }

        if (req.method === 'POST') {
            const { name, page_set_data } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            const { rows: [newPageSet] } = await query(
                `INSERT INTO page_sets (user_id, name, page_set_data)
                VALUES ($1, $2, $3)
                RETURNING id, name, page_set_data;`,
                [userId, name, JSON.stringify(page_set_data || {})]
            );

            return res.status(201).json(parsePageSetData(newPageSet));
        }

        if (req.method === 'PUT') {
            const { id, name, page_set_data } = req.body;
            if (!id || !name) return res.status(400).json({ error: 'ID and name are required' });

            const { rows: [updatedPageSet] } = await query(
                `UPDATE page_sets
                SET name = $1, page_set_data = $2
                WHERE id = $3 AND user_id = $4
                RETURNING id, name, page_set_data;`,
                [name, JSON.stringify(page_set_data || {}), id, userId]
            );

            if (!updatedPageSet) return res.status(404).json({ error: 'PageSet not found' });
            return res.status(200).json(parsePageSetData(updatedPageSet));
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const result = await query(
                'DELETE FROM page_sets WHERE id = $1 AND user_id = $2;',
                [id, userId]
            );

            if (result.rowCount === 0) return res.status(404).json({ error: 'PageSet not found' });
            return res.status(204).end();
        }

        if (req.method === 'PATCH') { // For loading a single full page set
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const { rows: [pageSet] } = await query(
                'SELECT id, name, page_set_data FROM page_sets WHERE id = $1 AND user_id = $2;',
                [id, userId]
            );

            if (!pageSet) return res.status(404).json({ error: 'PageSet not found' });

            return res.status(200).json(parsePageSetData(pageSet));
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);