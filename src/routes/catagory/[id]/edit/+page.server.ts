import { error, redirect } from '@sveltejs/kit';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import { superValidate } from 'sveltekit-superforms/server';
import type { PageServerLoad, Actions } from './$types';
import { sql } from '$lib/server/db';
import type { Category } from '$lib/server/db/types';

// Define schema for category validation
const schema = zfd.formData({
  name: zfd.text(z.string().min(1, 'Name is required')),
  description: zfd.text(z.string().optional()),
  parent_id: zfd.text(z.string().optional()),
  is_public: zfd.checkbox(),
  // Make these optional to avoid validation errors
  created_at: zfd.text(z.string().optional()),
  updated_at: zfd.text(z.string().optional()),
  path: zfd.text(z.string().optional()),
  // Add field for custom fields
  customFieldsJson: zfd.text(z.string().optional())
});

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
    if (category.createdBy !== user.id) {
      // Read-only mode for non-creators
      throw error(403, 'You can only edit categories you created');
    }

    // Fetch custom fields
    const customFields = await sql`
      SELECT cf.field_name, cf.data_type, cf.id as field_id, ccf.value
      FROM customfield cf
      LEFT JOIN categorycustomfield ccf ON cf.id = ccf.field_id AND ccf.category_id = ${params.id}
      WHERE cf.applies_to = 'category'
    `;

    // Transform custom fields into a more usable structure
    const customFieldsMap: Record<string, any> = {};
    for (const field of customFields) {
      if (field.value) {
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(field.value);
        } catch (e) {
          console.error(`Error parsing custom field value: ${e}`);
          parsedValue = field.value; // Use as is if can't parse
        }
        customFieldsMap[field.field_name] = parsedValue;
      }
    }

    // Fetch all categories for parent selection
    const allCategories = await sql`
      SELECT id, name FROM category 
      WHERE id != ${params.id} AND is_deleted = false
      ORDER BY name
    `;

    // Create form with existing data
    const form = await superValidate({
      name: category.name,
      description: category.description || '',
      parent_id: category.parentId || '',
      is_public: category.isPublic,
      created_at: category.createdAt.toISOString(),
      updated_at: category.updatedAt?.toISOString() || '',
      path: category.path,
      customFieldsJson: Object.keys(customFieldsMap).length > 0 
        ? JSON.stringify(customFieldsMap, null, 2) 
        : ''
    }, schema);

    return { 
      form, 
      category,
      categories: allCategories,
      customFields: customFields.map((cf: any) => ({
        id: cf.field_id,
        name: cf.field_name,
        type: cf.data_type
      }))
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

    const form = await superValidate(request, schema);

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
      if (category.createdBy !== user.id) {
        throw error(403, 'You can only edit categories you created');
      }

      const { 
        name, 
        description, 
        parent_id, 
        is_public, 
        customFieldsJson 
      } = form.data;

      // Update the category
      await sql`
        UPDATE category 
        SET 
          name = ${name},
          description = ${description || null},
          parent_id = ${parent_id || null},
          is_public = ${is_public},
          updated_by = ${user.id},
          updated_at = NOW()
        WHERE id = ${params.id}
      `;

      // Process custom fields if provided
      if (customFieldsJson && customFieldsJson.trim()) {
        try {
          const customFields = JSON.parse(customFieldsJson);
          
          // Delete existing custom fields
          await sql`
            DELETE FROM categorycustomfield 
            WHERE category_id = ${params.id}
          `;
          
          // Add new custom fields
          for (const [fieldName, fieldValue] of Object.entries(customFields)) {
            // Check if field exists
            const fieldCheck = await sql`
              SELECT id FROM customfield 
              WHERE field_name = ${fieldName} AND applies_to = 'category'
            `;
            
            let fieldId;
            if (fieldCheck.length === 0) {
              // Create a new custom field
              const dataType = typeof fieldValue === 'boolean' ? 'boolean' :
                               typeof fieldValue === 'number' ? 'number' : 'text';
              
              const newField = await sql`
                INSERT INTO customfield (field_name, data_type, applies_to)
                VALUES (${fieldName}, ${dataType}, 'category')
                RETURNING id
              `;
              fieldId = newField[0].id;
            } else {
              fieldId = fieldCheck[0].id;
            }
            
            // Insert the custom field value
            await sql`
              INSERT INTO categorycustomfield (category_id, field_id, value)
              VALUES (${params.id}, ${fieldId}, ${JSON.stringify(fieldValue)})
            `;
          }
        } catch (e) {
          console.error('Error processing custom fields:', e);
          throw error(400, 'Invalid custom fields format');
        }
      }

      throw redirect(303, `/catagory`);
    } catch (err) {
      if (err instanceof Error) {
        return { form, error: err.message };
      }
      return { form, error: 'An error occurred while updating the category' };
    }
  }
};
