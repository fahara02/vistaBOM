/**
 * Part Custom Field Management Functions
 * ===================================
 * These functions manage custom fields for parts (user-defined properties)
 */

import sql from "@/server/db/postgres";
import { PART_ERRORS } from "./partErrors";
import type { JsonValue } from "@/types";
import type { PartCustomField } from "@/types/schemaTypes";



/**
 * Converts a database row to a PartCustomField object
 */
function rowToPartCustomField(row: any): PartCustomField {
    return {
        part_custom_field_id: row.part_custom_field_id,
        part_version_id: row.part_version_id,
        field_name: row.field_name,
        field_value: row.field_value,
        field_type: row.field_type,
        field_group: row.field_group,
        display_order: row.display_order,
        required: row.required,
        validation_regex: row.validation_regex,
        validation_message: row.validation_message,
        options: row.options,
        created_by: row.created_by,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updated_by: row.updated_by,
        updated_at: row.updated_at instanceof Date ? row.updated_at : 
                   (row.updated_at ? new Date(row.updated_at) : null)
    };
}

/**
 * Validates a field value against its type and any validation rules
 */
function validateCustomFieldValue(
    fieldName: string,
    fieldValue: any,
    fieldType: string,
    required: boolean,
    validationRegex?: string | null,
    validationMessage?: string | null,
    options?: string[] | null
): void {
    // Check if required field is present
    if (required && (fieldValue === null || fieldValue === undefined)) {
        throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' is required`);
    }
    
    // Skip further validation if null/undefined and not required
    if ((fieldValue === null || fieldValue === undefined) && !required) {
        return;
    }
    
    // Type validation
    switch (fieldType) {
        case 'STRING':
            if (typeof fieldValue !== 'string') {
                throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be a string`);
            }
            // Check regex pattern if provided
            if (validationRegex && !new RegExp(validationRegex).test(fieldValue)) {
                throw new Error(validationMessage || 
                    `${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' failed validation`);
            }
            // Check options if provided
            if (options && options.length > 0 && !options.includes(fieldValue)) {
                throw new Error(
                    `${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be one of: ${options.join(', ')}`
                );
            }
            break;
        case 'NUMBER':
            if (typeof fieldValue !== 'number' || isNaN(fieldValue)) {
                throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be a number`);
            }
            break;
        case 'BOOLEAN':
            if (typeof fieldValue !== 'boolean') {
                throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be a boolean`);
            }
            break;
        case 'DATE':
            try {
                // Check if valid date
                const date = new Date(fieldValue);
                if (isNaN(date.getTime())) {
                    throw new Error();
                }
            } catch {
                throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be a valid date`);
            }
            break;
        case 'OBJECT':
            if (typeof fieldValue !== 'object' || Array.isArray(fieldValue) || fieldValue === null) {
                throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be an object`);
            }
            break;
        case 'ARRAY':
            if (!Array.isArray(fieldValue)) {
                throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' must be an array`);
            }
            break;
        default:
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Unknown field type '${fieldType}'`);
    }
}

/**
 * Creates a new custom field for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param fieldName - Name of the custom field
 * @param fieldValue - Value of the custom field (can be any JSON value)
 * @param fieldType - Type of the field (STRING, NUMBER, BOOLEAN, DATE, OBJECT, ARRAY)
 * @param createdBy - User ID of the creator
 * @param required - Whether the field is required
 * @param fieldGroup - Optional group for organizing related fields
 * @param displayOrder - Optional order for display in UI
 * @param validationRegex - Optional regex pattern for validation
 * @param validationMessage - Optional message to show when validation fails
 * @param options - Optional array of allowed values (for enum fields)
 * 
 * @returns The newly created custom field
 */
export async function createPartCustomField(
    partVersionId: string,
    fieldName: string,
    fieldValue: JsonValue,
    fieldType: string,
    createdBy: string,
    required: boolean = false,
    fieldGroup?: string | null,
    displayOrder?: number | null,
    validationRegex?: string | null,
    validationMessage?: string | null,
    options?: string[] | null
): Promise<PartCustomField> {
    try {
        // Validate inputs
        if (!fieldName || fieldName.trim() === '') {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field name is required`);
        }
        
        if (!fieldType || !['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'ARRAY'].includes(fieldType)) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Invalid field type`);
        }
        
        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // Check if this field name already exists for this part version
        const existingField = await sql`
            SELECT part_custom_field_id FROM "PartCustomField"
            WHERE part_version_id = ${partVersionId}
            AND field_name = ${fieldName}
        `;

        if (existingField && existingField.length > 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Field '${fieldName}' already exists for this part version`);
        }

        // Validate the field value against type and rules
        validateCustomFieldValue(
            fieldName,
            fieldValue,
            fieldType,
            required,
            validationRegex,
            validationMessage,
            options
        );

        // Prepare JSON data
        const jsonFieldValue = JSON.stringify(fieldValue);
        const jsonOptions = options ? JSON.stringify(options) : null;
        
        // Insert the new custom field
        const fieldId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "PartCustomField" (
                part_custom_field_id,
                part_version_id,
                field_name,
                field_value,
                field_type,
                field_group,
                display_order,
                required,
                validation_regex,
                validation_message,
                options,
                created_by,
                created_at,
                updated_by,
                updated_at
            ) VALUES (
                ${fieldId},
                ${partVersionId},
                ${fieldName},
                ${jsonFieldValue}::jsonb,
                ${fieldType},
                ${fieldGroup || null},
                ${displayOrder || null},
                ${required},
                ${validationRegex || null},
                ${validationMessage || null},
                ${jsonOptions}::jsonb,
                ${createdBy},
                NOW(),
                ${createdBy},
                NOW()
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Failed to create custom field`);
        }

        console.log(`[createPartCustomField] ✅ Created custom field '${fieldName}' for part version ${partVersionId}`);
        return rowToPartCustomField(result[0]);
    } catch (error) {
        console.error('[createPartCustomField] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific custom field by ID
 * 
 * @param fieldId - The ID of the custom field to retrieve
 * @returns The custom field, if found
 */
export async function getPartCustomFieldById(fieldId: string): Promise<PartCustomField | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartCustomField"
            WHERE part_custom_field_id = ${fieldId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartCustomField(result[0]);
    } catch (error) {
        console.error('[getPartCustomFieldById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all custom fields for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param fieldGroup - Optional filter for a specific field group
 * @returns Array of custom fields
 */
export async function getPartCustomFields(
    partVersionId: string,
    fieldGroup?: string | null
): Promise<PartCustomField[]> {
    try {
        let query;
        
        if (fieldGroup) {
            query = sql`
                SELECT * FROM "PartCustomField"
                WHERE part_version_id = ${partVersionId}
                AND field_group = ${fieldGroup}
                ORDER BY display_order NULLS LAST, field_name
            `;
        } else {
            query = sql`
                SELECT * FROM "PartCustomField"
                WHERE part_version_id = ${partVersionId}
                ORDER BY field_group NULLS LAST, display_order NULLS LAST, field_name
            `;
        }

        const result = await query;
        return result.map(rowToPartCustomField);
    } catch (error) {
        console.error('[getPartCustomFields] Error:', error);
        throw error;
    }
}

/**
 * Updates the value of an existing custom field
 * 
 * @param fieldId - The ID of the custom field to update
 * @param fieldValue - New value for the field
 * @param updatedBy - User ID of the person making the update
 * @returns The updated custom field
 */
export async function updatePartCustomFieldValue(
    fieldId: string,
    fieldValue: JsonValue,
    updatedBy: string
): Promise<PartCustomField> {
    try {
        // First check if the field exists
        const existingResult = await sql`
            SELECT * FROM "PartCustomField"
            WHERE part_custom_field_id = ${fieldId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Custom field with ID ${fieldId} not found`);
        }

        const existing = existingResult[0];
        
        // Validate the field value against type and rules
        validateCustomFieldValue(
            existing.field_name,
            fieldValue,
            existing.field_type,
            existing.required,
            existing.validation_regex,
            existing.validation_message,
            existing.options
        );

        // Update the field value
        const jsonFieldValue = JSON.stringify(fieldValue);
        const result = await sql`
            UPDATE "PartCustomField"
            SET 
                field_value = ${jsonFieldValue}::jsonb,
                updated_by = ${updatedBy},
                updated_at = NOW()
            WHERE part_custom_field_id = ${fieldId}
            RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Failed to update custom field value`);
        }

        console.log(`[updatePartCustomFieldValue] ✅ Updated value of custom field ${existing.field_name}`);
        return rowToPartCustomField(result[0]);
    } catch (error) {
        console.error('[updatePartCustomFieldValue] Error:', error);
        throw error;
    }
}

/**
 * Updates the metadata of an existing custom field (does not change the value)
 * 
 * @param fieldId - The ID of the custom field to update
 * @param updates - Object containing the fields to update
 * @param updatedBy - User ID of the person making the update
 * @returns The updated custom field
 */
export async function updatePartCustomFieldMetadata(
    fieldId: string,
    updates: Partial<{
        field_group: string | null,
        display_order: number | null,
        required: boolean,
        validation_regex: string | null,
        validation_message: string | null,
        options: string[] | null
    }>,
    updatedBy: string
): Promise<PartCustomField> {
    try {
        // First check if the field exists
        const existingResult = await sql`
            SELECT * FROM "PartCustomField"
            WHERE part_custom_field_id = ${fieldId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Custom field with ID ${fieldId} not found`);
        }

        // Build the update fields array
        const updateFields = [];
        const updateParams: any[] = [];
        let paramIndex = 1;
        
        if ('field_group' in updates) {
            updateFields.push(`field_group = $${paramIndex}`);
            updateParams.push(updates.field_group);
            paramIndex++;
        }
        
        if ('display_order' in updates) {
            updateFields.push(`display_order = $${paramIndex}`);
            updateParams.push(updates.display_order);
            paramIndex++;
        }
        
        if ('required' in updates) {
            updateFields.push(`required = $${paramIndex}`);
            updateParams.push(updates.required);
            paramIndex++;
        }
        
        if ('validation_regex' in updates) {
            updateFields.push(`validation_regex = $${paramIndex}`);
            updateParams.push(updates.validation_regex);
            paramIndex++;
        }
        
        if ('validation_message' in updates) {
            updateFields.push(`validation_message = $${paramIndex}`);
            updateParams.push(updates.validation_message);
            paramIndex++;
        }
        
        if ('options' in updates) {
            updateFields.push(`options = $${paramIndex}::jsonb`);
            updateParams.push(updates.options ? JSON.stringify(updates.options) : null);
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
            UPDATE "PartCustomField"
            SET ${updateFields.join(', ')}
            WHERE part_custom_field_id = $${paramIndex}
            RETURNING *
        `;
        updateParams.push(fieldId);

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, updateParams);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Failed to update custom field metadata`);
        }

        console.log(`[updatePartCustomFieldMetadata] ✅ Updated metadata for custom field ${result[0].field_name}`);
        return rowToPartCustomField(result[0]);
    } catch (error) {
        console.error('[updatePartCustomFieldMetadata] Error:', error);
        throw error;
    }
}

/**
 * Deletes a custom field
 * 
 * @param fieldId - The ID of the custom field to delete
 * @returns True if the deletion was successful
 */
export async function deletePartCustomField(fieldId: string): Promise<boolean> {
    try {
        // Get field details before deleting (for logging)
        const fieldDetails = await sql`
            SELECT field_name, part_version_id FROM "PartCustomField"
            WHERE part_custom_field_id = ${fieldId}
        `;
        
        if (!fieldDetails || fieldDetails.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Custom field with ID ${fieldId} not found or already deleted`);
        }
        
        // Now delete the field
        const result = await sql`
            DELETE FROM "PartCustomField"
            WHERE part_custom_field_id = ${fieldId}
            RETURNING part_custom_field_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.CUSTOM_FIELD_ERROR}: Failed to delete custom field`);
        }

        const details = fieldDetails[0];
        console.log(`[deletePartCustomField] ✅ Deleted custom field '${details.field_name}' from part version ${details.part_version_id}`);
        return true;
    } catch (error) {
        console.error('[deletePartCustomField] Error:', error);
        throw error;
    }
}