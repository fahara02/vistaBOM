//src/routes/part/new/+page.server.ts

import { createPart } from '@/core/parts';
// Import directly from core parts module without defining our own type
// The createPart function knows its parameter type
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { createPartSchema } from '@/schema/schema';
// Server-side code should import directly from server types
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, PartStatusEnum } from '@/types/types';
import sql from '$lib/server/db';
import { listManufacturers } from '@/core/manufacturer';

/**
 * Load function - initializes the form and loads lifecycle statuses
 */
export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Create an empty form based on the schema
  const form = await superValidate(zod(createPartSchema));
  
  // Initialize dimensions with empty object to prevent null reference errors
  if (!form.data.dimensions) {
    form.data.dimensions = { length: 0, width: 0, height: 0 };
  }
  
  // Add default status if not set
  if (!form.data.version_status) {
    form.data.version_status = LifecycleStatusEnum.DRAFT;
  }
  
  // Initialize dimensions_unit property with a safer type approach
  // Using properly typed interface to avoid any/unknown but still fix the issue
  interface PartFormData extends Record<string, any> {
    dimensions_unit?: DimensionUnitEnum;
  }
  const formData = form.data as PartFormData;
  formData.dimensions_unit = formData.dimensions_unit || DimensionUnitEnum.MM;
  
  // Fetch manufacturers from API endpoint instead of direct SQL query
  let manufacturers: any[] = [];
  
  try {
    console.log('Fetching manufacturers from API endpoint');
    
    // Use relative URL to avoid hardcoding domains - works with SvelteKit's server-side fetch
    const response = await fetch('/api/manufacturers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    manufacturers = await response.json();
    console.log(`API returned ${manufacturers.length} manufacturers`);
    
    // No need to transform - API already returns data in the format expected by ManufacturerSelector
  } catch (error) {
    console.error('Error fetching manufacturers from API:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Empty array on error
    manufacturers = [];
  }
  
  // Also load all categories for the form
  // Using EXACTLY the same working query from getChildCategories() function
  let categories: any[] = [];
  try {
    console.log('Using EXACT query from working getChildCategories() function');
    
    // Get all categories - using the exact SQL pattern from getChildCategories
    categories = await sql`
      SELECT * FROM Category 
      WHERE is_deleted = false 
      ORDER BY name
    `;

    // If that didn't work, try a fallback approach with lowercase
    if (categories.length === 0) {
      console.log('No categories found with PascalCase, trying lowercase');
      categories = await sql`
        SELECT * FROM category 
        WHERE is_deleted = false 
        ORDER BY name
      `;
    }
    console.log(`Loaded ${categories.length} categories for part form`);
  } catch (error) {
    console.error('Error loading categories:', error);
    // categories will remain an empty array on error
  }
  
  return {
    form,
    manufacturers,
    categories,
    statuses: Object.values(LifecycleStatusEnum),
    packageTypes: Object.values(PackageTypeEnum),
    weightUnits: Object.values(WeightUnitEnum),
    dimensionUnits: Object.values(DimensionUnitEnum)
  };
};

/**
 * Form actions for creating new parts with initial version
 */
export const actions = {
  default: async ({ request, locals }) => {
    // No need to explicitly access the database here
    // The createPart function will handle the database access
    // Validate user authentication
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });
    
    // Validate form data using superForm
    const form = await superValidate(request, zod(createPartSchema));
    console.log('Form data RAW:', form.data);
    console.log('Form data STATUS (original):', form.data.version_status);
    
    // We'll create a separate variable to track what status is supposed to be used
    // This avoids TypeScript issues while allowing us to debug
    let actualStatusToUse = form.data.version_status;
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
    if (form.data.part_weight && !form.data.weight_unit) {
      form.data.weight_unit = WeightUnitEnum.G; // Default to grams
    }
    
    // Fix dimensions unit if needed
    if (form.data.dimensions && !form.data.dimensions_unit) {
      form.data.dimensions_unit = DimensionUnitEnum.MM; // Default to millimeters
    }
    
    // Log critical values for debugging
    console.log('Critical values:', {
      name: form.data.part_name,
      version: form.data.part_version,
      status: form.data.version_status,
      dimensions: form.data.dimensions
    });
    
  
    try {
      // DIRECT APPROACH: Get the lifecycle status from the form
      const selectedLifecycleStatus = form.data.version_status;
      
      // Get the part status from the form or default to CONCEPT if not provided
      // This is the status for the Part table separate from its lifecycle status
      const selectedPartStatus = form.data.status_in_bom || PartStatusEnum.CONCEPT;
      
      console.log('SELECTED LIFECYCLE STATUS:', selectedLifecycleStatus);
      console.log('SELECTED PART STATUS:', selectedPartStatus);
      
      // Cast to proper enum type for the lifecycle status
      const lifecycleStatusToUse = String(selectedLifecycleStatus) as LifecycleStatusEnum;
      
      // Create part data with both status fields
      const partData = {
        part_name: form.data.part_name,
        part_version: form.data.part_version || '0.1.0',
        // Use the lifecycle status for the status field
        version_status: lifecycleStatusToUse,
        // Required field: lifecycle_status to match the interface requirement
        lifecycle_status: lifecycleStatusToUse,
        // Include status_in_bom field
        status_in_bom: form.data.status_in_bom || PartStatusEnum.CONCEPT,
        // Part requires is_public field
        is_public: form.data.is_public || false,
        short_description: form.data.short_description,
        functional_description: form.data.functional_description,
        // Required empty arrays for form validation
        compliance_info: [],
        attachments: [],
        representations: [],
        supplier_parts: [],
        manufacturer_parts: [],
        structure: [],
        // Required empty objects
        technical_specifications: {}
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