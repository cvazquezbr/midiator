export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const assetUrl = searchParams.get('url');

  if (!assetUrl) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  // Security: Only allow proxying for Vercel blob storage URLs
  const allowedHost = 'blob.vercel-storage.com';
  const urlObject = new URL(assetUrl);
  if (urlObject.host !== allowedHost) {
    return new Response('Provided URL is not from an allowed host.', { status: 403 });
  }

  try {
    // The Authorization header was removed. Public assets on Vercel Blob do not require it,
    // and providing one can lead to 403 Forbidden errors.
    const assetResponse = await fetch(assetUrl);

    if (!assetResponse.ok) {
      return new Response('Failed to fetch the asset from the external source.', { status: assetResponse.status });
    }

    // Create a new response that streams the asset body
    const response = new Response(assetResponse.body, {
      headers: {
        'Content-Type': assetResponse.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Length': assetResponse.headers.get('Content-Length') || '',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    return response;

  } catch (error) {
    console.error('Error proxying asset:', error);
    return new Response('An error occurred while proxying the asset.', { status: 500 });
  }
}