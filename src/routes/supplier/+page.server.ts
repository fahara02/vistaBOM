//src/routes/supplier/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { listSuppliers, createSupplier, deleteSupplier } from '@/core/supplier';
import { supplierSchema } from '@/schema/schema';
import { parseContactInfo } from '$lib/utils/util';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

import { z } from 'zod';

// Use the centralized supplier schema from schema.ts - following the project standard
// No custom schemas - supplierSchema is the single source of truth

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Call listSuppliers without the client parameter
  const suppliers = await listSuppliers();
  const form = await superValidate(event, zod(supplierSchema), { 
    id: 'create-supplier'
  });
  return { user, suppliers, form };
};

export const actions: Actions = {
  createSupplier: async (event) => {
    const { request, locals } = event;
    const user = locals.user;
    const form = await superValidate(request, zod(supplierSchema), { 
      id: 'create-supplier'
    });
    if (!form.valid) return fail(400, { form });
    if (!user) return fail(401, { form, message: 'Unauthorized' });
    try {
      // Process the contact info through our utility function
      // This allows users to enter contact info in various formats
      // parseContactInfo returns a JSON string, but we need to parse it back to a JS object for the API
      const contactInfoStr = form.data.contact_info ? String(form.data.contact_info) : '';
      const processedContactInfo = contactInfoStr ? 
        JSON.parse(parseContactInfo(contactInfoStr)) : undefined;
      
      // Call createSupplier without the client parameter
      // Use the standardized field names from the centralized schema
      await createSupplier({
        name: form.data.supplier_name,
        description: form.data.supplier_description,
        websiteUrl: form.data.website_url ?? undefined,
        contactInfo: processedContactInfo,
        logoUrl: form.data.logo_url ?? undefined,
        createdBy: user.id
      });
    } catch (err: any) {
      return fail(500, { form, message: err.message });
    }
    throw redirect(303, '/supplier');
  },
  
  // Named action for supplier deletion
  deleteSupplier: async (event) => {
    const { request, locals } = event;
    const user = locals.user;
    
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }
    
    try {
      const formData = await request.formData();
      const supplierId = formData.get('supplierId') as string;
      
      if (!supplierId) {
        return fail(400, { message: 'Supplier ID is required' });
      }
      
      // Call the core deleteSupplier function
      await deleteSupplier(supplierId);
      
      // Return success message and updated suppliers list
      const suppliers = await listSuppliers();
      return { success: true, message: 'Supplier deleted successfully', suppliers };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      
      // Return appropriate error message based on error type
      if (error instanceof Error) {
        if (error.message.includes('referenced by existing parts')) {
          return fail(409, { 
            message: 'This supplier cannot be deleted because it is referenced by existing parts' 
          });
        }
        if (error.message.includes('not found')) {
          return fail(404, { message: 'Supplier not found' });
        }
        return fail(500, { message: error.message });
      }
      
      return fail(500, { message: 'An unexpected error occurred' });
    }
  }
};
