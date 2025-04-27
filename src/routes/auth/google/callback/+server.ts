//src/routes/auth/google/callback/+server.ts

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$lib/env';
import { createSession, generateSessionToken } from '$lib/server/auth';
import client from '$lib/server/db/index';
import type { User } from '$lib/server/db/types';
import type { RequestEvent } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export async function GET({ url, cookies }: RequestEvent) {
	const code = url.searchParams.get('code');
	if (!code) throw error(400, 'Missing code');

	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: `${url.origin}/auth/google/callback`,
			grant_type: 'authorization_code'
		})
	});
	const tokenData = await tokenRes.json();
	if (!tokenRes.ok) throw error(500, 'Token exchange failed');

	const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: { Authorization: `Bearer ${tokenData.access_token}` }
	});
	const userInfo = await userRes.json();
	if (!userRes.ok) throw error(500, 'Failed to fetch user info');

	function rowToUser(raw: any): User {
		const [
			id,
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
		] = raw;
		return {
			id,
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
		};
	}

	let user: User;
	const find = await client.query(
		`SELECT id, username, email, full_name AS "fullName", password_hash AS "passwordHash", 
            google_id AS "googleId", avatar_url AS "avatarUrl", created_at AS "createdAt", 
            updated_at AS "updatedAt", last_login_at AS "lastLoginAt", is_active AS "isActive", 
            is_admin AS "isAdmin", is_deleted AS "isDeleted"
     FROM "User" WHERE google_id = $1 OR email = $2`,
		[userInfo.id, userInfo.email]
	);

	if (find.rows.length > 0) {
		user = rowToUser(find.rows[0]);
		if (!user.googleId || user.avatarUrl !== userInfo.picture) {
			const upd = await client.query(
				`UPDATE "User" SET google_id = $1, avatar_url = $2 WHERE id = $3
         RETURNING id, username, email, full_name AS "fullName", password_hash AS "passwordHash", 
                  google_id AS "googleId", avatar_url AS "avatarUrl", created_at AS "createdAt", 
                  updated_at AS "updatedAt", last_login_at AS "lastLoginAt", is_active AS "isActive", 
                  is_admin AS "isAdmin", is_deleted AS "isDeleted"`,
				[userInfo.id, userInfo.picture, user.id]
			);
			user = rowToUser(upd.rows[0]);
		}
	} else {
		const newId = randomUUID();
		const ins = await client.query(
			`INSERT INTO "User"(id, email, full_name, google_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name AS "fullName", password_hash AS "passwordHash", 
                google_id AS "googleId", avatar_url AS "avatarUrl", created_at AS "createdAt", 
                updated_at AS "updatedAt", last_login_at AS "lastLoginAt", is_active AS "isActive", 
                is_admin AS "isAdmin", is_deleted AS "isDeleted"`,
			[newId, userInfo.email, userInfo.name, userInfo.id, userInfo.picture]
		);
		user = rowToUser(ins.rows[0]);
	}

	if (!user) throw error(500, 'User creation failed');

	const sessionToken = generateSessionToken();
	await createSession(sessionToken, user.id);

	const isDev = import.meta.env.DEV;
	cookies.set('auth-session', sessionToken, {
		path: '/',
		httpOnly: true,
		secure: !isDev,
		sameSite: isDev ? 'lax' : 'none',
		maxAge: 60 * 60 * 24 * 30
	});

	throw redirect(303, '/dashboard');
}
