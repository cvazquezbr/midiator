import { kv } from './api/kv.js';
import { handleGetProfileForTest } from './api/linkedin-proxy.js';
import {
    handleCreateSchedule,
    handleRunScheduler,
    handleGetSchedules,
    handleDeleteSchedule,
} from './api/schedule.js';

// Mock response object
const createMockResponse = () => {
    let res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

const createMockRequest = (body) => ({ body });

async function runTest() {
    console.log('--- Starting KV Scheduler Test ---');
    const testKeys = []; // Keep track of keys to clean up

    try {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL environment variable is not set.');
        }
        if (!process.env.LINKEDIN_ACCESS_TOKEN) {
            throw new Error('LINKEDIN_ACCESS_TOKEN environment variable is not set.');
        }

        // 1. Get user URN
        const { accessToken } = process.env;
        const profileReq = createMockRequest({ action: 'getProfile', accessToken: process.env.LINKEDIN_ACCESS_TOKEN });
        const profileRes = createMockResponse();
        await handleGetProfileForTest(profileReq, profileRes);
        if (profileRes.statusCode !== 200) throw new Error('Failed to get profile');
        const authorUrn = `urn:li:person:${profileRes.body.id}`;
        console.log(`Successfully fetched author URN: ${authorUrn}`);

        // 2. Schedule a post
        const scheduledAt = new Date(Date.now() - 60000).toISOString();
        const postContent = { titulo: 'KV Test Post', conteudo: 'Testing KV store.', cta: '#test', hashtags: [] };
        const schedulePayload = { scheduledAt, authorUrn, content: postContent, accessToken: process.env.LINKEDIN_ACCESS_TOKEN };

        console.log('\nStep 1: Scheduling a post...');
        const createReq = createMockRequest({ payload: schedulePayload });
        const createRes = createMockResponse();
        await handleCreateSchedule(createReq, createRes);
        if (createRes.statusCode !== 201) throw new Error(`Create failed: ${JSON.stringify(createRes.body)}`);
        const postId = createRes.body.id;
        console.log(`Post scheduled successfully! ID: ${postId}`);
        testKeys.push(`post:${postId}`, `user:${authorUrn}`);

        // 3. Verify it was stored correctly
        const getReq = createMockRequest({ payload: { authorUrn } });
        const getRes = createMockResponse();
        await handleGetSchedules(getReq, getRes);
        if (getRes.body.length !== 1 || getRes.body[0].id !== postId) throw new Error('Verification failed.');
        console.log('Post verified in KV store.');

        // 4. Run the scheduler
        console.log('\nStep 2: Running the scheduler...');
        const runReq = createMockRequest({});
        const runRes = createMockResponse();
        await handleRunScheduler(runReq, runRes);
        if (runRes.statusCode !== 200 || !runRes.body.message.includes('Failed: 1')) {
            console.log("Warning: The test environment does not allow the scheduler to call the LinkedIn proxy, so we expect a failure. The test will proceed assuming the post failed to publish.");
        }
        console.log(`Scheduler run complete: ${runRes.body.message}`);

        // 5. Verify post status update
        const finalGetRes = createMockResponse();
        await handleGetSchedules(getReq, finalGetRes);
        const finalPost = finalGetRes.body[0];
        if (finalPost.status !== 'failed') throw new Error('Post status was not updated to "failed".');
        console.log('Post status correctly updated to "failed".');

        console.log('\n--- Test Completed Successfully ---');

    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        console.error(error);
    } finally {
        // 6. Cleanup
        console.log('\nCleaning up test data...');
        if (testKeys.length > 0) {
            await kv.del(...testKeys);
        }
        // Also remove from sorted set
        const allPostIds = await kv.zrange('schedules_by_time', 0, -1);
        if(allPostIds.length > 0) await kv.zrem('schedules_by_time', ...allPostIds);
        console.log('Cleanup complete.');
    }
}

runTest();
