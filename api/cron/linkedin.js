import { query } from '../db.js';
import { markdownToLinkedinText } from '../utils.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to publish a single post to LinkedIn.
// It returns the final response from the proxy.
export async function publishPost(fetch, post, accessToken) {
    const postContent = post.post_content;
    const authorUrn = postContent.authorUrn;
    const proxyApiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5173';

    // Define common headers for internal API calls to the proxy
    const internalApiHeaders = {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET,
    };

    // O texto final já vem formatado do frontend, garantindo consistência.
    let postText = postContent.fullText;

    if (!postText) {
        // Fallback para o caso de agendamentos antigos que não têm o fullText.
        console.warn(`Post ${post.id} is using legacy content assembly. Consider re-scheduling.`);
        postText = [
            postContent.titulo,
            postContent.conteudo,
            '----',
            postContent.cta,
            '----',
            (postContent.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
        ].filter(Boolean).join('\n\n').trim();
    }

    if (post.parent_id) {
        const { rows: parentRows } = await query(
            'SELECT linkedin_post_url FROM linkedin_schedules WHERE id = $1',
            [post.parent_id]
        );
        if (parentRows.length > 0 && parentRows[0].linkedin_post_url) {
            // Adiciona o link do post original ao final do texto.
            postText += `\n\nPost original: ${parentRows[0].linkedin_post_url}`;
        }
    }

    const images = post.post_content?.images || [];
    const imageUrns = [];

    if (images.length > 0) {
        for (const [index, imageUrl] of images.entries()) {
            console.log(`[Cron Job] Processing image ${index + 1}/${images.length}: ${imageUrl}`);

            const uniqueImageUrl = `${imageUrl}?t=${Date.now()}`;
            const imageResponse = await fetch(uniqueImageUrl);
            if (!imageResponse.ok) throw new Error(`Failed to fetch image from blob store: ${uniqueImageUrl}`);

            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            const imageType = imageResponse.headers.get('content-type');

            console.log(`[Cron Job] Fetched image with Base64 size: ${imageBase64.length}. Uploading to LinkedIn...`);

            const uploadCheckResponse = await fetch(`${proxyApiBaseUrl}/api/linkedin-proxy`, {
                method: 'POST',
                headers: internalApiHeaders,
                body: JSON.stringify({
                    action: 'uploadAndCheckImage',
                    accessToken,
                    authorUrn,
                    imageBase64,
                    imageType
                })
            });

            // If we get a 401, return the response immediately. The main scheduler loop
            // will catch this and attempt to refresh the token.
            if (uploadCheckResponse.status === 401) return uploadCheckResponse;

            if (!uploadCheckResponse.ok) {
                const errorData = await uploadCheckResponse.json();
                throw new Error(`Failed during uploadAndCheckImage for ${imageUrl}: ${errorData.message || 'Unknown error'}`);
            }

            const { assetUrn } = await uploadCheckResponse.json();
            if (!assetUrn) {
                throw new Error(`Proxy did not return an assetUrn for ${imageUrl}.`);
            }

            console.log(`[Cron Job] Successfully received asset URN: ${assetUrn}`);
            imageUrns.push(assetUrn);
        }
    }

    const videoUrn = post.post_content?.video;
    const payload = {
        author: authorUrn,
        content: postText,
        images: imageUrns,
        video: videoUrn,
        title: post.post_content?.titulo || 'Video Post'
    };


            // --- PATCHED: extra validation & logging to debug duplicate-image issue ---
            console.log('[Cron Patch] Final image URNs collected:', imageUrns);
            // Ensure number of URNs matches number of images requested
            const distinctUrns = Array.from(new Set(imageUrns));
            if (distinctUrns.length !== images.length) {
                console.warn('[Cron Patch] number of distinct URNs does not match images.length', { imagesLength: images.length, distinctUrnsLength: distinctUrns.length });
            }
            // Defensive small pause to ensure LinkedIn has finalized processing (extra safety)
            await delay(1200);
            // Reassign payload images explicitly to avoid accidental mutation
            payload.images = distinctUrns.slice(0, images.length);
            console.log('[Cron Patch] Posting payload images (final):', payload.images);
            // --- end patch ---

// --- PATCH APPLIED: ensure multiImage uses altText and contentFormat ---
try {
  console.log('[Cron Fix] Preparing final payload images:', imageUrns);
  if (Array.isArray(imageUrns) && imageUrns.length > 1) {
    const distinctUrns = Array.from(new Set(imageUrns));
    // Build multiImage with altText and contentFormat
    payload.content = {
      multiImage: {
        images: distinctUrns.map(u => ({ id: u, altText: ' ' }))
      },
      contentFormat: 'MULTI_IMAGE'
    };
    console.log('[Cron Fix] Forced multiImage with altText and contentFormat. Images:', payload.content.multiImage.images);
  } else if (Array.isArray(imageUrns) && imageUrns.length === 1) {
    payload.content = { media: { id: imageUrns[0] } };
    console.log('[Cron Fix] Single image payload assigned:', payload.content);
  }
} catch (e) {
  console.error('[Cron Fix] Error building multiImage payload:', e);
}
// --- END PATCH ---
return fetch(`${proxyApiBaseUrl}/api/linkedin-proxy`, {
        method: 'POST',
        headers: internalApiHeaders,
        body: JSON.stringify({ action: 'createPost', accessToken, payload }),
    });
}


// The main scheduler logic
export async function handleRunScheduler(request, response) {
    const fetch = (await import('node-fetch')).default;
    console.log('Scheduler run initiated...');
    let publishedCount = 0;
    let failedCount = 0;

    try {
        const now = new Date();
        const { rows: duePosts } = await query(
            `SELECT ls.*, c.campaign_data, u.linkedin_access_token
             FROM linkedin_schedules ls
             JOIN users u ON ls.user_id = u.id
             LEFT JOIN campaigns c ON ls.campaign_id = c.id
             WHERE ls.scheduled_at <= ($1 AT TIME ZONE 'UTC')
               AND ls.status = 'scheduled'
               AND u.linkedin_access_token IS NOT NULL
             ORDER BY ls.parent_id ASC NULLS FIRST, ls.scheduled_at ASC`,
            [now.toISOString()]
        );

        if (duePosts.length === 0) {
            console.log('No due posts to publish.');
            return response.status(200).json({ message: 'No due posts to publish.' });
        }

        console.log(`Found ${duePosts.length} posts to process.`);

        for (const post of duePosts) {
            try {
                let accessToken = post.linkedin_access_token;

                // First attempt to publish
                let proxyResponse = await publishPost(fetch, post, accessToken);

                // If the token is expired (401), try to refresh it
                if (proxyResponse.status === 401) {
                    console.log(`Access token for user ${post.user_id} may have expired. Attempting to refresh.`);

                    const refreshResponse = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal-secret': process.env.INTERNAL_API_SECRET,
                        },
                        body: JSON.stringify({ action: 'refreshTokenInternal', userId: post.user_id }),
                    });

                    if (refreshResponse.ok) {
                        const { accessToken: newAccessToken } = await refreshResponse.json();
                        accessToken = newAccessToken; // Update token
                        console.log(`Token refreshed successfully for user ${post.user_id}. Waiting 2s before retry...`);

                        await delay(2000);

                        // Second attempt to publish with the new token
                        proxyResponse = await publishPost(fetch, post, accessToken);
                    } else {
                        // If refresh fails, we can't proceed with this post.
                        const errorData = await refreshResponse.json();
                        throw new Error(`Failed to refresh token: ${errorData.message || `Status ${refreshResponse.status}`}`);
                    }
                }

                // Check the result of the final publish attempt
                if (!proxyResponse.ok) {
                    const errorData = await proxyResponse.json();
                    console.error('[Scheduler] Full error data from proxy:', errorData);
                    throw new Error(`LinkedIn API Error after potential refresh: ${JSON.stringify(errorData)}`);
                }

                const result = await proxyResponse.json();
                const linkedinPostUrl = `https://www.linkedin.com/feed/update/${result.id}/`;

                await query(
                    `UPDATE linkedin_schedules
                     SET status = 'published', linkedin_post_id = $1, linkedin_post_url = $2, updated_at = NOW()
                     WHERE id = $3`,
                    [result.id, linkedinPostUrl, post.id]
                );
                publishedCount++;
                console.log(`Successfully published post ${post.id} for user ${post.user_id}.`);

            } catch (error) {
                console.error(`Failed to process post ${post.id} for user ${post.user_id}. Error: ${error.message}`);
                await query(
                    `UPDATE linkedin_schedules
                     SET status = 'failed', error_message = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [error.message, post.id]
                );
                failedCount++;
            }
        }

        const summary = `Scheduler run finished. Published: ${publishedCount}, Failed: ${failedCount}.`;
        console.log(summary);
        return response.status(200).json({ message: summary });

    } catch (error) {
        console.error('Critical error in scheduler run:', error);
        return response.status(500).json({ error: 'Internal Server Error during scheduler run' });
    }
}


export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Log the received header for debugging, but be careful not to log secrets in production
    console.warn('Unauthorized cron request. Mismatched or missing secret.');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  return handleRunScheduler(request, response);
}
