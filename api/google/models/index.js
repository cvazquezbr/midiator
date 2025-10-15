import {Pool} from '@vercel/postgres';

export const config = {
    runtime: 'edge',
};

// Helper function to stream ReadableStream to the client
async function streamToResponse(stream, response) {
    const reader = stream.getReader();
    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            response.write(new TextDecoder().decode(value));
        }
        response.end();
    } catch (e) {
        console.error('Streaming error:', e);
        response.end();
    }
}

export default async function handler(request) {
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({error: 'Method Not Allowed'}), {
            status: 405,
            headers: {'Content-Type': 'application/json'},
        });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({error: 'API key is not configured'}), {
            status: 500,
            headers: {'Content-Type': 'application/json'},
        });
    }

    const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    try {
        const fetchResponse = await fetch(`${GOOGLE_API_URL}?key=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error('Google API error response:', errorText);
            return new Response(JSON.stringify({
                error: 'Failed to fetch models from Google API',
                details: errorText
            }), {
                status: fetchResponse.status,
                headers: {'Content-Type': 'application/json'},
            });
        }

        // Create a new response that streams the body from the Google API
        const response = new Response(fetchResponse.body, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
            },
        });

        return response;

    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return new Response(JSON.stringify({error: 'Internal Server Error', details: error.message}), {
            status: 500,
            headers: {'Content-Type': 'application/json'},
        });
    }
}