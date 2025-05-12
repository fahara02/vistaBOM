import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db/index';
import { listSuppliers, createSupplier } from '$lib/server/supplier';
import { supplierSchema } from '$lib/server/db/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

// Pick only creation fields
const createSupplierSchema = supplierSchema.pick({
  name: true,
  description: true,
  website_url: true,
  contact_info: true,
  logo_url: true
});

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Call listSuppliers without the client parameter
  const suppliers = await listSuppliers();
  const form = await superValidate(event, zod(createSupplierSchema), { id: 'create-supplier' });
  return { user, suppliers, form };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const user = locals.user;
    const form = await superValidate(request, zod(createSupplierSchema), { id: 'create-supplier' });
    if (!form.valid) return fail(400, { form });
    if (!user) return fail(401, { form, message: 'Unauthorized' });
    try {
      // Call createSupplier without the client parameter
      await createSupplier({
        name: form.data.name,
        description: form.data.description ?? undefined,
        websiteUrl: form.data.website_url ?? undefined,
        contactInfo: form.data.contact_info ?? undefined,
        logoUrl: form.data.logo_url ?? undefined,
        createdBy: user.id
      });
    } catch (err: any) {
      return fail(500, { form, message: err.message });
    }
    throw redirect(303, '/supplier');
  }
};
