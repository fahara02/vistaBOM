//src/routes/parts/new/+page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { redirect, fail } from '@sveltejs/kit';
import { createPartSchema } from '$lib/server/db/schema';
import { createPart } from '$lib/server/parts';
import { LifecycleStatusEnum, WeightUnitEnum } from '$lib/server/db/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const { locals } = event;
    const user = locals.user;
    if (!user) throw redirect(302, '/');
    // @ts-ignore: enable JSON parsing for union fields (long_description, etc.)
    const form = await superValidate(event, zod(createPartSchema), { dataType: 'json' });
    const statuses = Object.values(LifecycleStatusEnum);
    const weightUnits = Object.values(WeightUnitEnum);
    return { form, user, statuses, weightUnits };
};

export const actions: Actions = {
    default: async (event) => {
        const { request, locals } = event;
        // @ts-ignore: enable JSON parsing for union fields (long_description, etc.)
        const form = await superValidate(request, zod(createPartSchema), { dataType: 'json' });
        if (!form.valid) {
            console.log('Form errors:', form.errors);
            return fail(400, { form });
        }

        const user = locals.user;
        if (!user) throw redirect(302, '/');

        try {
            await createPart(form.data, user.id);
        } catch (err: any) {
            console.error('Error creating part:', err);
            return fail(500, { form, message: err.message });
        }

        throw redirect(303, '/parts');
    }
};