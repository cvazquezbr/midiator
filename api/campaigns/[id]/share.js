import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';
import nodemailer from 'nodemailer';
import { parseBody } from '../../utils.js';

const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id: campaignId } = req.query;

  // First, verify the requester is the owner of the campaign
  const { rows: campaignRows } = await query('SELECT user_id, name FROM campaigns WHERE id = $1', [campaignId]);
  if (campaignRows.length === 0) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  if (campaignRows[0].user_id !== userId) {
    return res.status(403).json({ error: 'You do not have permission to manage this campaign' });
  }
  const campaignName = campaignRows[0].name;

  // GET: List all shares for the campaign (both existing users and pending emails)
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        `SELECT
           cs.shared_with_user_id AS id,
           COALESCE(u.email, cs.shared_with_email) AS email,
           u.name,
           CASE WHEN cs.shared_with_user_id IS NULL THEN 'pending' ELSE 'accepted' END AS status
         FROM
           campaign_shares cs
         LEFT JOIN
           users u ON cs.shared_with_user_id = u.id
         WHERE
           cs.campaign_id = $1`,
        [campaignId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/campaigns/${campaignId}/share] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // POST: Share the campaign with a user, creating a pending invite if they don't exist
  if (req.method === 'POST') {
    try {
      const { email } = await parseBody(req);
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const { rows: userToShareWith } = await query('SELECT id, name FROM users WHERE email = $1', [email]);

      let sharedUserResponse;

      // Case 1: User exists in the system
      if (userToShareWith.length > 0) {
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
        sharedUserResponse = { ...userToShareWith[0], status: 'accepted' };

      // Case 2: User does not exist, create a pending invitation
      } else {
        const { rows: existingPendingShare } = await query(
          'SELECT id FROM campaign_shares WHERE campaign_id = $1 AND shared_with_email = $2',
          [campaignId, email]
        );
        if (existingPendingShare.length > 0) {
          return res.status(409).json({ error: 'Invitation already sent to this email.' });
        }

        await query(
          'INSERT INTO campaign_shares (campaign_id, shared_with_email, shared_by_user_id) VALUES ($1, $2, $3)',
          [campaignId, email, userId]
        );
        sharedUserResponse = { id: null, email: email, name: null, status: 'pending' };
      }

      // Send email notification
      try {
        const toEmail = userToShareWith.length > 0 ? userToShareWith[0].email : email;
        const toName = userToShareWith.length > 0 ? userToShareWith[0].name : 'there';
        const baseUrl = process.env.VERCEL_ENV === 'production'
          ? 'https://midiator.vercel.app'
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173';
        const campaignUrl = `${baseUrl}/campaigns/${campaignId}`;

        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || 'Midiator'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
          to: toEmail,
          subject: `A campaign has been shared with you: ${campaignName}`,
          html: `<p>Hello ${toName},</p>
                 <p>${req.user.name} (${req.user.email}) has shared the campaign "<strong>${campaignName}</strong>" with you.</p>
                 <p>Click the button below to access it directly:</p>
                 <a href="${campaignUrl}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px;">Access Campaign</a>
                 <p>If you don't have an account yet, you can sign up using this email address to see the shared campaign after logging in.</p>
                 <p>Thank you,<br/>The Midiator Team</p>`,
        });

      } catch (emailError) {
        console.error(`[POST /api/campaigns/${campaignId}/share] Failed to send email for user ${userId}:`, emailError);
      }

      return res.status(201).json(sharedUserResponse);
    } catch (error) {
      console.error(`[POST /api/campaigns/${campaignId}/share] Error for user ${userId}:`, error);
      // Handle potential unique constraint violation gracefully
      if (error.code === '23505') { // unique_violation
        return res.status(409).json({ error: 'This campaign has already been shared with the specified user or email.' });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // DELETE: Revoke a share by user_id (for accepted) or email (for pending)
  if (req.method === 'DELETE') {
    try {
        const { id, email } = await parseBody(req);
      if (!id && !email) {
        return res.status(400).json({ error: 'User ID or Email to revoke is required.' });
      }

      let queryText, queryParams;
      if (id) {
          queryText = 'DELETE FROM campaign_shares WHERE campaign_id = $1 AND shared_with_user_id = $2';
          queryParams = [campaignId, id];
      } else {
          queryText = 'DELETE FROM campaign_shares WHERE campaign_id = $1 AND shared_with_email = $2';
          queryParams = [campaignId, email];
      }

      const { rowCount } = await query(queryText, queryParams);

      if (rowCount === 0) {
        return res.status(404).json({ error: 'Share not found or already revoked.' });
      }

      return res.status(204).end();
    } catch (error) {
      console.error(`[DELETE /api/campaigns/${campaignId}/share] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
