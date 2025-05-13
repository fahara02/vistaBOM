//src/routes/api/manufacturers/[id]/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import { updateManufacturer, deleteManufacturer } from '@/core/manufacturer.js';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }
    const id = params.id;
    if (!id) {
        throw error(400, 'Missing manufacturer ID');
    }
    const userId = locals.user.id;
    if (!userId) {``
        throw error(401, 'Unauthorized');
    }
    const data = await request.json();
    try {
        // Using the new porsager/postgres API - no client parameter needed
        const updated = await updateManufacturer(
            id,
            data.updates,
            userId
        );
        return json(updated);
    } catch (e: any) {
        throw error(500, e.message);
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }
    const id = params.id;
    if (!id) {
        throw error(400, 'Missing manufacturer ID');
    }
    const userId = locals.user.id;
    if (!userId) {
        throw error(401, 'Unauthorized');
    }
    try {
        // Using the new porsager/postgres API - no client parameter needed
        await deleteManufacturer(id);
        return new Response(null, { status: 204 });
    } catch (e: any) {
        throw error(500, e.message);
    }
};
