/**
 * Part Representation Management Functions
 * =======================================
 * These functions manage visual/3D representations of parts (3D models, renderings, etc.)
 */

import sql from "@/server/db";
import { PART_ERRORS } from "./partErrors";
import { sanitizeSqlString } from "@/utils/util";

/**
 * Interface for the PartRepresentation table representing visual models for parts
 */
export interface PartRepresentation {
    part_representation_id: string;
    part_version_id: string;
    representation_type: string; // e.g., '3D_MODEL', '2D_DRAWING', 'ICON', 'THUMBNAIL'
    file_name: string;
    file_format: string; // e.g., 'STEP', 'STL', 'PNG', 'SVG'
    file_path: string;
    file_size_bytes: number;
    resolution?: string | null; // for images, format: '1024x768'
    thumbnail_path?: string | null;
    created_at: Date;
    created_by: string;
    is_primary: boolean;
}

/**
 * Converts a database row to a PartRepresentation object
 */
function rowToPartRepresentation(row: any): PartRepresentation {
    return {
        part_representation_id: row.part_representation_id,
        part_version_id: row.part_version_id,
        representation_type: row.representation_type,
        file_name: row.file_name,
        file_format: row.file_format,
        file_path: row.file_path,
        file_size_bytes: row.file_size_bytes,
        resolution: row.resolution,
        thumbnail_path: row.thumbnail_path,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        created_by: row.created_by,
        is_primary: row.is_primary
    };
}

/**
 * Creates a new visual representation for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param representationType - Type of representation (3D_MODEL, 2D_DRAWING, etc.)
 * @param fileName - Name of the representation file
 * @param fileFormat - Format of the file (STEP, STL, PNG, etc.)
 * @param filePath - Path where the file is stored
 * @param fileSizeBytes - Size of the file in bytes
 * @param createdBy - User ID of the creator
 * @param resolution - Optional resolution for image files
 * @param thumbnailPath - Optional path to a thumbnail image
 * @param isPrimary - Whether this is the primary representation
 * 
 * @returns The newly created representation record
 */
export async function createPartRepresentation(
    partVersionId: string,
    representationType: string,
    fileName: string,
    fileFormat: string,
    filePath: string,
    fileSizeBytes: number,
    createdBy: string,
    resolution?: string | null,
    thumbnailPath?: string | null,
    isPrimary: boolean = false
): Promise<PartRepresentation> {
    try {
        // Validate inputs
        if (!representationType || representationType.trim() === '') {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: Representation type is required`);
        }
        
        if (!fileName || fileName.trim() === '') {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: File name is required`);
        }
        
        if (!fileFormat || fileFormat.trim() === '') {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: File format is required`);
        }
        
        if (!filePath || filePath.trim() === '') {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: File path is required`);
        }
        
        if (fileSizeBytes <= 0) {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: File size must be greater than 0 bytes`);
        }

        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // If this is set as primary for a specific type, unset any existing primary representations of same type
        if (isPrimary) {
            await sql`
                UPDATE "PartRepresentation"
                SET is_primary = false
                WHERE part_version_id = ${partVersionId}
                AND representation_type = ${representationType}
                AND is_primary = true
            `;
        }

        // Insert the new representation
        const representationId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "PartRepresentation" (
                part_representation_id,
                part_version_id,
                representation_type,
                file_name,
                file_format,
                file_path,
                file_size_bytes,
                resolution,
                thumbnail_path,
                created_at,
                created_by,
                is_primary
            ) VALUES (
                ${representationId},
                ${partVersionId},
                ${representationType},
                ${fileName},
                ${fileFormat},
                ${filePath},
                ${fileSizeBytes},
                ${resolution || null},
                ${thumbnailPath || null},
                NOW(),
                ${createdBy},
                ${isPrimary}
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: Failed to create representation record`);
        }

        console.log(`[createPartRepresentation] ✅ Created ${representationType} representation for part version ${partVersionId}`);
        return rowToPartRepresentation(result[0]);
    } catch (error) {
        console.error('[createPartRepresentation] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific representation by ID
 * 
 * @param representationId - The ID of the representation to retrieve
 * @returns The representation, if found
 */
export async function getPartRepresentationById(representationId: string): Promise<PartRepresentation | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartRepresentation"
            WHERE part_representation_id = ${representationId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartRepresentation(result[0]);
    } catch (error) {
        console.error('[getPartRepresentationById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all representations for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param representationType - Optional filter for a specific representation type
 * @returns Array of representations
 */
export async function getPartRepresentationsByPartVersion(
    partVersionId: string,
    representationType?: string
): Promise<PartRepresentation[]> {
    try {
        let query;
        
        if (representationType) {
            query = sql`
                SELECT * FROM "PartRepresentation"
                WHERE part_version_id = ${partVersionId}
                AND representation_type = ${representationType}
                ORDER BY is_primary DESC, created_at DESC
            `;
        } else {
            query = sql`
                SELECT * FROM "PartRepresentation"
                WHERE part_version_id = ${partVersionId}
                ORDER BY is_primary DESC, created_at DESC
            `;
        }

        const result = await query;
        return result.map(rowToPartRepresentation);
    } catch (error) {
        console.error('[getPartRepresentationsByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing representation's metadata
 * 
 * @param representationId - The ID of the representation to update
 * @param updates - Object containing the fields to update
 * @returns The updated representation
 */
export async function updatePartRepresentation(
    representationId: string,
    updates: Partial<{
        file_name: string,
        thumbnail_path: string | null,
        resolution: string | null,
        is_primary: boolean
    }>
): Promise<PartRepresentation> {
    try {
        // First check if the representation exists
        const existingResult = await sql`
            SELECT * FROM "PartRepresentation"
            WHERE part_representation_id = ${representationId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: Representation with ID ${representationId} not found`);
        }

        const existing = existingResult[0];
        
        // If setting this as primary and it wasn't before, unset any existing primary representations of same type
        if ('is_primary' in updates && updates.is_primary && !existing.is_primary) {
            await sql`
                UPDATE "PartRepresentation"
                SET is_primary = false
                WHERE part_version_id = ${existing.part_version_id}
                AND representation_type = ${existing.representation_type}
                AND is_primary = true
            `;
        }
        
        // Build the update fields array
        const updateFields = [];
        
        if ('file_name' in updates && updates.file_name) {
            const fileName = updates.file_name;
            updateFields.push(`file_name = '${sanitizeSqlString(fileName)}'`);
        }
        
        if ('resolution' in updates) {
            const resolution = updates.resolution;
            updateFields.push(`resolution = ${resolution === null ? 'NULL' : `'${sanitizeSqlString(resolution || '')}'`}`);
        }
        
        if ('thumbnail_path' in updates) {
            const thumbnailPath = updates.thumbnail_path;
            updateFields.push(`thumbnail_path = ${thumbnailPath === null ? 'NULL' : `'${sanitizeSqlString(thumbnailPath || '')}'`}`);
        }
        
        if ('is_primary' in updates) {
            updateFields.push(`is_primary = ${updates.is_primary ? 'true' : 'false'}`);
        }
        
        // If no fields to update, throw an error
        if (updateFields.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: No valid fields to update`);
        }
        
        // Construct the final SQL query string with proper parameter placement
        const updateQuery = `
            UPDATE "PartRepresentation"
            SET ${updateFields.join(', ')}
            WHERE part_representation_id = $1
            RETURNING *
        `;

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, [representationId]);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: Failed to update representation`);
        }

        console.log(`[updatePartRepresentation] ✅ Updated representation ${representationId}`);
        return rowToPartRepresentation(result[0]);
    } catch (error) {
        console.error('[updatePartRepresentation] Error:', error);
        throw error;
    }
}

/**
 * Deletes a representation
 * 
 * @param representationId - The ID of the representation to delete
 * @returns True if the deletion was successful
 */
export async function deletePartRepresentation(representationId: string): Promise<boolean> {
    try {
        // Get representation details before deleting (for logging)
        const representationDetails = await sql`
            SELECT representation_type, file_name, part_version_id FROM "PartRepresentation"
            WHERE part_representation_id = ${representationId}
        `;
        
        if (!representationDetails || representationDetails.length === 0) {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: Representation with ID ${representationId} not found or already deleted`);
        }
        
        // Now delete the representation
        const result = await sql`
            DELETE FROM "PartRepresentation"
            WHERE part_representation_id = ${representationId}
            RETURNING part_representation_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.REPRESENTATION_ERROR}: Failed to delete representation`);
        }

        const details = representationDetails[0];
        console.log(`[deletePartRepresentation] ✅ Deleted ${details.representation_type} representation ${details.file_name} (ID: ${representationId}) from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deletePartRepresentation] Error:', error);
        throw error;
    }
}
