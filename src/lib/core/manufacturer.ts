/**
 * Manufacturer core functionality
 * Handles all database operations for manufacturers
 */
import sql from '$lib/server/db/index';
import type { Manufacturer } from '$lib/types';
import type { ManufacturerFormData } from '$lib/types/formTypes';
import type { JsonValue } from '$lib/types/primitive';

/**
 * Error messages for manufacturer operations
 */
const MANUFACTURER_ERRORS = {
  CREATE_FAILED: 'Failed to create manufacturer',
  NAME_EXISTS: 'Manufacturer name already exists',
  NOT_FOUND: 'Manufacturer not found',
  NOT_FOUND_AFTER_UPDATE: 'Manufacturer not found after update',
  DELETE_REFERENCED: 'Manufacturer cannot be deleted as it is referenced by existing parts',
  GENERAL_ERROR: 'An error occurred during the manufacturer operation'
};

/**
 * Normalize manufacturer data from database result
 * Converts snake_case DB fields to camelCase for the application
 */
function normalizeManufacturer(row: Record<string, unknown>): Manufacturer {
    // Parse contact_info if it exists
    let contactInfo: JsonValue | null = null;
    if (row.contact_info) {
        try {
            if (typeof row.contact_info === 'string') {
                contactInfo = JSON.parse(row.contact_info);
            } else if (typeof row.contact_info === 'object') {
                contactInfo = row.contact_info as JsonValue;
            }
        } catch (e) {
            console.error('Error parsing contact info:', e);
        }
    }
    
    // Parse custom_fields if they exist
    let customFields: Record<string, JsonValue> = {};
    try {
        if (typeof row.custom_fields === 'string') {
            customFields = JSON.parse(row.custom_fields);
        } else if (row.custom_fields && typeof row.custom_fields === 'object') {
            customFields = row.custom_fields as Record<string, JsonValue>;
        }
    } catch (e) {
        console.error('Error parsing custom fields:', e);
    }
    
    // Create normalized object with proper typing
    return {
        id: row.id as string,
        name: row.name as string,
        description: row.description as string | undefined,
        websiteUrl: row.website_url as string | undefined,
        contactInfo,
        logoUrl: row.logo_url as string | undefined,
        createdBy: row.created_by as string | undefined,
        createdAt: row.created_at as Date,
        updatedBy: row.updated_by as string | undefined,
        updatedAt: row.updated_at as Date,
        customFields
    };
}

/**
 * Create a new manufacturer
 * @param params - Manufacturer data for creation
 * @returns The created manufacturer with normalized structure
 */
export async function createManufacturer(params: {
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
    contactInfo?: Record<string, JsonValue>;
    createdBy: string;
}): Promise<Manufacturer> {
    try {
        // Use porsager/postgres template literals with proper table name quoting
        const result = await sql`
            INSERT INTO "Manufacturer" (
                name, 
                description, 
                website_url, 
                logo_url, 
                contact_info,
                created_by
            )
            VALUES (
                ${params.name},
                ${params.description || null},
                ${params.websiteUrl || null},
                ${params.logoUrl || null},
                ${params.contactInfo ? sql.json(params.contactInfo) : null},
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error(MANUFACTURER_ERRORS.CREATE_FAILED);
        }

        return normalizeManufacturer(result[0]);
    } catch (error) {
        // Type guard for postgres error with code property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const pgError = error as { code: string; message: string };
            
            // Handle duplicate key violation
            if (pgError.code === '23505') {
                throw new Error(`${MANUFACTURER_ERRORS.NAME_EXISTS}: "${params.name}"`);
            }
        }
        
        // Generic error with original message
        if (error instanceof Error) {
            throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error.message}`);
        }
        
        // Fallback for unknown error types
        throw new Error(MANUFACTURER_ERRORS.GENERAL_ERROR);
    }
}

/**
 * Get a manufacturer by ID
 * @param id - Manufacturer UUID
 * @returns Manufacturer data with custom fields or null if not found
 */
export async function getManufacturer(id: string): Promise<Manufacturer | null> {
    try {
        // Query with properly quoted table names and field names
        const result = await sql`
            SELECT 
                m.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, mcf.value)
                    FROM "ManufacturerCustomField" mcf
                    JOIN "CustomField" cf ON mcf.field_id = cf.id
                    WHERE mcf.manufacturer_id = m.id
                    ), '{}'::json) AS custom_fields
            FROM "Manufacturer" m
            WHERE m.id = ${id}
        `;
        
        // Return normalized result or null if not found
        return result.length > 0 ? normalizeManufacturer(result[0]) : null;
    } catch (error) {
        console.error(`Error fetching manufacturer with ID ${id}:`, error);
        throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update an existing manufacturer
 * @param id - Manufacturer UUID to update
 * @param updates - Object containing fields to update
 * @param userId - ID of the user making the update
 * @returns Updated manufacturer with custom fields
 */
export async function updateManufacturer(
    id: string,
    updates: {
        name?: string;
        description?: string;
        websiteUrl?: string;
        contactInfo?: Record<string, JsonValue>;
        logoUrl?: string;
    },
    userId: string
): Promise<Manufacturer> {
    // Return early if no updates provided
    if (Object.keys(updates).length === 0) {
        const existing = await getManufacturer(id);
        if (!existing) throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
        return existing;
    }
    
    try {
        // Start a transaction to ensure atomicity of update and custom field operations
        return await sql.begin(async (sql) => {
            // Build the dynamic SET clause with parameters
            const setParts = [];
            const paramValues = [];
            
            // Add each provided field to the update
            if (updates.name !== undefined) {
                setParts.push('name = $1');
                paramValues.push(updates.name);
            }
            if (updates.description !== undefined) {
                setParts.push(`description = $${paramValues.length + 1}`);
                paramValues.push(updates.description);
            }
            if (updates.websiteUrl !== undefined) {
                setParts.push(`website_url = $${paramValues.length + 1}`);
                paramValues.push(updates.websiteUrl);
            }
            if (updates.logoUrl !== undefined) {
                setParts.push(`logo_url = $${paramValues.length + 1}`);
                paramValues.push(updates.logoUrl);
            }
            if (updates.contactInfo !== undefined) {
                setParts.push(`contact_info = $${paramValues.length + 1}`);
                paramValues.push(updates.contactInfo ? JSON.stringify(updates.contactInfo) : null);
            }
            
            // Always add updated_by and updated_at
            setParts.push(`updated_by = $${paramValues.length + 1}`);
            paramValues.push(userId);
            setParts.push('updated_at = NOW()');
            
            // Complete the query with proper parameter placeholders
            const query = `
                UPDATE "Manufacturer" 
                SET ${setParts.join(', ')} 
                WHERE id = $${paramValues.length + 1} 
                RETURNING *
            `;
            
            // Add ID as the last parameter
            paramValues.push(id);
            
            // Execute update with parameters in correct order
            const result = await sql.unsafe(query, paramValues);
            
            if (result.length === 0) {
                throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
            }
            
            // If contact info was provided, ensure it's properly formatted
            if (updates.contactInfo !== undefined) {
                // Format has already been handled in the query above
            }
            
            // Fetch the complete manufacturer data with custom fields
            const manufacturerWithCustomFields = await getManufacturer(id);
            if (!manufacturerWithCustomFields) {
                throw new Error(MANUFACTURER_ERRORS.NOT_FOUND_AFTER_UPDATE);
            }
            
            return manufacturerWithCustomFields;
        });
    } catch (error) {
        // Type guard for postgres error with code property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const pgError = error as { code: string; message: string };
            
            // Handle duplicate key violation
            if (pgError.code === '23505') {
                throw new Error(`${MANUFACTURER_ERRORS.NAME_EXISTS}: "${updates.name}"`);
            }
        }
        
        // Re-throw specifically handled errors
        if (error instanceof Error && 
            (error.message.includes(MANUFACTURER_ERRORS.NOT_FOUND) || 
             error.message.includes(MANUFACTURER_ERRORS.NOT_FOUND_AFTER_UPDATE) ||
             error.message.includes(MANUFACTURER_ERRORS.NAME_EXISTS))) {
            throw error;
        }
        
        // Generic error with original message
        if (error instanceof Error) {
            throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error.message}`);
        }
        
        // Fallback for unknown error types
        throw new Error(MANUFACTURER_ERRORS.GENERAL_ERROR);
    }
}

/**
 * Delete a manufacturer by ID
 * @param id - Manufacturer UUID to delete
 * @throws Error if manufacturer is referenced by parts or doesn't exist
 */
export async function deleteManufacturer(id: string): Promise<void> {
    try {
        // First verify that the manufacturer exists
        const manufacturer = await getManufacturer(id);
        if (!manufacturer) {
            throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
        }
        
        // Execute deletion with proper table name quoting
        const result = await sql`DELETE FROM "Manufacturer" WHERE id = ${id}`;
        
        // Verify something was deleted
        if (result.count === 0) {
            throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
        }
    } catch (error) {
        // Type guard for postgres error with code property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const pgError = error as { code: string; message: string };
            
            // Handle foreign key constraint violation
            if (pgError.code === '23503') {
                throw new Error(MANUFACTURER_ERRORS.DELETE_REFERENCED);
            }
        }
        
        // Re-throw specific errors we recognize
        if (error instanceof Error && 
            (error.message.includes(MANUFACTURER_ERRORS.NOT_FOUND) || 
             error.message.includes(MANUFACTURER_ERRORS.DELETE_REFERENCED))) {
            throw error;
        }
        
        // Generic error with original message
        if (error instanceof Error) {
            throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error.message}`);
        }
        
        // Fallback for unknown error types
        throw new Error(MANUFACTURER_ERRORS.GENERAL_ERROR);
    }
}

/**
 * List all manufacturers with their custom fields
 * @param limit - Optional limit on number of records to return
 * @param offset - Optional offset for pagination
 * @param nameFilter - Optional filter by name (case-insensitive partial match)
 * @returns Array of manufacturer objects with normalized structure
 */
export async function listManufacturers(options?: { 
    limit?: number; 
    offset?: number; 
    nameFilter?: string;
    userId?: string; // Optional user ID to filter by created_by
}): Promise<Manufacturer[]> {
    try {
        // Build query conditionally based on options
        let query = sql`
            SELECT 
                m.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, mcf.value)
                     FROM "ManufacturerCustomField" mcf
                     JOIN "CustomField" cf ON mcf.field_id = cf.id
                     WHERE mcf.manufacturer_id = m.id
                    ), '{}'::json) AS custom_fields
            FROM "Manufacturer" m
            WHERE 1=1
        `;
        
        // Add conditional filters if provided
        if (options?.nameFilter) {
            query = sql`${query} AND m.name ILIKE ${`%${options.nameFilter}%`}`;
        }
        
        if (options?.userId) {
            query = sql`${query} AND m.created_by = ${options.userId}`;
        }
        
        // Add sorting
        query = sql`${query} ORDER BY m.name ASC`;
        
        // Add pagination if specified
        if (options?.limit) {
            query = sql`${query} LIMIT ${options.limit}`;
            
            if (options?.offset) {
                query = sql`${query} OFFSET ${options.offset}`;
            }
        }
        
        const result = await query;
        return result.map(normalizeManufacturer);
    } catch (error) {
        console.error('Error listing manufacturers:', error);
        throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get manufacturer custom fields
 * @param manufacturerId - Manufacturer UUID
 * @returns Object containing custom field name/value pairs
 */
export async function getManufacturerCustomFields(manufacturerId: string): Promise<Record<string, JsonValue>> {
    try {
        const result = await sql`
            SELECT cf.field_name, mcf.value
            FROM "ManufacturerCustomField" mcf
            JOIN "CustomField" cf ON mcf.field_id = cf.id
            WHERE mcf.manufacturer_id = ${manufacturerId}
        `;
        
        // Build the custom fields object
        const customFields: Record<string, JsonValue> = {};
        for (const row of result) {
            customFields[row.field_name] = row.value;
        }
        
        return customFields;
    } catch (error) {
        console.error(`Error fetching custom fields for manufacturer ${manufacturerId}:`, error);
        throw new Error(`Error fetching manufacturer custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update manufacturer custom fields
 * @param manufacturerId - Manufacturer UUID
 * @param customFields - Object containing custom field name/value pairs
 * @returns Promise that resolves when update is complete
 * @throws Error if manufacturer doesn't exist or another error occurs
 */
export async function updateManufacturerCustomFields(
    manufacturerId: string, 
    customFields: Record<string, JsonValue>
): Promise<void> {
    try {
        // First verify that the manufacturer exists
        const manufacturer = await getManufacturer(manufacturerId);
        if (!manufacturer) {
            throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
        }
        
        // Start a transaction to ensure atomicity
        await sql.begin(async (sql) => {
            // Delete existing custom fields
            await sql`
                DELETE FROM "ManufacturerCustomField"
                WHERE manufacturer_id = ${manufacturerId}
            `;
            
            // Skip further processing if no custom fields to add
            if (Object.keys(customFields).length === 0) {
                return;
            }
            
            // Insert new custom fields
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Get or create the custom field definition
                let fieldId: string;
                const existingField = await sql`
                    SELECT id FROM "CustomField"
                    WHERE field_name = ${fieldName} AND applies_to = 'manufacturer'
                `;
                
                if (existingField.length > 0) {
                    fieldId = existingField[0].id;
                } else {
                    // Determine data type based on the value
                    let dataType = 'text'; // Default to text
                    if (typeof fieldValue === 'number') dataType = 'number';
                    else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                    else if (fieldValue instanceof Date) dataType = 'date';
                    
                    // Create the custom field definition
                    const newField = await sql`
                        INSERT INTO "CustomField" (field_name, data_type, applies_to)
                        VALUES (${fieldName}, ${dataType}, 'manufacturer')
                        RETURNING id
                    `;
                    fieldId = newField[0].id;
                }
                
                // Insert the custom field value using sql.json for proper JSONB formatting
                await sql`
                    INSERT INTO "ManufacturerCustomField" (manufacturer_id, field_id, value)
                    VALUES (${manufacturerId}, ${fieldId}, ${sql.json(fieldValue)})
                `;
            }
        });
    } catch (error) {
        // Re-throw specific errors we recognize
        if (error instanceof Error && error.message.includes(MANUFACTURER_ERRORS.NOT_FOUND)) {
            throw error;
        }
        
        // Generic error with original message
        console.error(`Error updating custom fields for manufacturer ${manufacturerId}:`, error);
        throw new Error(`Error updating manufacturer custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Create a manufacturer with custom fields in a single transaction
 * @param data - Form data for creating the manufacturer
 * @returns The created manufacturer with normalized structure
 */
export async function createManufacturerWithCustomFields(data: ManufacturerFormData): Promise<Manufacturer> {
    try {
        // Extract custom fields from form data if present
        let customFields: Record<string, JsonValue> = {};
        if (data.custom_fields_json) {
            try {
                customFields = JSON.parse(data.custom_fields_json);
            } catch (e) {
                console.error('Error parsing custom fields JSON:', e);
                throw new Error('Invalid custom fields format');
            }
        }
        
        // Create the manufacturer and add custom fields in a transaction
        return await sql.begin(async (sql) => {
            // Create the manufacturer first
            const manufacturer = await createManufacturer({
                name: data.manufacturer_name,
                description: data.manufacturer_description || undefined,
                websiteUrl: data.website_url || undefined,
                logoUrl: data.logo_url || undefined,
                contactInfo: data.contact_info ? JSON.parse(data.contact_info) : undefined,
                createdBy: data.created_by || ''
            });
            
            // Add custom fields if any exist
            if (Object.keys(customFields).length > 0) {
                await updateManufacturerCustomFields(manufacturer.id, customFields);
            }
            
            // Return the manufacturer with custom fields
            return manufacturer;
        });
    } catch (error) {
        console.error('Error creating manufacturer with custom fields:', error);
        throw new Error(`Error creating manufacturer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}