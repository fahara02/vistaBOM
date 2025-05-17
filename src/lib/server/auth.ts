//src/lib/server/auth.ts
import sql from '$lib/server/db/postgres';
import type { Session, User } from '@/types/types';
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
	// Create Date objects
	const expires_at = new Date(Date.now() + 30 * DAY_IN_MS);
	const last_used = new Date();
	
	// Format dates as ISO strings for postgres.js compatibility
	const expiresAtStr = expires_at.toISOString();
	const lastUsedStr = last_used.toISOString();
	
	await sql`
		INSERT INTO "Session" (session_id, user_id, expires_at, last_used)
		VALUES (${token}, ${userId}, ${expiresAtStr}::timestamp, ${lastUsedStr}::timestamp)
	`;
	return { session_id: token, user_id: userId, expires_at, last_used };
}

export async function validateSessionToken(
	token: string
): Promise<{ session: Session | null; user: User | null }> {
	const sessionId = token;
	const rows = await sql`
	  SELECT
	    s.session_id AS session_id,
	    s.user_id AS session_user_id,
	    s.expires_at AS expires_at,
	    u.user_id AS usr_id,
	    u.username AS username,
	    u.email AS email,
	    u.full_name AS full_name,
	    u.password_hash AS password_hash,
	    u.google_id AS google_id,
	    u.avatar_url AS avatar_url,
	    u.created_at AS created_at,
	    u.updated_at AS updated_at,
	    u.last_login_at AS last_login_at,
	    u.is_active AS is_active,
	    u.is_admin AS is_admin,
	    u.is_deleted AS is_deleted
	  FROM "Session" s
	  JOIN "User" u ON s.user_id = u.user_id
	  WHERE s.session_id = ${token}
	`;
	if (!rows || !Array.isArray(rows)) {
		return { session: null, user: null };
	}
	
	if (!rows.length) return { session: null, user: null };
	const row = rows[0];
	const session: Session = { 
		session_id: row.session_id, 
		user_id: row.session_user_id, 
		expires_at: row.expires_at, 
		last_used: new Date() 
	};
	const user: User = {
		user_id: row.usr_id,
		username: row.username,
		email: row.email,
		full_name: row.full_name,
		password_hash: row.password_hash,
		google_id: row.google_id,
		avatar_url: row.avatar_url,
		created_at: new Date(row.created_at),
		updated_at: new Date(row.updated_at),
		last_login_at: row.last_login_at ? new Date(row.last_login_at) : null,
		is_active: row.is_active,
		is_admin: row.is_admin,
		is_deleted: row.is_deleted
	};

	// Session expiration and renewal logic remains unchanged
	if (Date.now() >= session.expires_at.getTime()) {
		await sql`DELETE FROM "Session" WHERE session_id = ${row.session_id}`;
		return { session: null, user: null };
	}
	const renewThreshold = session.expires_at.getTime() - DAY_IN_MS * 15;
	if (Date.now() >= renewThreshold) {
		const newExpiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		// Convert to ISO string for postgres.js
		const newExpiresAtStr = newExpiresAt.toISOString();
		await sql`UPDATE "Session" SET expires_at = ${newExpiresAtStr}::timestamp WHERE session_id = ${session.session_id}`;
		session.expires_at = newExpiresAt;
	}
	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string): Promise<void> {
	await sql`DELETE FROM "Session" WHERE id = ${sessionId}`;
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
