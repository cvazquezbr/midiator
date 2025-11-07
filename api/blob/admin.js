import { withAdminAuth } from '../middleware/auth.js';
import { list } from '@vercel/blob';
import * as db from '../db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blobs } = await list();
    const { rows: campaigns } = await db.query(`
      SELECT c.id, c.campaign_data, u.name as user_name
      FROM campaigns c
      JOIN users u ON c.user_id = u.id
    `);

    const activeUrls = new Set();
    const campaignUserMap = {};
    campaigns.forEach(campaign => {
      campaignUserMap[campaign.id] = campaign.user_name;
      if (campaign.campaign_data) {
        try {
          const campaignData = JSON.parse(campaign.campaign_data);
          extractAssetUrls(campaignData, activeUrls);
        } catch (e) {
          console.warn(`Could not parse campaign_data for campaign ${campaign.id}:`, e);
        }
      }
    });

    const orphanedFiles = [];
    const campaignUsage = {};
    const userUsage = {};
    let totalOrphanedSize = 0;
    let totalActiveSize = 0;
    let totalSize = 0;

    for (const blob of blobs) {
      const campaignId = blob.pathname.split('/')[0];
      const userName = campaignUserMap[campaignId] || 'Unknown';

      totalSize += blob.size;

      // Campaign Usage
      if (!campaignUsage[campaignId]) {
        campaignUsage[campaignId] = { size: 0, count: 0, user: userName };
      }
      campaignUsage[campaignId].size += blob.size;
      campaignUsage[campaignId].count++;

      // User Usage
      if (!userUsage[userName]) {
        userUsage[userName] = { size: 0, count: 0 };
      }
      userUsage[userName].size += blob.size;
      userUsage[userName].count++;

      if (!activeUrls.has(blob.url)) {
        orphanedFiles.push(blob);
        totalOrphanedSize += blob.size;
      } else {
        totalActiveSize += blob.size;
      }
    }

    return res.status(200).json({
      orphanedFiles,
      campaignUsage,
      userUsage,
      orphanAnalysis: {
        orphanedSize: totalOrphanedSize,
        activeSize: totalActiveSize,
        totalSize: totalSize,
        orphanedCount: orphanedFiles.length,
        activeCount: blobs.length - orphanedFiles.length,
        totalCount: blobs.length,
      },
    });

  } catch (error) {
    console.error('Error in Vercel Blob admin handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

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
