import Redis from 'ioredis';

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);

  redis.on('connect', () => {
    console.log('Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
} else {
  console.warn('REDIS_URL environment variable is not set. Redis client not initialized.');
  // Create a mock client if Redis is not configured
  redis = {
    get: async () => null,
    set: async () => {},
    del: async () => {},
    on: () => {}, // Mock 'on' to prevent errors on event subscription
  };
}

export default redis;
