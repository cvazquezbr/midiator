import pg from 'pg';

const connectionString = process.env.POSTGRES_URL;

let pool;

const getPool = () => {
  if (!pool) {
    if (!connectionString) {
      // This error will be thrown at request time, inside the API handler's try/catch block.
      throw new Error('Database configuration is missing. The POSTGRES_URL environment variable is not set.');
    }

    console.log("Creating new PostgreSQL connection pool.");
    pool = new pg.Pool({
      connectionString,
      // Vercel recommends these settings for serverless functions
      // See: https://vercel.com/guides/project-environment-variables-and-secrets
      max: 10, // Max number of clients in the pool
      idleTimeoutMillis: 5000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a client to connect
    });
  }
  return pool;
};

/**
 * A wrapper for the pool.query function that ensures the pool is initialized.
 * @param {string} text - The SQL query text.
 * @param {Array} params - The parameters for the SQL query.
 * @returns {Promise<pg.QueryResult>} The result of the query.
 */
export const query = (text, params) => {
  const dbPool = getPool();
  // The call to pool.query() is already wrapped in a try/catch in the API route handlers.
  return dbPool.query(text, params);
};

// Note: We don't export the pool directly anymore to ensure it's always accessed via getPool.
// This prevents direct usage without the initialization and connection string check.
export default { query };
