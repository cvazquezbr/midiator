import { query } from '../db.js';
import { kv } from '../kv.js';
import fetch from 'node-fetch';

// Debug helper (mantido)
const DEBUG = !!process.env.DEBUG;
function dlog(...args) {
  if (DEBUG) console.log(...args);
}

/**
 * Garante que commentary seja texto e que multi-image seja montado corretamente
 */
function escapeLinkedinText(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') {
    try {
      text = String(text);
    } catch (e) {
      return '';
    }
  }
  return text.replace(/([|{}@[\]()<>#*_~\\])/g, '\\$1');
}

/**
 * Delay simples (ms)
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Função principal executada pelo scheduler (cron)
 */
export async function handleRunScheduler() {
  console.log('[Cron Fixed] Iniciando execução do LinkedIn Scheduler...');

  try {
    const { rows } = await query(`
      SELECT id, user_id, access_token, payload, scheduled_for
      FROM scheduled_posts
      WHERE scheduled_for <= NOW() AND status = 'pending'
    `);

    if (rows.length === 0) {
      console.log('[Cron Fixed] Nenhum post agendado encontrado.');
      return;
    }

    for (const row of rows) {
      const { id, user_id, access_token, payload } = row;
      console.log(`[Cron Fixed] Processando post ID ${id} (user: ${user_id})`);

      let parsedPayload;
      try {
        parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch (err) {
        console.error('[Cron Fixed] Erro ao parsear payload JSON:', err);
        await query('UPDATE scheduled_posts SET status = $1 WHERE id = $2', ['failed', id]);
        continue;
      }

      // --- PATCH: normalização do payload ---
      try {
        const _payloadForProxy = { ...parsedPayload };

        if (!_payloadForProxy.commentary && typeof _payloadForProxy.content === 'string') {
          _payloadForProxy.commentary = String(_payloadForProxy.content);
        }

        if (_payloadForProxy.commentary && typeof _payloadForProxy.commentary !== 'string') {
          _payloadForProxy.commentary = String(_payloadForProxy.commentary);
        }

        const _normalizedImages = Array.isArray(_payloadForProxy.images)
          ? _payloadForProxy.images
              .map((i) => (typeof i === 'string' ? i : i.id))
              .filter(Boolean)
          : [];

        if (_normalizedImages.length > 1) {
          _payloadForProxy.content = {
            multiImage: {
              images: _normalizedImages.map((u) => ({ id: u, altText: ' ' })),
            },
            contentFormat: 'MULTI_IMAGE',
          };
          _payloadForProxy.images = _normalizedImages;
        }

        parsedPayload = _payloadForProxy;
      } catch (e) {
        console.warn('[Cron Patch] Erro ao normalizar payload:', e);
      }
      // --- FIM PATCH ---

      try {
        // Log explícito e sempre visível
        console.log(
          '[Cron Patch] Enviando payload para proxy (flat):',
          JSON.stringify({ accessToken: access_token, payload: parsedPayload }, null, 2)
        );

        const proxyApiBaseUrl = process.env.INTERNAL_API_BASE_URL || process.env.API_BASE_URL || '';

        const response = await fetch(`${proxyApiBaseUrl}/api/linkedin-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createPost',
            accessToken: access_token,
            payload: parsedPayload,
          }),
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }

        if (response.ok) {
          console.log(`[Cron Fixed] Post ID ${id} publicado com sucesso.`);
          await query('UPDATE scheduled_posts SET status = $1 WHERE id = $2', ['sent', id]);
        } else {
          console.error(`[Cron Fixed] Erro do LinkedIn API (${response.status}):`, data);
          await query('UPDATE scheduled_posts SET status = $1 WHERE id = $2', ['failed', id]);
        }
      } catch (error) {
        console.error('[Cron Fixed] Erro fatal durante envio ao proxy:', error);
        await query('UPDATE scheduled_posts SET status = $1 WHERE id = $2', ['failed', id]);
      }

      await delay(2000); // pausa entre posts
    }
  } catch (error) {
    console.error('[Cron Fixed] Erro fatal no cron LinkedIn:', error);
  }

  console.log('[Cron Fixed] Execução do scheduler concluída.');
}

/**
 * Export default para compatibilidade
 */
export default handleRunScheduler;
