//src/lib/server/auth.ts
import client from '$lib/server/db/index';
import type { Session, User } from '$lib/server/db/types';
import { randomBytes } from 'crypto';
import { TextEncoder } from 'util';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import type { RequestEvent } from '@sveltejs/kit';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken(): string {
  const bytes = randomBytes(18);
  return encodeBase64url(bytes);
}

// src/lib/server/auth.ts
export async function createSession(token: string, userId: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  try {
    // Insert session with direct Date object for expires_at
    await client.query(
      `INSERT INTO "Session" (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, userId, expiresAt]
    );
    return { id: token, userId, expiresAt };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

export async function validateSessionToken(token: string): Promise<{ session: Session | null; user: User | null }> {
  const sessionId = token;
  // run select and cast rows
  const result = (await client.query(
    `SELECT
       s.id,
       s.user_id,
       s.expires_at,
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
     WHERE s.id = $1`,
    [sessionId]
  )) as unknown as { rows: unknown[] };
  if (!result || typeof result !== 'object' || !('rows' in (result as any)) || !Array.isArray((result as any).rows)) {
    return { session: null, user: null };
  }
  const rows = (result as any).rows;
  if (!rows.length) return { session: null, user: null };
  // ts-postgres returns tuple arrays; destructure fields
  const raw = rows[0] as unknown as any[];
  const [sessId, sessUserId, expiresRaw, usrId, age, username, email, fullName, passwordHash, googleId, avatarUrl] = raw;
  const expiresAt = expiresRaw instanceof Date ? expiresRaw : new Date(expiresRaw as string);
  const session: Session = { id: sessId, userId: sessUserId, expiresAt };
  const user: User = { id: usrId, age, username, email, fullName, passwordHash, googleId, avatarUrl };

  if (!session || !session.expiresAt) {
    return { session: null, user: null };
  }
  // expire session
  if (Date.now() >= session.expiresAt.getTime()) {
    await client.query(`DELETE FROM "Session" WHERE id = $1`, [session.id]);
    return { session: null, user: null };
  }
  // renew session
  const renewThreshold = session.expiresAt.getTime() - DAY_IN_MS * 15;
  if (Date.now() >= renewThreshold) {
    const newExpiresAt = new Date(Date.now() + DAY_IN_MS * 30);
    await client.query(`UPDATE "Session" SET expires_at = $1 WHERE id = $2`, [newExpiresAt, session.id]);
    session.expiresAt = newExpiresAt;
  }
  return { session, user };

}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string): Promise<void> {
  await client.query(`DELETE FROM "Session" WHERE id = $1`, [sessionId]);
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
  event.cookies.set(sessionCookieName, token, {
    expires: expiresAt,
    path: '/'
  });
}

export function deleteSessionTokenCookie(event: RequestEvent) {
  event.cookies.delete(sessionCookieName, {
    path: '/'
  });
}