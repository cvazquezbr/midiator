import { parseBody } from '../utils.js';

export default async function handler(req, res) {
  const body = await parseBody(req);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  const { wordpressUrl, username, password } = body;

  if (!wordpressUrl || !username || !password) {
    return res.status(400).json({ message: 'Missing required fields: wordpressUrl, username, password' });
  }

  let fullUrl = wordpressUrl.startsWith('http') ? wordpressUrl : `https://${wordpressUrl}`;
  fullUrl = fullUrl.replace(/\/$/, '');

  const testUrl = `${fullUrl}/wp-json/wp/v2/users/me?context=edit`;
  const credentials = btoa(`${username}:${password}`);

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'PostGenius-Connection-Test/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.status(200).json({ success: true, message: `Conexão bem-sucedida. Conectado como ${data.name}.`, name: data.name });
    } else {
      const errorBody = await response.text();
      console.error(`WordPress API Error (${response.status}): ${errorBody}`);
      if (response.status === 401) {
        res.status(401).json({ success: false, message: 'Credenciais inválidas ou URL incorreta.' });
      } else {
         res.status(response.status).json({ success: false, message: `Erro ao conectar com o WordPress: ${response.statusText}` });
      }
    }
  } catch (error) {
    console.error('Erro de rede ao testar a conexão com o WordPress:', error);
    res.status(500).json({ success: false, message: 'Erro de rede ou DNS. Verifique a URL do WordPress e a conectividade do servidor.' });
  }
}
