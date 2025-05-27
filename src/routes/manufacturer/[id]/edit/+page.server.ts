// src/routes/manufacturer/[id]/edit/+page.server.ts
import sql from '$lib/server/db/index';
import { getManufacturerById } from '$lib/core/manufacturer';
import { manufacturerSchema } from '$lib/schema/schema';
import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

// Create a schema for manufacturer updates, omitting fields that shouldn't be in the form
const updateManufacturerSchema = manufacturerSchema
  .partial()
  .extend({
    manufacturer_id: z.string().uuid(),
    // Add explicit support for custom fields storage in form
    custom_fields: z.string().optional()
  });



export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    throw redirect(302, '/login');
  }

  const manufacturerId = params.id;
  console.log('Loading manufacturer with ID:', manufacturerId);
  
  try {
    // Fetch the manufacturer by ID
    const manufacturer = await getManufacturerById(manufacturerId);
    
    if (!manufacturer) {
      console.log('Manufacturer not found, redirecting');
      throw redirect(302, '/manufacturer');
    }
    
    // Check if the user is allowed to edit this manufacturer
    // Only the creator or admin should be able to edit
    if (manufacturer.created_by !== user.user_id && user.role !== 'admin') {
      console.log('User not authorized to edit this manufacturer');
      throw redirect(302, '/manufacturer');
    }
    
    // Debug logs to see what's coming from the database
    console.log('Raw manufacturer from DB:', JSON.stringify(manufacturer, null, 2));
    console.log('Manufacturer properties:', Object.keys(manufacturer));
    console.log('Custom fields:', manufacturer.custom_fields);
    
    // Format initial data with custom fields as a JSON string
    // Map camelCase TypeScript properties to snake_case form fields to match schema
    // Convert fields to expected schema format
    const initialData = {
      // Core fields
      manufacturer_id: manufacturer.manufacturer_id,
      manufacturer_name: manufacturer.manufacturer_name,
      manufacturer_description: manufacturer.manufacturer_description || '',
      website_url: manufacturer.website_url || '',
      logo_url: manufacturer.logo_url || '',
      
      // Convert custom fields to string for form editing
      custom_fields: manufacturer.custom_fields && 
                     Object.keys(manufacturer.custom_fields || {}).length > 0 ?
                     JSON.stringify(manufacturer.custom_fields, null, 2) : ''
      
      // No longer including metadata fields as they're not needed for the form
      // and they cause type issues with superValidate
    };
    
    console.log('Complete initialData for form:', initialData);
    
    console.log('Initial form data:', initialData);
    
    // Initialize the form with manufacturer data
    // Force detailed schema validation to ensure all properties are correctly set
    const form = await superValidate(initialData, zod(updateManufacturerSchema), {
      errors: false, // Don't validate on initial load to avoid false errors
      id: 'manufacturer-edit-form' // Unique ID to ensure form state is maintained correctly
    });
    
    console.log('Form data after superValidate:', form);
    console.log('Form data stringified:', JSON.stringify(form.data, null, 2));
    
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
  update: async ({ request, params, locals }) => {
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
      let customFields: Record<string, any> | null = null;
      const customFieldsStr = form.data.custom_fields;
      
      // Only process if it's a non-empty string
      if (typeof customFieldsStr === 'string' && customFieldsStr.trim()) {
        try {
          customFields = JSON.parse(customFieldsStr);
          console.log('Successfully parsed custom fields:', customFields);
        } catch (e) {
          console.error('Invalid JSON format for custom fields:', e);
          return message(form, 'Invalid JSON format for custom fields', { status: 400 });
        }
      }
      
      console.log('Updating manufacturer with ID:', manufacturerId);
      
      // Execute the update query for the main fields
      // Use separate values for SQL parameters to avoid type issues
      const manufacturerName = form.data.manufacturer_name || null;
      const manufacturerDescription = form.data.manufacturer_description || null;
      const websiteUrl = form.data.website_url || null;
      const logoUrl = form.data.logo_url || null;
      const updatedBy = user.user_id;
      
      const result = await sql`
        UPDATE "Manufacturer"
        SET 
          manufacturer_name = ${manufacturerName},
          manufacturer_description = ${manufacturerDescription},
          website_url = ${websiteUrl},
          logo_url = ${logoUrl},
          updated_by = ${updatedBy},
          updated_at = NOW()
        WHERE manufacturer_id = ${manufacturerId}
        RETURNING manufacturer_id, manufacturer_name
      `;
      
      console.log('Basic update successful, returned data:', result);
      
      // Handle custom fields if provided
      if (customFields && Object.keys(customFields).length > 0) {
        console.log('Processing custom fields...');
        
        try {
          // Import the updateManufacturerCustomFields function
          const { updateManufacturerCustomFields } = await import('$lib/core/manufacturer');
          
          // Use the core function to update custom fields
          // This ensures consistent handling with the rest of the application
          const updatedManufacturer = await updateManufacturerCustomFields(manufacturerId, customFields);
          
          if (!updatedManufacturer) {
            console.error('Failed to update custom fields');
            return message(form, 'Manufacturer updated but custom fields update failed', { status: 500 });
          }
          
          console.log('Custom fields updated successfully');
        } catch (error) {
          console.error('Error handling custom fields:', error);
          // Don't fail the whole update if custom fields processing fails
          // Just log the error and continue
          return message(form, 'Manufacturer updated but custom fields update failed: ' + 
                        (error instanceof Error ? error.message : 'Unknown error'), { status: 500 });
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
  delete: async ({ params, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }
    
    const manufacturerId = params.id;
    
    try {
      // Check if manufacturer exists and user has permission to delete it
      const manufacturerCheck = await sql`
        SELECT manufacturer_id FROM "Manufacturer"
        WHERE manufacturer_id = ${manufacturerId}
        AND created_by = ${user.user_id}
      `;
      
      if (manufacturerCheck.length === 0) {
        return fail(404, { message: 'Manufacturer not found or you do not have permission to delete it' });
      }
      
      // IMPORTANT: First delete any custom fields to avoid foreign key constraint violations
      
      await sql`
        DELETE FROM "ManufacturerCustomField"
        WHERE manufacturer_id = ${manufacturerId}
      `;
      
   
      await sql`
        DELETE FROM "Manufacturer"
        WHERE manufacturer_id = ${manufacturerId}
        AND created_by = ${user.user_id}
      `;
      
      // Redirect to the manufacturer list
      throw redirect(303, '/manufacturer?deleted=true');
    } catch (error) {
      console.error('Error deleting manufacturer:', error);
      return fail(500, { message: 'Failed to delete manufacturer' });
    }
  }
};
