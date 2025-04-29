// src/routes/api/suppliers/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getClient } from '$lib/server/db';
import { updateSupplier, deleteSupplier } from '$lib/server/supplier';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }
    const id = params.id;
    if (!id) {
        throw error(400, 'Missing supplier ID');
    }
    const userId = locals.user.id;
    if (!userId) {
        throw error(401, 'Unauthorized');
    }
    const client = await getClient();
    try {
        const data = await request.json();
        const updated = await updateSupplier(
            client,
            id,
            {
                name: data.name,
                description: data.description,
                websiteUrl: data.websiteUrl,
                contactInfo: data.contactInfo,
                logoUrl: data.logoUrl
            },
            userId // Use authenticated user ID
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
        throw error(400, 'Missing supplier ID');
    }
    const userId = locals.user.id;
    if (!userId) {
        throw error(401, 'Unauthorized');
    }
    const client = await getClient();
    try {
        await deleteSupplier(client, id);
        return new Response(null, { status: 204 });
    } catch (e: any) {
        throw error(500, e.message);
    }
};