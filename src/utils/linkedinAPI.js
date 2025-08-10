import { getLinkedinConfig } from './linkedinCredentials';

// Helper to convert Blob to Base64
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

// Helper to slice a blob
const sliceBlob = (blob, start, end) => {
    return blob.slice(start, end, blob.type);
}

const markdownToLinkedinText = (markdown) => {
  if (!markdown) return '';
  let text = markdown;
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, '$1$2');
  text = text.replace(/^#+\s/gm, '');
  text = text.replace(/^>\s/gm, '');
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
  text = text.replace(/^\s*[-*]\s/gm, '');
  text = text.trim().replace(/\n{3,}/g, '\n\n');
  return text;
};

const _getProfileUrn = async (accessToken) => {
    const response = await fetch('/api/linkedin-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProfile', accessToken }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
        throw new Error(`Failed to fetch LinkedIn profile via proxy: ${errorData.message || 'Unknown error'}`);
    }
    const profileData = await response.json();
    return `urn:li:person:${profileData.id}`;
};

const _registerImageUpload = async (accessToken, authorUrn) => {
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'registerUpload',
      accessToken,
      payload: {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      }
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
    throw new Error(`Failed to register image upload via proxy: ${errorData.message || 'Unknown error'}`);
  }
  return await response.json();
};

const _uploadImage = async (accessToken, uploadUrl, imageBlob) => {
  const imageBase64 = (await blobToBase64(imageBlob)).substring((await blobToBase64(imageBlob)).indexOf(',') + 1);
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'uploadImage',
      accessToken,
      uploadUrl,
      imageBase64,
      imageType: imageBlob.type,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Proxy Image Upload Error Body:", errorText);
    throw new Error(`Failed to upload image to LinkedIn via proxy. Status: ${response.status}`);
  }
};

// New Video API Functions
const _initializeVideoUpload = async (accessToken, authorUrn, videoSize) => {
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'initializeVideoUpload',
      accessToken,
      payload: {
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: videoSize,
        },
      },
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
    throw new Error(`Failed to initialize video upload: ${errorData.message || 'Unknown error'}`);
  }
  return await response.json();
};

const _uploadVideoParts = async (videoBlob, uploadInstructions) => {
    const uploadedPartIds = [];
    for (const instruction of uploadInstructions) {
        const { uploadUrl, firstByte, lastByte } = instruction;
        const chunk = sliceBlob(videoBlob, firstByte, lastByte + 1);
        const chunkBase64 = (await blobToBase64(chunk)).split(',')[1];

        const response = await fetch('/api/linkedin-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'uploadVideo',
                uploadUrl: uploadUrl,
                videoBase64: chunkBase64,
                videoContentType: videoBlob.type
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to upload video part. Status: ${response.status}`);
        }
        const { eTag } = await response.json();
        uploadedPartIds.push(eTag);
    }
    return uploadedPartIds;
};

const _finalizeVideoUpload = async (accessToken, videoUrn, uploadToken, uploadedPartIds) => {
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'finalizeVideoUpload',
      accessToken,
      payload: {
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken,
          uploadedPartIds,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
    throw new Error(`Failed to finalize video upload: ${errorData.message || 'Unknown error'}`);
  }
};

const _pollVideoStatus = async (accessToken, videoUrn) => {
  const MAX_POLLS = 10;
  const DELAY_MS = 5000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    const response = await fetch('/api/linkedin-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkVideoStatus', accessToken, videoUrn }),
    });

    if (!response.ok) {
        console.warn(`Polling video status failed with status ${response.status}. Retrying...`);
        continue;
    }

    const data = await response.json();
    if (data.status === 'AVAILABLE') {
      console.log('Video is processed and available.');
      return;
    }
    console.log(`Polling video status (${i + 1}/${MAX_POLLS}): ${data.status}`);
  }

  throw new Error('Video processing timed out or failed to become available.');
};

const _createPost = async (accessToken, authorUrn, campaignContent, assetUrns = [], videoUrn = null) => {
  const postText = [
    campaignContent.titulo.toUpperCase(),
    '',
    markdownToLinkedinText(campaignContent.conteudo),
    '',
    '----',
    campaignContent.cta,
    '----',
    campaignContent.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
  ].join('\n');

  const shareContent = {
    shareCommentary: { text: postText },
    shareMediaCategory: 'NONE',
  };

  if (videoUrn) {
    // The UGC Posts API expects the classic 'digitalmediaAsset' URN, not the new 'video' URN.
    const assetUrn = videoUrn.replace('urn:li:video:', 'urn:li:digitalmediaAsset:');
    shareContent.shareMediaCategory = 'VIDEO';
    shareContent.media = [{
      status: 'READY',
      description: { text: campaignContent.titulo },
      media: assetUrn,
      title: { text: campaignContent.titulo },
    }];
  } else if (assetUrns && assetUrns.length > 0) {
    shareContent.shareMediaCategory = 'IMAGE';
    shareContent.media = assetUrns.map(assetUrn => ({
      status: 'READY',
      description: { text: campaignContent.titulo },
      media: assetUrn,
      title: { text: campaignContent.titulo },
    }));
  }

  const payload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'createPost', accessToken, payload }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
    throw new Error(`Failed to create post on LinkedIn via proxy: ${errorData.message || 'Unknown error'}`);
  }

  return await response.json();
};

export const getLinkedInProfiles = async () => {
  const config = getLinkedinConfig();
  if (!config || !config.accessToken) {
    throw new Error('LinkedIn configuration or Access Token not found. Please connect first.');
  }
  const { accessToken } = config;

  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getOrganizations', accessToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
    throw new Error(`Failed to fetch LinkedIn profiles via proxy: ${errorData.message || 'Unknown error'}`);
  }

  return await response.json();
};

export const publishToLinkedIn = async (campaignData) => {
  const { campaignContent, imageBlobs = [], videoBlob, authorUrn: providedAuthorUrn } = campaignData;
  const config = getLinkedinConfig();
  if (!config || !config.accessToken) {
    throw new Error('LinkedIn configuration or Access Token not found. Please connect first.');
  }
  const { accessToken } = config;

  const authorUrn = providedAuthorUrn || await _getProfileUrn(accessToken);

  console.log('--- LinkedIn Publishing Debug ---');
  console.log('Using URN for both Asset Owner and Post Author:', authorUrn);

  let postResult;

  if (videoBlob) {
    console.log('Publishing to LinkedIn: Starting new video upload process...');
    // 1. Initialize
    const initData = await _initializeVideoUpload(accessToken, authorUrn, videoBlob.size);
    const { video: videoUrn, uploadInstructions, uploadToken } = initData;
    console.log(`Video initialized. URN: ${videoUrn}`);

    // 2. Upload parts
    const uploadedPartIds = await _uploadVideoParts(videoBlob, uploadInstructions);
    console.log('All video parts uploaded successfully.');

    // 3. Finalize
    await _finalizeVideoUpload(accessToken, videoUrn, uploadToken, uploadedPartIds);
    console.log('Video upload finalized.');

    // 4. Poll for status
    await _pollVideoStatus(accessToken, videoUrn);
    console.log(`Video with URN: ${videoUrn} is processed and ready.`);

    // 5. Create Post
    postResult = await _createPost(accessToken, authorUrn, campaignContent, [], videoUrn);

  } else if (imageBlobs && imageBlobs.length > 0) {
    console.log(`Publishing to LinkedIn: Registering and uploading ${imageBlobs.length} image(s)...`);
    const assetUrns = [];
    for (const imageBlob of imageBlobs) {
        const { uploadUrl, assetUrn } = await _registerImageUpload(accessToken, authorUrn);
        await _uploadImage(accessToken, uploadUrl, imageBlob);
        console.log(`Image with asset URN: ${assetUrn} uploaded successfully.`);
        assetUrns.push(assetUrn);
    }
    console.log('All images uploaded.');
    postResult = await _createPost(accessToken, authorUrn, campaignContent, assetUrns);

  } else {
    console.log('Publishing to LinkedIn: Creating text-only post.');
    postResult = await _createPost(accessToken, authorUrn, campaignContent);
  }

  console.log('Post created successfully on LinkedIn!', postResult);
  const postId = postResult.id;
  return {
    id: postId,
    link: `https://www.linkedin.com/feed/update/${postId}/`,
  };
};
