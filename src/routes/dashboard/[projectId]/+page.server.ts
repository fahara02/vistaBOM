// src/routes/dashboard/[projectId]/+page.server.ts
import type { PageServerLoad } from './$types';
import type { User, Project } from '$lib/server/db/types';
import client from '$lib/server/db/index';
import { redirect } from '@sveltejs/kit';

// Load a single project by ID
export const load: PageServerLoad = async ({ locals, params }) => {
  const user = locals.user as User | null;
  if (!user) throw redirect(302, '/');
  const projectId = params.projectId;
  const result = await client.query<Project>(
    `SELECT id, project_name AS "projectName", created_at AS "createdAt", user_id AS "userId"
     FROM "Project" WHERE user_id = $1 AND id = $2`,
    [user.id, projectId]
  );
  if (!result.rows.length) throw redirect(302, '/dashboard');
  // Convert raw result row to array for destructuring
  const raw = result.rows[0] as unknown as any[];
  const [id, projectName, createdAt, userId] = raw;
  const project: Project = { id, projectName, createdAt, userId };
  return { user, project };
};