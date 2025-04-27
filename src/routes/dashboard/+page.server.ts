//src/routes/dashboard/+page.server.ts
import client from '$lib/server/db/index';
import type { LifecycleStatusEnum, Project, User } from '$lib/server/db/types';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user as User | null;
	if (!user) throw redirect(302, '/');
	const result = await client.query<Project>(
		`SELECT id, name, description, owner_id AS "ownerId", status,
     created_at AS "createdAt", updated_by AS "updatedBy", updated_at AS "updatedAt"
     FROM "Project" WHERE owner_id = $1`,
		[user.id]
	);
	const projects: Project[] = result.rows.map((row) => {
		const proj = row.reify();
		return {
			...proj,
			description: proj.description ?? undefined,
			updatedBy: proj.updatedBy ?? undefined
		};
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
			await client.query(`INSERT INTO "Project"(id, name, owner_id) VALUES ($1, $2, $3)`, [
				newId,
				name,
				user.id
			]);
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
