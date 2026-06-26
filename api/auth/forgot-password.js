import { query } from '../db.js';
import { randomBytes, createHash } from 'crypto';
import nodemailer from 'nodemailer';
import { parseBody } from '../utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email } = await parseBody(req);
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // 1. Find the user by email
    const { rows: users } = await query('SELECT id, name, password_hash, google_id FROM users WHERE email = $1', [email]);
    if (users.length === 0) {
      // To prevent user enumeration, we send a success response even if the user doesn't exist.
      // The user will just not receive an email.
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    const user = users[0];

    // Check if the user is Google-only and has no password.
    // We allow them to create a password via this flow.
    if (user.google_id && !user.password_hash) {
      console.log(`Password reset initiated for Google-only user: ${email}. They will now create a password.`);
    }

    // 2. Generate a secure, random token
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(resetToken).digest('hex');

    // 3. Set an expiry date (e.g., 1 hour from now)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // 4. Store the hashed token and expiry date in the database
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [hashedToken, expires, user.id]
    );

    // 5. Send the password reset email
    // The link should point to the frontend page for resetting the password
    const baseUrl = process.env.VERCEL_ENV === 'production'
      ? 'https://midiator.vercel.app'
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const toName = user.name || 'there';

    try {
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
        to: email,
        subject: 'Reset Your Midiator Password',
        html: `<p>Hello ${toName},</p>
               <p>You requested a password reset. Please click the link below to set a new password. This link is valid for one hour.</p>
               <a href="${resetUrl}">Reset Password</a>
               <p>If you did not request this, please ignore this email.</p>
               <p>Thank you,<br/>The Midiator Team</p>`,
      });
    } catch (emailError) {
      console.error(`Failed to send password reset email to ${email}:`, emailError);
      return res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
    }

    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
