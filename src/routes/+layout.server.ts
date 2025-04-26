// src/routes/+layout.server.ts
import client from '$lib/server/db/index';
import type { User } from '$lib/server/db/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get('auth-session');
  console.log('DEBUG: layout.server.ts token', token);
  if (!token) {
    return { user: null };
  }

  // Query session and map tuple row to User
  const result = await client.query(
    `SELECT
       u.id,
       u.age,
       u.username,
       u.email,
       u.full_name AS "fullName",
       u.password_hash AS "passwordHash",
       u.google_id AS "googleId",
       u.avatar_url AS "avatarUrl"
     FROM "Session" s
     JOIN "User" u ON s.user_id = u.id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [token]
  ) as unknown as { rows: unknown[] };
  const rows = result.rows;
  if (!rows.length) return { user: null };
  const raw = rows[0] as unknown as any[];
  const [id, age, username, email, fullName, passwordHash, googleId, avatarUrl] = raw;
  const sessionUser: User = { id, age, username, email, fullName, passwordHash, googleId, avatarUrl };
  return { user: sessionUser };
};