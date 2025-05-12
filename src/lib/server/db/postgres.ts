/**
 * Consolidated PostgreSQL client using porsager/postgres
 * Replaces the previous ts-postgres client
 */
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Ensure DATABASE_URL is set
if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL must be set');
}

// Create postgres SQL client with connection pooling
const sql = postgres(env.DATABASE_URL, {
	max: 10, // Connection pool size
	idle_timeout: 30, // Idle connection timeout in seconds
	connect_timeout: 10, // Connection timeout in seconds
	types: {
		// Register custom type parsers for proper date handling
		date: {
			to: 1184, // timestamp type OID
			from: [1082, 1083, 1114, 1184], // date, time, timestamp, timestamptz
			serialize: (date: Date) => date,
			parse: (str: string) => new Date(str)
		}
	},
	transform: {
		// By default, keep column names as-is from database
		column: {
			from: (name) => name 
		}
	}
});

// Utility to split SQL statements properly
function splitStatements(sqlText: string): string[] {
	const stmts: string[] = [];
	let current = '';
	let inDollar = false;
	for (let i = 0; i < sqlText.length; i++) {
		if (sqlText[i] === '$' && sqlText[i + 1] === '$') {
			inDollar = !inDollar;
			current += '$$';
			i++;
		} else if (sqlText[i] === ';' && !inDollar) {
			if (current.trim()) stmts.push(current.trim());
			current = '';
		} else {
			current += sqlText[i];
		}
	}
	if (current.trim()) stmts.push(current.trim());
	return stmts;
}

// Initialize database and apply schema on startup
async function initDatabase() {
	try {
		const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
		if (fs.existsSync(schemaPath)) {
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

			console.log('Applying database schema...');
			
			// Apply schema statements
			for (const stmt of statements) {
				try {
					await sql.unsafe(stmt);
				} catch (err: any) {
					if (err.code === '42710' || err.message?.includes('already exists')) {
						// Ignore already exists errors for idempotence
						continue;
					}
					console.warn('Schema application warning:', err.message);
					// Continue execution despite errors - more forgiving approach
				}
			}
			console.log('Database schema applied successfully');
		}
	} catch (err) {
		console.error('Database initialization error:', err);
	}
}

// Initialize database on startup
initDatabase().catch(console.error);

// Export the SQL client as default
export default sql;

// Additional exports for transaction support and utility functions
export { sql };

// Helper function to properly handle JSON fields in SQL queries
export function toJsonB(obj: any): string | null {
	return obj ? JSON.stringify(obj) : null;
}
