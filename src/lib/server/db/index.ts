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

// Ensure target database exists, then connect
let client: Client;
try {
	client = await connect(connectionOptions);
} catch (err: any) {
	// Create database if it doesn't exist
	if (err.code === '3D000') {
		const rootOptions = { ...connectionOptions, database: 'postgres' };
		const rootClient = await connect(rootOptions);
		await rootClient.query(`CREATE DATABASE "${connectionOptions.database}"`);
		await rootClient.end();
		client = await connect(connectionOptions);
	} else {
		throw err;
	}
}

// Add specific SQL statements to handle enum types
// This tells PostgreSQL server to use text format when possible, which avoids binary encoding issues
await client.query(`SET bytea_output = 'escape';`);
await client.query(`SET client_encoding = 'UTF8';`);
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
// DO NOT EXECUTE SCHEMA MIGRATIONS ON SERVER STARTUP - THIS IS THE SOURCE OF THE CONCURRENCY ISSUES

// This is a safer approach - only check if we have a valid connection
const testConnection = async () => {
	try {
		console.log('Testing database connection...');
		await client.query('SELECT 1');
		console.log('Database connection successful');
		return true;
	} catch (err) {
		console.error('Database connection failed:', err);
		return false;
	}
};

// Test the connection rather than applying migrations on server startup
await testConnection();

// For safety, define a function to execute schema if explicitly needed
export async function applySchema() {
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

	for (let i = 0; i < statements.length; i++) {
		const stmt = statements[i];
		try {
			// Add a small delay between statements to avoid concurrent updates
			if (i > 0) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
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
	console.log('Schema application completed');
}

export default client;
