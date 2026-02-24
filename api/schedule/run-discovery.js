import { withAdminAuth } from '../middleware/auth.js';
import { handleRunDiscovery } from '../cron/discovery.js';

// Handler principal do executor de descoberta
const discoveryRunnerHandler = async (request, response) => {
  console.log('[Run] Iniciando execução manual do job de descoberta...');
  try {
    return await handleRunDiscovery(request, response);
  } catch (error) {
    console.error('[Run] Erro ao executar o job de descoberta:', error);
    return response.status(500).json({ error: 'Falha ao executar o job de descoberta.', details: error.message });
  }
};

// Endpoint principal, mantendo autenticação de administrador
const mainHandler = async (request, response) => {
  if (request.method === 'POST') {
    return withAdminAuth(discoveryRunnerHandler)(request, response);
  }

  response.setHeader('Allow', ['POST']);
  return response.status(405).end('Method Not Allowed');
};

export default mainHandler;
