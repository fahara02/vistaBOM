//src/routes/auth/google/callback/+server.ts

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$lib/env';
import { createSession, generateSessionToken } from '$lib/server/auth';
import sql from '$lib/server/db/index'; // Using the consolidated postgres client
import type { User } from '@/types/types';
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

	// User mapping function that works with both object and array formats
	function rowToUser(row: any): User {
		// With porsager/postgres, results are objects with named properties
		if (row && typeof row === 'object' && !Array.isArray(row)) {
			// Object style access for porsager/postgres - with Date parsing
			return {
			    user_id: row.user_id,
				username: row.username,
				email: row.email,
				full_name: row.full_name,
				password_hash: row.password_hash,
				google_id: row.google_id,
				avatar_url: row.avatar_url,
				// Convert string dates to Date objects
				created_at: row.created_at ? new Date(row.created_at) : new Date(),
				updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
				last_login_at: row.last_login_at ? new Date(row.last_login_at) : null,
				is_active: row.is_active,
				is_admin: row.is_admin,
				is_deleted: row.is_deleted
			};
		} else{

       // Return empty user if we somehow got an invalid format
		   console.error('Invalid row format for user mapping:', row);
		   return {} as User;

		}

		
	}

	let user: User;

	// Use porsager/postgres template literals for queries
	const find = await sql`
		SELECT 
			user_id, 
			username, 
			email, 
			full_name, 
			password_hash, 
			google_id, 
			avatar_url, 
			created_at, 
			updated_at, 
			last_login_at, 
			is_active, 
			is_admin, 
			is_deleted
		FROM "User" 
		WHERE google_id = ${userInfo.id} OR email = ${userInfo.email}
	`;

	if (find.length > 0) {
		user = rowToUser(find[0]);

		if (!user.google_id || user.avatar_url !== userInfo.picture) {
			// Update user with Google info if needed
			const upd = await sql`
				UPDATE "User" 
				SET 
					google_id = ${userInfo.id}, 
					avatar_url = ${userInfo.picture} 
				WHERE user_id = ${user.user_id}
				RETURNING 
					user_id, 
					username, 
					email, 
					full_name, 
					password_hash, 
					google_id, 
					avatar_url, 
					created_at, 
					updated_at, 
					last_login_at, 
					is_active, 
					is_admin, 
					is_deleted
			`;
			user = rowToUser(upd[0]);
		}
	} else {
		// Insert new user with Google info
		const newId = randomUUID();
		const ins = await sql`
			INSERT INTO "User"(user_id, email, full_name, google_id, avatar_url)
			VALUES (
				${newId}, 
				${userInfo.email}, 
				${userInfo.name}, 
				${userInfo.id}, 
				${userInfo.picture}
			)
			RETURNING 
				user_id, 
				username, 
				email, 
				full_name, 
				password_hash, 
				google_id, 
				avatar_url, 
				created_at, 
				updated_at, 
				last_login_at, 
				is_active, 
				is_admin, 
				is_deleted
		`;
		user = rowToUser(ins[0]);
	}

	if (!user) throw error(500, 'User creation failed');

	const sessionToken = generateSessionToken();
	await createSession(sessionToken, user.user_id);

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
