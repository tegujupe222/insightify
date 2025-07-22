import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: process.env.NODE_ENV === 'production' ? 1 : 20,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 1000 : 30000,
});

export default pool; 