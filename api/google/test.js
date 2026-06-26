
import { GoogleAuth } from 'google-auth-library';
import { withAuth } from '../middleware/auth.js';

import { parseBody } from '../utils.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { serviceAccount, projectId } = await parseBody(req);

    if (!serviceAccount || !projectId) {
      return res.status(400).json({ error: 'Conta de Serviço e ID do Projeto são obrigatórios.' });
    }

    // Attempt to authenticate using the provided service account
    const auth = new GoogleAuth({
      credentials: JSON.parse(serviceAccount),
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    // This will throw an error if the credentials are bad
    await auth.getClient();
    await auth.getAccessToken();

    return res.status(200).json({ success: true, message: 'Autenticação com a Conta de Serviço bem-sucedida!' });

  } catch (error) {
    console.error('Erro no teste de conexão da Conta de Serviço:', error.message);
    return res.status(400).json({ success: false, error: `Falha na autenticação: ${error.message}` });
  }
}

export default withAuth(handler);
