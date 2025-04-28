// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema } from '$lib/server/db/schema';
import { LifecycleStatusEnum, PackageTypeEnum } from '$lib/server/db/types';
import { getPartWithCurrentVersion, updatePartVersion } from '$lib/server/parts';
import { error, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const part = await getPartWithCurrentVersion(params.id);
	if (!part) throw error(404, 'Part not found');

	const form = await superValidate(part.currentVersion, partVersionSchema);
	const statuses = Object.values(LifecycleStatusEnum);
	const packageTypes = Object.values(PackageTypeEnum);
	return { form, part, statuses, packageTypes };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const form = await superValidate(request, partVersionSchema);
		if (!form.valid) return { form };

		try {
			const userID = locals.user.id;
			const part = await getPartWithCurrentVersion(params.id);

			if (!part) throw error(404, 'Part not found');
			if (!isVersionEditable(part.currentVersion)) {
				const newVersion = createNewVersion(part.currentVersion, userID);
				await createPartVersion(newVersion);
				await updatePartCurrentVersion(part.id, newVersion.id);
			}

			await updatePartVersion(form.data);
			redirect(303, `/parts/${params.id}`);
		} catch (err) {
			return message(form, 'Failed to update part');
		}
	}
};
