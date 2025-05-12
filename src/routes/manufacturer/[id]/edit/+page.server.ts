// src/routes/manufacturer/[id]/edit/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import * as z from 'zod';
import sql from '$lib/server/db/index';
import { getManufacturer, deleteManufacturer } from '$lib/server/manufacturer';
import { manufacturerSchema } from '$lib/server/db/schema';

// Create a schema for manufacturer updates, omitting fields that shouldn't be in the form
const updateManufacturerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  custom_fields_json: z.string().optional().nullable(),
  // These fields are in manufacturerSchema but should not be required in the form
  created_by: z.string().optional().nullable(),
  created_at: z.any().optional(),
  updated_by: z.string().optional().nullable(),
  updated_at: z.any().optional(),
});

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    throw redirect(302, '/login');
  }

  const manufacturerId = params.id;
  
  try {
    // Fetch the manufacturer by ID
    const manufacturer = await getManufacturer(manufacturerId);
    
    if (!manufacturer) {
      throw redirect(302, '/manufacturer');
    }
    
    // Check if the user is allowed to edit this manufacturer
    // Only the creator or admin should be able to edit
    if (manufacturer.createdBy !== user.id && user.role !== 'admin') {
      throw redirect(302, '/manufacturer');
    }
    
    // Debug logs to see what's coming from the database
    console.log('Raw manufacturer from DB:', manufacturer);
    console.log('Custom fields:', manufacturer.customFields);
    
    // Format initial data with custom fields as a JSON string
    // Map camelCase TypeScript properties to snake_case form fields
    const initialData = {
      id: manufacturer.id,
      name: manufacturer.name,
      description: manufacturer.description,
      website_url: manufacturer.websiteUrl || '', // Convert camelCase to snake_case
      logo_url: manufacturer.logoUrl || '', // Convert camelCase to snake_case
      custom_fields_json: manufacturer.customFields && Object.keys(manufacturer.customFields).length > 0
        ? JSON.stringify(manufacturer.customFields, null, 2) 
        : ''
    };
    
    console.log('Initial form data:', initialData);
    
    // Initialize the form with manufacturer data
    const form = await superValidate(initialData, zod(updateManufacturerSchema));
    
    return { 
      manufacturer, 
      form 
    };
  } catch (error) {
    console.error('Error loading manufacturer:', error);
    throw redirect(302, '/manufacturer');
  }
};

export const actions: Actions = {
  // Update manufacturer action
  update: async ({ request, params, locals }: { request: Request, params: { id: string }, locals: { user: any } }) => {
    const user = locals.user;
    const manufacturerId = params.id;
    
    console.log('Update action triggered for manufacturer ID:', manufacturerId);
    
    if (!user) {
      console.log('User not authenticated, redirecting to login');
      throw redirect(302, '/login');
    }
    
    console.log('Processing form submission...');
    const form = await superValidate(request, zod(updateManufacturerSchema));
    console.log('Form data received:', form.data);
    
    if (!form.valid) {
      console.log('Form validation failed:', form.errors);
      return fail(400, { form });
    }
    
    try {
      // Parse custom fields JSON if provided
      let customFields = null;
      if (form.data.custom_fields_json?.trim()) {
        try {
          customFields = JSON.parse(form.data.custom_fields_json);
          console.log('Successfully parsed custom fields:', customFields);
        } catch (e) {
          console.error('Invalid JSON format for custom fields:', e);
          return message(form, 'Invalid JSON format for custom fields', { status: 400 });
        }
      }
      
      console.log('Updating manufacturer with ID:', manufacturerId);
      
      // Execute the update query for the main fields
      const result = await sql`
        UPDATE manufacturer
        SET 
          name = ${form.data.name},
          description = ${form.data.description || null},
          website_url = ${form.data.website_url || null},
          logo_url = ${form.data.logo_url || null}
        WHERE id = ${manufacturerId}
        RETURNING id, name
      `;
      
      console.log('Basic update successful, returned data:', result);
      
      // Handle custom fields if provided
      if (customFields && Object.keys(customFields).length > 0) {
        console.log('Processing custom fields...');
        
        try {
          if (form.data.custom_fields_json) {
            // Delete existing custom fields first
            await sql`DELETE FROM manufacturercustomfield WHERE manufacturer_id = ${manufacturerId}`;
            console.log('Deleted existing custom fields');

            const customFields = JSON.parse(form.data.custom_fields_json);
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
              // Check if this field already exists
              const existingField = await sql`
                SELECT id FROM customfield WHERE field_name = ${fieldName}
              `;
              
              let fieldId;
              if (existingField.length > 0) {
                fieldId = existingField[0].id;
                console.log(`Using existing field ID ${fieldId} for ${fieldName}`);
              } else {
                // Create a new custom field with correct data_type according to schema
                let dataType;
                if (typeof fieldValue === 'string') dataType = 'text';  // Use 'text' instead of 'string'
                else if (typeof fieldValue === 'number') dataType = 'number';
                else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                else if (fieldValue instanceof Date) dataType = 'date';
                else dataType = 'text';  // Default to text for other types
                
                const newField = await sql`
                  INSERT INTO customfield (field_name, data_type, applies_to)
                  VALUES (${fieldName}, ${dataType}, ${'manufacturer'})
                  RETURNING id
                `;
                fieldId = newField[0].id;
                console.log(`Created new field ID ${fieldId} for ${fieldName}`);
              }
              
              // Now add the value
              await sql`
                INSERT INTO manufacturercustomfield (manufacturer_id, field_id, value)
                VALUES (${manufacturerId}, ${fieldId}, ${JSON.stringify(fieldValue)})
              `;
              console.log(`Added value ${fieldValue} for field ${fieldName}`);
            }
          }
        } catch (error) {
          console.error('Error handling custom fields:', error);
          // Don't fail the whole update if custom fields processing fails
          // Just log the error and continue
        }
      }
      
      // Return success message
      return message(form, 'Manufacturer updated successfully');
    } catch (error: any) {
      console.error('Error in manufacturer update:', error);
      return message(form, 'Error updating manufacturer: ' + (error.message || 'Unknown error'), { status: 500 });
    }
  },
  
  // Delete manufacturer action
  delete: async ({ params, locals }: { params: { id: string }, locals: { user: any } }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }
    
    const manufacturerId = params.id;
    
    try {
      // Check if manufacturer exists and user has permission to delete it
      const manufacturerCheck = await sql`
        SELECT id FROM manufacturer
        WHERE id = ${manufacturerId}
        AND created_by = ${user.id}
      `;
      
      if (manufacturerCheck.length === 0) {
        return fail(404, { message: 'Manufacturer not found or you do not have permission to delete it' });
      }
      
      // Delete the manufacturer directly
      await sql`
        DELETE FROM manufacturer
        WHERE id = ${manufacturerId}
        AND created_by = ${user.id}
      `;
      
      // Redirect to the manufacturer list
      throw redirect(303, '/manufacturer?deleted=true');
    } catch (error) {
      console.error('Error deleting manufacturer:', error);
      return fail(500, { message: 'Failed to delete manufacturer' });
    }
  }
};
