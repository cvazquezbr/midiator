import { del } from '@vercel/blob';
import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  const userId = req.user.sub; // The user ID is in the 'sub' (subject) claim
  const userEmail = req.user.email;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        `SELECT c.id, c.name, c.campaign_data, c.autor_id, c.persona_id, c.palette_id, c.updated_at
         FROM campaigns c
         WHERE c.id = $1
           AND (c.user_id = $2 OR EXISTS (
             SELECT 1 FROM campaign_shares cs
             WHERE cs.campaign_id = c.id
               AND (cs.shared_with_user_id = $2 OR cs.shared_with_email = $3)
           ))`,
        [id, userId, userEmail]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[GET /api/campaigns/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'PUT') {
    try {
      // Step 1: First, verify if the user has access to this campaign (owner or shared)
      const accessCheck = await query(
        `SELECT c.id FROM campaigns c
         WHERE c.id = $1
           AND (c.user_id = $2 OR EXISTS (
             SELECT 1 FROM campaign_shares cs
             WHERE cs.campaign_id = c.id
               AND (cs.shared_with_user_id = $2 OR cs.shared_with_email = $3)
           ))`,
        [id, userId, userEmail]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }

      // Step 2: If access is verified, proceed with the update
      const { name, campaign_data, autor_id, persona_id, palette_id } = await parseBody(req);
      if (!name || !campaign_data) {
        return res.status(400).json({ error: 'Campaign name and data are required.' });
      }

      const finalAutorId = autor_id === '' ? null : autor_id;
      const finalPersonaId = persona_id === '' ? null : persona_id;
      const finalPaletteId = (palette_id === '' || palette_id === 'custom') ? null : palette_id;

      const { rows } = await query(
        'UPDATE campaigns SET name = $1, campaign_data = $2, autor_id = $3, persona_id = $4, palette_id = $5, updated_at = NOW() WHERE id = $6 RETURNING id, name, updated_at, autor_id, persona_id, palette_id',
        [name, campaign_data, finalAutorId, finalPersonaId, finalPaletteId, id]
      );

      if (rows.length === 0) {
        // This case should not be reached if the access check passed, but it's a safeguard
        return res.status(404).json({ error: 'Campaign not found after access verification.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[PUT /api/campaigns/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Step 1: Fetch the campaign to get its data
      const { rows } = await query('SELECT campaign_data FROM campaigns WHERE id = $1 AND user_id = $2', [id, userId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }

      const campaignData = rows[0].campaign_data;

      // Dynamically import the utility function
      const { extractAssetUrls } = await import('../../src/utils/campaignUtils.js');
      const assetUrls = extractAssetUrls(campaignData);

      // Step 2: Delete associated assets from Vercel Blob Storage
      if (assetUrls.length > 0) {
        console.log(`[DELETE /api/campaigns/${id}] Deleting ${assetUrls.length} assets from blob storage...`);
        await del(assetUrls);
        console.log(`[DELETE /api/campaigns/${id}] Successfully deleted assets.`);
      }

      // Step 3: Delete the campaign from the database
      const { rowCount } = await query('DELETE FROM campaigns WHERE id = $1 AND user_id = $2', [id, userId]);

      if (rowCount === 0) {
        // This case should ideally not be reached if the first query succeeded
        return res.status(404).json({ error: 'Campaign not found or access denied after asset deletion.' });
      }

      return res.status(200).json({ message: 'Campaign and associated assets deleted successfully.' });
    } catch (error) {
      console.error(`[DELETE /api/campaigns/${id}] Error for user ${userId}:`, error);
      // Check if the error is from the blob deletion
      if (error.message.includes('blob')) {
        return res.status(500).json({ error: 'Failed to delete one or more assets from storage. Campaign not deleted.' });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
