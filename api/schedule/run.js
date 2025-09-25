import { withAdminAuth } from '../middleware/auth.js';
import { handleRunScheduler } from '../cron/linkedin.js';

// The withAdminAuth middleware now handles the authentication and admin role check.
const schedulerRunnerHandler = async (request, response) => {
    return handleRunScheduler(request, response);
};

// Main handler for the endpoint
const mainHandler = async (request, response) => {
    if (request.method === 'POST') {
        // Wrap the handler with withAdminAuth.
        return withAdminAuth(schedulerRunnerHandler)(request, response);
    }

    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
};

export default mainHandler;