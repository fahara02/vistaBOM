//src/routes/supplier/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { listSuppliers, createSupplier } from '@/core/supplier';
import { supplierSchema } from '@/schema/schema';
import { parseContactInfo } from '$lib/utils/util';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

import { z } from 'zod';

// Create a custom schema for supplier form with string-based contact_info
const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  website_url: z.string().url("Must be a valid URL").optional().nullable(),
  contact_info: z.string().optional().nullable(),  // Keep as string and process later
  logo_url: z.string().url("Must be a valid URL").optional().nullable()
});

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Call listSuppliers without the client parameter
  const suppliers = await listSuppliers();
  const form = await superValidate(event, zod(createSupplierSchema), { 
    id: 'create-supplier'
  });
  return { user, suppliers, form };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const user = locals.user;
    const form = await superValidate(request, zod(createSupplierSchema), { 
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
      await createSupplier({
        name: form.data.name,
        description: form.data.description ?? undefined,
        websiteUrl: form.data.website_url ?? undefined,
        contactInfo: processedContactInfo,
        logoUrl: form.data.logo_url ?? undefined,
        createdBy: user.id
      });
    } catch (err: any) {
      return fail(500, { form, message: err.message });
    }
    throw redirect(303, '/supplier');
  }
};
