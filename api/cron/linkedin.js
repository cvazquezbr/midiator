// api/cron/linkedin.js
import { query } from '../db.js';
import fetch from 'node-fetch';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const PROXY_BASE = process.env.INTERNAL_API_BASE_URL || process.env.API_BASE_URL || '';

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
  if (initData.value && initData.value.uploadMechanism &&
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

  // After upload, the video URN may be in initData.value.asset or returned separately.
  // Try to derive video URN:
  if (initData.value && initData.value.asset) {
    return initData.value.asset;
  } else if (uploadData && uploadData.eTag) {
    // Not a URN, but sometimes proxy returns eTag. We return initData asset if present.
    if (initData.asset) return initData.asset;
  }
  // As a fallback, try common fields
  if (initData.asset) return initData.asset;
  if (initData.value && initData.value.assetUrn) return initData.value.assetUrn;

  throw new Error('[Cron LinkedIn UploadVideo] could not determine video URN from responses');
}

// Build author URN from target_type/target_id or author field
function buildAuthorUrn(row) {
  if (row.author) return row.author;
  const targetId = row.target_id || row.targetId || row.targetId;
  const targetType = row.target_type || row.targetType;
  if (targetId && targetType) {
    return `urn:li:${targetType === 'organization' ? 'organization' : 'person'}:${targetId}`;
  }
  // fallback to user_id-based person urn if available
  if (row.user_id) return `urn:li:person:${row.user_id}`;
  return null;
}

function stripEmojis(text) {
  if (!text) return text;
  return String(text).replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}

function escapeLinkedinText(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') {
    try { text = String(text); } catch (e) { return ''; }
  }
  return text.replace(/([|{}@[\]()<>#*_~\\])/g, '\\$1');
}

export async function handleRunScheduler() {
  console.log('[Cron LinkedIn] Starting scheduler run...');

  try {
    // Query pending scheduled posts (schema public)
    const { rows } = await query(
      `SELECT id, user_id, linkedin_access_token, payload, scheduled_for, author, target_id, target_type
       FROM scheduled_posts
       WHERE status = 'pending'
       ORDER BY scheduled_for ASC
       LIMIT 50`
    );

    if (!rows || rows.length === 0) {
      console.log('[Cron LinkedIn] No pending posts.');
      return { ok: true, message: 'no posts' };
    }

    console.log(`[Cron LinkedIn] ${rows.length} pending posts found.`);

    for (const row of rows) {
      const postId = row.id;
      console.log(`[Cron LinkedIn] Processing post ${postId}...`);

      // Parse payload (may be stored as JSON string or JSONB)
      let payload = row.payload;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) { console.warn('[Cron LinkedIn] payload parse error', e); }
      }
      if (!payload) payload = {};

      // Determine access token (use linkedin_access_token column or payload.accessToken)
      const accessToken = row.linkedin_access_token || payload.accessToken || null;
      if (!accessToken) {
        console.error(`[Cron LinkedIn] No access token for post ${postId}. Marking failed.`);
        await query('UPDATE scheduled_posts SET status = $1, error_message = $2 WHERE id = $3', ['failed', 'missing access token', postId]);
        continue;
      }

      // Build author URN
      const authorUrn = buildAuthorUrn(Object.assign({}, row, payload));
      if (!authorUrn) {
        console.error(`[Cron LinkedIn] Could not determine author URN for post ${postId}.`);
        await query('UPDATE scheduled_posts SET status = $1, error_message = $2 WHERE id = $3', ['failed', 'missing authorUrn', postId]);
        continue;
      }

      // Prepare commentary/text
      const commentaryRaw = payload.content || payload.commentary || payload.text || '';
      const commentary = escapeLinkedinText(stripEmojis(commentaryRaw));

      // Collect uploaded asset URNs for this post
      const uploadedUrns = [];

      try {
        // If payload has images as URLs (blob store), upload them now
        if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
          console.log(`[Cron LinkedIn] Found ${payload.images.length} image(s) for post ${postId}. Uploading to LinkedIn...`);

          for (const imgRef of payload.images) {
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
            } catch (err) {
              console.error(`[Cron LinkedIn UploadImage] Failed processing image ${imgUrl} for post ${postId}:`, err.message || err);
              // Decide: continue with remaining images or mark as failed. We'll continue but log.
            }
          } // end for images
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
          console.log(`[Cron LinkedIn CreatePost] Post ${postId} created successfully. Response:`, createData);
          await query('UPDATE scheduled_posts SET status = $1, posted_at = NOW() WHERE id = $2', ['sent', postId]);
        } else {
          console.error(`[Cron LinkedIn CreatePost] Failed to create post ${postId}:`, createResp.status, createData);
          await query('UPDATE scheduled_posts SET status = $1, error_message = $2 WHERE id = $3', ['failed', JSON.stringify(createData), postId]);
        }
      } catch (err) {
        console.error(`[Cron LinkedIn] Error processing post ${postId}:`, err);
        try {
          await query('UPDATE scheduled_posts SET status = $1, error_message = $2 WHERE id = $3', ['failed', err.message || String(err), postId]);
        } catch (qerr) {
          console.error('[Cron LinkedIn] Failed to update DB for post failure:', qerr);
        }
      }

      // Small delay to avoid hitting rate limits
      await delay(2000);
    } // end for rows

    console.log('[Cron LinkedIn] Scheduler run completed.');
    return { ok: true };
  } catch (err) {
    console.error('[Cron LinkedIn] Fatal error in scheduler run:', err);
    return { ok: false, error: err.message || String(err) };
  }
}

export default async function handler() {
  return await handleRunScheduler();
}


