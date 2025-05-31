/**
 * Part Revision Management Functions
 * ================================
 * These functions manage revision history for parts
 */

import sql from "@/server/db";
import { PART_ERRORS } from "./partErrors";
import type { PartRevision } from "@/types/schemaTypes";


/**
 * Converts a database row to a PartRevision object
 */
function rowToPartRevision(row: any): PartRevision {
    return {
        part_revision_id: row.part_revision_id,
        part_version_id: row.part_version_id,
        revision_number: row.revision_number,
        revision_date: row.revision_date instanceof Date ? row.revision_date : new Date(row.revision_date),
        revised_by: row.revised_by,
        change_type: row.change_type,
        change_description: row.change_description,
        change_justification: row.change_justification,
        affected_fields: row.affected_fields,
        previous_values: row.previous_values,
        new_values: row.new_values,
        approval_status: row.approval_status,
        approved_by: row.approved_by,
        approved_at: row.approved_at instanceof Date ? row.approved_at : 
                    (row.approved_at ? new Date(row.approved_at) : null),
        comments: row.comments
    };
}

/**
 * Creates a new revision record for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param revisionNumber - The revision number (e.g., 'A', 'B', '1.0')
 * @param revisedBy - User ID of the person making the revision
 * @param changeType - Type of change (INITIAL, MINOR, MAJOR, OBSOLETE)
 * @param changeDescription - Description of the changes made
 * @param changeJustification - Optional justification for the changes
 * @param affectedFields - Optional array of field names that were changed
 * @param previousValues - Optional record of previous values
 * @param newValues - Optional record of new values
 * @param approvalStatus - Status of the revision approval
 * @param approvedBy - Optional user ID of the approver
 * @param approvedAt - Optional date when the revision was approved
 * @param comments - Optional comments about the revision
 * 
 * @returns The newly created revision record
 */
export async function createPartRevision(
    partVersionId: string,
    revisionNumber: string,
    revisedBy: string,
    changeType: string,
    changeDescription: string,
    changeJustification?: string | null,
    affectedFields?: string[] | null,
    previousValues?: Record<string, any> | null,
    newValues?: Record<string, any> | null,
    approvalStatus: string = 'PENDING',
    approvedBy?: string | null,
    approvedAt?: Date | null,
    comments?: string | null
): Promise<PartRevision> {
    try {
        // Validate inputs
        if (!revisionNumber || revisionNumber.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Revision number is required`);
        }
        
        if (!changeType || changeType.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Change type is required`);
        }
        
        if (!changeDescription || changeDescription.trim() === '') {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Change description is required`);
        }

        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // Check if this revision number already exists for this part version
        const existingRevision = await sql`
            SELECT part_revision_id FROM "PartRevision"
            WHERE part_version_id = ${partVersionId}
            AND revision_number = ${revisionNumber}
        `;

        if (existingRevision && existingRevision.length > 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Revision number ${revisionNumber} already exists for this part version`);
        }

        // Insert the new revision record
        const revisionId = crypto.randomUUID();
        
        // We need to handle JSON data properly
        const jsonAffectedFields = affectedFields ? JSON.stringify(affectedFields) : null;
        const jsonPreviousValues = previousValues ? JSON.stringify(previousValues) : null;
        const jsonNewValues = newValues ? JSON.stringify(newValues) : null;
        
        const result = await sql`
            INSERT INTO "PartRevision" (
                part_revision_id,
                part_version_id,
                revision_number,
                revision_date,
                revised_by,
                change_type,
                change_description,
                change_justification,
                affected_fields,
                previous_values,
                new_values,
                approval_status,
                approved_by,
                approved_at,
                comments
            ) VALUES (
                ${revisionId},
                ${partVersionId},
                ${revisionNumber},
                NOW(),
                ${revisedBy},
                ${changeType},
                ${changeDescription},
                ${changeJustification || null},
                ${jsonAffectedFields}::jsonb,
                ${jsonPreviousValues}::jsonb,
                ${jsonNewValues}::jsonb,
                ${approvalStatus},
                ${approvedBy || null},
                ${approvedAt || null},
                ${comments || null}
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to create revision record`);
        }

        console.log(`[createPartRevision] ✅ Created revision ${revisionNumber} for part version ${partVersionId}`);
        return rowToPartRevision(result[0]);
    } catch (error) {
        console.error('[createPartRevision] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific revision by ID
 * 
 * @param revisionId - The ID of the revision to retrieve
 * @returns The revision, if found
 */
export async function getPartRevisionById(revisionId: string): Promise<PartRevision | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartRevision"
            WHERE part_revision_id = ${revisionId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartRevision(result[0]);
    } catch (error) {
        console.error('[getPartRevisionById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all revisions for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param approvalStatus - Optional filter for approval status
 * @returns Array of revisions
 */
export async function getPartRevisionsByPartVersion(
    partVersionId: string,
    approvalStatus?: string
): Promise<PartRevision[]> {
    try {
        let query;
        
        if (approvalStatus) {
            query = sql`
                SELECT * FROM "PartRevision"
                WHERE part_version_id = ${partVersionId}
                AND approval_status = ${approvalStatus}
                ORDER BY revision_date DESC
            `;
        } else {
            query = sql`
                SELECT * FROM "PartRevision"
                WHERE part_version_id = ${partVersionId}
                ORDER BY revision_date DESC
            `;
        }

        const result = await query;
        return result.map(rowToPartRevision);
    } catch (error) {
        console.error('[getPartRevisionsByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates the approval status of a revision
 * 
 * @param revisionId - The ID of the revision to update
 * @param approvalStatus - New approval status
 * @param approvedBy - User ID of the approver
 * @param comments - Optional comments about the decision
 * @returns The updated revision record
 */
export async function updatePartRevisionApproval(
    revisionId: string,
    approvalStatus: string,
    approvedBy: string,
    comments?: string | null
): Promise<PartRevision> {
    try {
        // Validate input
        if (!approvalStatus || !['APPROVED', 'REJECTED', 'PENDING'].includes(approvalStatus)) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Invalid approval status. Must be APPROVED, REJECTED, or PENDING`);
        }

        // First check if the revision exists
        const existingResult = await sql`
            SELECT * FROM "PartRevision"
            WHERE part_revision_id = ${revisionId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Revision with ID ${revisionId} not found`);
        }

        // Update the revision approval status
        const result = await sql`
            UPDATE "PartRevision"
            SET 
                approval_status = ${approvalStatus},
                approved_by = ${approvedBy},
                approved_at = ${approvalStatus === 'PENDING' ? null : 'NOW()'},
                comments = ${comments || null}
            WHERE part_revision_id = ${revisionId}
            RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update revision approval status`);
        }

        console.log(`[updatePartRevisionApproval] ✅ Updated revision ${revisionId} to status ${approvalStatus}`);
        return rowToPartRevision(result[0]);
    } catch (error) {
        console.error('[updatePartRevisionApproval] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing revision record
 * 
 * @param revisionId - The ID of the revision to update
 * @param updates - Object containing the fields to update
 * @returns The updated revision record
 */
export async function updatePartRevision(
    revisionId: string,
    updates: Partial<{
        change_description: string,
        change_justification: string | null,
        affected_fields: string[] | null,
        previous_values: Record<string, any> | null,
        new_values: Record<string, any> | null,
        comments: string | null
    }>
): Promise<PartRevision> {
    try {
        // First check if the revision exists
        const existingResult = await sql`
            SELECT * FROM "PartRevision"
            WHERE part_revision_id = ${revisionId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Revision with ID ${revisionId} not found`);
        }

        // Build the update fields array
        const updateFields = [];
        const updateParams: any[] = [];
        let paramIndex = 1;
        
        if ('change_description' in updates && updates.change_description) {
            updateFields.push(`change_description = $${paramIndex}`);
            updateParams.push(updates.change_description);
            paramIndex++;
        }
        
        if ('change_justification' in updates) {
            updateFields.push(`change_justification = $${paramIndex}`);
            updateParams.push(updates.change_justification);
            paramIndex++;
        }
        
        if ('affected_fields' in updates) {
            updateFields.push(`affected_fields = $${paramIndex}::jsonb`);
            updateParams.push(updates.affected_fields ? JSON.stringify(updates.affected_fields) : null);
            paramIndex++;
        }
        
        if ('previous_values' in updates) {
            updateFields.push(`previous_values = $${paramIndex}::jsonb`);
            updateParams.push(updates.previous_values ? JSON.stringify(updates.previous_values) : null);
            paramIndex++;
        }
        
        if ('new_values' in updates) {
            updateFields.push(`new_values = $${paramIndex}::jsonb`);
            updateParams.push(updates.new_values ? JSON.stringify(updates.new_values) : null);
            paramIndex++;
        }
        
        if ('comments' in updates) {
            updateFields.push(`comments = $${paramIndex}`);
            updateParams.push(updates.comments);
            paramIndex++;
        }
        
        // If no fields to update, throw an error
        if (updateFields.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: No valid fields to update`);
        }
        
        // Construct the final SQL query string with proper parameter placement
        const updateQuery = `
            UPDATE "PartRevision"
            SET ${updateFields.join(', ')}
            WHERE part_revision_id = $${paramIndex}
            RETURNING *
        `;
        updateParams.push(revisionId);

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, updateParams);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update revision`);
        }

        console.log(`[updatePartRevision] ✅ Updated revision ${revisionId}`);
        return rowToPartRevision(result[0]);
    } catch (error) {
        console.error('[updatePartRevision] Error:', error);
        throw error;
    }
}






