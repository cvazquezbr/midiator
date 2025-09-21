import { withAuth } from '@clerk/clerk-sdk-node';
import { db } from '../../../db/index.mjs';
import { palettes, campaigns } from '../../../db/schema.mjs';
import { and, eq, count } from 'drizzle-orm';

const handler = async (req, res) => {
  if (!req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.auth.userId;
  const { id } = req.query;
  const paletteId = parseInt(id, 10);

  if (isNaN(paletteId)) {
    return res.status(400).json({ error: 'Invalid palette ID.' });
  }

  // GET: Fetch a single palette by ID
  if (req.method === 'GET') {
    try {
      const [palette] = await db.select().from(palettes).where(and(eq(palettes.id, paletteId), eq(palettes.userId, userId)));
      if (!palette) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json(palette);
    } catch (error) {
      console.error(`Error fetching palette ${paletteId}:`, error);
      return res.status(500).json({ error: 'Failed to fetch palette' });
    }
  }

  // PUT: Update a palette by ID
  if (req.method === 'PUT') {
    const { name, colors } = req.body;
    if (!name || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Palette name and colors array are required.' });
    }
    try {
      const [updatedPalette] = await db.update(palettes)
        .set({ name, colors, updatedAt: new Date() })
        .where(and(eq(palettes.id, paletteId), eq(palettes.userId, userId)))
        .returning();

      if (!updatedPalette) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json(updatedPalette);
    } catch (error) {
      console.error(`Error updating palette ${paletteId}:`, error);
      return res.status(500).json({ error: 'Failed to update palette' });
    }
  }

  // DELETE: Delete a palette by ID
  if (req.method === 'DELETE') {
    try {
      // Check if any campaigns are using this palette
      const [campaignCountResult] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.paletteId, paletteId));
      if (campaignCountResult.count > 0) {
        return res.status(400).json({ error: `Cannot delete palette because it is being used by ${campaignCountResult.count} campaign(s).` });
      }

      const [deletedPalette] = await db.delete(palettes)
        .where(and(eq(palettes.id, paletteId), eq(palettes.userId, userId)))
        .returning();

      if (!deletedPalette) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json({ message: 'Palette deleted successfully.' });
    } catch (error) {
      console.error(`Error deleting palette ${paletteId}:`, error);
      return res.status(500).json({ error: 'Failed to delete palette' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
