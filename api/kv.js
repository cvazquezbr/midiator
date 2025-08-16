import Redis from 'ioredis';

// ioredis is a robust Node.js redis client that can handle
// standard redis:// URLs, which is what the user provided.
// It will automatically parse the URL for host, port, user, and password.
const redis = new Redis(process.env.REDIS_URL || process.env.KV_URL);

// We export it with the name 'kv' so we don't have to change the import name
// in every file, just the logic.
export { redis as kv };
