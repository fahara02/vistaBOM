import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getClient } from '$lib/server/db';
import { updateManufacturer, deleteManufacturer } from '$lib/server/manufacturer';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
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
    const client = await getClient();
    const data = await request.json();
    try {
        const updated = await updateManufacturer(
            client,
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
    const client = await getClient();
    try {
        await deleteManufacturer(client, id);
        return new Response(null, { status: 204 });
    } catch (e: any) {
        throw error(500, e.message);
    }
};
