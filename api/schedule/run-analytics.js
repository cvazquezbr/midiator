import { withAdminAuth } from '../middleware/auth.js';
import { handleRunAnalyticsCollector } from '../cron/linkedin-analytics.js';

// The withAdminAuth middleware now handles the authentication and admin role check.
const analyticsRunnerHandler = async (request, response) => {
    return handleRunAnalyticsCollector(request, response);
};

// Main handler for the endpoint
const mainHandler = async (request, response) => {
    if (request.method === 'POST') {
        // Wrap the handler with withAdminAuth.
        return withAdminAuth(analyticsRunnerHandler)(request, response);
    }

    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
};

export default mainHandler;