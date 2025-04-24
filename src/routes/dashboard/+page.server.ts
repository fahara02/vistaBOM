import { prisma } from '$lib/server/db/prisma';
import { Prisma } from '@prisma/client';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) {
    throw redirect(302, '/');
  }
  
  const projects = await prisma.project.findMany({
    where: { userId: user.id }
  });
  
  return {
    user,
    projects
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = event.locals.user;
    if (!user) {
      throw redirect(302, '/');
    }
    
    const data = await event.request.formData();
    const projectName = data.get('projectName');
    
    if (typeof projectName !== 'string' || projectName.trim() === '') {
      return fail(400, { message: 'Project name is required' });
    }
    
    try {
      await prisma.project.create({
        data: {
          projectName,
          userId: user.id
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return fail(400, { message: 'Project name already exists' });
      }
      throw error;
    }
    
    throw redirect(302, '/dashboard');
  }
};