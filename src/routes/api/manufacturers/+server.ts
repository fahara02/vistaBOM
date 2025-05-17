// src/routes/api/manufacturers/+server.ts
import sql from '$lib/server/db/index';
import type { Manufacturer } from '@/types';
import type { DbRow } from '@/types/db-types';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
// Helper to normalize manufacturer data from postgres result
function normalizeManufacturer(row: DbRow): Manufacturer {
    // Parse custom_fields if it's a string
    let customFields = {};
    try {
        if (typeof row.custom_fields === 'string') {
            customFields = JSON.parse(row.custom_fields);
        } else if (row.custom_fields && typeof row.custom_fields === 'object') {
            customFields = row.custom_fields;
        }
    } catch (e) {
        console.error('Error parsing custom fields:', e);
    }
    
    // Return in snake_case format to match what ManufacturerSelector expects
    return {
        manufacturer_id: row.id,
        manufacturer_name: row.name,
        manufacturer_description: row.description || '',
        website_url: row.website_url || '', // Return as snake_case for frontend
        logo_url: row.logo_url || null,     // Return as snake_case for frontend
        custom_fields: customFields,
        created_at:row.created_at,
        created_by:row.created_by,
        updated_at:row.updated_at,
        updated_by:row.updated_by
    };
}

// GET handler for fetching all manufacturers
export const GET: RequestHandler = async ({ locals }) => {
     const { user } = locals;
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
    try {
        console.log('API: Fetching manufacturers with proper lowercase table names');
        
        // Important: Using lowercase table names as per PostgreSQL convention for unquoted identifiers
        const result = await sql`
            SELECT 
                m.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, mcf.custom_field_value)
                     FROM "ManufacturerCustomField" mcf
                     JOIN "CustomField" cf ON mcf.field_id = cf.custom_field_id
                     WHERE mcf.manufacturer_id = m.manufacturer_id
                    ), '{}'::json) AS custom_fields
            FROM manufacturer m
            ORDER BY m.name ASC
        `;
        
        console.log(`API: Found ${result.length} manufacturers`);
        
        // Transform to expected format
        const manufacturers = result.map(normalizeManufacturer);
        
        return json(manufacturers);
    } catch (error) {
        console.error('API Error fetching manufacturers:', error);
        // Return empty array instead of error to prevent UI breakage
        return json([]);
    }
}
