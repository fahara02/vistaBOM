//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import type { LifecycleStatusEnum, Project, User } from '$lib/server/db/types';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user as User | null;
	if (!user) throw redirect(302, '/');
	// Use porsager/postgres template literals for queries
	const result = await sql`
		SELECT 
			id, 
			name, 
			description, 
			owner_id AS "ownerId", 
			status,
			created_at AS "createdAt", 
			updated_by AS "updatedBy", 
			updated_at AS "updatedAt"
		FROM "Project" 
		WHERE owner_id = ${user.id}
	`;

	// With porsager/postgres, results are direct objects
	// Each row already has all Project properties, just need to handle optional fields
	const projects: Project[] = result.map(proj => {
		return {
			id: proj.id,
			name: proj.name,
			ownerId: proj.ownerId,
			status: proj.status,
			createdAt: proj.createdAt,
			updatedAt: proj.updatedAt,
			// Optional fields with undefined fallback
			description: proj.description ?? undefined,
			updatedBy: proj.updatedBy ?? undefined
		} as Project;
	});
	return { projects };
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user as User | null;
		if (!user) throw redirect(302, '/');
		const data = await event.request.formData();
		const name = data.get('name'); // Match Project interface
		if (typeof name !== 'string' || name.trim() === '') {
			return fail(400, { message: 'Project name is required' });
		}
		try {
			const newId = randomUUID();
			// Use template literals for INSERT operation
			await sql`
				INSERT INTO "Project"(id, name, owner_id) 
				VALUES (${newId}, ${name}, ${user.id})
			`;
		} catch (error: unknown) {
			const pgError = error as { code?: string };
			if (pgError.code === '23505') {
				return fail(400, { message: 'Project name already exists for this user' });
			}
			throw error;
		}
		throw redirect(302, '/dashboard');
	}
};
