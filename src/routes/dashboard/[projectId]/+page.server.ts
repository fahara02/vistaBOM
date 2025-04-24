// @ts-nocheck
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';

// Load project details
export async function load({ params, locals }) {
  const user = locals.user;
  if (!user) throw redirect(302, '/');

  // ignore TS error for stale Prisma types
  // @ts-ignore
  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project || project.userId !== user.id) throw redirect(302, '/dashboard');
  return { project };
}
