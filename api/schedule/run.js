import { withAdminAuth } from '../middleware/auth.js';
import { handleRunScheduler } from '../cron/linkedin.js';

// Handler principal do scheduler
const schedulerRunnerHandler = async (request, response) => {
  console.log('[Run] Iniciando execução manual do cron LinkedIn...');
  try {
    await handleRunScheduler();
    return response.status(200).json({ message: 'Execução do cron concluída com sucesso.' });
  } catch (error) {
    console.error('[Run] Erro ao executar o cron LinkedIn:', error);
    return response.status(500).json({ error: 'Falha ao executar o cron.', details: error.message });
  }
};

// Endpoint principal, mantendo autenticação de administrador
const mainHandler = async (request, response) => {
  if (request.method === 'POST') {
    return withAdminAuth(schedulerRunnerHandler)(request, response);
  }

  response.setHeader('Allow', ['POST']);
  return response.status(405).end('Method Not Allowed');
};

export default mainHandler;
