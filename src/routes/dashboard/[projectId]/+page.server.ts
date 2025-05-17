// src/routes/dashboard/[projectId]/+page.server.ts
import sql from '$lib/server/db/index';
import type { Project, User, LifecycleStatusEnum } from '$lib/types/types';
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
			project_id,
			project_name,
			project_description,
			owner_id,
			project_status,
			created_at,
			updated_by,
			updated_at,
            custom_fields
		FROM "Project"
		WHERE owner_id = ${user.user_id} AND project_id = ${projectId}
	`;

	// Redirect if no project is found
	if (result.length === 0) throw redirect(302, '/dashboard');

	// With porsager/postgres, we get the object directly
	const project: Project = {
		project_id: result[0].project_id,
		project_name: result[0].project_name,
		project_description: result[0].project_description || undefined,
		owner_id: result[0].owner_id,
		project_status: result[0].project_status as LifecycleStatusEnum,
		created_at: result[0].created_at,
		updated_by: result[0].updated_by || undefined,
		updated_at: result[0].updated_at,
        custom_fields: result[0].custom_fields || undefined
	};

	return { user, project };
};
