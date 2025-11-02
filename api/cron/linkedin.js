// api/cron/linkedin.js
import { query } from '../db.js';
import fetch from 'node-fetch';

const delay = ms => new Promise(r => setTimeout(r, ms));

export async function handleRunScheduler() {
  console.log('[Cron Fixed] Iniciando execução do scheduler LinkedIn...');

  try {
    // Buscar posts pendentes
    const { rows: pendingPosts } = await query(
      `SELECT * FROM public.scheduled_posts 
       WHERE status = 'pending' 
       ORDER BY scheduled_for ASC 
       LIMIT 20`
    );

    if (pendingPosts.length === 0) {
      console.log('[Cron Fixed] Nenhum post pendente.');
      return { success: true, message: 'Nenhum post pendente.' };
    }

    console.log(`[Cron Fixed] ${pendingPosts.length} posts pendentes encontrados.`);

    for (const post of pendingPosts) {
      const {
        id,
        linkedin_access_token: accessToken,
        content,
        images,
        video,
        title,
        target_id: targetId,
        target_type: targetType,
        author
      } = post;

      try {
        console.log(`[Cron Fixed] Preparando post ${id}...`);

        let authorUrn;
        if (author) {
          authorUrn = author;
        } else if (targetId && targetType) {
          authorUrn = `urn:li:${targetType === 'organization' ? 'organization' : 'person'}:${targetId}`;
        }

        const payload = {
          author: authorUrn,
          commentary: content || '',
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false
        };

        // Montagem de conteúdo (multi-image e vídeo)
        if (video) {
          payload.content = {
            media: { id: video, title: title || 'Video Post' }
          };
        } else if (images && images.length > 0) {
          const normalizedUrns = images
            .map(img => (typeof img === 'string' ? img : img.id))
            .filter(Boolean);
          if (normalizedUrns.length === 1) {
            payload.content = { media: { id: normalizedUrns[0] } };
          } else {
            payload.content = {
              multiImage: { images: normalizedUrns.map(urn => ({ id: urn })) }
            };
          }
        }

        console.log('[Cron Patch] Enviando payload para proxy (flat):', JSON.stringify({ accessToken, payload }, null, 2));

        const res = await fetch(`${process.env.API_BASE_URL}/api/linkedin-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createPost',
            accessToken,
            payload
          })
        });

        const text = await res.text();
        console.log(`[Cron Fixed] Resposta do proxy para post ${id}:`, text);

        if (res.ok) {
          await query('UPDATE public.scheduled_posts SET status = $1, posted_at = NOW() WHERE id = $2', ['sent', id]);
          console.log(`[Cron Fixed] Post ${id} publicado com sucesso.`);
        } else {
          await query('UPDATE public.scheduled_posts SET status = $1, error_message = $2 WHERE id = $3', ['failed', text, id]);
          console.error(`[Cron Fixed] Falha ao publicar post ${id}:`, text);
        }

        await delay(2000); // 2 segundos entre cada post
      } catch (err) {
        console.error(`[Cron Fixed] Erro fatal ao processar post ${post.id}:`, err);
        await query(
          'UPDATE public.scheduled_posts SET status = $1, error_message = $2 WHERE id = $3',
          ['failed', err.message || 'Erro desconhecido', post.id]
        );
      }
    }

    console.log('[Cron Fixed] Execução do scheduler concluída.');
    return { success: true };
  } catch (err) {
    console.error('[Cron Fixed] Erro fatal no cron LinkedIn:', err);
    return { success: false, error: err.message };
  }
}

export default handleRunScheduler;
