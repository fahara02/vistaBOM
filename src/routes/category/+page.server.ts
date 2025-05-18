//src/routes/category/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { getAllCategories, createCategory, type UiCategory } from '$lib/core/category';
import { categorySchema } from '$lib/schema/schema';
import { z } from 'zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

// Create a new schema with only the fields we need for category creation
const createCategorySchema = z.object({
  category_name: z.string().min(1),
  parent_id: z.string().uuid().optional().nullable(),
  category_description: z.string().optional().nullable(),
  is_public: z.boolean().default(true)
});

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Use getAllCategories with explicit filtering to ensure consistency with dashboard
  // This ensures deleted categories are properly filtered out
  const getAllCategoriesOptions = {
    excludeDeleted: true,  // This is critical - ensures we don't show deleted categories
    // We don't filter by isPublic here to allow admins to see all categories
  };
  
  console.log('Loading categories with options:', getAllCategoriesOptions);
  const categories = await getAllCategories(getAllCategoriesOptions);
  console.log(`Loaded ${categories.length} categories`);
  
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
      name: form.data.category_name,
      // Convert null to undefined using nullish coalescing
      parentId: form.data.parent_id === null ? undefined : form.data.parent_id,
      description: form.data.category_description === null ? undefined : form.data.category_description,
      isPublic: form.data.is_public ?? true,
      createdBy: locals.user.user_id
    });
    throw redirect(303, '/category');
  }
};