//src/routes/api/manufacturers/[id]/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import { getManufacturerById, updateManufacturerCustomFields, deleteManufacturer } from '$lib/core/manufacturer';

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
        // First check if manufacturer exists
        const manufacturer = await getManufacturerById(id);
        if (!manufacturer) {
            throw error(404, 'Manufacturer not found');
        }
        
        // Update the manufacturer data directly using SQL
        await sql`
            UPDATE "Manufacturer"
            SET 
                manufacturer_name = ${data.updates.name || manufacturer.manufacturer_name},
                manufacturer_description = ${data.updates.description || manufacturer.manufacturer_description},
                website_url = ${data.updates.websiteUrl || manufacturer.website_url},
                logo_url = ${data.updates.logoUrl || manufacturer.logo_url},
                updated_by = ${userId},
                updated_at = NOW()
            WHERE manufacturer_id = ${id}
        `;
        
        // Update custom fields if provided
        if (data.updates.customFields) {
            await updateManufacturerCustomFields(id, data.updates.customFields);
        }
        
        // Get the updated manufacturer
        const updated = await getManufacturerById(id);
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
    const userId = locals.user.user_id; // Fixed: using user_id instead of id
    if (!userId) {
        throw error(401, 'Unauthorized');
    }
    try {
        // Use the new deleteManufacturer function which handles all validations and deletions in a transaction
        await deleteManufacturer(id);
        return new Response(null, { status: 204 });
    } catch (e: any) {
        console.error('Delete manufacturer error:', e);
        
        // Return appropriate status codes based on error type
        if (e.message.includes('referenced by') || e.message.includes('REFERENCED_BY_PARTS')) {
            throw error(409, e.message); // Conflict - can't delete due to references
        } else if (e.message.includes('not found') || e.message.includes('NOT_FOUND')) {
            throw error(404, e.message); // Not found
        } else {
            throw error(500, e instanceof Error ? e.message : 'Failed to delete manufacturer');
        }
    }
};
