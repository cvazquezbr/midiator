import { withAuth, isAdmin } from '../middleware/auth.js';
import { handleRunAnalyticsCollector } from '../cron/linkedin-analytics.js';

const analyticsRunnerHandler = async (request, response) => {
    // Ensure the user is an admin
    if (!isAdmin(request)) {
        return response.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
    }

    // We can call the analytics collector directly.
    // The request object might need to be slightly adapted if the collector expects a specific format,
    // but for now, we assume it can be called directly.
    return handleRunAnalyticsCollector(request, response);
};

// Main handler for the endpoint
const mainHandler = async (request, response) => {
    if (request.method === 'POST') {
        // Wrap the handler with withAuth to ensure the user is authenticated
        return withAuth(analyticsRunnerHandler)(request, response);
    }

    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
};

export default mainHandler;