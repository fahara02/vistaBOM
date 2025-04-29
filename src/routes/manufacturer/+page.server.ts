import type { PageServerLoad, Actions } from './$types';
import client from '$lib/server/db/index';
import { listManufacturers, createManufacturer } from '$lib/server/manufacturer';
import { manufacturerSchema } from '$lib/server/db/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';

// Pick only the fields needed for creation
const createManufacturerSchema = manufacturerSchema.pick({
  name: true,
  description: true,
  website_url: true,
  logo_url: true
});

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  const manufacturers = await listManufacturers(client);
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
      await createManufacturer(client, {
        name: form.data.name,
        description: form.data.description ?? undefined,
        websiteUrl: form.data.website_url ?? undefined,
        logoUrl: form.data.logo_url ?? undefined,
        createdBy: user.id
      });
    } catch (err: any) {
      return fail(500, { form, message: err.message });
    }
    throw redirect(303, '/manufacturer');
  }
};
