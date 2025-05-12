/**
 * Database client exports
 * Provides unified access to the database client and helper functions
 * src/lib/server/db/index.ts
 */

// Import from the consolidated postgres client file
import sql, { toJsonB } from './postgres';

// Legacy compatibility function for code still using the old client pattern
export function getClient() {
  return sql;
}

// Re-export helper functions
export { toJsonB };

// Default export the SQL client for direct import
export default sql;
