export const config = {
  runtime: 'nodejs',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const assetUrl = searchParams.get('url');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('CRITICAL: BLOB_READ_WRITE_TOKEN is not set in the environment.');
    return new Response('Server configuration error: Missing required storage access token.', { status: 500 });
  }

  if (!assetUrl) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  // JULES: Adicionando log para depuração
  console.log(`[DEBUG-JULES] API asset-proxy recebeu para buscar: ${assetUrl}`);

  // Security: Only allow proxying for Vercel blob storage URLs.
  // The check now correctly uses `endsWith` to allow for the unique
  // subdomain in Vercel's public blob URLs.
  const allowedHostSuffix = '.blob.vercel-storage.com';
  const urlObject = new URL(assetUrl);
  if (!urlObject.hostname.endsWith(allowedHostSuffix)) {
    return new Response('Provided URL is not from an allowed host.', { status: 403 });
  }

  try {
    // The Authorization header is required for the server-side proxy to fetch
    // assets from the blob store.
    const assetResponse = await fetch(assetUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!assetResponse.ok) {
      return new Response(`Failed to fetch the asset from the external source. Status: ${assetResponse.status}`, { status: assetResponse.status });
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