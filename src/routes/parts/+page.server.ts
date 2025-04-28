// src/routes/parts/+page.server.ts
import type { PageServerLoad } from './$types';
import { listParts } from '$lib/server/parts';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	const parts = await listParts();
	return { parts, user };
};
