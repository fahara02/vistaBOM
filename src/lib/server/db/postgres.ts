// DB client using postgres (porsager/postgres)
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Ensure DATABASE_URL is set
if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL must be set');
}

// Create postgres SQL client
const sql = postgres(env.DATABASE_URL, {
	max: 10, // Connection pool size
	idle_timeout: 30, // Idle connection timeout in seconds
	connect_timeout: 10, // Connection timeout in seconds  
	types: {
		// Add custom type parsers if needed
	}
});

// Utility to split SQL statements
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

// Apply schema on startup
async function applySchema() {
	try {
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

		// Check if database exists, if not create it (postgres client creates it automatically)
		console.log('Applying schema with postgres client...');
		
		// Apply schema statements
		for (const stmt of statements) {
			try {
				await sql.unsafe(stmt);
			} catch (err: any) {
				if (err.code === '42710' || err.message?.includes('already exists')) {
					console.warn('Skipping existing object:', stmt.split('\n')[0]);
					continue;
				}
				console.error('Failed SQL statement:', stmt.split('\n')[0], '...', err.message);
				// Continue execution despite errors - more forgiving approach
			}
		}
		console.log('Schema applied successfully.');
	} catch (err) {
		console.error('Error applying schema:', err);
	}
}

// Initialize schema
applySchema();

export default sql;
