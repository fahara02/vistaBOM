/**
 * Manufacturer Part Management Functions
 * ============================================
 * These functions manage links between parts and manufacturer parts
 */

import sql from "@/server/db";
import { PART_ERRORS } from "./partErrors";
import type { ManufacturerPart } from "@/types/schemaTypes";



function rowToManufacturerPart(row: any): ManufacturerPart {
    return {
        manufacturer_part_id: row.manufacturer_part_id,
        part_version_id: row.part_version_id,
        manufacturer_id: row.manufacturer_id,
        manufacturer_name: row.manufacturer_name,
        manufacturer_part_number: row.manufacturer_part_number,
        description: row.description,
        status: row.status,
        datasheet_url: row.datasheet_url,
        created_by: row.created_by,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updated_by: row.updated_by,
        updated_at: row.updated_at instanceof Date ? row.updated_at : 
                   (row.updated_at ? new Date(row.updated_at) : null)
    };
}

/**
 * Creates a new manufacturer part for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param manufacturerId - The ID of the manufacturer
 * @param manufacturerPartNumber - The manufacturer's part number
 * @param createdBy - User ID of the creator
 * @param manufacturerName - Optional manufacturer name (denormalized)
 * @param description - Optional description
 * @param status - Status of the part (defaults to 'ACTIVE')
 * @param datasheetUrl - Optional URL to the datasheet
 * 
 * @returns The newly created manufacturer part
 */
export async function createManufacturerPart(
    partVersionId: string,
    manufacturerId: string,
    manufacturerPartNumber: string,
    createdBy: string,
    manufacturerName?: string | null,
    description?: string | null,
    status: string = 'ACTIVE',
    datasheetUrl?: string | null
): Promise<ManufacturerPart> {
    try {
        // Validate inputs
        if (!manufacturerId || manufacturerId.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer ID is required`);
        }
        
        if (!manufacturerPartNumber || manufacturerPartNumber.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer part number is required`);
        }
        
        // Validate URL format if provided
        if (datasheetUrl && !datasheetUrl.match(/^https?:\/\//)) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Datasheet URL must start with http:// or https://`);
        }
        
        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // Check if this manufacturer part number already exists for this part version
        const existingPart = await sql`
            SELECT manufacturer_part_id FROM "ManufacturerPart"
            WHERE part_version_id = ${partVersionId}
            AND manufacturer_id = ${manufacturerId}
            AND manufacturer_part_number = ${manufacturerPartNumber}
        `;

        if (existingPart && existingPart.length > 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer part number '${manufacturerPartNumber}' for manufacturer '${manufacturerId}' already exists for this part version`);
        }

        // Insert the new manufacturer part
        const partId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "ManufacturerPart" (
                manufacturer_part_id,
                part_version_id,
                manufacturer_id,
                manufacturer_name,
                manufacturer_part_number,
                description,
                status,
                datasheet_url,
                created_by,
                created_at,
                updated_by,
                updated_at
            ) VALUES (
                ${partId},
                ${partVersionId},
                ${manufacturerId},
                ${manufacturerName || null},
                ${manufacturerPartNumber},
                ${description || null},
                ${status},
                ${datasheetUrl || null},
                ${createdBy},
                NOW(),
                ${createdBy},
                NOW()
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to create manufacturer part`);
        }

        console.log(`[createManufacturerPart] ✅ Created manufacturer part '${manufacturerPartNumber}' for part version ${partVersionId}`);
        return rowToManufacturerPart(result[0]);
    } catch (error) {
        console.error('[createManufacturerPart] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific manufacturer part by ID
 * 
 * @param manufacturerPartId - The ID of the manufacturer part to retrieve
 * @returns The manufacturer part, if found
 */
export async function getManufacturerPartById(manufacturerPartId: string): Promise<ManufacturerPart | null> {
    try {
        const result = await sql`
            SELECT * FROM "ManufacturerPart"
            WHERE manufacturer_part_id = ${manufacturerPartId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToManufacturerPart(result[0]);
    } catch (error) {
        console.error('[getManufacturerPartById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all manufacturer parts for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @returns Array of manufacturer parts
 */
export async function getManufacturerPartsByPartVersion(partVersionId: string): Promise<ManufacturerPart[]> {
    try {
        const result = await sql`
            SELECT * FROM "ManufacturerPart"
            WHERE part_version_id = ${partVersionId}
            ORDER BY manufacturer_name, manufacturer_part_number
        `;

        return result.map(rowToManufacturerPart);
    } catch (error) {
        console.error('[getManufacturerPartsByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing manufacturer part
 * 
 * @param manufacturerPartId - The ID of the manufacturer part to update
 * @param updates - Object containing the fields to update
 * @param updatedBy - User ID of the person making the update
 * @returns The updated manufacturer part
 */
export async function updateManufacturerPart(
    manufacturerPartId: string,
    updates: Partial<{
        manufacturer_name: string | null,
        manufacturer_part_number: string,
        description: string | null,
        status: string,
        datasheet_url: string | null
    }>,
    updatedBy: string
): Promise<ManufacturerPart> {
    try {
        // First check if the manufacturer part exists
        const existingResult = await sql`
            SELECT * FROM "ManufacturerPart"
            WHERE manufacturer_part_id = ${manufacturerPartId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer part with ID ${manufacturerPartId} not found`);
        }

        // Validate URL format if provided
        if ('datasheet_url' in updates && updates.datasheet_url && 
            !updates.datasheet_url.match(/^https?:\/\//)) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Datasheet URL must start with http:// or https://`);
        }

        // Build the update fields array
        const updateFields = [];
        const updateParams: any[] = [];
        let paramIndex = 1;
        
        if ('manufacturer_name' in updates) {
            updateFields.push(`manufacturer_name = $${paramIndex}`);
            updateParams.push(updates.manufacturer_name);
            paramIndex++;
        }
        
        if ('manufacturer_part_number' in updates) {
            updateFields.push(`manufacturer_part_number = $${paramIndex}`);
            updateParams.push(updates.manufacturer_part_number);
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
        
        if ('datasheet_url' in updates) {
            updateFields.push(`datasheet_url = $${paramIndex}`);
            updateParams.push(updates.datasheet_url);
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
            UPDATE "ManufacturerPart"
            SET ${updateFields.join(', ')}
            WHERE manufacturer_part_id = $${paramIndex}
            RETURNING *
        `;
        updateParams.push(manufacturerPartId);

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, updateParams);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update manufacturer part`);
        }

        console.log(`[updateManufacturerPart] ✅ Updated manufacturer part ${manufacturerPartId}`);
        return rowToManufacturerPart(result[0]);
    } catch (error) {
        console.error('[updateManufacturerPart] Error:', error);
        throw error;
    }
}

/**
 * Deletes a manufacturer part
 * 
 * @param manufacturerPartId - The ID of the manufacturer part to delete
 * @returns True if the deletion was successful
 */
export async function deleteManufacturerPart(manufacturerPartId: string): Promise<boolean> {
    try {
        // Check if this manufacturer part is referenced by any supplier parts
        const referencedBy = await sql`
            SELECT supplier_part_id FROM "SupplierPart"
            WHERE manufacturer_part_id = ${manufacturerPartId}
        `;
        
        if (referencedBy && referencedBy.length > 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Cannot delete manufacturer part because it is referenced by ${referencedBy.length} supplier parts`);
        }
        
        // Get manufacturer part details before deleting (for logging)
        const partDetails = await sql`
            SELECT manufacturer_part_number, part_version_id FROM "ManufacturerPart"
            WHERE manufacturer_part_id = ${manufacturerPartId}
        `;
        
        if (!partDetails || partDetails.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Manufacturer part with ID ${manufacturerPartId} not found or already deleted`);
        }
        
        // Now delete the manufacturer part
        const result = await sql`
            DELETE FROM "ManufacturerPart"
            WHERE manufacturer_part_id = ${manufacturerPartId}
            RETURNING manufacturer_part_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to delete manufacturer part`);
        }

        const details = partDetails[0];
        console.log(`[deleteManufacturerPart] ✅ Deleted manufacturer part '${details.manufacturer_part_number}' from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deleteManufacturerPart] Error:', error);
        throw error;
    }
}