// src/lib/server/db/index.ts

import { env } from '$env/dynamic/private';
import { connect } from 'ts-postgres';
import type { Client } from 'ts-postgres';
import fs from 'fs';
import path from 'path';

// Ensure DATABASE_URL is set
if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Parse DATABASE_URL
const dbUrl = new URL(env.DATABASE_URL);


// Build connection options, include password if provided
const connectionOptions: {
  host: string;
  port?: number;
  database: string;
  user: string;
  password?: string;
} = {
  host: dbUrl.hostname,
  port: dbUrl.port ? parseInt(dbUrl.port) : undefined,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
};
if (dbUrl.password) {
  connectionOptions.password = decodeURIComponent(dbUrl.password);
} else if (env.DB_PASSWORD) {
  connectionOptions.password = env.DB_PASSWORD;
}
const client: Client = await connect(connectionOptions);

// Apply SQL schema on startup (uses IF NOT EXISTS for idempotence)
const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
// eslint-disable-next-line no-await-in-loop
for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
  await client.query(stmt);
}

export default client;
