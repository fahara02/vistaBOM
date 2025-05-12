// src/routes/dashboard/[projectId]/+page.server.ts
import sql from '$lib/server/db/index';
import type { Project, User, LifecycleStatusEnum } from '$lib/server/db/types';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Load a single project by ID
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user as User | null;
	if (!user) throw redirect(302, '/');
	const projectId = params.projectId;

	// Query all fields from the Project table using template literals
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
		WHERE owner_id = ${user.id} AND id = ${projectId}
	`;

	// Redirect if no project is found
	if (result.length === 0) throw redirect(302, '/dashboard');

	// With porsager/postgres, we get the object directly
	const project: Project = {
		id: result[0].id,
		name: result[0].name,
		description: result[0].description || undefined,
		ownerId: result[0].ownerId,
		status: result[0].status as LifecycleStatusEnum,
		createdAt: result[0].createdAt,
		updatedBy: result[0].updatedBy || undefined,
		updatedAt: result[0].updatedAt
	};

	return { user, project };
};
