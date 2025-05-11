import sql from '$lib/server/db/postgres';
import type { Manufacturer } from '$lib/server/db/types';

// Map database row to Manufacturer type
function mapManufacturer(row: any): Manufacturer {
    return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        websiteUrl: row.website_url || undefined,
        logoUrl: row.logo_url || undefined,
        createdBy: row.created_by || undefined,
        createdAt: row.created_at,
        updatedBy: row.updated_by || undefined,
        updatedAt: row.updated_at,
        customFields: row.custom_fields || {} 
    };
}

export async function createManufacturer(
    params: {
        name: string;
        description?: string;
        websiteUrl?: string;
        logoUrl?: string;
        createdBy: string;
    }
): Promise<Manufacturer> {
    try {
        const result = await sql`
            INSERT INTO "Manufacturer" (
                name, 
                description, 
                website_url, 
                logo_url, 
                created_by
            )
            VALUES (
                ${params.name}, 
                ${params.description || null}, 
                ${params.websiteUrl || null}, 
                ${params.logoUrl || null}, 
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error('Failed to create manufacturer');
        }

        return mapManufacturer(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Manufacturer name "${params.name}" already exists`);
        }
        throw new Error(`Error creating manufacturer: ${error.message}`);
    }
}

export async function getManufacturer(id: string): Promise<Manufacturer | null> {
    const result = await sql`
        SELECT 
            m.*,
            COALESCE(
                (SELECT json_object_agg(cf.field_name, mcf.value)
                 FROM "ManufacturerCustomField" mcf
                 JOIN "CustomField" cf ON mcf.field_id = cf.id
                 WHERE mcf.manufacturer_id = m.id
                ), '{}'::json) AS custom_fields
         FROM "Manufacturer" m
         WHERE m.id = ${id}
    `;
    
    return result.length > 0 ? mapManufacturer(result[0]) : null;
}

export async function updateManufacturer(
    id: string,
    updates: {
        name?: string;
        description?: string;
        websiteUrl?: string;
        logoUrl?: string;
    },
    userId: string
): Promise<Manufacturer> {
    // If no updates provided, return existing manufacturer
    if (!updates.name && updates.description === undefined && 
        updates.websiteUrl === undefined && updates.logoUrl === undefined) {
        const existing = await getManufacturer(id);
        if (!existing) throw new Error('Manufacturer not found');
        return existing;
    }

    try {
        // Use sql helper for dynamic updates
        const updateObject: any = {};
        
        if (updates.name !== undefined) updateObject.name = updates.name;
        if (updates.description !== undefined) updateObject.description = updates.description;
        if (updates.websiteUrl !== undefined) updateObject.website_url = updates.websiteUrl;
        if (updates.logoUrl !== undefined) updateObject.logo_url = updates.logoUrl;
        
        // Always update these fields
        updateObject.updated_by = userId;
        updateObject.updated_at = new Date();
        
        const result = await sql`
            UPDATE "Manufacturer"
            SET ${sql(updateObject)}
            WHERE id = ${id}
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error('Manufacturer not found');
        }

        return mapManufacturer(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Manufacturer name "${updates.name}" already exists`);
        }
        throw new Error(`Error updating manufacturer: ${error.message}`);
    }
}

export async function deleteManufacturer(id: string): Promise<void> {
    try {
        await sql`DELETE FROM "Manufacturer" WHERE id = ${id}`;
    } catch (error: any) {
        if (error.code === '23503') {
            throw new Error('Manufacturer cannot be deleted as it is referenced by existing parts');
        }
        throw new Error(`Error deleting manufacturer: ${error.message}`);
    }
}

export async function listManufacturers(): Promise<Manufacturer[]> {
    const result = await sql`
        SELECT 
            m.*,
            COALESCE(
                (SELECT json_object_agg(cf.field_name, mcf.value)
                 FROM "ManufacturerCustomField" mcf
                 JOIN "CustomField" cf ON mcf.field_id = cf.id
                 WHERE mcf.manufacturer_id = m.id
                ), '{}'::json) AS custom_fields
        FROM "Manufacturer" m
        ORDER BY name
    `;
    
    return result.map(mapManufacturer);
}
