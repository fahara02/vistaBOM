//src/routes/catagory/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { getCategoryTree, createCategory } from '@/core/category';
import { categorySchema } from '@/schema/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

// pick only create fields
const createCategorySchema = categorySchema.pick({
  name: true,
  parent_id: true,
  description: true,
  is_public: true
});

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Call getCategoryTree without parameters
  const categories = await getCategoryTree();
  const form = await superValidate(event, zod(createCategorySchema), { id: 'create-category' });
  return { user, categories, form };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const form = await superValidate(request, zod(createCategorySchema), { id: 'create-category' });
    if (!form.valid) return fail(400, { form });
    // Call createCategory with just the parameters object
    await createCategory({
      name: form.data.name,
      parentId: form.data.parent_id ?? undefined,
      description: form.data.description ?? undefined,
      isPublic: form.data.is_public,
      createdBy: locals.user.id
    });
    throw redirect(303, '/catagory');
  }
};