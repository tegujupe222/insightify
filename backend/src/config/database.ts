import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Vercel Postgres configuration
const dbConfig: PoolConfig = {
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 2000,
  // Vercel Postgres specific settings
  application_name: 'insightify-analytics',
  // Connection pooling for serverless
  max: process.env.NODE_ENV === 'production' ? 1 : 20, // Vercel recommends 1 for serverless
  idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 1000 : 30000,
};

const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

export default pool; 