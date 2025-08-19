import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { query } from '../db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// O redirect_uri deve corresponder ao que está configurado no Google Cloud Console.
// Para o fluxo de código de autorização iniciado pelo cliente, 'postmessage' é um valor seguro e padrão.
const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, 'postmessage');

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

const issueJwtAndSetCookie = (res, user) => {
  const tokenPayload = {
    sub: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  const cookie = serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Logged in successfully.', user: tokenPayload });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!GOOGLE_CLIENT_ID || !JWT_SECRET || !GOOGLE_CLIENT_SECRET) {
    console.error('Server configuration error: Google credentials or JWT Secret is missing.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const { code } = await parseBody(req);
    if (!code) {
      return res.status(400).json({ error: 'Google authorization code not provided.' });
    }

    // 1. Trocar o código de autorização por tokens
    const { tokens } = await client.getToken(code);
    const { access_token, refresh_token, id_token } = tokens;

    if (!id_token) {
        return res.status(400).json({ error: 'ID token not received from Google.' });
    }

    // 2. Verificar o ID token para obter informações do usuário de forma segura
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload.' });
    }

    const { sub: googleId, email, name } = payload;

    // 3. Procurar usuário pelo google_id
    let { rows } = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user = rows[0];

    if (user) {
      // Usuário existente, atualiza os tokens
      const updateQuery = refresh_token
        ? 'UPDATE users SET google_access_token = $1, google_refresh_token = $2 WHERE id = $3 RETURNING *'
        : 'UPDATE users SET google_access_token = $1 WHERE id = $2 RETURNING *';
      const params = refresh_token ? [access_token, refresh_token, user.id] : [access_token, user.id];
      const { rows: updatedRows } = await query(updateQuery, params);
      user = updatedRows[0];
      return issueJwtAndSetCookie(res, user);
    }

    // 4. Se não encontrado, procurar por e-mail para vincular a conta
    ({ rows } = await query('SELECT * FROM users WHERE email = $1', [email]));
    user = rows[0];

    if (user) {
      // Usuário com este e-mail existe, vincular a conta e salvar os tokens
      const updateQuery = refresh_token
        ? 'UPDATE users SET google_id = $1, google_access_token = $2, google_refresh_token = $3 WHERE id = $4 RETURNING *'
        : 'UPDATE users SET google_id = $1, google_access_token = $2 WHERE id = $3 RETURNING *';
      const params = refresh_token ? [googleId, access_token, refresh_token, user.id] : [googleId, access_token, user.id];
      const { rows: updatedRows } = await query(updateQuery, params);
      user = updatedRows[0];
      return issueJwtAndSetCookie(res, user);
    }

    // 5. Se não houver usuário, criar um novo com os tokens
    const { rows: newRows } = await query(
      'INSERT INTO users (name, email, google_id, google_access_token, google_refresh_token) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, googleId, access_token, refresh_token]
    );
    user = newRows[0];
    return issueJwtAndSetCookie(res, user);

  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(401).json({ error: 'Google authentication failed. The token might be invalid or expired.' });
  }
}
