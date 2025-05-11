//src/routes/parts/new/+page.server.ts
import { superValidate } from 'sveltekit-superforms/server';
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
   
    const form = await superValidate(event, zod(createPartSchema), { dataType: 'json' } as any);
    const statuses = Object.values(LifecycleStatusEnum);
    const weightUnits = Object.values(WeightUnitEnum);
    return { form, user, statuses, weightUnits };
};

export const actions: Actions = {
    default: async (event) => {
        const { request, locals } = event;
       
        const form = await superValidate(request, zod(createPartSchema), { dataType: 'json' } as any);
        if (!form.valid) {
            console.log('Form errors:', form.errors);
            return fail(400, { form });
        }

        const user = locals.user;
        if (!user) throw redirect(302, '/');

        try {
            const { name, version, status } = form.data;
            await createPart({ name, version, status }, user.id);
        } catch (err) {
            console.error('Error creating part:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            return fail(500, { form, message });
        }

        throw redirect(303, '/parts');
    }
};