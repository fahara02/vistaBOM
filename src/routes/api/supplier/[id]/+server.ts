// src/routes/api/supplier/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import { updateSupplier, deleteSupplier, updateSupplierCustomFields } from '$lib/core/supplier';

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
                name: data.supplier_name || data.name,
                description: data.supplier_description || data.description,
                websiteUrl: data.website_url || data.websiteUrl,
                contactInfo: data.contact_info || data.contactInfo,
                logoUrl: data.logo_url || data.logoUrl,
                updatedBy: userId // Include user ID as part of the params object
            }
        );
        
        // Handle custom fields separately if they exist
        if (data.custom_fields || data.customFields) {
            await updateSupplierCustomFields(
                id, 
                data.custom_fields || data.customFields || {}
            );
        }
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