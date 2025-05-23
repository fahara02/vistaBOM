// src/routes/api/supplier/[id]/+server.ts
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
    const userId = locals.user.user_id;
    if (!userId) {
        throw error(401, 'Unauthorized');
    }
    try {
        const data = await request.json();
        // Using the new porsager/postgres API - no client parameter needed
        const updated = await updateSupplier(
            id,
            {
                supplier_name: data.supplier_name,
                supplier_description: data.supplier_description,
                websiteUrl: data.websiteUrl,
                contactInfo: data.contactInfo,
                logoUrl: data.logoUrl,
                updatedBy: userId, // Include user ID as part of the params object
                customFields: data.customFields // Pass custom fields from the request
            }
        );
        return json(updated);
    } catch (e: any) {
        console.error('Delete supplier error:', e);
        throw error(500, e instanceof Error ? e.message : 'Failed to delete supplier');
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
    const userId = locals.user.user_id;
    if (!userId) {
        throw error(401, 'Unauthorized');
    }
    try {
        // Using the new porsager/postgres API - no client parameter needed
        await deleteSupplier(id);
        return new Response(null, { status: 204 });
    } catch (e: any) {
        console.error('Delete supplier error:', e);
        throw error(500, e instanceof Error ? e.message : 'Failed to delete supplier');
    }
};