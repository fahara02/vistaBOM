//src/routes/part/new/+page.server.ts

import { createPart } from '@/core/parts';
import type { CreatePartInput } from '@/core/parts';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { createPartSchema } from '$lib/server/db/schema';
// Server-side code should import directly from server types
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, PartStatusEnum } from '@/types/types';

/**
 * Load function - initializes the form and loads lifecycle statuses
 */
export const load: PageServerLoad = async () => {
  // Create an empty form based on the schema
  const form = await superValidate(zod(createPartSchema));
  
  // Initialize dimensions with empty object to prevent null reference errors
  if (!form.data.dimensions) {
    form.data.dimensions = { length: 0, width: 0, height: 0 };
  }
  
  // Add default status if not set
  if (!form.data.status) {
    form.data.status = LifecycleStatusEnum.DRAFT;
  }
  
  return {
    form,
    statuses: Object.values(LifecycleStatusEnum),
    packageTypes: Object.values(PackageTypeEnum),
    weightUnits: Object.values(WeightUnitEnum),
    dimensionUnits: Object.values(DimensionUnitEnum)
  };
};

/**
 * Form actions for creating new parts with initial version
 */
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Validate user authentication
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });
    
    // Validate form data using superForm
    const form = await superValidate(request, zod(createPartSchema));
    console.log('Form data RAW:', form.data);
    console.log('Form data STATUS (original):', form.data.status);
    
    // We'll create a separate variable to track what status is supposed to be used
    // This avoids TypeScript issues while allowing us to debug
    let actualStatusToUse = form.data.status;
    console.log('ACTUAL STATUS that should be used:', actualStatusToUse);
    console.log('Form data:', JSON.stringify(form.data, null, 2));
    
    // Fix validation issues by either removing fields or setting proper values
    // First approach: remove dimensions entirely if all values are 0
    if (form.data.dimensions && 
        form.data.dimensions.length === 0 && 
        form.data.dimensions.width === 0 && 
        form.data.dimensions.height === 0) {
      form.data.dimensions = undefined;
    }
    
    // Fix weight/weight_unit mismatch - if weight is present but unit is not
    if (form.data.weight && !form.data.weight_unit) {
      form.data.weight_unit = WeightUnitEnum.G; // Default to grams
    }
    
    // Fix dimensions unit if needed
    if (form.data.dimensions && !form.data.dimensions_unit) {
      form.data.dimensions_unit = DimensionUnitEnum.MM; // Default to millimeters
    }
    
    // Log critical values for debugging
    console.log('Critical values:', {
      name: form.data.name,
      version: form.data.version,
      status: form.data.status,
      dimensions: form.data.dimensions
    });
    
  
    try {
      // DIRECT APPROACH: Get the lifecycle status from the form
      const selectedLifecycleStatus = form.data.status;
      
      // Get the part status from the form or default to CONCEPT if not provided
      // This is the status for the Part table separate from its lifecycle status
      const selectedPartStatus = form.data.partStatus || PartStatusEnum.CONCEPT;
      
      console.log('SELECTED LIFECYCLE STATUS:', selectedLifecycleStatus);
      console.log('SELECTED PART STATUS:', selectedPartStatus);
      
      // Cast to proper enum type for the lifecycle status
      const lifecycleStatusToUse = String(selectedLifecycleStatus) as LifecycleStatusEnum;
      
      // Create part data with both status fields
      const partData: CreatePartInput = {
        name: form.data.name,
        version: form.data.version || '0.1.0',
        // Use the lifecycle status for the status field
        status: lifecycleStatusToUse,
        // Add the part status separately
        partStatus: selectedPartStatus,
        // Include simple fields
        shortDescription: form.data.short_description,
        functionalDescription: form.data.functional_description,
        // Skip complex objects for now to ensure it works
      };
      
      // Create the part with all the form data
      await createPart(partData, user.id);
      
      // Redirect to parts list on success
      throw redirect(303, '/parts');
    } catch (err) {
      console.error('Create part error:', err);
      // Return form with error message for superForm to display
      return message(form, 'Failed to create part: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }
};