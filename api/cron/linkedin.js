// api/cron/linkedin.js
import { query } from '../db.js';
import fetch from 'node-fetch';
import { processDiscoverySession } from '../engagement/ai-worker.js';
import { escapeLinkedinText, markdownToLinkedinText } from '../utils.js';
import { sendPublicationNotification } from '../email-utils.js';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const PROXY_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:5173';

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url, opts = {}, retries = 4, backoff = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
}

// Download a remote URL and return { base64, mimeType, size }
async function downloadToBase64(url) {
  const res = await fetchWithRetry(url, { method: 'GET' }, 3, 500);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const buffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  // Convert to base64
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunk));
  }
  const base64 = Buffer.from(binary, 'binary').toString('base64');
  return { base64, mimeType: contentType, size: uint8.length };
}

// Upload image via proxy (uploadAndCheckImage). Returns assetUrn.
async function uploadImageViaProxy(accessToken, authorUrn, imageBase64, imageType) {
  console.log('[Cron LinkedIn UploadImage] starting upload for author:', authorUrn);
  const body = {
    action: 'uploadAndCheckImage',
    accessToken,
    authorUrn,
    imageBase64,
    imageType
  };

  const res = await fetchWithRetry(`${PROXY_BASE}/api/linkedin-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET
    },
    body: JSON.stringify(body)
  }, 3, 1000);

  const text = await res.text().catch(() => '');
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(`[Cron LinkedIn UploadImage] proxy upload failed: ${res.status} ${text}`);
  }

  // proxy returns { assetUrn } or { assetUrn: 'urn:li:image:...' } in body
  if (data.assetUrn) return data.assetUrn;
  if (data.value && data.value.asset) return data.value.asset;
  // try common shapes
  if (data.value && data.value.assetUrn) return data.value.assetUrn;
  throw new Error('[Cron LinkedIn UploadImage] assetUrn not found in proxy response: ' + JSON.stringify(data));
}

// Initialize video upload via proxy, then upload binary and return video URN.
async function uploadVideoViaProxy(accessToken, authorUrn, videoBase64, videoType) {
  console.log('[Cron LinkedIn UploadVideo] initializing upload for author:', authorUrn);
  // Step 1: initialize upload via proxy
  const initBody = {
    action: 'initializeVideoUpload',
    accessToken,
    payload: {
      initializeUploadRequest: { owner: authorUrn }
    }
  };

  const initRes = await fetchWithRetry(`${PROXY_BASE}/api/linkedin-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET
    },
    body: JSON.stringify(initBody)
  }, 3, 1000);

  const initText = await initRes.text().catch(() => '');
  let initData;
  try { initData = initText ? JSON.parse(initText) : {}; } catch (e) { initData = { raw: initText }; }

  if (!initRes.ok) {
    throw new Error('[Cron LinkedIn UploadVideo] initialize failed: ' + initText);
  }

  // Extract uploadUrl
  let uploadUrl = null;
  if (Array.isArray(initData.uploadInstructions) && initData.uploadInstructions.length > 0) {
    uploadUrl = initData.uploadInstructions[0].uploadUrl;
  } else if (Array.isArray(initData.value?.uploadInstructions) && initData.value.uploadInstructions.length > 0) {
    uploadUrl = initData.value.uploadInstructions[0].uploadUrl;
  } else if (initData.value && initData.value.uploadMechanism &&
      initData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'] &&
      initData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl) {
    uploadUrl = initData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  } else if (initData.uploadUrl) {
    uploadUrl = initData.uploadUrl;
  } else if (initData.value && initData.value.uploadUrl) {
    uploadUrl = initData.value.uploadUrl;
  }

  if (!uploadUrl) {
    throw new Error('[Cron LinkedIn UploadVideo] uploadUrl not found in initialize response: ' + JSON.stringify(initData));
  }

  // Step 2: upload binary via proxy action uploadVideo (proxy will PUT to uploadUrl)
  console.log('[Cron LinkedIn UploadVideo] uploading binary to uploadUrl...');
  const uploadBody = {
    action: 'uploadVideo',
    // pass uploadUrl and binary + mime type
    uploadUrl,
    videoBase64,
    videoContentType: videoType
  };

  const uploadRes = await fetchWithRetry(`${PROXY_BASE}/api/linkedin-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET
    },
    body: JSON.stringify(uploadBody)
  }, 3, 2000);

  const uploadText = await uploadRes.text().catch(() => '');
  let uploadData;
  try { uploadData = uploadText ? JSON.parse(uploadText) : {}; } catch (e) { uploadData = { raw: uploadText }; }

  if (!uploadRes.ok) {
    throw new Error('[Cron LinkedIn UploadVideo] upload failed: ' + uploadText);
  }

  // After upload, the video URN may be in initData.video, initData.value.video, initData.value.asset, or returned separately.
  // Try to derive video URN:
  let videoUrn = null;
  if (initData.video) {
    videoUrn = initData.video;
  } else if (initData.value && initData.value.video) {
    videoUrn = initData.value.video;
  } else if (initData.value && initData.value.asset) {
    videoUrn = initData.value.asset;
  } else if (initData.asset) {
    videoUrn = initData.asset;
  } else if (initData.value && initData.value.assetUrn) {
    videoUrn = initData.value.assetUrn;
  }

  if (!videoUrn) {
    throw new Error('[Cron LinkedIn UploadVideo] could not determine video URN from responses');
  }

  // Step 3: Finalize video upload
  console.log('[Cron LinkedIn UploadVideo] finalizing upload for URN:', videoUrn);
  const finalizeBody = {
    action: 'finalizeVideoUpload',
    accessToken,
    payload: {
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: "",
        uploadedPartIds: [uploadData.eTag]
      }
    }
  };

  const finalizeRes = await fetchWithRetry(`${PROXY_BASE}/api/linkedin-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET
    },
    body: JSON.stringify(finalizeBody)
  }, 3, 2000);

  if (!finalizeRes.ok) {
    const finalizeText = await finalizeRes.text();
    throw new Error('[Cron LinkedIn UploadVideo] finalize failed: ' + finalizeText);
  }

  // Step 4: Wait for processing
  console.log('[Cron LinkedIn UploadVideo] waiting for video processing...');
  let videoStatus = '';
  let attempts = 0;
  const maxAttempts = 15;
  while (videoStatus !== 'AVAILABLE' && attempts < maxAttempts) {
    await delay(10000); // 10s delay between checks
    const statusBody = {
      action: 'checkVideoStatus',
      accessToken,
      videoUrn
    };
    const statusRes = await fetchWithRetry(`${PROXY_BASE}/api/linkedin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET
      },
      body: JSON.stringify(statusBody)
    }, 3, 1000);

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      videoStatus = statusData.status;
      console.log(`[Cron LinkedIn UploadVideo] Status attempt ${attempts + 1}: ${videoStatus}`);
    }
    attempts++;
  }

  if (videoStatus !== 'AVAILABLE') {
    console.warn(`[Cron LinkedIn UploadVideo] Video ${videoUrn} not AVAILABLE after ${maxAttempts} attempts. Status: ${videoStatus}`);
    // We proceed anyway, LinkedIn might finish processing later
  }

  return videoUrn;
}

// Build author URN from target_type/target_id or author field
function buildAuthorUrn(data) {
  if (data.author) return data.author; // author can be in the payload
  const targetId = data.targetId; // targetId is in the payload
  const targetType = data.targetType; // targetType is in the payload
  if (targetId && targetType) {
    return `urn:li:${targetType === 'organization' ? 'organization' : 'person'}:${targetId}`;
  }
  // fallback to user_id-based person urn if available from the db row
  if (data.user_id) return `urn:li:person:${data.user_id}`;
  return null;
}

export async function handleRunScheduler(response) {
  console.log('[Cron LinkedIn] Starting scheduler run...');

  try {
    // Query pending scheduled posts (schema public)
    const now = new Date();
    const { rows } = await query(
      `SELECT ls.*, c.campaign_data, c.name as campaign_name, u.linkedin_access_token
             FROM linkedin_schedules ls
             JOIN users u ON ls.user_id = u.id
             LEFT JOIN campaigns c ON ls.campaign_id = c.id
             WHERE ls.scheduled_at <= ($1 AT TIME ZONE 'UTC')
               AND ls.status = 'scheduled'
               AND u.linkedin_access_token IS NOT NULL
             ORDER BY ls.parent_id ASC NULLS FIRST, ls.scheduled_at ASC`,
      [now]
    );

    if (!rows || rows.length === 0) {
      console.log('[Cron LinkedIn] No pending posts.');
      return response.status(200).json({ message: 'No pending posts.' });
    }

    console.log(`[Cron LinkedIn] ${rows.length} pending posts found.`);

    const parentPostData = new Map();

    for (const row of rows) {
      const postId = row.id;
      console.log(`[Cron LinkedIn] Processing post ${postId}...`);

      // Unify data extraction from either post_content or campaign_data
      let postData = {};
      if (row.post_content) {
        postData = typeof row.post_content === 'string' ? JSON.parse(row.post_content) : row.post_content;
      } else if (row.campaign_data) {
        const campaignData = typeof row.campaign_data === 'string' ? JSON.parse(row.campaign_data) : row.campaign_data;
        // Adapt campaign_data structure to a common postData structure
        postData = {
          authorUrn: campaignData.authorUrn, // Assuming authorUrn is stored here
          content: {
            fullText: campaignData.conteudo, // Or relevant field
            // ... other fields if necessary
          },
          // ...
        };
      }

      const payload = postData; // Use the unified 'payload' variable name

      // Determine access token (use linkedin_access_token column or payload.accessToken)
      const accessToken = row.linkedin_access_token || payload.accessToken || null;
      if (!accessToken) {
        console.error(`[Cron LinkedIn] No access token for post ${postId}. Marking failed.`);
        await query('UPDATE linkedin_schedules SET status = $1, error_message = $2 WHERE id = $3', ['failed', 'missing access token', postId]);
        continue;
      }

      // Extract authorUrn from the JSON payload (post_content)
      const authorUrn = payload.authorUrn;
      if (!authorUrn) {
        console.error(`[Cron LinkedIn] Could not determine author URN from post_content for post ${postId}.`);
        await query('UPDATE linkedin_schedules SET status = $1, error_message = $2 WHERE id = $3', ['failed', 'missing authorUrn from payload', postId]);
        continue;
      }

      // Prepare commentary/text, handling main and follow-up posts differently
      // to selectively escape content and preserve hashtags.
      let commentary = '';

      if (row.parent_id) {
        let parentData = parentPostData.get(row.parent_id);

        // Fallback: If parent data is not in the map (e.g., processed in a previous run), query the DB.
        if (!parentData) {
          console.log(`[Cron LinkedIn] Parent data for ${row.parent_id} not in memory, querying DB.`);
          const { rows: parentRows } = await query(
            'SELECT linkedin_post_url, post_content FROM linkedin_schedules WHERE id = $1',
            [row.parent_id]
          );
          if (parentRows.length > 0) {
            const parentRow = parentRows[0];
            const parentPostContent = typeof parentRow.post_content === 'string'
              ? JSON.parse(parentRow.post_content)
              : parentRow.post_content;

            parentData = {
              url: parentRow.linkedin_post_url,
              cta: parentPostContent.cta || (parentPostContent.content && parentPostContent.content.cta) || '',
              hashtags: parentPostContent.hashtags || (parentPostContent.content && parentPostContent.content.hashtags) || [],
            };
          }
        }

        if (parentData) {
            // This is a follow-up post. Construct its content from parts.
            const mainContent = payload.conteudo || '';
            const cta = parentData.cta || '';
            const hashtags = (parentData.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
            const parentUrl = parentData.url;

            const finalMainContent = escapeLinkedinText(markdownToLinkedinText(mainContent));
            const finalCta = escapeLinkedinText(cta);

            commentary = [
                finalMainContent,
                '----',
                finalCta,
                '----',
                hashtags, // Hashtags should not be escaped
                `\nPost original: ${parentUrl}` // URL should not be escaped
            ].join('\n').trim();
        } else {
             console.error(`[Cron LinkedIn] Could not find parent post data for follow-up ${postId}. Skipping formatting.`);
             // Fallback to original content if parent is not found
             const commentaryRaw = (payload.content && payload.content.fullText) || payload.conteudo || payload.fullText || payload.content || payload.commentary || '';
             commentary = escapeLinkedinText(markdownToLinkedinText(commentaryRaw));
        }
      } else {
        // This is a main post. The payload's fullText contains everything.
        // To avoid escaping hashtags, we must split, escape, and rejoin.
        const fullTextRaw = (payload.content && payload.content.fullText) || payload.fullText || '';
        const parts = fullTextRaw.split('----');

        const contentPart = parts[0] ? escapeLinkedinText(markdownToLinkedinText(parts[0].trim())) : '';
        const ctaPart = parts[1] ? escapeLinkedinText(parts[1].trim()) : '';
        const hashtagsPart = parts[2] ? parts[2].trim() : ''; // Do not escape hashtags

        let commentaryParts = [];
        if (contentPart) commentaryParts.push(contentPart);
        if (ctaPart) commentaryParts.push(ctaPart);
        if (hashtagsPart) commentaryParts.push(hashtagsPart);

        commentary = commentaryParts.join('\n----\n');
      }

      // Collect uploaded asset URNs for this post
      const uploadedUrns = [];

      try {
        // If payload has images as URLs (blob store), upload them now
        const imagesToUpload = (payload.content && payload.content.images) || payload.images || [];
        if (imagesToUpload.length > 0) {
          console.log(`[Cron LinkedIn] Found ${imagesToUpload.length} image(s) for post ${postId}. Uploading to LinkedIn...`);

          for (const imgRef of imagesToUpload) {
            // imgRef may be a full URL (string) or an object { url: '', ... } or an existing urn
            let imgUrl = null;
            let maybeUrn = null;
            if (typeof imgRef === 'string') {
              // detect if it's already a LinkedIn URN
              if (imgRef.startsWith('urn:li:image:') || imgRef.startsWith('urn:li:digitalmediaAsset:')) {
                maybeUrn = imgRef;
              } else {
                imgUrl = imgRef;
              }
            } else if (imgRef && typeof imgRef === 'object') {
              if (imgRef.id && typeof imgRef.id === 'string' && imgRef.id.startsWith('urn:li:')) {
                maybeUrn = imgRef.id;
              } else if (imgRef.url) {
                imgUrl = imgRef.url;
              } else if (imgRef.src) {
                imgUrl = imgRef.src;
              }
            }

            if (maybeUrn) {
              // already an URN — use directly
              uploadedUrns.push(maybeUrn);
              console.log(`[Cron LinkedIn] Using existing URN for image: ${maybeUrn}`);
              continue;
            }

            if (!imgUrl) {
              console.warn(`[Cron LinkedIn] Skipping image entry (no URL or URN):`, imgRef);
              continue;
            }

            // Download image and convert to base64
            try {
              const { base64, mimeType, size } = await downloadToBase64(imgUrl);
              console.log(`[Cron LinkedIn UploadImage] Downloaded ${imgUrl} (${size} bytes, ${mimeType})`);
              // Upload via proxy to LinkedIn and get assetUrn
              const assetUrn = await uploadImageViaProxy(accessToken, authorUrn, base64, mimeType);
              uploadedUrns.push(assetUrn);
              console.log(`[Cron LinkedIn UploadImage] Uploaded and obtained assetUrn: ${assetUrn}`);
              await delay(1000); // Add a 1s delay between image uploads
            } catch (err) {
              // Re-throw the error to be caught by the main post processor's catch block.
              // This will halt the process for this post and mark it as failed.
              throw new Error(`Failed processing image ${imgUrl}: ${err.message || err}`);
            }
          } // end for images

          // If there were images to upload, but none were successful, abort.
          if (imagesToUpload.length > 0 && uploadedUrns.length === 0) {
            throw new Error('All image uploads failed for this post.');
          }

          // Defensive delay for asset propagation if images were uploaded
          if (uploadedUrns.length > 0) {
            console.log(`[Cron LinkedIn] All images processed. Waiting 5 seconds for asset propagation before creating post...`);
            await delay(5000);
          }
        } // end if images

        // If video present (payload.videoUrl OR payload.video)
        let videoUrn = null;
        if (payload.videoUrl || payload.video) {
          const videoRef = payload.videoUrl || payload.video;
          let videoUrl = typeof videoRef === 'string' ? videoRef : (videoRef.url || videoRef.src);
          if (videoUrl) {
            try {
              console.log(`[Cron LinkedIn UploadVideo] Downloading video for post ${postId}...`);
              const { base64, mimeType, size } = await downloadToBase64(videoUrl);
              console.log(`[Cron LinkedIn UploadVideo] Downloaded video (${size} bytes, ${mimeType})`);
              // Upload video via proxy (initialize + upload)
              videoUrn = await uploadVideoViaProxy(accessToken, authorUrn, base64, mimeType);
              console.log(`[Cron LinkedIn UploadVideo] Upload complete, videoUrn: ${videoUrn}`);
            } catch (err) {
              console.error(`[Cron LinkedIn UploadVideo] Video upload failed for post ${postId}:`, err);
              // fallback: proceed without video
            }
          }
        }

        // Build final payload for createPost
        const postPayload = {
          author: authorUrn,
          commentary: commentary || '',
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false
        };

        if (videoUrn) {
          postPayload.content = {
            media: {
              id: videoUrn,
              title: payload.title || payload.videoTitle || 'Video Post'
            }
          };
        } else if (uploadedUrns.length === 1) {
          postPayload.content = { media: { id: uploadedUrns[0] } };
        } else if (uploadedUrns.length > 1) {
          postPayload.content = {
            multiImage: {
              images: uploadedUrns.map(u => ({ id: u }))
            }
          };
        }

        // Log final payload being sent
        console.log(`[Cron LinkedIn] Final payload for post ${postId}:`, JSON.stringify(postPayload, null, 2));

        // Send to proxy (flat shape expected)
        const createResp = await fetchWithRetry(`${PROXY_BASE}/api/linkedin-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_API_SECRET
          },
          body: JSON.stringify({
            action: 'createPost',
            accessToken,
            payload: postPayload
          })
        }, 3, 1000);

        const createText = await createResp.text().catch(() => '');
        let createData;
        try { createData = createText ? JSON.parse(createText) : {}; } catch (e) { createData = { raw: createText }; }

        if (createResp.ok) {
          const postIdFromApi = createData.id;
          if (!postIdFromApi) {
             throw new Error('Post created on LinkedIn, but x-restli-id header was missing in the response from proxy.');
          }
          const postUrl = `https://www.linkedin.com/feed/update/${postIdFromApi}/`;
          console.log(`[Cron LinkedIn CreatePost] Post ${postId} created successfully. LinkedIn Post URL: ${postUrl}`);

          // If this is a main post, store its data for follow-ups
          if (!row.parent_id) {
            parentPostData.set(postId, {
              url: postUrl,
              cta: (payload.content && payload.content.cta) || payload.cta || '',
              hashtags: (payload.content && payload.content.hashtags) || payload.hashtags || [],
            });
          }

          console.log(`[Cron LinkedIn DB] Attempting to update post ${postId} to 'published' with URL...`);
          const updateResult = await query(
            'UPDATE linkedin_schedules SET status = $1, linkedin_post_id = $2, linkedin_post_url = $3, error_message = NULL WHERE id = $4',
            ['published', postIdFromApi, postUrl, postId]
          );
          console.log(`[Cron LinkedIn DB] Update result for post ${postId}:`, JSON.stringify(updateResult));

          // Create engagement discovery session
          try {
            const sessionResult = await query(
                `INSERT INTO linkedin_discovery_sessions (user_id, source_post_id, source_post_content, status)
                 VALUES ($1, $2, $3, 'pending')
                 RETURNING id`,
                [row.user_id, postIdFromApi, commentary]
            );
            const sessionId = sessionResult?.rows?.[0]?.id;
            console.log(`[Cron LinkedIn Engagement] Discovery session created for post ${postId} (Session: ${sessionId}).`);

            if (sessionId) {
              processDiscoverySession(sessionId).catch(err =>
                console.error(`[Cron LinkedIn Engagement] Error processing session ${sessionId}:`, err)
              );
            }
          } catch (engErr) {
            console.error(`[Cron LinkedIn Engagement] Failed to create discovery session for post ${postId}:`, engErr);
          }

          if (updateResult.rowCount === 0) {
            throw new Error(`DB update failed for post ${postId}. Post was published but its status could not be updated in the database.`);
          }

          // Send notification email if specified
          if (row.notification_email) {
            try {
              const campaignTitle = row.campaign_name || payload.titulo || (payload.content && payload.content.titulo) || 'Publicação no LinkedIn';
              const postText = (payload.content && payload.content.fullText) || payload.conteudo || payload.fullText || '';

              await sendPublicationNotification({
                to: row.notification_email,
                campaignTitle,
                postUrl,
                postContent: postText
              });
              console.log(`[Cron LinkedIn] Notification email sent for post ${postId} to ${row.notification_email}`);
            } catch (emailErr) {
              console.error(`[Cron LinkedIn] Failed to send notification email for post ${postId}:`, emailErr);
            }
          }

        } else {
          console.error(`[Cron LinkedIn CreatePost] Failed to create post ${postId}:`, createResp.status, createData);
          await query('UPDATE linkedin_schedules SET status = $1, error_message = $2 WHERE id = $3', ['failed', JSON.stringify(createData), postId]);
        }
      } catch (err) {
        console.error(`[Cron LinkedIn] Error processing post ${postId}:`, err);
        try {
          await query('UPDATE linkedin_schedules SET status = $1, error_message = $2 WHERE id = $3', ['failed', err.message || String(err), postId]);
        } catch (qerr) {
          console.error('[Cron LinkedIn] Failed to update DB for post failure:', qerr);
        }
      }

      // Small delay to avoid hitting rate limits
      await delay(2000);
    } // end for rows

    console.log('[Cron LinkedIn] Scheduler run completed.');
    return response.status(200).json({ message: 'Scheduler run completed.' });
  } catch (err) {
    console.error('[Cron LinkedIn] Fatal error in scheduler run:', err);
    return response.status(500).json({ error: err.message || String(err) });
  }
}

export default async function handler(request, response) {
  return handleRunScheduler(response);
}
