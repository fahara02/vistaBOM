/**
 * Part Attachment Management Functions
 * ==================================
 * These functions manage file attachments for parts (datasheets, drawings, etc.)
 */

import sql from "@/server/db";
import { PART_ERRORS } from "./partErrors";
import { sanitizeSqlString } from "@/utils/util";
import type { PartAttachment } from "@/types/schemaTypes";


/**
 * Converts a database row to a PartAttachment object
 */
function rowToPartAttachment(row: any): PartAttachment {
    return {
        part_attachment_id: row.part_attachment_id,
        part_version_id: row.part_version_id,
        file_name: row.file_name,
        file_size_bytes: row.file_size_bytes,
        file_type: row.file_type,
        file_path: row.file_path,
        description: row.description,
        upload_date: row.upload_date instanceof Date ? row.upload_date : new Date(row.upload_date),
        uploaded_by: row.uploaded_by,
        is_primary: row.is_primary
    };
}

/**
 * Creates a new file attachment for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param fileName - Name of the uploaded file
 * @param fileSizeBytes - Size of the file in bytes
 * @param fileType - MIME type or extension of the file
 * @param filePath - Path where the file is stored
 * @param uploadedBy - User ID of the uploader
 * @param description - Optional description of the file
 * @param isPrimary - Whether this is the primary attachment (e.g., main datasheet)
 * 
 * @returns The newly created attachment record
 */
export async function createPartAttachment(
    partVersionId: string,
    fileName: string,
    fileSizeBytes: number,
    fileType: string,
    filePath: string,
    uploadedBy: string,
    description?: string | null,
    isPrimary: boolean = false
): Promise<PartAttachment> {
    try {
        // Validate inputs
        if (!fileName || fileName.trim() === '') {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: File name is required`);
        }
        
        if (fileSizeBytes <= 0) {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: File size must be greater than 0 bytes`);
        }
        
        if (!fileType || fileType.trim() === '') {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: File type is required`);
        }
        
        if (!filePath || filePath.trim() === '') {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: File path is required`);
        }

        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // If this is set as primary, unset any existing primary attachments
        if (isPrimary) {
            await sql`
                UPDATE "PartAttachment"
                SET is_primary = false
                WHERE part_version_id = ${partVersionId}
                AND is_primary = true
            `;
        }

        // Insert the new attachment
        const attachmentId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "PartAttachment" (
                part_attachment_id,
                part_version_id,
                file_name,
                file_size_bytes,
                file_type,
                file_path,
                description,
                upload_date,
                uploaded_by,
                is_primary
            ) VALUES (
                ${attachmentId},
                ${partVersionId},
                ${fileName},
                ${fileSizeBytes},
                ${fileType},
                ${filePath},
                ${description || null},
                NOW(),
                ${uploadedBy},
                ${isPrimary}
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: Failed to create attachment record`);
        }

        console.log(`[createPartAttachment] ✅ Created attachment ${fileName} for part version ${partVersionId}`);
        return rowToPartAttachment(result[0]);
    } catch (error) {
        console.error('[createPartAttachment] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific attachment by ID
 * 
 * @param attachmentId - The ID of the attachment to retrieve
 * @returns The attachment, if found
 */
export async function getPartAttachmentById(attachmentId: string): Promise<PartAttachment | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartAttachment"
            WHERE part_attachment_id = ${attachmentId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartAttachment(result[0]);
    } catch (error) {
        console.error('[getPartAttachmentById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all attachments for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param fileType - Optional filter for specific file types
 * @returns Array of attachments
 */
export async function getPartAttachmentsByPartVersion(
    partVersionId: string,
    fileType?: string
): Promise<PartAttachment[]> {
    try {
        let query;
        
        if (fileType) {
            query = sql`
                SELECT * FROM "PartAttachment"
                WHERE part_version_id = ${partVersionId}
                AND file_type = ${fileType}
                ORDER BY is_primary DESC, upload_date DESC
            `;
        } else {
            query = sql`
                SELECT * FROM "PartAttachment"
                WHERE part_version_id = ${partVersionId}
                ORDER BY is_primary DESC, upload_date DESC
            `;
        }

        const result = await query;
        return result.map(rowToPartAttachment);
    } catch (error) {
        console.error('[getPartAttachmentsByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing attachment's metadata
 * 
 * @param attachmentId - The ID of the attachment to update
 * @param updates - Object containing the fields to update
 * @returns The updated attachment
 */
export async function updatePartAttachment(
    attachmentId: string,
    updates: Partial<{
        file_name: string,
        description: string | null,
        is_primary: boolean
    }>
): Promise<PartAttachment> {
    try {
        // First check if the attachment exists
        const existingResult = await sql`
            SELECT * FROM "PartAttachment"
            WHERE part_attachment_id = ${attachmentId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: Attachment with ID ${attachmentId} not found`);
        }

        const existing = existingResult[0];
        
        // If setting this as primary and it wasn't before, unset any existing primary attachments
        if ('is_primary' in updates && updates.is_primary && !existing.is_primary) {
            await sql`
                UPDATE "PartAttachment"
                SET is_primary = false
                WHERE part_version_id = ${existing.part_version_id}
                AND is_primary = true
            `;
        }
        
        // Build the update fields array
        const updateFields = [];
        
        if ('file_name' in updates && updates.file_name) {
            const fileName = updates.file_name;
            updateFields.push(`file_name = '${sanitizeSqlString(fileName)}'`);
        }
        
        if ('description' in updates) {
            const description = updates.description;
            updateFields.push(`description = ${description === null ? 'NULL' : `'${sanitizeSqlString(description || '')}'`}`);
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
            UPDATE "PartAttachment"
            SET ${updateFields.join(', ')}
            WHERE part_attachment_id = $1
            RETURNING *
        `;

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, [attachmentId]);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: Failed to update attachment`);
        }

        console.log(`[updatePartAttachment] ✅ Updated attachment ${attachmentId}`);
        return rowToPartAttachment(result[0]);
    } catch (error) {
        console.error('[updatePartAttachment] Error:', error);
        throw error;
    }
}

/**
 * Deletes an attachment
 * 
 * @param attachmentId - The ID of the attachment to delete
 * @returns True if the deletion was successful
 */
export async function deletePartAttachment(attachmentId: string): Promise<boolean> {
    try {
        // Get attachment details before deleting (for logging)
        const attachmentDetails = await sql`
            SELECT file_name, part_version_id FROM "PartAttachment"
            WHERE part_attachment_id = ${attachmentId}
        `;
        
        if (!attachmentDetails || attachmentDetails.length === 0) {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: Attachment with ID ${attachmentId} not found or already deleted`);
        }
        
        // Now delete the attachment
        const result = await sql`
            DELETE FROM "PartAttachment"
            WHERE part_attachment_id = ${attachmentId}
            RETURNING part_attachment_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.ATTACHMENT_ERROR}: Failed to delete attachment`);
        }

        const details = attachmentDetails[0];
        console.log(`[deletePartAttachment] ✅ Deleted attachment ${details.file_name} (ID: ${attachmentId}) from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deletePartAttachment] Error:', error);
        throw error;
    }
}
