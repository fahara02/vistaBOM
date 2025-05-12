// src/lib/server/manufacturer.ts
import sql from '$lib/server/db/index';
import type { Manufacturer } from '$lib/server/db/types';

// Helper to normalize manufacturer data from postgres result
function normalizeManufacturer(row: any): Manufacturer {
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
        customFields: row.custom_fields || {} // Add customFields mapping
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
        // Use porsager/postgres template literals
        const result = await sql`
            INSERT INTO Manufacturer (
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

        return normalizeManufacturer(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Manufacturer name "${params.name}" already exists`);
        }
        throw new Error(`Error creating manufacturer: ${error.message}`);
    }
}

export async function getManufacturer(id: string): Promise<Manufacturer | null> {
    // Use template literals for the complex query
    const result = await sql`
        SELECT 
            m.*,
            COALESCE(
                (SELECT json_object_agg(cf.field_name, mcf.value)
                 FROM ManufacturerCustomField mcf
                 JOIN CustomField cf ON mcf.field_id = cf.id
                 WHERE mcf.manufacturer_id = m.id
                ), '{}'::json) AS custom_fields
         FROM Manufacturer m
         WHERE m.id = ${id}
    `;
    
    return result.length > 0 ? normalizeManufacturer(result[0]) : null;
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
    // With porsager/postgres, we need a different approach for dynamic updates
    
    // Return early if no updates
    if (Object.keys(updates).length === 0) {
        const existing = await getManufacturer(id);
        if (!existing) throw new Error('Manufacturer not found');
        return existing;
    }
    
    try {
        // Build the dynamic SET clause
        const setParts = [];
        const updateValues: any = {};
        
        if (updates.name !== undefined) {
            setParts.push('name = ${name}');
            updateValues.name = updates.name;
        }
        if (updates.description !== undefined) {
            setParts.push('description = ${description}');
            updateValues.description = updates.description;
        }
        if (updates.websiteUrl !== undefined) {
            setParts.push('website_url = ${websiteUrl}');
            updateValues.websiteUrl = updates.websiteUrl;
        }
        if (updates.logoUrl !== undefined) {
            setParts.push('logo_url = ${logoUrl}');
            updateValues.logoUrl = updates.logoUrl;
        }
        
        // Always add updated_by and updated_at
        setParts.push('updated_by = ${userId}');
        updateValues.userId = userId;
        setParts.push('updated_at = NOW()');
        
        // Add the ID for the WHERE clause
        updateValues.id = id;
        
        // Use sql.unsafe for dynamic queries that can't be directly expressed in template literals
        const result = await sql.unsafe(
            `UPDATE Manufacturer 
             SET ${setParts.join(', ')} 
             WHERE id = \${id} 
             RETURNING *`,
            updateValues
        );
        
        // Fetch the custom fields for the updated manufacturer
        const manufacturerWithCustomFields = await getManufacturer(id);
        if (!manufacturerWithCustomFields) {
            throw new Error('Manufacturer not found after update');
        }
        
        return manufacturerWithCustomFields;
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Manufacturer name "${updates.name}" already exists`);
        }
        throw new Error(`Error updating manufacturer: ${error.message}`);
    }
}

export async function deleteManufacturer(id: string): Promise<void> {
    try {
        await sql`DELETE FROM Manufacturer WHERE id = ${id}`;
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
                 FROM ManufacturerCustomField mcf
                 JOIN CustomField cf ON mcf.field_id = cf.id
                 WHERE mcf.manufacturer_id = m.id
                ), '{}'::json) AS custom_fields
        FROM Manufacturer m
        ORDER BY name
    `;
    return result.map(normalizeManufacturer);
}