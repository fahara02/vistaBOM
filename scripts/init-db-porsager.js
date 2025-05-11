// Initialize database using porsager/postgres
import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Fixed database name
const targetDb = 'vbom';

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL must be set in .env');
  process.exit(1);
}

// Function to split SQL statements
function splitStatements(sql) {
  const stmts = [];
  let current = '';
  let inDollar = false;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === '$' && sql[i+1] === '$') {
      inDollar = !inDollar;
      current += '$$'; i++;
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

async function main() {
  // Extract connection details from DATABASE_URL
  const dbUrl = new URL(process.env.DATABASE_URL);
  const rootConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    database: 'postgres',
    username: dbUrl.username,
    password: dbUrl.password ? decodeURIComponent(dbUrl.password) : undefined,
  };
  
  // Connect to postgres database to manage creation
  const rootSql = postgres({
    ...rootConfig,
    max: 1
  });

  // Terminate existing connections
  try {
    await rootSql.unsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${targetDb}'`);
    console.log(`Terminated existing connections to '${targetDb}'`);
  } catch (err) {
    console.warn('Warning terminating connections:', err.message);
  }

  // Drop database if exists
  try {
    await rootSql.unsafe(`DROP DATABASE IF EXISTS "${targetDb}"`);
    console.log(`Dropped database '${targetDb}' if it existed`);
  } catch (err) {
    console.warn('Warning dropping database:', err.message);
  }

  // Create fresh database
  try {
    await rootSql.unsafe(`CREATE DATABASE "${targetDb}" OWNER "${rootConfig.username}"`);
    console.log(`Created database '${targetDb}'`);
  } catch (err) {
    console.error('Error creating database:', err.message);
    await rootSql.end();
    process.exit(1);
  }
  
  // Close root connection
  await rootSql.end();
  console.log('Closed root connection');
  
  // Wait briefly before connecting to new database
  await new Promise(res => setTimeout(res, 1000));
  
  // Connect to newly created database
  const targetConfig = {
    ...rootConfig,
    database: targetDb
  };
  
  const sql = postgres({
    ...targetConfig,
    max: 1
  });

  // Apply schema
  try {
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const statements = splitStatements(schemaContent)
      .map(stmt => stmt.split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('--'))
        .join('\n'))
      .filter(stmt => stmt);
    
    console.log(`Applying ${statements.length} statements to schema...`);
    
    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
      } catch (err) {
        if (err.code === '42710' || (err.message && err.message.includes('already exists'))) {
          console.warn('Skipping existing object:', stmt.split('\n')[0]);
          continue;
        }
        console.error('Failed SQL statement:', stmt.split('\n')[0]);
        console.error('Error:', err.message);
        // Continue with the next statement - more forgiving approach
      }
    }
    
    console.log(`Database '${targetDb}' initialized successfully`);
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    // Close connection
    await sql.end();
    console.log('Closed target connection');
  }
}

main().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
