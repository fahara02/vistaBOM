// src/routes/manufacturer/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { listManufacturers, createManufacturer } from '$lib/core/manufacturer';
import { createManufacturerSchema, manufacturerSchema } from '$lib/schema/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

import { z } from 'zod';



export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Call listManufacturers without the client parameter
  const manufacturers = await listManufacturers();
  
  // Initialize the form with proper validation
  const form = await superValidate(event, zod(createManufacturerSchema), { 
    id: 'create-manufacturer',
    // This ensures we validate all fields including empty ones
    errors: false // Don't show errors on initial load
  });
  
  
  return { user, manufacturers, form };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const user = locals.user;
    
    // Debug request form data
    const formData = await request.clone().formData();
    console.log('\nMANUFACTURER CREATE FORM DATA:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Validate the form data
    const form = await superValidate(request, zod(createManufacturerSchema), { id: 'create-manufacturer' });
    console.log('Form validation result:', form.valid);
    console.log('Form data:', form.data);
    console.log('Form errors:', form.errors);
    
    // Check form validity with explicit error handling
    if (!form.valid) {
      // Add explicit validation error for empty manufacturer name
      const validationErrors: Record<string, string> = {};
      
      // Convert error arrays to strings for consistent API response
      for (const [key, value] of Object.entries(form.errors)) {
        if (Array.isArray(value) && value.length > 0) {
          validationErrors[key] = value.join(', ');
        } else if (typeof value === 'string') {
          validationErrors[key] = value;
        }
      }
      
      // Add specific check for manufacturer name
      if (!form.data.manufacturer_name || form.data.manufacturer_name.trim() === '') {
        validationErrors.manufacturer_name = 'Manufacturer name is required';
      }
      
      return fail(400, { form, errors: validationErrors });
    }
    
    if (!user) return fail(401, { form, message: 'Unauthorized' });
    
    try {
      // Custom fields handling
      let customFields = undefined;
      if (form.data.custom_fields) {
        if (typeof form.data.custom_fields === 'string') {
          try {
            customFields = JSON.parse(form.data.custom_fields);
          } catch (e) {
            console.error('Error parsing custom fields:', e);
          }
        } else if (typeof form.data.custom_fields === 'object') {
          customFields = form.data.custom_fields;
        }
      }
      
      // Call createManufacturer with correct field mapping
      // Handle custom fields separately since they're not part of the main interface
      const newManufacturer = await createManufacturer({
        name: form.data.manufacturer_name,
        description: form.data.manufacturer_description ?? undefined,
        websiteUrl: form.data.website_url ?? undefined,
        logoUrl: form.data.logo_url ?? undefined,
        createdBy: user.user_id // Use the correct user_id field
      });
      
      // If we have custom fields, update them separately
      if (customFields && Object.keys(customFields).length > 0) {
        try {
          // Import the function to update custom fields
          const { updateManufacturerCustomFields } = await import('$lib/core/manufacturer');
          await updateManufacturerCustomFields(newManufacturer.manufacturer_id, customFields);
        } catch (e) {
          console.error('Error updating custom fields:', e);
          // Continue without failing - we've already created the manufacturer
        }
      }
    } catch (err: any) {
      return fail(500, { form, message: err.message });
    }
    throw redirect(303, '/manufacturer');
  }
};
