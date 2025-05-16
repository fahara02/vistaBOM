/**
 * Supplier Part Management Functions
 * ============================================
 * These functions manage links between parts and supplier parts
 */

import sql from "@/server/db";
import { PART_ERRORS } from "./partErrors";

/**
 * Interface for the SupplierPart table
 */
export interface SupplierPart {
    supplier_part_id: string;
    part_version_id: string;
    supplier_id: string;
    supplier_name?: string | null; // Denormalized for convenience
    supplier_part_number: string;
    manufacturer_part_id?: string | null; // Optional link to manufacturer part
    description?: string | null;
    status: string; // e.g., 'ACTIVE', 'OBSOLETE', 'EOL', 'NRND'
    packaging?: string | null; // e.g., 'Reel', 'Tube', 'Tray'
    min_order_quantity?: number | null;
    lead_time_days?: number | null;
    created_by: string;
    created_at: Date;
    updated_by?: string | null;
    updated_at?: Date | null;
}

/**
 * Converts a database row to a SupplierPart object
 */
function rowToSupplierPart(row: any): SupplierPart {
    return {
        supplier_part_id: row.supplier_part_id,
        part_version_id: row.part_version_id,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        supplier_part_number: row.supplier_part_number,
        manufacturer_part_id: row.manufacturer_part_id,
        description: row.description,
        status: row.status,
        packaging: row.packaging,
        min_order_quantity: row.min_order_quantity,
        lead_time_days: row.lead_time_days,
        created_by: row.created_by,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updated_by: row.updated_by,
        updated_at: row.updated_at instanceof Date ? row.updated_at : 
                   (row.updated_at ? new Date(row.updated_at) : null)
    };
}



/**
 * Creates a new supplier part for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param supplierId - The ID of the supplier
 * @param supplierPartNumber - The supplier's part number
 * @param createdBy - User ID of the creator
 * @param supplierName - Optional supplier name (denormalized)
 * @param manufacturerPartId - Optional link to manufacturer part
 * @param description - Optional description
 * @param status - Status of the part (defaults to 'ACTIVE')
 * @param packaging - Optional packaging information
 * @param minOrderQuantity - Optional minimum order quantity
 * @param leadTimeDays - Optional lead time in days
 * 
 * @returns The newly created supplier part
 */
export async function createSupplierPart(
    partVersionId: string,
    supplierId: string,
    supplierPartNumber: string,
    createdBy: string,
    supplierName?: string | null,
    manufacturerPartId?: string | null,
    description?: string | null,
    status: string = 'ACTIVE',
    packaging?: string | null,
    minOrderQuantity?: number | null,
    leadTimeDays?: number | null
): Promise<SupplierPart> {
    try {
        // Validate inputs
        if (!supplierId || supplierId.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Supplier ID is required`);
        }
        
        if (!supplierPartNumber || supplierPartNumber.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Supplier part number is required`);
        }
        
        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // If manufacturer part ID is provided, check if it exists
        if (manufacturerPartId) {
            const manufacturerPartCheck = await sql`
                SELECT manufacturer_part_id FROM "ManufacturerPart"
                WHERE manufacturer_part_id = ${manufacturerPartId}
            `;

            if (!manufacturerPartCheck || manufacturerPartCheck.length === 0) {
                throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer part with ID ${manufacturerPartId} not found`);
            }
        }

        // Check if this supplier part number already exists for this part version
        const existingPart = await sql`
            SELECT supplier_part_id FROM "SupplierPart"
            WHERE part_version_id = ${partVersionId}
            AND supplier_id = ${supplierId}
            AND supplier_part_number = ${supplierPartNumber}
        `;

        if (existingPart && existingPart.length > 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Supplier part number '${supplierPartNumber}' for supplier '${supplierId}' already exists for this part version`);
        }

        // Insert the new supplier part
        const partId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "SupplierPart" (
                supplier_part_id,
                part_version_id,
                supplier_id,
                supplier_name,
                supplier_part_number,
                manufacturer_part_id,
                description,
                status,
                packaging,
                min_order_quantity,
                lead_time_days,
                created_by,
                created_at,
                updated_by,
                updated_at
            ) VALUES (
                ${partId},
                ${partVersionId},
                ${supplierId},
                ${supplierName || null},
                ${supplierPartNumber},
                ${manufacturerPartId || null},
                ${description || null},
                ${status},
                ${packaging || null},
                ${minOrderQuantity || null},
                ${leadTimeDays || null},
                ${createdBy},
                NOW(),
                ${createdBy},
                NOW()
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to create supplier part`);
        }

        console.log(`[createSupplierPart] ✅ Created supplier part '${supplierPartNumber}' for part version ${partVersionId}`);
        return rowToSupplierPart(result[0]);
    } catch (error) {
        console.error('[createSupplierPart] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific supplier part by ID
 * 
 * @param supplierPartId - The ID of the supplier part to retrieve
 * @returns The supplier part, if found
 */
export async function getSupplierPartById(supplierPartId: string): Promise<SupplierPart | null> {
    try {
        const result = await sql`
            SELECT * FROM "SupplierPart"
            WHERE supplier_part_id = ${supplierPartId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToSupplierPart(result[0]);
    } catch (error) {
        console.error('[getSupplierPartById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all supplier parts for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @returns Array of supplier parts
 */
export async function getSupplierPartsByPartVersion(partVersionId: string): Promise<SupplierPart[]> {
    try {
        const result = await sql`
            SELECT * FROM "SupplierPart"
            WHERE part_version_id = ${partVersionId}
            ORDER BY supplier_name, supplier_part_number
        `;

        return result.map(rowToSupplierPart);
    } catch (error) {
        console.error('[getSupplierPartsByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing supplier part
 * 
 * @param supplierPartId - The ID of the supplier part to update
 * @param updates - Object containing the fields to update
 * @param updatedBy - User ID of the person making the update
 * @returns The updated supplier part
 */
export async function updateSupplierPart(
    supplierPartId: string,
    updates: Partial<{
        supplier_name: string | null,
        supplier_part_number: string,
        manufacturer_part_id: string | null,
        description: string | null,
        status: string,
        packaging: string | null,
        min_order_quantity: number | null,
        lead_time_days: number | null
    }>,
    updatedBy: string
): Promise<SupplierPart> {
    try {
        // First check if the supplier part exists
        const existingResult = await sql`
            SELECT * FROM "SupplierPart"
            WHERE supplier_part_id = ${supplierPartId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Supplier part with ID ${supplierPartId} not found`);
        }

        // Check manufacturer part if changing it
        if ('manufacturer_part_id' in updates && updates.manufacturer_part_id) {
            const manufacturerPartCheck = await sql`
                SELECT manufacturer_part_id FROM "ManufacturerPart"
                WHERE manufacturer_part_id = ${updates.manufacturer_part_id}
            `;

            if (!manufacturerPartCheck || manufacturerPartCheck.length === 0) {
                throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer part with ID ${updates.manufacturer_part_id} not found`);
            }
        }

        // Build the update fields array
        const updateFields = [];
        const updateParams: any[] = [];
        let paramIndex = 1;
        
        if ('supplier_name' in updates) {
            updateFields.push(`supplier_name = $${paramIndex}`);
            updateParams.push(updates.supplier_name);
            paramIndex++;
        }
        
        if ('supplier_part_number' in updates) {
            updateFields.push(`supplier_part_number = $${paramIndex}`);
            updateParams.push(updates.supplier_part_number);
            paramIndex++;
        }
        
        if ('manufacturer_part_id' in updates) {
            updateFields.push(`manufacturer_part_id = $${paramIndex}`);
            updateParams.push(updates.manufacturer_part_id);
            paramIndex++;
        }
        
        if ('description' in updates) {
            updateFields.push(`description = $${paramIndex}`);
            updateParams.push(updates.description);
            paramIndex++;
        }
        
        if ('status' in updates) {
            updateFields.push(`status = $${paramIndex}`);
            updateParams.push(updates.status);
            paramIndex++;
        }
        
        if ('packaging' in updates) {
            updateFields.push(`packaging = $${paramIndex}`);
            updateParams.push(updates.packaging);
            paramIndex++;
        }
        
        if ('min_order_quantity' in updates) {
            updateFields.push(`min_order_quantity = $${paramIndex}`);
            updateParams.push(updates.min_order_quantity);
            paramIndex++;
        }
        
        if ('lead_time_days' in updates) {
            updateFields.push(`lead_time_days = $${paramIndex}`);
            updateParams.push(updates.lead_time_days);
            paramIndex++;
        }
        
        // Add updated_by and updated_at fields
        updateFields.push(`updated_by = $${paramIndex}`);
        updateParams.push(updatedBy);
        paramIndex++;
        
        updateFields.push(`updated_at = NOW()`);
        
        // If no fields to update, throw an error
        if (updateFields.length <= 2) { // Only updated_by and updated_at
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: No valid fields to update`);
        }
        
        // Construct the final SQL query string with proper parameter placement
        const updateQuery = `
            UPDATE "SupplierPart"
            SET ${updateFields.join(', ')}
            WHERE supplier_part_id = $${paramIndex}
            RETURNING *
        `;
        updateParams.push(supplierPartId);

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, updateParams);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update supplier part`);
        }

        console.log(`[updateSupplierPart] ✅ Updated supplier part ${supplierPartId}`);
        return rowToSupplierPart(result[0]);
    } catch (error) {
        console.error('[updateSupplierPart] Error:', error);
        throw error;
    }
}

/**
 * Deletes a supplier part
 * 
 * @param supplierPartId - The ID of the supplier part to delete
 * @returns True if the deletion was successful
 */
export async function deleteSupplierPart(supplierPartId: string): Promise<boolean> {
    try {
        // Get supplier part details before deleting (for logging)
        const partDetails = await sql`
            SELECT supplier_part_number, part_version_id FROM "SupplierPart"
            WHERE supplier_part_id = ${supplierPartId}
        `;
        
        if (!partDetails || partDetails.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Supplier part with ID ${supplierPartId} not found or already deleted`);
        }
        
        // Now delete the supplier part
        const result = await sql`
            DELETE FROM "SupplierPart"
            WHERE supplier_part_id = ${supplierPartId}
            RETURNING supplier_part_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to delete supplier part`);
        }

        const details = partDetails[0];
        console.log(`[deleteSupplierPart] ✅ Deleted supplier part '${details.supplier_part_number}' from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deleteSupplierPart] Error:', error);
        throw error;
    }
}