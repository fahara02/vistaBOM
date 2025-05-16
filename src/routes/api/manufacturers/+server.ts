// src/routes/api/manufacturers/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import type { Manufacturer } from '@/types/types';

// Helper to normalize manufacturer data from postgres result
function normalizeManufacturer(row: any): any {
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
        id: row.id,
        name: row.name,
        description: row.description || '',
        website_url: row.website_url || '', // Return as snake_case for frontend
        logo_url: row.logo_url || null,     // Return as snake_case for frontend
        custom_fields: customFields
    };
}

// GET handler for fetching all manufacturers
export const GET: RequestHandler = async ({ url }) => {
    try {
        console.log('API: Fetching manufacturers with proper lowercase table names');
        
        // Important: Using lowercase table names as per PostgreSQL convention for unquoted identifiers
        const result = await sql`
            SELECT 
                m.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, mcf.value)
                     FROM manufacturercustomfield mcf
                     JOIN customfield cf ON mcf.field_id = cf.id
                     WHERE mcf.manufacturer_id = m.id
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
