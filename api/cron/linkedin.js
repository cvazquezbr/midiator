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

    // Build the final text for the post. Use fullText when available.
    let postText = postContent.fullText;

    if (!postText) {
        console.warn(`[LinkedIn Cron] Post ${post.id} using legacy content assembly.`);
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
            postText += `\n\nPost original: ${parentRows[0].linkedin_post_url}`;
        }
    }

    // Normalize images array (can be urls to blob storage)
    const images = Array.isArray(post.post_content?.images) ? post.post_content.images : [];
    const imageUrns = [];

    if (images.length > 0) {
        for (const [index, imageUrl] of images.entries()) {
            try {
                console.log(`[LinkedIn Cron] Processing image ${index + 1}/${images.length}: ${imageUrl}`);

                const uniqueImageUrl = `${imageUrl}?t=${Date.now()}`;
                const imageResponse = await fetch(uniqueImageUrl);
                if (!imageResponse.ok) throw new Error(`Failed to fetch image from blob store: ${uniqueImageUrl}`);

                const imageBuffer = await imageResponse.arrayBuffer();
                const imageBase64 = Buffer.from(imageBuffer).toString('base64');
                const imageType = imageResponse.headers.get('content-type') || 'image/jpeg';

                console.log(`[LinkedIn Cron] Fetched image, base64 size: ${imageBase64.length}. Uploading to proxy...`);

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

                if (uploadCheckResponse.status === 401) {
                    console.warn('[LinkedIn Cron] Received 401 from proxy during image upload; forwarding to caller for token refresh.');
                    return uploadCheckResponse;
                }

                if (!uploadCheckResponse.ok) {
                    const errorData = await uploadCheckResponse.json().catch(() => null);
                    throw new Error(`Failed during uploadAndCheckImage for ${imageUrl}: ${errorData?.message || 'Unknown error'}`);
                }

                const uploadJson = await uploadCheckResponse.json().catch(() => null);
                const assetUrn = uploadJson?.assetUrn || uploadJson?.asset || uploadJson?.value?.asset;
                if (!assetUrn) {
                    throw new Error(`Proxy did not return an assetUrn for ${imageUrl}. Response: ${JSON.stringify(uploadJson)}`);
                }

                console.log(`[LinkedIn Cron] Successfully received asset URN: ${assetUrn}`);
                imageUrns.push(assetUrn);

            } catch (err) {
                console.error(`[LinkedIn Cron] Error uploading image ${imageUrl}:`, err.message || err);
                throw err;
            }
        }
    }

    const videoUrn = post.post_content?.video;
    // Build the payload. Use 'commentary' for text (so proxy can escape it), and 'content' only for media.
    const payload = {
        author: authorUrn,
        commentary: postText,
        images: [], // will be filled with URNs (kept for backwards compatibility)
        video: videoUrn,
        title: post.post_content?.titulo || 'Video Post'
    };

    // --- Validation & dedupe ---
    console.log('[LinkedIn Cron] Final image URNs collected (raw):', imageUrns);
    const distinctUrns = Array.from(new Set(imageUrns));
    if (distinctUrns.length !== images.length) {
        console.warn('[LinkedIn Cron] distinct URNs length differs from original images length', { imagesLength: images.length, distinctUrnsLength: distinctUrns.length });
    }
    // Defensive pause to give LinkedIn time to register assets in some tenants
    if (distinctUrns.length > 0) await delay(1200);

    // Keep an images array for backward compatibility, but build proper content for multi-image posts
    payload.images = distinctUrns.slice(0, images.length);

    try {
        if (distinctUrns.length > 1) {
            payload.content = {
                multiImage: {
                    images: distinctUrns.slice(0, images.length).map(u => ({ id: u, altText: ' ' }))
                },
                contentFormat: 'MULTI_IMAGE'
            };
            console.log('[LinkedIn Cron] Built content.multiImage with altText and contentFormat:', payload.content);
        } else if (distinctUrns.length === 1) {
            payload.content = { media: { id: distinctUrns[0] } };
            console.log('[LinkedIn Cron] Built single image content.media:', payload.content);
        } else if (videoUrn) {
            payload.content = { media: { id: videoUrn, title: payload.title } };
            console.log('[LinkedIn Cron] Built video content.media:', payload.content);
        } else {
            // No media: leave payload.content undefined (text-only post)
            console.log('[LinkedIn Cron] No media detected — text-only post.');
        }
    } catch (e) {
        console.error('[LinkedIn Cron] Error building payload.content:', e);
    }

    // Final debug log showing exact payload that will be sent to proxy
    console.log('[LinkedIn Cron] Final payload to proxy:', JSON.stringify(payload, null, 2));

    // Send to proxy to create the post
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
                        const errorData = await refreshResponse.json().catch(() => null);
                        throw new Error(`Failed to refresh token: ${errorData?.message || `Status ${refreshResponse.status}`}`);
                    }
                }

                if (!proxyResponse.ok) {
                    const errorData = await proxyResponse.json().catch(() => null);
                    console.error('[Scheduler] Full error data from proxy:', errorData);
                    throw new Error(`LinkedIn API Error after potential refresh: ${JSON.stringify(errorData)}`);
                }

                const result = await proxyResponse.json().catch(() => null);
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
    console.warn('Unauthorized cron request. Mismatched or missing secret.');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  return handleRunScheduler(request, response);
}
