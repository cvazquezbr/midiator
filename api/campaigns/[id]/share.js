import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

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

const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id: campaignId } = req.query;

  // First, verify the requester is the owner of the campaign
  const { rows: campaignRows } = await query('SELECT user_id FROM campaigns WHERE id = $1', [campaignId]);
  if (campaignRows.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  if (campaignRows[0].user_id !== userId) {
    return res.status(403).json({ error: 'You do not have permission to manage this campaign' });
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        `SELECT u.id, u.email, u.name
         FROM campaign_shares cs
         JOIN users u ON cs.shared_with_user_id = u.id
         WHERE cs.campaign_id = $1`,
        [campaignId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/campaigns/${campaignId}/share] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email } = await parseBody(req);
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const { rows: userToShareWith } = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (userToShareWith.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
      const sharedWithUserId = userToShareWith[0].id;

      if (sharedWithUserId === userId) {
        return res.status(400).json({ error: 'You cannot share a campaign with yourself.' });
      }

      const { rows: existingShare } = await query(
        'SELECT id FROM campaign_shares WHERE campaign_id = $1 AND shared_with_user_id = $2',
        [campaignId, sharedWithUserId]
      );
      if (existingShare.length > 0) {
        return res.status(409).json({ error: 'Campaign already shared with this user.' });
      }

      await query(
        'INSERT INTO campaign_shares (campaign_id, shared_with_user_id, shared_by_user_id) VALUES ($1, $2, $3)',
        [campaignId, sharedWithUserId, userId]
      );

      const { rows: sharedUser } = await query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [sharedWithUserId]
      );

      // Send email notification
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Midiator <noreply@midiator.app>',
            to: sharedUser[0].email,
            subject: `A campaign has been shared with you: ${campaignRows[0].name}`,
            html: `<p>Hello ${sharedUser[0].name},</p>
                   <p>${req.user.name} (${req.user.email}) has shared the campaign "${campaignRows[0].name}" with you.</p>
                   <p>You can access it by logging into your Midiator account.</p>
                   <p>Thank you,<br/>The Midiator Team</p>`,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Resend API Error: ${JSON.stringify(errorData)}`);
        }
      } catch (emailError) {
        console.error(`[POST /api/campaigns/${campaignId}/share] Failed to send email for user ${userId}:`, emailError);
        // Do not block the response for email failure, but log it
      }

      return res.status(201).json(sharedUser[0]);
    } catch (error) {
      console.error(`[POST /api/campaigns/${campaignId}/share] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
        const { shared_with_user_id } = await parseBody(req);
      if (!shared_with_user_id) {
        return res.status(400).json({ error: 'User ID to revoke is required.' });
      }

      const { rowCount } = await query(
        'DELETE FROM campaign_shares WHERE campaign_id = $1 AND shared_with_user_id = $2',
        [campaignId, shared_with_user_id]
      );

      if (rowCount === 0) {
        return res.status(404).json({ error: 'Share not found or already revoked.' });
      }

      return res.status(204).end(); // No Content
    } catch (error) {
      console.error(`[DELETE /api/campaigns/${campaignId}/share] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
