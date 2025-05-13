// src/lib/server/manufacturer.ts
import sql from '$lib/server/db/index';
import type { Manufacturer } from '@/types/types';

// Helper to normalize manufacturer data from postgres result
function normalizeManufacturer(row: any): Manufacturer {
    // Debug what's coming from the database
    console.log('normalizeManufacturer input raw data:', JSON.stringify(row, null, 2));
    
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
    
    // Create normalized object
    const normalized = {
        id: row.id,
        name: row.name,
        description: row.description || null,
        websiteUrl: row.website_url || null,
        // contact_info field doesn't exist in the actual database table
        // but keeping it in the type for UI purposes
        contactInfo: null,
        logoUrl: row.logo_url || null,
        createdBy: row.created_by || null,
        createdAt: row.created_at,
        updatedBy: row.updated_by || null,
        updatedAt: row.updated_at,
        customFields: customFields
    };
    
    console.log('normalizeManufacturer output:', JSON.stringify(normalized, null, 2));
    return normalized;
}

export async function createManufacturer(
    params: {
        name: string;
        description?: string;
        websiteUrl?: string;
        // contactInfo removed from params since it's not in DB
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
    // Use template literals for the complex query - with lowercase table names to match actual DB
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
        // contactInfo removed from updates since it's not in DB
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
        // Build the dynamic SET clause with proper parameter indexing
        const setParts = [];
        const paramValues = [];
        let paramIndex = 1;
        
        if (updates.name !== undefined) {
            setParts.push(`name = $${paramIndex}`);
            paramValues.push(updates.name);
            paramIndex++;
        }
        if (updates.description !== undefined) {
            setParts.push(`description = $${paramIndex}`);
            paramValues.push(updates.description);
            paramIndex++;
        }
        if (updates.websiteUrl !== undefined) {
            setParts.push(`website_url = $${paramIndex}`);
            paramValues.push(updates.websiteUrl);
            paramIndex++;
        }
        if (updates.logoUrl !== undefined) {
            setParts.push(`logo_url = $${paramIndex}`);
            paramValues.push(updates.logoUrl);
            paramIndex++;
        }
        // contactInfo field removed as it doesn't exist in actual DB table
        
        // Always add updated_by and updated_at
        setParts.push(`updated_by = $${paramIndex}`);
        paramValues.push(userId);
        paramIndex++;
        setParts.push('updated_at = NOW()');
        
        // Construct the query with proper parameter placeholders
        const query = `
            UPDATE Manufacturer 
            SET ${setParts.join(', ')} 
            WHERE id = $${paramIndex} 
            RETURNING *
        `;
        
        // Add ID as the last parameter
        paramValues.push(id);
        
        // Execute with parameters in correct order
        const result = await sql.unsafe(query, paramValues);
        
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