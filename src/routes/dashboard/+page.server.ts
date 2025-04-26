//src/routes/dashboard/+page.server.ts
import client from '$lib/server/db/index';
import type { User, Project } from '$lib/server/db/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user as User | null;
  if (!user) throw redirect(302, '/');
  const result = await client.query<Project>(
    `SELECT id, project_name AS "projectName", created_at AS "createdAt", user_id AS "userId"
       FROM "Project" WHERE user_id = $1`,
    [user.id]
  );
  // Map ts-postgres tuple rows to Project objects
  const projects = result.rows.map((row) => ({
    id: row[0],
    projectName: row[1],
    createdAt: row[2],
    userId: row[3]
  }));
  // Return only projects so layout's user (with avatar and fullName) is preserved
  return { projects };
};

export const actions: Actions = {
  default: async (event) => {
    const user = event.locals.user as User | null;
    if (!user) throw redirect(302, '/');
    
    const data = await event.request.formData();
    const projectName = data.get('projectName');
    
    if (typeof projectName !== 'string' || projectName.trim() === '') {
      return fail(400, { message: 'Project name is required' });
    }
    
    try {
      const newId = randomUUID();
      await client.query(
        `INSERT INTO "Project"(id, project_name, user_id) VALUES ($1, $2, $3)`,
        [newId, projectName, user.id]
      );
    } catch (error) {
      if ((error as any).code === '23505') {
        return fail(400, { message: 'Project name already exists' });
      }
      throw error;
    }
    
    throw redirect(302, '/dashboard');
  }
};