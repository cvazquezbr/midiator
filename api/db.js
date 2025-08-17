import pg from 'pg';

// Vercel automatically populates environment variables from the project settings.
// We will assume POSTGRES_URL is set there.
// See: https://vercel.com/docs/projects/environment-variables
const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  // In a local environment, you might use a .env file.
  // For production on Vercel, this variable must be set in the project settings.
  console.error('POSTGRES_URL environment variable is not set.');
  // We don't throw an error here to allow the application to build,
  // but any API call to the DB will fail.
}

const pool = new pg.Pool({
  connectionString,
  // Vercel recommends these settings for serverless functions
  // See: https://vercel.com/guides/project-environment-variables-and-secrets
  max: 10, // Max number of clients in the pool
  idleTimeoutMillis: 5000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a client to connect
});

/**
 * A wrapper for the pool.query function.
 * @param {string} text - The SQL query text.
 * @param {Array} params - The parameters for the SQL query.
 * @returns {Promise<pg.QueryResult>} The result of the query.
 */
export const query = (text, params) => {
  if (!pool) {
    throw new Error('Database pool is not initialized. Check POSTGRES_URL environment variable.');
  }
  return pool.query(text, params);
};

export default pool;
