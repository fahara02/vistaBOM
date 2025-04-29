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
	user: dbUrl.username
};
if (dbUrl.password) {
	connectionOptions.password = decodeURIComponent(dbUrl.password);
} else if (env.DB_PASSWORD) {
	connectionOptions.password = env.DB_PASSWORD;
}
const client: Client = await connect(connectionOptions);
export function getClient():Client{
    return client;
}

// Utility to split SQL statements outside of dollar-quoted blocks
function splitStatements(sql: string): string[] {
	const stmts: string[] = [];
	let current = '';
	let inDollar = false;
	for (let i = 0; i < sql.length; i++) {
		if (sql[i] === '$' && sql[i + 1] === '$') {
			inDollar = !inDollar;
			current += '$$';
			i++;
		} else if (sql[i] === ';' && !inDollar) {
			if (current.trim()) stmts.push(current.trim());
			current = '';
		} else {
			current += sql[i];
		}
	}
	if (current.trim()) stmts.push(current.trim());
	return stmts;
}

// Apply SQL schema on startup (uses IF NOT EXISTS for idempotence)
const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
const statements = splitStatements(schema)
	.map((stmt) => {
		const lines = stmt.split('\n');
		let start = 0;
		while (
			start < lines.length &&
			(lines[start].trim() === '' || lines[start].trim().startsWith('--'))
		) {
			start++;
		}
		return lines.slice(start).join('\n').trim();
	})
	.filter((stmt) => stmt.length > 0);
for (const stmt of statements) {
	try {
		await client.query(stmt);
	} catch (err: any) {
		// Ignore duplicate object errors (e.g., types or triggers already exist)
		if (err.code == 42710 || err.code == '42710' || err.message?.includes('already exists')) {
			console.warn('Skipping existing object:', stmt.split('\n')[0]);
			continue;
		}
		console.error('Failed SQL statement:', stmt.split('\n')[0], '...', err.message);
		throw err;
	}
}




export default client;
