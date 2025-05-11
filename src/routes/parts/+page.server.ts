// src/routes/parts/+page.server.ts
import type { PageServerLoad } from './$types';
import { listParts } from '$lib/server/parts';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const user = locals.user;
		const parts = await listParts();
		return { parts, user };
	} catch (err) {
		console.error('[parts/+page.server.ts] Error loading parts:', err);
		// Include the error message in the console but use a generic message for the user
		throw error(500, 'Failed to load parts: ' + (err instanceof Error ? err.message : String(err)));
	}
};
