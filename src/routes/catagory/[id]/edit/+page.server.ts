import sql from '$lib/server/db';
import { categorySchema } from '@/schema/schema';
import type { Category } from '@/types/types';
import { error, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';





export const load: PageServerLoad = async ({ params, locals }) => {
  const { user } = locals;

  if (!user) {
    throw redirect(302, '/login');
  }

  try {
    // Fetch the category by ID
    const categoryData = await sql`
      SELECT * FROM category WHERE id = ${params.id}
    `;

    if (categoryData.length === 0) {
      throw error(404, 'Category not found');
    }

    const category = categoryData[0] as Category;

    // Check if the current user is the creator
    if (category.created_by !== user.id) {
      // Read-only mode for non-creators
      throw error(403, 'You can only edit categories you created');
    }

 



    // Fetch all categories for parent selection - optimized for combobox
    // Only fetch the minimum needed fields (id, name) and add name search index
    const allCategories = await sql`
      SELECT id, name, path FROM category 
      WHERE id != ${params.id} AND is_deleted = false
      ORDER BY name ASC
      LIMIT 1000 -- Practical limit for UI performance
    `;

    // Create form with schema first, then update its data
    const form = await superValidate(zod(categorySchema));
    
    // Set the form data
    form.data = {
      category_id:category.category_id,
      category_name: category.category_name,
      category_description: category.category_description || '',
      parent_id: category.parent_id || '',
      is_public: category.is_public,
      created_at: category.created_at ? new Date(category.created_at): new Date(),
      updated_at: category.updated_at?  new Date(category.updated_at): new Date(),
      category_path: category.category_path,
      
    
    };

    return { 
      form, 
      category,
      categories: allCategories,
   
    };
  } catch (err) {
    console.error('Error loading category data:', err);
    throw error(500, 'Error loading category data');
  }
};

export const actions: Actions = {
  default: async ({ params, request, locals }) => {
    const { user } = locals;
    
    if (!user) {
      throw error(401, 'You must be logged in to edit a category');
    }

    const form = await superValidate(request, zod(categorySchema));

    if (!form.valid) {
      return { form };
    }

    try {
      // Check if category exists and is owned by user
      const categoryCheck = await sql`
        SELECT * FROM category WHERE id = ${params.id}
      `;

      if (categoryCheck.length === 0) {
        throw error(404, 'Category not found');
      }

      const category = categoryCheck[0] as Category;
      if (category.created_by !== user.id) {
        throw error(403, 'You can only edit categories you created');
      }

      const { 
        category_name, 
        category_description, 
        parent_id, 
        is_public, 
        
      } = form.data;

      // Update the category
      await sql`
        UPDATE category 
        SET 
          category_name = ${category_name as string},
          ctegory_description = ${category_description ? String(category_description) : null},
          parent_id = ${parent_id ? String(parent_id) : null},
          is_public = ${Boolean(is_public)},
          updated_at = NOW(),
          updated_by = ${String(user.id)}
        WHERE id = ${String(params.id)}
      `;

   

      throw redirect(303, `/catagory`);
    } catch (err) {
      if (err instanceof Error) {
        return { form, error: err.message };
      }
      return { form, error: 'An error occurred while updating the category' };
    }
  }
};
