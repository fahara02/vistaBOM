// src/routes/+layout.server.ts
import sql from '$lib/server/db/index';
import type { User } from '@/types/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
//	console.log('DEBUG: layout.server.ts token', token);
	if (!token) {
		return { user: null };
	}

	// Use porsager/postgres template literals for the session query
	const result = await sql`
		SELECT
		   u.user_id,
		   u.username,
		   u.email,
		   u.full_name,
		   u.password_hash,
		   u.google_id,
		   u.avatar_url,
		   u.created_at,
		   u.updated_at,
		   u.last_login_at,
		   u.is_active,
		   u.is_admin,
		   u.is_deleted
		FROM "Session" s
		JOIN "User" u ON s.user_id = u.user_id
		WHERE s.session_id = ${token} AND s.expires_at > NOW()
	`;

	if (result.length === 0) return { user: null };
	
	// Convert database result to User object with proper field names
	const row = result[0];
	const user: User = {
		user_id: row.user_id,
		username: row.username,
		email: row.email,
		full_name: row.full_name,
		password_hash: row.password_hash,
		google_id: row.google_id,
		avatar_url: row.avatar_url,
		created_at: row.created_at ? new Date(row.created_at) : new Date(),
		updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
		last_login_at: row.last_login_at ? new Date(row.last_login_at) : null,
		is_active: row.is_active,
		is_admin: row.is_admin,
		is_deleted: row.is_deleted
	};
	
	return { user };
};
