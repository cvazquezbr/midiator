import { withAdminAuth } from '../middleware/auth.js';
import { handleRunScheduler } from '../cron/linkedin.js';

/**
 * API handler for manually triggering the scheduler by an admin.
 * It only accepts POST requests and is protected by admin-only authentication.
 *
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 */
const handler = (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // req.user is guaranteed to be available here because withAdminAuth runs first.
    console.log(`Manual scheduler run initiated by admin user: ${req.user.email}`);

    // The actual scheduler logic is in handleRunScheduler.
    return handleRunScheduler(req, res);
};

// Wrap the main handler with the admin auth middleware.
// This ensures that only authenticated admins can reach this point.
export default withAdminAuth(handler);
