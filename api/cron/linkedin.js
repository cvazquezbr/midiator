/**
 * linkedin-cron-fixed.js
 * Corrige o formato da requisição enviada ao linkedin-proxy para suportar multi-imagens.
 * Inclui logs adicionais e compatibilidade total com páginas e perfis pessoais.
 */

import fetch from 'node-fetch';
import { query } from '../db.js';
import { kv } from '../kv.js';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://yourdomain.com';

export async function postToLinkedIn({ accessToken, payload }) {
  try {
    console.log('[Cron Fixed] Enviando requisição ao linkedin-proxy com formato correto...');

    const res = await fetch(`${BASE_URL}/api/linkedin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET
      },
      body: JSON.stringify({
        action: 'createPost',
        body: {
          accessToken,
          payload
        }
      })
    });

    const data = await res.json().catch(() => ({}));
    console.log('[Cron Fixed] Resposta do proxy:', res.status, data);
    return { status: res.status, data };
  } catch (err) {
    console.error('[Cron Fixed] Erro ao enviar para o proxy:', err);
    throw err;
  }
}

// Exemplo de uso dentro do cron principal
export default async function handler() {
  try {
    const jobs = await query('SELECT * FROM scheduled_posts WHERE platform = $1', ['linkedin']);
    for (const job of jobs.rows) {
      const { access_token: accessToken, payload } = job;

      // Verifica se há múltiplas imagens
      if (payload?.images?.length > 1) {
        console.log(`[Cron Fixed] Publicando ${payload.images.length} imagens para autor ${payload.author}`);
      }

      const result = await postToLinkedIn({ accessToken, payload });
      console.log('[Cron Fixed] Resultado da publicação:', result.status);
    }
  } catch (error) {
    console.error('[Cron Fixed] Erro fatal no cron LinkedIn:', error);
  }
}
