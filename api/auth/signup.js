import { query } from '../db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Vercel's Edge runtime doesn't support the `body` property directly.
  // We need to parse the JSON from the request stream.
  // Also, for some reason, the request object is not standard.
  // Aparently, Vercel serializes the request and we need to deserialize it.
  const body = await (async (req) => {
    let body = '';
    for await (const chunk of req) {
      body += new TextDecoder().decode(chunk);
    }
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  })(req);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { name, email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check if user already exists
    const { rows: existingUsers } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const { rows: newUsers } = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, uuid, name, email, role',
      [name, email, passwordHash]
    );

    const newUser = newUsers[0];

    // After successful user creation, claim any pending campaign shares
    try {
      const { rowCount } = await query(
        `UPDATE campaign_shares
         SET shared_with_user_id = $1, shared_with_email = NULL
         WHERE shared_with_email = $2`,
        [newUser.id, newUser.email]
      );
      if (rowCount > 0) {
        console.log(`User ${newUser.email} (ID: ${newUser.id}) claimed ${rowCount} pending campaign shares.`);
      }
    } catch (claimError) {
      // Log the error but don't fail the signup process
      console.error(`Error claiming campaign shares for ${newUser.email}:`, claimError);
    }

    res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: newUser.id,
        uuid: newUser.uuid,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
