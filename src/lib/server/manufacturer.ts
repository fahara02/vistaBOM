// src/lib/server/manufacturer.ts
import type { Client } from 'ts-postgres';
import type { Manufacturer } from '$lib/server/db/types';

function mapManufacturer(row: any): Manufacturer {
    return {
        id: row.get('id'),
        name: row.get('name'),
        description: row.get('description') || undefined,
        websiteUrl: row.get('website_url') || undefined,
        logoUrl: row.get('logo_url') || undefined,
        createdBy: row.get('created_by') || undefined,
        createdAt: row.get('created_at'),
        updatedBy: row.get('updated_by') || undefined,
        updatedAt: row.get('updated_at')
    };
}

export async function createManufacturer(
    client: Client,
    params: {
        name: string;
        description?: string;
        websiteUrl?: string;
        logoUrl?: string;
        createdBy: string;
    }
): Promise<Manufacturer> {
    try {
        const result = await client.query(
            `INSERT INTO Manufacturer (name, description, website_url, logo_url, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                params.name,
                params.description || null,
                params.websiteUrl || null,
                params.logoUrl || null,
                params.createdBy
            ]
        );

        if (result.rows.length === 0) {
            throw new Error('Failed to create manufacturer');
        }

        return mapManufacturer(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Manufacturer name "${params.name}" already exists`);
        }
        throw new Error(`Error creating manufacturer: ${error.message}`);
    }
}

export async function getManufacturer(client: Client, id: string): Promise<Manufacturer | null> {
    const result = await client.query('SELECT * FROM Manufacturer WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapManufacturer(result.rows[0]) : null;
}

export async function updateManufacturer(
    client: Client,
    id: string,
    updates: {
        name?: string;
        description?: string;
        websiteUrl?: string;
        logoUrl?: string;
    },
    userId: string
): Promise<Manufacturer> {
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
    if (updates.logoUrl !== undefined) {
        fields.push(`logo_url = $${paramIndex}`);
        values.push(updates.logoUrl);
        paramIndex++;
    }

    if (fields.length === 0) {
        const existing = await getManufacturer(client, id);
        if (!existing) throw new Error('Manufacturer not found');
        return existing;
    }

    fields.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    fields.push(`updated_at = NOW()`);

    values.push(id);

    const query = `
        UPDATE Manufacturer
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;

    try {
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Manufacturer not found');
        }
        return mapManufacturer(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Manufacturer name "${updates.name}" already exists`);
        }
        throw new Error(`Error updating manufacturer: ${error.message}`);
    }
}

export async function deleteManufacturer(client: Client, id: string): Promise<void> {
    try {
        await client.query('DELETE FROM Manufacturer WHERE id = $1', [id]);
    } catch (error: any) {
        if (error.code === '23503') {
            throw new Error('Manufacturer cannot be deleted as it is referenced by existing parts');
        }
        throw new Error(`Error deleting manufacturer: ${error.message}`);
    }
}

export async function listManufacturers(client: Client): Promise<Manufacturer[]> {
    const result = await client.query('SELECT * FROM Manufacturer ORDER BY name');
    return result.rows.map(mapManufacturer);
}