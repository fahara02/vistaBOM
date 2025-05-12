// src/lib/server/supplier.ts
import sql from '$lib/server/db/index';
import type { Supplier, JsonValue } from '$lib/server/db/types';

// Helper to normalize supplier data from postgres result
function normalizeSupplier(row: any): Supplier {
    return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        websiteUrl: row.website_url || undefined,
        contactInfo: row.contact_info || undefined,
        logoUrl: row.logo_url || undefined,
        createdBy: row.created_by || undefined,
        createdAt: row.created_at,
        updatedBy: row.updated_by || undefined,
        updatedAt: row.updated_at
    };
}

export async function createSupplier(
    params: {
        name: string;
        description?: string;
        websiteUrl?: string;
        contactInfo?: JsonValue;
        logoUrl?: string;
        createdBy: string;
    }
): Promise<Supplier> {
    try {
        // Use porsager/postgres template literals
        const result = await sql`
            INSERT INTO Supplier (
                name, 
                description, 
                website_url, 
                contact_info, 
                logo_url, 
                created_by
            )
            VALUES (
                ${params.name},
                ${params.description || null},
                ${params.websiteUrl || null},
                ${params.contactInfo ? JSON.stringify(params.contactInfo) : null},
                ${params.logoUrl || null},
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error('Failed to create supplier');
        }

        return normalizeSupplier(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Supplier name "${params.name}" already exists`);
        }
        throw new Error(`Error creating supplier: ${error.message}`);
    }
}

export async function getSupplier(id: string): Promise<Supplier | null> {
    const result = await sql`SELECT * FROM Supplier WHERE id = ${id}`;
    return result.length > 0 ? normalizeSupplier(result[0]) : null;
}

export async function updateSupplier(
    id: string,
    updates: {
        name?: string;
        description?: string;
        websiteUrl?: string;
        contactInfo?: JsonValue;
        logoUrl?: string;
    },
    userId: string
): Promise<Supplier> {
    // With porsager/postgres, we need a different approach for dynamic updates
    // We'll use the SQL helper library to construct our query
    
    // Return early if no updates
    if (Object.keys(updates).length === 0) {
        const existing = await getSupplier(id);
        if (!existing) throw new Error('Supplier not found');
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
        if (updates.contactInfo !== undefined) {
            setParts.push('contact_info = ${contactInfo}');
            updateValues.contactInfo = updates.contactInfo ? JSON.stringify(updates.contactInfo) : null;
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
            `UPDATE Supplier 
             SET ${setParts.join(', ')} 
             WHERE id = \${id} 
             RETURNING *`,
            updateValues
        );
        
        if (result.length === 0) {
            throw new Error('Supplier not found');
        }
        
        return normalizeSupplier(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Supplier name "${updates.name}" already exists`);
        }
        throw new Error(`Error updating supplier: ${error.message}`);
    }
}

export async function deleteSupplier(id: string): Promise<void> {
    try {
        await sql`DELETE FROM Supplier WHERE id = ${id}`;
    } catch (error: any) {
        if (error.code === '23503') {
            throw new Error('Supplier cannot be deleted as it is referenced by existing parts');
        }
        throw new Error(`Error deleting supplier: ${error.message}`);
    }
}

export async function listSuppliers(): Promise<Supplier[]> {
    const result = await sql`SELECT * FROM Supplier ORDER BY name`;
    return result.map(normalizeSupplier);
}