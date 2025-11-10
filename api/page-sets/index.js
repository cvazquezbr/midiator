import { db } from '@vercel/postgres';
import { withAuth } from '../middleware/auth.js';

const handler = async (req, res) => {
    const userId = req.user.sub;

    try {
        const client = await db.connect();

        if (req.method === 'GET') {
            const { rows } = await client.sql`SELECT id, name, page_set_data FROM page_sets WHERE user_id = ${userId} ORDER BY name`;
            return res.status(200).json(rows);
        }

        if (req.method === 'POST') {
            const { name, page_set_data } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            const { rows: [newPageSet] } = await client.sql`
                INSERT INTO page_sets (user_id, name, page_set_data)
                VALUES (${userId}, ${name}, ${JSON.stringify(page_set_data || {})})
                RETURNING id, name, page_set_data;
            `;

            return res.status(201).json(newPageSet);
        }

        if (req.method === 'PUT') {
            const { id, name, page_set_data } = req.body;
            if (!id || !name) return res.status(400).json({ error: 'ID and name are required' });

            const { rows: [updatedPageSet] } = await client.sql`
                UPDATE page_sets
                SET name = ${name}, page_set_data = ${JSON.stringify(page_set_data || {})}
                WHERE id = ${id} AND user_id = ${userId}
                RETURNING id, name, page_set_data;
            `;

            if (!updatedPageSet) return res.status(404).json({ error: 'PageSet not found' });
            return res.status(200).json(updatedPageSet);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const result = await client.sql`
                DELETE FROM page_sets WHERE id = ${id} AND user_id = ${userId};
            `;

            if (result.rowCount === 0) return res.status(404).json({ error: 'PageSet not found' });
            return res.status(204).end();
        }

        if (req.method === 'PATCH') { // For loading a single full page set
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const { rows: [pageSet] } = await client.sql`
                SELECT id, name, page_set_data FROM page_sets WHERE id = ${id} AND user_id = ${userId};
            `;

            if (!pageSet) return res.status(404).json({ error: 'PageSet not found' });
            return res.status(200).json(pageSet);
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);
