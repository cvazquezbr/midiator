import { query } from '../db.js';
import { withAuth } from '../middleware/auth.js';

const parseBody = async (req) => {
  let body = '';
  for await (const chunk of req) {
    body += new TextDecoder().decode(chunk);
  }
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

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
            const { name, page_set_data } = await parseBody(req);
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
            const { id, name, page_set_data } = await parseBody(req);
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

        if (req.method === 'PATCH') {
            const { id, name, page_set_data } = await parseBody(req);
            if (!id) return res.status(400).json({ error: 'ID is required' });

            // Build the query dynamically to only update provided fields
            const fields = [];
            const values = [];
            let queryIndex = 1;

            if (name !== undefined) {
                fields.push(`name = $${queryIndex++}`);
                values.push(name);
            }
            if (page_set_data !== undefined) {
                fields.push(`page_set_data = $${queryIndex++}`);
                values.push(JSON.stringify(page_set_data));
            }

            if (fields.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id, userId);
            const queryString = `
                UPDATE page_sets
                SET ${fields.join(', ')}
                WHERE id = $${queryIndex++} AND user_id = $${queryIndex++}
                RETURNING id, name, page_set_data;
            `;

            const { rows: [updatedPageSet] } = await query(queryString, values);

            if (!updatedPageSet) return res.status(404).json({ error: 'PageSet not found or user not authorized' });

            return res.status(200).json(parsePageSetData(updatedPageSet));
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default withAuth(handler);