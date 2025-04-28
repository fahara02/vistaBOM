// src/lib/server/supplier.ts
import type { Client } from 'ts-postgres';
import type { Supplier, JsonValue } from '$lib/server/db/types';

function mapSupplier(row: any): Supplier {
    return {
        id: row.get('id'),
        name: row.get('name'),
        description: row.get('description') || undefined,
        websiteUrl: row.get('website_url') || undefined,
        contactInfo: row.get('contact_info') || undefined,
        logoUrl: row.get('logo_url') || undefined,
        createdBy: row.get('created_by') || undefined,
        createdAt: row.get('created_at'),
        updatedBy: row.get('updated_by') || undefined,
        updatedAt: row.get('updated_at')
    };
}

export async function createSupplier(
    client: Client,
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
        const result = await client.query(
            `INSERT INTO Supplier (name, description, website_url, contact_info, logo_url, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                params.name,
                params.description || null,
                params.websiteUrl || null,
                params.contactInfo ? JSON.stringify(params.contactInfo) : null,
                params.logoUrl || null,
                params.createdBy
            ]
        );

        if (result.rows.length === 0) {
            throw new Error('Failed to create supplier');
        }

        return mapSupplier(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Supplier name "${params.name}" already exists`);
        }
        throw new Error(`Error creating supplier: ${error.message}`);
    }
}

export async function getSupplier(client: Client, id: string): Promise<Supplier | null> {
    const result = await client.query('SELECT * FROM Supplier WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapSupplier(result.rows[0]) : null;
}

export async function updateSupplier(
    client: Client,
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
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex}`);
        values.push(updates.name);
        paramIndex++;
    }
    if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex}`);
        values.push(updates.description);
        paramIndex++;
    }
    if (updates.websiteUrl !== undefined) {
        fields.push(`website_url = $${paramIndex}`);
        values.push(updates.websiteUrl);
        paramIndex++;
    }
    if (updates.contactInfo !== undefined) {
        fields.push(`contact_info = $${paramIndex}`);
        values.push(updates.contactInfo ? JSON.stringify(updates.contactInfo) : null);
        paramIndex++;
    }
    if (updates.logoUrl !== undefined) {
        fields.push(`logo_url = $${paramIndex}`);
        values.push(updates.logoUrl);
        paramIndex++;
    }

    if (fields.length === 0) {
        const existing = await getSupplier(client, id);
        if (!existing) throw new Error('Supplier not found');
        return existing;
    }

    fields.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    fields.push(`updated_at = NOW()`);

    values.push(id);

    const query = `
        UPDATE Supplier
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;

    try {
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Supplier not found');
        }
        return mapSupplier(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Supplier name "${updates.name}" already exists`);
        }
        throw new Error(`Error updating supplier: ${error.message}`);
    }
}

export async function deleteSupplier(client: Client, id: string): Promise<void> {
    try {
        await client.query('DELETE FROM Supplier WHERE id = $1', [id]);
    } catch (error: any) {
        if (error.code === '23503') {
            throw new Error('Supplier cannot be deleted as it is referenced by existing parts');
        }
        throw new Error(`Error deleting supplier: ${error.message}`);
    }
}

export async function listSuppliers(client: Client): Promise<Supplier[]> {
    const result = await client.query('SELECT * FROM Supplier ORDER BY name');
    return result.rows.map(mapSupplier);
}