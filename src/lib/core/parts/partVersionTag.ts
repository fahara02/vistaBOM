/**
 * Part Tag Management Functions
 * ==========================
 * These functions manage tags for flexible categorization of parts
 */

import sql from "@/server/db/postgres";
import { PART_ERRORS } from "./partErrors";
import type { PartVersionTag } from "@/types/schemaTypes";



/**
 * Converts a database row to a PartVersionTag object
 */
function rowToPartVersionTag(row: any): PartVersionTag {
    return {
        part_version_tag_id: row.part_version_tag_id,
        part_version_id: row.part_version_id,
        tag_name: row.tag_name,
        tag_value: row.tag_value,
        tag_category: row.tag_category,
        tag_color: row.tag_color,
        created_by: row.created_by,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at)
    };
}

/**
 * Creates a new tag for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param tagName - Name of the tag
 * @param createdBy - User ID of the creator
 * @param tagValue - Optional value associated with the tag
 * @param tagCategory - Optional category for organizing tags
 * @param tagColor - Optional color for UI display
 * 
 * @returns The newly created tag
 */
export async function createPartVersionTag(
    partVersionId: string,
    tagName: string,
    createdBy: string,
    tagValue?: string | null,
    tagCategory?: string | null,
    tagColor?: string | null
): Promise<PartVersionTag> {
    try {
        // Validate inputs
        if (!tagName || tagName.trim() === '') {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Tag name is required`);
        }
        
        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // Check if this tag name already exists for this part version
        const existingTag = await sql`
            SELECT part_version_tag_id FROM "PartVersionTag"
            WHERE part_version_id = ${partVersionId}
            AND tag_name = ${tagName}
        `;

        if (existingTag && existingTag.length > 0) {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Tag '${tagName}' already exists for this part version`);
        }

        // Insert the new tag
        const tagId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "PartVersionTag" (
                part_version_tag_id,
                part_version_id,
                tag_name,
                tag_value,
                tag_category,
                tag_color,
                created_by,
                created_at
            ) VALUES (
                ${tagId},
                ${partVersionId},
                ${tagName},
                ${tagValue || null},
                ${tagCategory || null},
                ${tagColor || null},
                ${createdBy},
                NOW()
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Failed to create tag`);
        }

        console.log(`[createPartVersionTag] ✅ Created tag '${tagName}' for part version ${partVersionId}`);
        return rowToPartVersionTag(result[0]);
    } catch (error) {
        console.error('[createPartVersionTag] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific tag by ID
 * 
 * @param tagId - The ID of the tag to retrieve
 * @returns The tag, if found
 */
export async function getPartVersionTagById(tagId: string): Promise<PartVersionTag | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartVersionTag"
            WHERE part_version_tag_id = ${tagId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartVersionTag(result[0]);
    } catch (error) {
        console.error('[getPartVersionTagById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all tags for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param tagCategory - Optional filter for a specific tag category
 * @returns Array of tags
 */
export async function getPartVersionTags(
    partVersionId: string,
    tagCategory?: string | null
): Promise<PartVersionTag[]> {
    try {
        let query;
        
        if (tagCategory) {
            query = sql`
                SELECT * FROM "PartVersionTag"
                WHERE part_version_id = ${partVersionId}
                AND tag_category = ${tagCategory}
                ORDER BY tag_name
            `;
        } else {
            query = sql`
                SELECT * FROM "PartVersionTag"
                WHERE part_version_id = ${partVersionId}
                ORDER BY tag_name
            `;
        }

        const result = await query;
        return result.map(rowToPartVersionTag);
    } catch (error) {
        console.error('[getPartVersionTags] Error:', error);
        throw error;
    }
}

/**
 * Find part versions by tag
 * 
 * @param tagName - Name of the tag to search for
 * @param tagValue - Optional value of the tag to match
 * @returns Array of part version IDs with the matching tag
 */
export async function findPartVersionsByTag(
    tagName: string,
    tagValue?: string | null
): Promise<string[]> {
    try {
        let query;
        
        if (tagValue) {
            query = sql`
                SELECT part_version_id FROM "PartVersionTag"
                WHERE tag_name = ${tagName}
                AND tag_value = ${tagValue}
            `;
        } else {
            query = sql`
                SELECT part_version_id FROM "PartVersionTag"
                WHERE tag_name = ${tagName}
            `;
        }

        const result = await query;
        return result.map(row => row.part_version_id);
    } catch (error) {
        console.error('[findPartVersionsByTag] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing tag
 * 
 * @param tagId - The ID of the tag to update
 * @param updates - Object containing the fields to update
 * @returns The updated tag
 */
export async function updatePartVersionTag(
    tagId: string,
    updates: Partial<{
        tag_value: string | null,
        tag_category: string | null,
        tag_color: string | null
    }>
): Promise<PartVersionTag> {
    try {
        // First check if the tag exists
        const existingResult = await sql`
            SELECT * FROM "PartVersionTag"
            WHERE part_version_tag_id = ${tagId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Tag with ID ${tagId} not found`);
        }

        // Build the update fields array
        const updateFields = [];
        const updateParams: any[] = [];
        let paramIndex = 1;
        
        if ('tag_value' in updates) {
            updateFields.push(`tag_value = $${paramIndex}`);
            updateParams.push(updates.tag_value);
            paramIndex++;
        }
        
        if ('tag_category' in updates) {
            updateFields.push(`tag_category = $${paramIndex}`);
            updateParams.push(updates.tag_category);
            paramIndex++;
        }
        
        if ('tag_color' in updates) {
            updateFields.push(`tag_color = $${paramIndex}`);
            updateParams.push(updates.tag_color);
            paramIndex++;
        }
        
        // If no fields to update, throw an error
        if (updateFields.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: No valid fields to update`);
        }
        
        // Construct the final SQL query string with proper parameter placement
        const updateQuery = `
            UPDATE "PartVersionTag"
            SET ${updateFields.join(', ')}
            WHERE part_version_tag_id = $${paramIndex}
            RETURNING *
        `;
        updateParams.push(tagId);

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, updateParams);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Failed to update tag`);
        }

        console.log(`[updatePartVersionTag] ✅ Updated tag ${tagId}`);
        return rowToPartVersionTag(result[0]);
    } catch (error) {
        console.error('[updatePartVersionTag] Error:', error);
        throw error;
    }
}

/**
 * Deletes a tag
 * 
 * @param tagId - The ID of the tag to delete
 * @returns True if the deletion was successful
 */
export async function deletePartVersionTag(tagId: string): Promise<boolean> {
    try {
        // Get tag details before deleting (for logging)
        const tagDetails = await sql`
            SELECT tag_name, part_version_id FROM "PartVersionTag"
            WHERE part_version_tag_id = ${tagId}
        `;
        
        if (!tagDetails || tagDetails.length === 0) {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Tag with ID ${tagId} not found or already deleted`);
        }
        
        // Now delete the tag
        const result = await sql`
            DELETE FROM "PartVersionTag"
            WHERE part_version_tag_id = ${tagId}
            RETURNING part_version_tag_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.TAG_ERROR}: Failed to delete tag`);
        }

        const details = tagDetails[0];
        console.log(`[deletePartVersionTag] ✅ Deleted tag '${details.tag_name}' (ID: ${tagId}) from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deletePartVersionTag] Error:', error);
        throw error;
    }
}
