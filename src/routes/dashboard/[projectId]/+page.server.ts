// src/routes/dashboard/[projectId]/+page.server.ts
import client from '$lib/server/db/index';
import type { Project, User, LifecycleStatusEnum } from '$lib/server/db/types';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Load a single project by ID
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user as User | null;
	if (!user) throw redirect(302, '/');
	const projectId = params.projectId;

	// Query all fields from the Project table
	const result = await client.query<Project>(
		`SELECT
         id,
         name,
         description,
         owner_id AS "ownerId",
         status,
         created_at AS "createdAt",
         updated_by AS "updatedBy",
         updated_at AS "updatedAt"
       FROM "Project"
       WHERE owner_id = $1 AND id = $2`,
		[user.id, projectId]
	);

	// Redirect if no project is found
	if (!result.rows.length) throw redirect(302, '/dashboard');

	// Map row to Project object
	const row = result.rows[0];
	const project: Project = {
		id: row.get('id') as string,
		name: row.get('name') as string,
		description: row.get('description') as string | undefined,
		ownerId: row.get('ownerId') as string,
		status: row.get('status') as LifecycleStatusEnum,
		createdAt: row.get('createdAt') as Date,
		updatedBy: row.get('updatedBy') as string | undefined,
		updatedAt: row.get('updatedAt') as Date
	};

	return { user, project };
};
