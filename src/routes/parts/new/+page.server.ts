import { createPart } from '$lib/server/parts';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { createPartSchema } from '$lib/server/db/schema';
import { LifecycleStatusEnum } from '$lib/server/db/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Load function - initializes the form and loads lifecycle statuses
 */
export const load: PageServerLoad = async () => {
  const form = await superValidate(zod(createPartSchema));
  
  return {
    form,
    statuses: Object.values(LifecycleStatusEnum)
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
    
    // Validate form data
    const form = await superValidate(request, zod(createPartSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      // SIMPLIFIED APPROACH: Only pass the minimum required fields
      // Log the form data for debugging
      console.log('Form data:', JSON.stringify(form.data, null, 2));
      
      // Only use the three required fields to isolate the issue
      await createPart({
        name: form.data.name,
        version: form.data.version,
        status: form.data.status
      }, user.id);

      // Redirect to parts list on success
      throw redirect(303, '/parts');
    } catch (err) {
      // Return form with error
      return message(form, 'Failed to create part: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }
};