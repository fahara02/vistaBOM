import { error, redirect } from '@sveltejs/kit';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import type { Category } from '$lib/server/db/types';

// Define schema for category validation
const rawSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parent_id: z.string().optional(),
  is_public: z.boolean(),
  // Make these optional to avoid validation errors
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  path: z.string().optional(),
  // Add field for custom fields
  customFieldsJson: z.string().optional()
});

// Convert to form data schema for proper form handling
const schema = zfd.formData({
  name: zfd.text(z.string().min(1, 'Name is required')),
  description: zfd.text(z.string().optional()),
  parent_id: zfd.text(z.string().optional()),
  is_public: zfd.checkbox(),
  created_at: zfd.text(z.string().optional()),
  updated_at: zfd.text(z.string().optional()),
  path: zfd.text(z.string().optional()),
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

    // Fetch all categories for parent selection - optimized for combobox
    // Only fetch the minimum needed fields (id, name) and add name search index
    const allCategories = await sql`
      SELECT id, name, path FROM category 
      WHERE id != ${params.id} AND is_deleted = false
      ORDER BY name ASC
      LIMIT 1000 -- Practical limit for UI performance
    `;

    // Create form with schema first, then update its data
    const form = await superValidate(zod(rawSchema));
    
    // Set the form data
    form.data = {
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
    };

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

    const form = await superValidate(request, zod(rawSchema));

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
          name = ${name as string},
          description = ${description ? String(description) : null},
          parent_id = ${parent_id ? String(parent_id) : null},
          is_public = ${Boolean(is_public)},
          updated_at = NOW(),
          updated_by = ${String(user.id)}
        WHERE id = ${String(params.id)}
      `;

      // Process custom fields if provided
      if (customFieldsJson && typeof customFieldsJson === 'string' && customFieldsJson.trim()) {
        try {
          const customFields = JSON.parse(customFieldsJson as string);
          
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
