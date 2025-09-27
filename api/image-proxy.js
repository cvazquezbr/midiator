export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  // Security: Only allow proxying for Vercel blob storage URLs
  const allowedHost = 'blob.vercel-storage.com';
  const urlObject = new URL(imageUrl);
  if (urlObject.host !== allowedHost) {
    return new Response('Provided URL is not from an allowed host.', { status: 403 });
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!imageResponse.ok) {
      return new Response('Failed to fetch the image from the external source.', { status: imageResponse.status });
    }

    // Create a new response that streams the image body
    const response = new Response(imageResponse.body, {
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Length': imageResponse.headers.get('Content-Length') || '',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    return response;

  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response('An error occurred while proxying the image.', { status: 500 });
  }
}
