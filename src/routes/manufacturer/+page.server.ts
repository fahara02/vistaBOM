// src/routes/manufacturer/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { listManufacturers, createManufacturer } from '$lib/core/manufacturer';
import { manufacturerSchema } from '$lib/schema/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

import { z } from 'zod';

// Create a new schema with only the fields needed for creation
const createManufacturerSchema = z.object({
  manufacturer_name: z.string().min(1, "Manufacturer name cannot be empty"),
  manufacturer_description: z.string().optional(), 
  website_url: z.string().refine(val => !val || /^https?:\/\/.+/.test(val), {
    message: "Website URL must start with http:// or https://"
  }).optional(),
  logo_url: z.string().refine(val => !val || /^https?:\/\/.+/.test(val), {
    message: "Logo URL must start with http:// or https://"
  }).optional()
});

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Call listManufacturers without the client parameter
  const manufacturers = await listManufacturers();
  const form = await superValidate(event, zod(createManufacturerSchema), { id: 'create-manufacturer' });
  return { user, manufacturers, form };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const user = locals.user;
    const form = await superValidate(request, zod(createManufacturerSchema), { id: 'create-manufacturer' });
    if (!form.valid) return fail(400, { form });
    if (!user) return fail(401, { form, message: 'Unauthorized' });
    try {
      // Call createManufacturer with correct field mapping
      await createManufacturer({
        name: form.data.manufacturer_name,
        description: form.data.manufacturer_description ?? undefined,
        websiteUrl: form.data.website_url ?? undefined,
        logoUrl: form.data.logo_url ?? undefined,
        createdBy: user.user_id // Use the correct user_id field
      });
    } catch (err: any) {
      return fail(500, { form, message: err.message });
    }
    throw redirect(303, '/manufacturer');
  }
};
