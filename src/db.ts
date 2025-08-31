import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { 
    return await fn(c); 
  } finally { 
    c.release(); 
  }
}