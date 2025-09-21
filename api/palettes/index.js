import { withAuth } from '@clerk/clerk-sdk-node';
import { db } from '../../db/index.mjs';
import { palettes } from '../../db/schema.mjs';
import { eq } from 'drizzle-orm';

const handler = async (req, res) => {
  if (!req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.auth.userId;

  // GET: List all palettes for the authenticated user
  if (req.method === 'GET') {
    try {
      const userPalettes = await db.select().from(palettes).where(eq(palettes.userId, userId));

      // Sanitize data before sending to the client
      const sanitizedPalettes = userPalettes.map(palette => {
        // The 'colors' column is JSONB. If it was saved incorrectly as a string
        // instead of an array, it will be returned as a string.
        // We ensure it's always an array before sending to the client.
        if (typeof palette.colors === 'string' || !Array.isArray(palette.colors)) {
          console.warn(`Sanitizing malformed color data for palette ID: ${palette.id}. Found:`, palette.colors);
          return { ...palette, colors: [] };
        }
        return palette;
      });

      return res.status(200).json(sanitizedPalettes);
    } catch (error) {
      console.error('Error fetching palettes:', error);
      return res.status(500).json({ error: 'Failed to fetch palettes' });
    }
  }

  // POST: Create a new palette for the authenticated user
  if (req.method === 'POST') {
    const { name, colors } = req.body;

    if (!name || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Palette name and a colors array are required.' });
    }

    try {
      const [newPalette] = await db.insert(palettes).values({
        userId: userId,
        name: name,
        colors: colors,
      }).returning();

      return res.status(201).json(newPalette);
    } catch (error) {
      console.error('Error creating palette:', error);
      return res.status(500).json({ error: 'Failed to create palette' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
