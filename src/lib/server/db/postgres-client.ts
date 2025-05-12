// /**
//  * PostgreSQL client using porsager/postgres
//  * This replaces the ts-postgres client and provides a more modern interface
//  */
// //src/lib/server/db/postgres-client.ts
// import { env } from '$env/dynamic/private';
// import postgres from 'postgres';
// import fs from 'fs';
// import path from 'path';

// // Ensure DATABASE_URL is set
// if (!env.DATABASE_URL) {
//   throw new Error('DATABASE_URL must be set');
// }

// // Create postgres SQL client with connection pooling
// const sql = postgres(env.DATABASE_URL, {
//   max: 10, // Connection pool size
//   idle_timeout: 30, // Idle connection timeout in seconds
//   connect_timeout: 10, // Connection timeout in seconds
//   types: {
//     // Register custom type parsers if needed
//     date: {
//       to: 1184, // timestamp type OID
//       from: [1082, 1083, 1114, 1184], // date, time, timestamp, timestamptz
//       serialize: (date: Date) => date,
//       parse: (str: string) => new Date(str)
//     }
//   },
//   transform: {
//     // By default, transform snake_case column names to camelCase in result objects
//     column: {
//       from: (name) => name // Keep names as-is from database
//     }
//   }
// });

// // Ensure database and schema exists
// async function initDatabase() {
//   try {
//     // Apply schema
//     const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
//     if (fs.existsSync(schemaPath)) {
//       const schema = fs.readFileSync(schemaPath, 'utf-8');
//       const statements = splitStatements(schema)
//         .map((stmt) => {
//           const lines = stmt.split('\n');
//           let start = 0;
//           while (
//             start < lines.length &&
//             (lines[start].trim() === '' || lines[start].trim().startsWith('--'))
//           ) {
//             start++;
//           }
//           return lines.slice(start).join('\n').trim();
//         })
//         .filter((stmt) => stmt.length > 0);

//       for (const stmt of statements) {
//         try {
//           await sql.unsafe(stmt);
//         } catch (err: any) {
//           if (err.code === '42710' || err.message?.includes('already exists')) {
//             // Ignore already exists errors for idempotence
//             continue;
//           }
//           console.warn('Schema application warning:', err.message);
//           // Continue execution despite errors - more forgiving approach
//         }
//       }
//       console.log('Schema applied successfully');
//     }
//   } catch (err) {
//     console.error('Database initialization error:', err);
//   }
// }

// // Utility to split SQL statements properly
// function splitStatements(sqlText: string): string[] {
//   const stmts: string[] = [];
//   let current = '';
//   let inDollar = false;
//   for (let i = 0; i < sqlText.length; i++) {
//     if (sqlText[i] === '$' && sqlText[i + 1] === '$') {
//       inDollar = !inDollar;
//       current += '$$';
//       i++;
//     } else if (sqlText[i] === ';' && !inDollar) {
//       if (current.trim()) stmts.push(current.trim());
//       current = '';
//     } else {
//       current += sqlText[i];
//     }
//   }
//   if (current.trim()) stmts.push(current.trim());
//   return stmts;
// }

// // Initialize database on startup
// initDatabase().catch(console.error);

// export default sql;
