// src/routes/supplier/[id]/edit/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';
import { supplierActionSchema } from '$lib/schema/schema';
import { deleteSupplier, getSupplierById } from '$lib/core/supplier';
import type { User } from '$lib/types/schemaTypes';
import { 
  parseJsonField,
  prepareUpdateParams,
  handleSupplierUpdate,
  handleSupplierDelete
} from '$lib/services/supplierService';

// Reuse the same schema for edit that we use for creation
export const load: PageServerLoad = async ({ params, locals }) => {
  // Validate user authentication
  const user = locals.user as User | null;
  if (!user) {
    throw redirect(302, '/login');
  }

  const supplierId = params.id;
  console.log('Loading supplier for edit, ID:', supplierId);
  
  try {
    // Get the supplier and verify permissions directly
    const supplier = await getSupplierById(supplierId);
    
    // Check if supplier exists
    if (!supplier) {
      console.log('Supplier not found, redirecting');
      throw redirect(302, '/supplier');
    }
    
    // Verify user permissions
    if (supplier.created_by !== user.user_id && !user.is_admin) {
      console.log('User does not have permission to edit this supplier');
      throw redirect(302, '/supplier');
    }
    
    console.log('Supplier retrieved successfully:', supplier.supplier_name);
    // Prepare the form data - map DB fields to form fields
    // Format the data to match the structure expected by the form
    const formData = {
      supplier_id: supplier.supplier_id,
      supplier_name: supplier.supplier_name,
      supplier_description: supplier.supplier_description || '',
      website_url: supplier.website_url || '',
      logo_url: supplier.logo_url || '',
      contact_info: typeof supplier.contact_info === 'object' ? 
                   JSON.stringify(supplier.contact_info) : 
                   supplier.contact_info || '{}',
      custom_fields: typeof supplier.custom_fields === 'object' ? 
                    JSON.stringify(supplier.custom_fields, null, 2) : 
                    supplier.custom_fields || '{}',
      created_by: supplier.created_by,
      updated_by: user.user_id
    };
    
    console.log('Form data prepared for SuperForm');
    
    // Initialize the form with proper validation
    const form = await superValidate(formData, zod(supplierActionSchema), {
      id: 'supplier-edit-form',
      errors: false // Don't validate initially to avoid errors on load
    });
    
    return {
      supplier,
      form
    };
    
  } catch (error) {
    console.error('Error in supplier edit load:', error);
    throw redirect(302, '/supplier');
  }
};

export const actions: Actions = {
  // Update action - reuses core functions from lib/core/supplier.ts
  update: async ({ request, params, locals }) => {
    const user = locals.user as User | null;
    if (!user) {
      return fail(401, { message: 'You must be logged in to update suppliers' });
    }
    
    const supplierId = params.id;
    console.log('Processing supplier update for ID:', supplierId);
    
    try {
      // Validate form data using SuperForm with our schema
      const form = await superValidate(request, zod(supplierActionSchema));
      
      if (!form.valid) {
        console.log('Form validation failed:', form.errors);
        return fail(400, { form });
      }
      
      // Use the handleSupplierUpdate function from the service layer
      // This function handles permissions, data processing, and updates in one call
      const result = await handleSupplierUpdate(form, supplierId, user.user_id, user.is_admin);
      
      // If result is an ActionFailure (from fail()), it will be returned as is
      return result;
      // The handleSupplierUpdate function already includes comprehensive error handling
    } catch (error: any) {
      console.error('Error in supplier update:', error);
      return fail(500, { message: 'Error updating supplier: ' + (error.message || 'Unknown error') });
    }
  },
  
  // Delete action - reuses the core deleteSupplier function
  delete: async ({ params, locals }) => {
    const user = locals.user as User | null;
    if (!user) {
      return fail(401, { message: 'You must be logged in to delete suppliers' });
    }
    
    const supplierId = params.id;
    console.log('Processing supplier deletion for ID:', supplierId);
    
    try {
      // Use the handleSupplierDelete function from the service layer
      // This function handles permissions, verification, and deletion in one call
      const result = await handleSupplierDelete(supplierId, user.user_id, user.is_admin);
      
      // If an error occurred, result will be an ActionFailure, otherwise null
      if (result) {
        return result; // Return the error
      }
      
      console.log('Supplier deleted successfully');
      throw redirect(303, '/supplier');
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      return fail(500, { message: 'Error deleting supplier: ' + (error.message || 'Unknown error') });
    }
  }
};
