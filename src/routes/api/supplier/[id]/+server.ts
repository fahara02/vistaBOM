// src/routes/api/suppliers/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import { updateSupplier, deleteSupplier } from '$lib/core/supplier';

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
    try {
        const data = await request.json();
        // Using the new porsager/postgres API - no client parameter needed
        const updated = await updateSupplier(
            id,
            {
                name: data.name,
                description: data.description,
                websiteUrl: data.websiteUrl,
                contactInfo: data.contactInfo,
                logoUrl: data.logoUrl,
                updatedBy: userId // Include user ID as part of the params object
            }
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
    try {
        // Using the new porsager/postgres API - no client parameter needed
        await deleteSupplier(id);
        return new Response(null, { status: 204 });
    } catch (e: any) {
        throw error(500, e.message);
    }
};