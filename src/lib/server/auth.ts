//src/lib/server/auth.ts
import client from '$lib/server/db/index';
import type { Session, User } from '$lib/server/db/types';
import { encodeBase64url } from '@oslojs/encoding';
import type { RequestEvent } from '@sveltejs/kit';
import { randomBytes } from 'crypto';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken(): string {
	const bytes = randomBytes(18);
	return encodeBase64url(bytes);
}

// src/lib/server/auth.ts
export async function createSession(token: string, userId: string): Promise<Session> {
	const expiresAt = new Date(Date.now() + 30 * DAY_IN_MS);
	const lastUsed = new Date();
	await client.query(
		`INSERT INTO "Session" (id, user_id, expires_at, last_used)
     VALUES ($1, $2, $3, $4)`,
		[token, userId, expiresAt, lastUsed]
	);
	return { id: token, userId, expiresAt, lastUsed };
}

export async function validateSessionToken(
	token: string
): Promise<{ session: Session | null; user: User | null }> {
	const sessionId = token;
	const result = (await client.query(
		`SELECT
       s.id,
       s.user_id,
       s.expires_at,
       u.id,
       u.username,
       u.email,
       u.full_name AS "fullName",
       u.password_hash AS "passwordHash",
       u.google_id AS "googleId",
       u.avatar_url AS "avatarUrl",
       u.created_at AS "createdAt",
       u.updated_at AS "updatedAt",
       u.last_login_at AS "lastLoginAt",
       u.is_active AS "isActive",
       u.is_admin AS "isAdmin",
       u.is_deleted AS "isDeleted"
     FROM "Session" s
     JOIN "User" u ON s.user_id = u.id
     WHERE s.id = $1`,
		[sessionId]
	)) as unknown as { rows: unknown[] };
	if (!result || typeof result !== 'object' || !('rows' in result) || !Array.isArray(result.rows)) {
		return { session: null, user: null };
	}
	const rows = result.rows;
	if (!rows.length) return { session: null, user: null };
	const [
		sessId,
		sessUserId,
		expiresRaw,
		usrId,
		username,
		email,
		fullName,
		passwordHash,
		googleId,
		avatarUrl,
		createdAt,
		updatedAt,
		lastLoginAt,
		isActive,
		isAdmin,
		isDeleted
	] = rows[0] as any[];
	const expiresAt = expiresRaw instanceof Date ? expiresRaw : new Date(expiresRaw as string);
	const session: Session = { id: sessId, userId: sessUserId, expiresAt, lastUsed: new Date() }; // lastUsed added below
	const user: User = {
		id: usrId,
		username,
		email,
		fullName,
		passwordHash,
		googleId,
		avatarUrl,
		createdAt: new Date(createdAt),
		updatedAt: new Date(updatedAt),
		lastLoginAt: lastLoginAt ? new Date(lastLoginAt) : null,
		isActive,
		isAdmin,
		isDeleted
	};

	// Session expiration and renewal logic remains unchanged
	if (Date.now() >= session.expiresAt.getTime()) {
		await client.query(`DELETE FROM "Session" WHERE id = $1`, [session.id]);
		return { session: null, user: null };
	}
	const renewThreshold = session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (Date.now() >= renewThreshold) {
		const newExpiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await client.query(`UPDATE "Session" SET expires_at = $1 WHERE id = $2`, [
			newExpiresAt,
			session.id
		]);
		session.expiresAt = newExpiresAt;
	}
	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string): Promise<void> {
	await client.query(`DELETE FROM "Session" WHERE id = $1`, [sessionId]);
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}
