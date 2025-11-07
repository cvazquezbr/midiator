import { withAdminAuth } from '../middleware/auth.js';
import { list } from '@vercel/blob';
import { db } from '../db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. List all blobs
    const { blobs } = await list();

    // 2. Fetch all campaign data for all users
    const { rows: campaigns } = await db.query('SELECT id, campaign_data FROM campaigns');

    // 3. Extract all asset URLs from campaigns
    const activeUrls = new Set();
    campaigns.forEach(campaign => {
      // It's possible for campaign_data to be null or invalid JSON
      if (campaign.campaign_data) {
        try {
          const campaignData = JSON.parse(campaign.campaign_data);
          extractAssetUrls(campaignData, activeUrls);
        } catch (e) {
          console.warn(`Could not parse campaign_data for campaign ${campaign.id}:`, e);
        }
      }
    });

    // 4. Identify orphaned files and calculate storage usage
    const orphanedFiles = [];
    const campaignUsage = {};

    for (const blob of blobs) {
      // Pathname format is expected to be "campaignId/..."
      const campaignId = blob.pathname.split('/')[0];
      if (!campaignUsage[campaignId]) {
        campaignUsage[campaignId] = { size: 0, count: 0 };
      }
      campaignUsage[campaignId].size += blob.size;
      campaignUsage[campaignId].count++;

      if (!activeUrls.has(blob.url)) {
        orphanedFiles.push(blob);
      }
    }

    return res.status(200).json({ orphanedFiles, campaignUsage });
  } catch (error) {
    console.error('Error in Vercel Blob admin handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to recursively extract asset URLs from campaign data
function extractAssetUrls(data, urlSet) {
  if (typeof data === 'string' && data.startsWith('https://')) {
    try {
      const url = new URL(data);
      if (url.hostname.endsWith('.public.blob.vercel-storage.com')) {
        urlSet.add(data);
      }
    } catch (e) {
      // Not a valid URL, ignore
    }
  } else if (Array.isArray(data)) {
    data.forEach(item => extractAssetUrls(item, urlSet));
  } else if (typeof data === 'object' && data !== null) {
    Object.values(data).forEach(value => extractAssetUrls(value, urlSet));
  }
}

export default withAdminAuth(handler);
