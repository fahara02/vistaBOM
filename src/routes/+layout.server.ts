// src/routes/+layout.server.ts
import sql from '$lib/server/db/index';
import type { User } from '@/types/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	console.log('DEBUG: layout.server.ts token', token);
	if (!token) {
		return { user: null };
	}

	// Use porsager/postgres template literals for the session query
	const result = await sql`
		SELECT
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
		WHERE s.id = ${token} AND s.expires_at > NOW()
	`;

	if (result.length === 0) return { user: null };
	// With porsager/postgres, we get the object directly
	const sessionUser = result[0];
	return { user: sessionUser };
};
