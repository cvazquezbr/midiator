import { withAuth } from './middleware/auth.js';

// Disable Vercel's default body parser to handle raw streams
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handleUploadVideo(request, response) {
  const fetch = (await import('node-fetch')).default;
  const uploadUrl = decodeURIComponent(request.headers['x-upload-url']);
  const videoContentType = request.headers['content-type'];
  const contentLength = request.headers['content-length'];

  if (!uploadUrl) {
    return response.status(400).json({ error: 'Missing X-Upload-URL header for video part upload.' });
  }

  try {
    const linkedinResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoContentType,
        'Content-Length': contentLength,
      },
      body: request, // Forward the raw request stream
      duplex: 'half', // Required for streaming request bodies with node-fetch
    });

    if (!linkedinResponse.ok) {
      const errorText = await linkedinResponse.text();
      console.error("LinkedIn Video Part Upload Error Body:", errorText);
      return response.status(linkedinResponse.status).json({ message: `Failed to upload video part. Status: ${linkedinResponse.status} | Body: ${errorText}` });
    }

    const eTag = linkedinResponse.headers.get('ETag');
    if (!eTag) {
      return response.status(500).json({ message: 'ETag missing from LinkedIn upload response.' });
    }

    // The frontend expects a JSON response
    return response.status(200).json({ eTag: eTag.replace(/"/g, '') });
  } catch (error) {
    console.error('Error during video part upload:', error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

// The main handler for this endpoint, protected by authentication
const mainHandler = async (request, response) => {
    // We are not using the protectedHandler wrapper from the other file,
    // as this endpoint only does one thing. We call the handler directly.
    return handleUploadVideo(request, response);
};

export default withAuth(mainHandler);
