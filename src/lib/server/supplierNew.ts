import sql from '$lib/server/db/postgres';
import type { Supplier, JsonValue } from '$lib/server/db/types';

// Map database row to Supplier type
function mapSupplier(row: any): Supplier {
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
        const result = await sql`
            INSERT INTO "Supplier" (
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

        return mapSupplier(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Supplier name "${params.name}" already exists`);
        }
        throw new Error(`Error creating supplier: ${error.message}`);
    }
}

export async function getSupplier(id: string): Promise<Supplier | null> {
    const result = await sql`
        SELECT * FROM "Supplier" WHERE id = ${id}
    `;
    
    return result.length > 0 ? mapSupplier(result[0]) : null;
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
    // If no updates provided, return existing supplier
    if (!updates.name && updates.description === undefined && 
        updates.websiteUrl === undefined && updates.contactInfo === undefined &&
        updates.logoUrl === undefined) {
        const existing = await getSupplier(id);
        if (!existing) throw new Error('Supplier not found');
        return existing;
    }

    try {
        // Use sql helper for dynamic updates
        const updateObject: any = {};
        
        if (updates.name !== undefined) updateObject.name = updates.name;
        if (updates.description !== undefined) updateObject.description = updates.description;
        if (updates.websiteUrl !== undefined) updateObject.website_url = updates.websiteUrl;
        if (updates.contactInfo !== undefined) {
            updateObject.contact_info = updates.contactInfo ? 
                JSON.stringify(updates.contactInfo) : null;
        }
        if (updates.logoUrl !== undefined) updateObject.logo_url = updates.logoUrl;
        
        // Always update these fields
        updateObject.updated_by = userId;
        updateObject.updated_at = new Date();
        
        const result = await sql`
            UPDATE "Supplier"
            SET ${sql(updateObject)}
            WHERE id = ${id}
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error('Supplier not found');
        }

        return mapSupplier(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Supplier name "${updates.name}" already exists`);
        }
        throw new Error(`Error updating supplier: ${error.message}`);
    }
}

export async function deleteSupplier(id: string): Promise<void> {
    try {
        await sql`DELETE FROM "Supplier" WHERE id = ${id}`;
    } catch (error: any) {
        if (error.code === '23503') {
            throw new Error('Supplier cannot be deleted as it is referenced by existing parts');
        }
        throw new Error(`Error deleting supplier: ${error.message}`);
    }
}

export async function listSuppliers(): Promise<Supplier[]> {
    const result = await sql`
        SELECT * FROM "Supplier" ORDER BY name
    `;
    
    return result.map(mapSupplier);
}
