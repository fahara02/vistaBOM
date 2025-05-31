/**
 * Part Validation Management Functions
 * =================================
 * These functions manage validation checks and reports for parts
 */

import sql from "@/server/db";
import { PART_ERRORS } from "./partErrors";
import type { PartValidation } from "@/types/schemaTypes";



/**
 * Converts a database row to a PartValidation object
 */
function rowToPartValidation(row: any): PartValidation {
    return {
        part_validation_id: row.part_validation_id,
        part_version_id: row.part_version_id,
        validation_type: row.validation_type,
        validation_status: row.validation_status,
        validation_date: row.validation_date instanceof Date ? row.validation_date : new Date(row.validation_date),
        validated_by: row.validated_by,
        waived_by: row.waived_by,
        waiver_reason: row.waiver_reason,
        waiver_date: row.waiver_date instanceof Date ? row.waiver_date : 
                   (row.waiver_date ? new Date(row.waiver_date) : null),
        validation_method: row.validation_method,
        test_procedure: row.test_procedure,
        test_results: row.test_results,
        issues_found: row.issues_found,
        corrective_actions: row.corrective_actions,
        attachments: row.attachments,
        notes: row.notes
    };
}

/**
 * Creates a new validation record for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param validationType - Type of validation (DESIGN_REVIEW, QUALITY_CHECK, etc.)
 * @param validationStatus - Status of the validation (PENDING, PASSED, FAILED, WAIVED)
 * @param validatedBy - User ID of the validator
 * @param validationMethod - Method used for validation
 * @param testProcedure - Optional description of the test procedure
 * @param testResults - Optional JSON data with test results
 * @param issuesFound - Optional array of issues found during validation
 * @param correctiveActions - Optional array of corrective actions
 * @param attachments - Optional array of attachment IDs related to the validation
 * @param notes - Optional notes about the validation
 * @param waivedBy - Optional user ID who waived the validation (if WAIVED)
 * @param waiverReason - Optional reason for waiving validation (if WAIVED)
 * @param waiverDate - Optional date when validation was waived (if WAIVED)
 * 
 * @returns The newly created validation record
 */
export async function createPartValidation(
    partVersionId: string,
    validationType: string,
    validationStatus: string,
    validatedBy: string,
    validationMethod: string,
    testProcedure?: string | null,
    testResults?: Record<string, any> | null,
    issuesFound?: string[] | null,
    correctiveActions?: string[] | null,
    attachments?: string[] | null,
    notes?: string | null,
    waivedBy?: string | null,
    waiverReason?: string | null,
    waiverDate?: Date | null
): Promise<PartValidation> {
    try {
        // Validate inputs
        if (!validationType || validationType.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Validation type is required`);
        }
        
        if (!validationStatus || !['PENDING', 'PASSED', 'FAILED', 'WAIVED'].includes(validationStatus)) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid validation status. Must be PENDING, PASSED, FAILED, or WAIVED`);
        }
        
        if (!validationMethod || validationMethod.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Validation method is required`);
        }
        
        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // If status is WAIVED, ensure waiver information is provided
        if (validationStatus === 'WAIVED') {
            if (!waivedBy || waivedBy.trim() === '') {
                throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Waiver must include the user who authorized the waiver`);
            }
            
            if (!waiverReason || waiverReason.trim() === '') {
                throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Waiver reason is required when validation is waived`);
            }
            
            // If waiver date not provided, use current date
            if (!waiverDate) {
                waiverDate = new Date();
            }
        }

        // Insert the new validation record
        const validationId = crypto.randomUUID();
        
        // Handle JSON data
        const jsonTestResults = testResults ? JSON.stringify(testResults) : null;
        const jsonIssuesFound = issuesFound ? JSON.stringify(issuesFound) : null;
        const jsonCorrectiveActions = correctiveActions ? JSON.stringify(correctiveActions) : null;
        const jsonAttachments = attachments ? JSON.stringify(attachments) : null;
        
        const result = await sql`
            INSERT INTO "PartValidation" (
                part_validation_id,
                part_version_id,
                validation_type,
                validation_status,
                validation_date,
                validated_by,
                waived_by,
                waiver_reason,
                waiver_date,
                validation_method,
                test_procedure,
                test_results,
                issues_found,
                corrective_actions,
                attachments,
                notes
            ) VALUES (
                ${validationId},
                ${partVersionId},
                ${validationType},
                ${validationStatus},
                NOW(),
                ${validatedBy},
                ${waivedBy || null},
                ${waiverReason || null},
                ${waiverDate || null},
                ${validationMethod},
                ${testProcedure || null},
                ${jsonTestResults}::jsonb,
                ${jsonIssuesFound}::jsonb,
                ${jsonCorrectiveActions}::jsonb,
                ${jsonAttachments}::jsonb,
                ${notes || null}
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Failed to create validation record`);
        }

        console.log(`[createPartValidation] ✅ Created ${validationType} validation with status ${validationStatus} for part version ${partVersionId}`);
        return rowToPartValidation(result[0]);
    } catch (error) {
        console.error('[createPartValidation] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific validation by ID
 * 
 * @param validationId - The ID of the validation to retrieve
 * @returns The validation, if found
 */
export async function getPartValidationById(validationId: string): Promise<PartValidation | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartValidation"
            WHERE part_validation_id = ${validationId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartValidation(result[0]);
    } catch (error) {
        console.error('[getPartValidationById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all validations for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param validationType - Optional filter for a specific validation type
 * @param validationStatus - Optional filter for a specific validation status
 * @returns Array of validations
 */
export async function getPartValidationsByPartVersion(
    partVersionId: string,
    validationType?: string,
    validationStatus?: string
): Promise<PartValidation[]> {
    try {
        let conditions = [`part_version_id = ${partVersionId}`];
        const queryParams: any[] = [partVersionId];
        
        // Add optional filters if provided
        if (validationType) {
            conditions.push(`validation_type = $${queryParams.length + 1}`);
            queryParams.push(validationType);
        }
        
        if (validationStatus) {
            conditions.push(`validation_status = $${queryParams.length + 1}`);
            queryParams.push(validationStatus);
        }
        
        // Construct the final query
        const queryString = `
            SELECT * FROM "PartValidation"
            WHERE ${conditions.join(' AND ')}
            ORDER BY validation_date DESC
        `;
        
        // Execute the query with parameters
        const result = await sql.unsafe(queryString, queryParams);
        return result.map(rowToPartValidation);
    } catch (error) {
        console.error('[getPartValidationsByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates the status of a validation record
 * 
 * @param validationId - The ID of the validation to update
 * @param validationStatus - New validation status
 * @param updatedBy - User ID who updated the status
 * @param notes - Optional notes about the status change
 * @param testResults - Optional updated test results
 * @param issuesFound - Optional updated issues found
 * @param correctiveActions - Optional updated corrective actions
 * @param waivedBy - Required if status is WAIVED, User ID who waived the validation
 * @param waiverReason - Required if status is WAIVED, reason for waiving validation
 * @returns The updated validation record
 */
export async function updatePartValidationStatus(
    validationId: string,
    validationStatus: string,
    updatedBy: string,
    notes?: string | null,
    testResults?: Record<string, any> | null,
    issuesFound?: string[] | null,
    correctiveActions?: string[] | null,
    waivedBy?: string | null,
    waiverReason?: string | null
): Promise<PartValidation> {
    try {
        // Validate inputs
        if (!validationStatus || !['PENDING', 'PASSED', 'FAILED', 'WAIVED'].includes(validationStatus)) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid validation status. Must be PENDING, PASSED, FAILED, or WAIVED`);
        }

        // First check if the validation exists
        const existingResult = await sql`
            SELECT * FROM "PartValidation"
            WHERE part_validation_id = ${validationId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Validation with ID ${validationId} not found`);
        }

        // If status is WAIVED, ensure waiver information is provided
        if (validationStatus === 'WAIVED') {
            if (!waivedBy || waivedBy.trim() === '') {
                throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Waiver must include the user who authorized the waiver`);
            }
            
            if (!waiverReason || waiverReason.trim() === '') {
                throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Waiver reason is required when validation is waived`);
            }
        }

        // Handle JSON data
        const jsonTestResults = testResults ? JSON.stringify(testResults) : null;
        const jsonIssuesFound = issuesFound ? JSON.stringify(issuesFound) : null;
        const jsonCorrectiveActions = correctiveActions ? JSON.stringify(correctiveActions) : null;
        
        // Build the SQL update query
        const updateFields = [];
        const updateParams: any[] = [validationStatus, updatedBy];
        let paramIndex = 3; // Starting after the first two params
        
        // Start with the basic status update fields
        let queryString = `
            UPDATE "PartValidation"
            SET 
                validation_status = $1,
                validated_by = $2
        `;
        
        // Add optional fields if provided
        if (notes !== undefined) {
            queryString += `, notes = $${paramIndex}`;
            updateParams.push(notes);
            paramIndex++;
        }
        
        if (testResults !== undefined) {
            queryString += `, test_results = $${paramIndex}::jsonb`;
            updateParams.push(jsonTestResults);
            paramIndex++;
        }
        
        if (issuesFound !== undefined) {
            queryString += `, issues_found = $${paramIndex}::jsonb`;
            updateParams.push(jsonIssuesFound);
            paramIndex++;
        }
        
        if (correctiveActions !== undefined) {
            queryString += `, corrective_actions = $${paramIndex}::jsonb`;
            updateParams.push(jsonCorrectiveActions);
            paramIndex++;
        }
        
        // Handle waiver info if provided
        if (validationStatus === 'WAIVED') {
            queryString += `, 
                waived_by = $${paramIndex},
                waiver_reason = $${paramIndex + 1},
                waiver_date = NOW()
            `;
            updateParams.push(waivedBy, waiverReason);
            paramIndex += 2;
        }
        
        // Complete the query
        queryString += `
            WHERE part_validation_id = $${paramIndex}
            RETURNING *
        `;
        updateParams.push(validationId);

        // Execute the query with parameters
        const result = await sql.unsafe(queryString, updateParams);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Failed to update validation status`);
        }

        console.log(`[updatePartValidationStatus] ✅ Updated validation ${validationId} to status ${validationStatus}`);
        return rowToPartValidation(result[0]);
    } catch (error) {
        console.error('[updatePartValidationStatus] Error:', error);
        throw error;
    }
}

/**
 * Deletes a validation record
 * 
 * @param validationId - The ID of the validation to delete
 * @returns True if the deletion was successful
 */
export async function deletePartValidation(validationId: string): Promise<boolean> {
    try {
        // Get validation details before deleting (for logging)
        const validationDetails = await sql`
            SELECT validation_type, part_version_id FROM "PartValidation"
            WHERE part_validation_id = ${validationId}
        `;
        
        if (!validationDetails || validationDetails.length === 0) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Validation with ID ${validationId} not found or already deleted`);
        }
        
        // Now delete the validation
        const result = await sql`
            DELETE FROM "PartValidation"
            WHERE part_validation_id = ${validationId}
            RETURNING part_validation_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Failed to delete validation`);
        }

        const details = validationDetails[0];
        console.log(`[deletePartValidation] ✅ Deleted ${details.validation_type} validation (ID: ${validationId}) from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deletePartValidation] Error:', error);
        throw error;
    }
}
