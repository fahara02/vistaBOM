//src/lib/server/auth.ts
import sql from '$lib/server/db/postgres';
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
	await sql`
		INSERT INTO "Session" (id, user_id, expires_at, last_used)
		VALUES (${token}, ${userId}, ${expiresAt}, ${lastUsed})
	`;
	return { id: token, userId, expiresAt, lastUsed };
}

export async function validateSessionToken(
	token: string
): Promise<{ session: Session | null; user: User | null }> {
	const sessionId = token;
	const rows = await sql`
	  SELECT
	    s.id AS session_id,
	    s.user_id AS session_user_id,
	    s.expires_at AS expires_at,
	    u.id AS usr_id,
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
	  JOIN "User" u ON s.user_id = u.id
	  WHERE s.id = ${token}
	`;
	if (!rows || !Array.isArray(rows)) {
		return { session: null, user: null };
	}
	
	if (!rows.length) return { session: null, user: null };
	const row = rows[0];
	const session: Session = { 
		id: row.session_id, 
		userId: row.session_user_id, 
		expiresAt: row.expires_at, 
		lastUsed: new Date() 
	};
	const user: User = {
		id: row.usr_id,
		username: row.username,
		email: row.email,
		fullName: row.full_name,
		passwordHash: row.password_hash,
		googleId: row.google_id,
		avatarUrl: row.avatar_url,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
		lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
		isActive: row.is_active,
		isAdmin: row.is_admin,
		isDeleted: row.is_deleted
	};

	// Session expiration and renewal logic remains unchanged
	if (Date.now() >= session.expiresAt.getTime()) {
		await sql`DELETE FROM "Session" WHERE id = ${row.session_id}`;
		return { session: null, user: null };
	}
	const renewThreshold = session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (Date.now() >= renewThreshold) {
		const newExpiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await sql`UPDATE "Session" SET expires_at = ${newExpiresAt} WHERE id = ${session.id}`;
		session.expiresAt = newExpiresAt;
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
