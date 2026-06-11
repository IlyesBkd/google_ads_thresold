/**
 * Database helper for Neon PostgreSQL
 * Provides typed query functions and connection pooling
 */

import { Pool, neonConfig } from '@neondatabase/serverless';

// Configure Neon for edge/serverless environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  // Development: use http fetch polyfill for Node.js
  const https = require('https');
  const http = require('http');

  neonConfig.fetchFunction = (url: string, options: any) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.request(url, {
        method: options?.method || 'GET',
        headers: options?.headers || {},
      }, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: async () => data,
            json: async () => JSON.parse(data),
          } as any);
        });
      });

      req.on('error', reject);
      if (options?.body) req.write(options.body);
      req.end();
    });
  };
}

// Create a singleton pool
let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

// Helper for typed queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper for single row queries
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Helper for insert/update/delete
export async function execute(text: string, params?: any[]): Promise<number> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rowCount || 0;
}

// Close pool (for cleanup in scripts)
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
