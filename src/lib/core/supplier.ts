/**
 * Core functionality for supplier management
 */
import sql from '$lib/server/db';
import crypto from 'crypto';
// Import schema-defined types for type safety
import type { SupplierFormData } from '$lib/types/formTypes';
import type { JsonValue, Supplier } from '$lib/types/schemaTypes';
import { supplierSchema } from '$lib/schema/schema';

/**
 * Extended Supplier interface for internal use with both camelCase and snake_case properties
 * This provides backwards compatibility with existing code while maintaining type safety
 */
interface SupplierWithId {
    // Database identifier (both formats for compatibility)
    id: string;
    supplier_id: string;
    
    // Core supplier data (both formats)
    name: string;
    supplier_name: string;
    description?: string | null | undefined;
    supplier_description?: string | null | undefined;
    websiteUrl?: string | null | undefined;
    website_url?: string | null | undefined;
    logoUrl?: string | null | undefined;
    logo_url?: string | null | undefined;
    
    // Contact information (both formats)
    contactInfo?: JsonValue | null | undefined;
    contact_info?: JsonValue | null | undefined;
    
    // Custom fields - always a non-null object to avoid type issues
    customFields: Record<string, JsonValue>;
    
    // Metadata fields (both formats)
    createdBy: string;
    created_by: string;
    createdAt: Date;
    created_at: Date;
    updatedBy?: string | null | undefined;
    updated_by?: string | null | undefined;
    updatedAt: Date;
    updated_at: Date;
}

/**
 * Error messages for supplier operations
 */
export const SUPPLIER_ERRORS = {
    NOT_FOUND: 'Supplier not found',
    DUPLICATE_NAME: 'Supplier with this name already exists',
    REFERENCED_BY_PARTS: 'Supplier cannot be deleted as it is referenced by existing parts',
    VALIDATION_ERROR: 'Supplier validation error',
    GENERAL_ERROR: 'An error occurred during the supplier operation'
};

/**
 * Helper to normalize supplier data from postgres result
 * @param row - Raw database row
 * @returns Normalized supplier object
 */
/**
 * Type definition for database row data to ensure type safety
 */
type DbRow = Record<string, unknown>;

/**
 * Helper function to safely deserialize contact info from database JSON
 * @param json The JSON value from the database
 * @returns Typed contact info object or null
 */
function deserializeContactInfo(json: unknown | null | undefined): JsonValue | null {
    if (!json) return null;
    
    try {
        // Handle string JSON that's not already a JSON structure (e.g. "key: value; key2: value2")
        if (typeof json === 'string' && !json.trim().startsWith('{') && (json.includes(':') || json.includes(';'))) {
            // Parse key-value pairs in the format "key: value; key2: value2"
            const pairs = json.split(/[;\n]+/);
            const contactObj: Record<string, string> = {};
            
            for (const pair of pairs) {
                const match = pair.match(/^\s*([^:]+)\s*:\s*(.+?)\s*$/);
                if (match) {
                    const [, key, value] = match;
                    contactObj[key.trim()] = value.trim();
                }
            }
            
            // Detect common contact info patterns and structure them accordingly
            const structuredObj: Record<string, string> = {};
            
            // Look for common contact fields
            for (const [key, value] of Object.entries(contactObj)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('email')) {
                    structuredObj['email'] = value;
                } else if (lowerKey.includes('phone') || lowerKey.includes('tel')) {
                    structuredObj['phone'] = value;
                } else if (lowerKey.includes('address')) {
                    structuredObj['address'] = value;
                } else if (lowerKey.includes('note')) {
                    structuredObj['notes'] = value;
                } else {
                    structuredObj[key] = value;
                }
            }
            
            return structuredObj;
        }
        
        // Handle standard JSON string
        if (typeof json === 'string') {
            try {
                return JSON.parse(json) as JsonValue;
            } catch {
                // If parsing fails, look for email/phone patterns directly
                const emailMatch = json.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
                const phoneMatch = json.match(/[+\d()-\s]{7,}/);
                
                if (emailMatch || phoneMatch) {
                    const result: Record<string, string> = {};
                    if (emailMatch) result.email = emailMatch[0];
                    if (phoneMatch) result.phone = phoneMatch[0].trim();
                    return result;
                }
                
                // Otherwise treat as plain text
                return { text: json };
            }
        }
        
        // Already an object
        if (typeof json === 'object') {
            return json as JsonValue;
        }
        
        // Default case
        return null;
    } catch (error) {
        console.error('[deserializeContactInfo] Error deserializing contact info:', error);
        return null;
    }
}

/**
 * Helper function to safely deserialize custom fields from database JSON
 * @param json The JSON value from the database
 * @returns Typed custom fields object or null
 */
function deserializeCustomFields(json: unknown | null | undefined): Record<string, JsonValue> | null {
    if (!json) return null;
    
    try {
        // Handle string JSON
        if (typeof json === 'string') {
            return JSON.parse(json) as Record<string, JsonValue>;
        }
        
        // Already an object
        if (typeof json === 'object') {
            return json as Record<string, JsonValue>;
        }
        
        // Default case
        return null;
    } catch (error) {
        console.error('[deserializeCustomFields] Error deserializing custom fields:', error);
        return null;
    }
}

/**
 * Convert SupplierWithId to schema-compatible Supplier
 * This function handles type compatibility between our extended interface and the schema type
 * 
 * @param supplier - The extended supplier object or a partial supplier object
 * @returns A schema-compatible supplier object that conforms to the Zod schema
 */
export function toSchemaSupplier(supplier: Partial<SupplierWithId> & { 
    supplier_id: string; 
    supplier_name: string; 
    created_at: Date; 
    updated_at: Date; 
    created_by: string;
}): Supplier {
    // Create a schema-compatible supplier object
    return {
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        supplier_description: supplier.supplier_description !== null && supplier.supplier_description !== undefined ? supplier.supplier_description : undefined,
        website_url: supplier.website_url !== null && supplier.website_url !== undefined ? supplier.website_url : undefined,
        contact_info: supplier.contact_info !== null && supplier.contact_info !== undefined ? supplier.contact_info : undefined,
        logo_url: supplier.logo_url !== null && supplier.logo_url !== undefined ? supplier.logo_url : undefined,
        created_by: supplier.created_by,
        created_at: supplier.created_at,
        updated_by: supplier.updated_by !== null && supplier.updated_by !== undefined ? supplier.updated_by : undefined,
        updated_at: supplier.updated_at,
        custom_fields: supplier.customFields || {}
    };
}

function normalizeSupplier(row: DbRow): SupplierWithId {
    // Convert JSONB fields properly
    const contactInfo = row.contact_info ? 
        (typeof row.contact_info === 'string' ? 
            JSON.parse(row.contact_info as string) : 
            row.contact_info as Record<string, JsonValue>) : 
        undefined;
    
    const customFields = row.custom_fields ? 
        (typeof row.custom_fields === 'string' ? 
            JSON.parse(row.custom_fields as string) : 
            row.custom_fields as Record<string, JsonValue>) : 
        {};
    
    // Ensure dates are properly handled
    const createdDate = row.created_at ? 
        (row.created_at instanceof Date ? 
            row.created_at : 
            new Date(row.created_at as string)) : 
        new Date();
    
    // Extract and validate created_by field
    // Following TypeScript best practices with proper type narrowing
    let createdByValue: string;
    if (row.created_by !== null && row.created_by !== undefined && String(row.created_by).trim() !== '') {
        createdByValue = String(row.created_by).trim();
    } else {
        createdByValue = 'system';
    }
    
    const updatedDate = row.updated_at ? 
        (row.updated_at instanceof Date ? 
            row.updated_at : 
            new Date(row.updated_at as string)) : 
        new Date();
    
    return {
        id: row.supplier_id as string, // Database ID for internal use
        supplier_id: row.supplier_id as string, // Match with SupplierFormData
        name: row.supplier_name as string,
        supplier_name: row.supplier_name as string, // Match with the database column name
        description: row.supplier_description as string | undefined,
        supplier_description: row.supplier_description as string | undefined, // Match with the database column name
        websiteUrl: row.website_url as string | undefined,
        website_url: row.website_url as string | undefined, // Match with SupplierFormData
        contactInfo: contactInfo,
        contact_info: contactInfo, // Match with SupplierFormData
        logoUrl: row.logo_url as string | undefined,
        logo_url: row.logo_url as string | undefined, // Match with SupplierFormData 
        customFields: customFields,
        // Both fields must be strings per the interface definition
        createdBy: createdByValue,
        created_by: createdByValue,
        createdAt: createdDate as Date, // Explicit type assertion to avoid type error
        created_at: createdDate as Date, // Match with SupplierFormData and ensure proper type
        updatedBy: row.updated_by as string | undefined,
        updated_by: row.updated_by as string | undefined, // Match with SupplierFormData
        updatedAt: updatedDate,
        updated_at: updatedDate // Match with SupplierFormData
    };
}

/**
 * Save custom fields for a supplier
 * @param supplierId - Supplier UUID
 * @param customFields - Custom fields to save
 * @param createdBy - User ID who created the fields
 */
export async function saveSupplierCustomFields(
    supplierId: string,
    customFields: Record<string, JsonValue>,
    createdBy: string
): Promise<void> {
    if (!customFields || Object.keys(customFields).length === 0) {
        return;
    }
    
    try {
        // Using a transaction to ensure data consistency
        await sql.begin(async sql => {
            // Delete existing entries to avoid conflicts
            await sql`DELETE FROM "SupplierCustomField" WHERE supplier_id = ${supplierId}`;
            
            // For each custom field entry
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Skip null or undefined values
                if (fieldValue === null || fieldValue === undefined) {
                    continue;
                }
                
                // Determine the data type
                let dataType: string;
                if (typeof fieldValue === 'string') dataType = 'text';
                else if (typeof fieldValue === 'number') dataType = 'number';
                else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                else if (fieldValue instanceof Date) dataType = 'date';
                else dataType = 'text';  // Default to text
                
                // First find or create the CustomField entry
                let fieldId: string;
                const existingField = await sql`
                    SELECT custom_field_id FROM "CustomField" 
                    WHERE field_name = ${fieldName} AND applies_to = 'supplier'
                `;
                
                if (existingField.length > 0) {
                    fieldId = existingField[0].custom_field_id;
                } else {
                    // Create new custom field definition
                    const newField = await sql`
                        INSERT INTO "CustomField" (
                            field_name, 
                            data_type, 
                            applies_to
                        ) 
                        VALUES (
                            ${fieldName}, 
                            ${dataType}, 
                            'supplier'
                        )
                        RETURNING custom_field_id
                    `;
                    fieldId = newField[0].custom_field_id;
                }
                
                // Prepare the value as JSONB
                // Store the actual value directly as JSONB, not as a string
                await sql`
                    INSERT INTO "SupplierCustomField" (
                        supplier_id,
                        field_id,
                        custom_field_value
                    )
                    VALUES (
                        ${supplierId},
                        ${fieldId},
                        ${sql.json(fieldValue)}
                    )
                `;
            }
        });
    } catch (error) {
        console.error('Error saving supplier custom fields:', error);
        throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);  
    }
}

/**
 * Create a new supplier
 * @param params - Parameters for creating a supplier
 * @returns The created supplier with normalized structure
 */
export async function createSupplier(
    params: {
        supplier_name: string;
        supplier_description?: string;
        websiteUrl?: string;
        contactInfo?: Record<string, JsonValue>;
        logoUrl?: string;
        createdBy: string;
        customFields?: Record<string, JsonValue>;
    }
): Promise<Supplier> {
    // First validate the input using the zod schema
    try {
        supplierSchema.parse({
            supplier_name: params.supplier_name,
            supplier_description: params.supplier_description,
            website_url: params.websiteUrl,
            contact_info: params.contactInfo,
            logo_url: params.logoUrl,
            created_by: params.createdBy,
            created_at: new Date(),
            updated_at: new Date()
        });
    } catch (validationError) {
        console.error('Supplier validation error:', validationError);
        throw new Error(`${SUPPLIER_ERRORS.VALIDATION_ERROR}: ${validationError instanceof Error ? validationError.message : 'Invalid supplier data'}`);
    }

    // Use a transaction to ensure all operations succeed or fail together
    return await sql.begin(async sql => {
        try {
            // Convert empty strings to null for nullable fields
            const description = (!params.supplier_description || params.supplier_description === '') ? null : params.supplier_description;
            const websiteUrl = (!params.websiteUrl || params.websiteUrl === '') ? null : params.websiteUrl;
            const logoUrl = (!params.logoUrl || params.logoUrl === '') ? null : params.logoUrl;
            
            // Use porsager/postgres template literals with correct case sensitivity
            // Table name is quoted "Supplier" (capitalized) to match PostgreSQL case sensitivity
            const result = await sql`
                INSERT INTO "Supplier" (
                    supplier_name, 
                    supplier_description, 
                    website_url, 
                    contact_info, 
                    logo_url, 
                    created_by
                )
                VALUES (
                    ${params.supplier_name},
                    ${description},
                    ${websiteUrl},
                    ${params.contactInfo ? sql.json(params.contactInfo) : null},
                    ${logoUrl},
                    ${params.createdBy}
                )
                RETURNING *
            `;

            if (result.length === 0) {
                throw new Error(SUPPLIER_ERRORS.GENERAL_ERROR + ': Failed to create supplier');
            }

            const supplierId = result[0].supplier_id as string;
            
            // Save custom fields if provided (within the same transaction)
            if (params.customFields && Object.keys(params.customFields).length > 0) {
                for (const [fieldName, fieldValue] of Object.entries(params.customFields)) {
                    // Skip null or undefined values
                    if (fieldValue === null || fieldValue === undefined) {
                        continue;
                    }
                    
                    // Determine the data type (use 'text', not 'string')
                    let dataType: string;
                    if (typeof fieldValue === 'string') dataType = 'text'; // NOT 'string'
                    else if (typeof fieldValue === 'number') dataType = 'number';
                    else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                    else if (fieldValue instanceof Date) dataType = 'date';
                    else dataType = 'text';  // Default to text
                    
                    // Convert value to string for storage
                    let stringValue: string;
                    if (typeof fieldValue === 'object' && fieldValue !== null) {
                        stringValue = JSON.stringify(fieldValue);
                    } else {
                        stringValue = String(fieldValue);
                    }
                    
                    await sql`
                        INSERT INTO "SupplierCustomField" (
                            supplier_id,
                            field_name,
                            field_value,
                            data_type,
                            applies_to,
                            created_by
                        )
                        VALUES (
                            ${supplierId},
                            ${fieldName},
                            ${stringValue},
                            ${dataType},
                            'supplier',
                            ${params.createdBy}
                        )
                    `;
                }
            }
            
            // Build result with custom fields within the transaction
            const customFields = await sql`
                SELECT field_name, field_value, data_type
                FROM "SupplierCustomField"
                WHERE supplier_id = ${supplierId}
            `;
            
            // Build the custom fields object
            const customFieldsRecord: Record<string, JsonValue> = {};
            for (const field of customFields) {
                const fieldName = field.field_name as string;
                let fieldValue: JsonValue = field.field_value;
                
                // Convert the field value based on data_type
                if (field.data_type === 'number') {
                    fieldValue = Number(fieldValue);
                } else if (field.data_type === 'boolean') {
                    fieldValue = fieldValue === 'true' || fieldValue === true;
                }
                
                customFieldsRecord[fieldName] = fieldValue;
            }
            
            // Combine the supplier data with custom fields
            const resultWithCustomFields = {
                ...result[0],
                custom_fields: customFieldsRecord
            };
            
            // Return the complete supplier object
            const supplier = normalizeSupplier(resultWithCustomFields);
            return toSchemaSupplier(supplier);
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23505') {
                throw new Error(SUPPLIER_ERRORS.DUPLICATE_NAME);
            }
            if (error.message.includes(SUPPLIER_ERRORS.VALIDATION_ERROR)) {
                throw error; // Re-throw validation errors as is
            }
        }
        // Generic error with original message
        console.error('Error creating supplier:', error);
        throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
}



/**
 * Get a supplier by ID with custom fields
 * @param id - Supplier UUID
 * @returns The supplier with normalized structure or null if not found
 */
export async function getSupplier(id: string): Promise<Supplier | null> {
    try {
        // Note: Table name is capitalized "Supplier" for PostgreSQL case sensitivity
        const result = await sql`
            SELECT s.*
            FROM "Supplier" s
            WHERE s.supplier_id = ${id}
        `;
        if (result.length > 0) {
            // Get custom fields separately for better type safety
            const customFields = await getSupplierCustomFields(id);
            
            // Add custom fields to the result
            const resultWithCustomFields = {
                ...result[0],
                custom_fields: customFields
            };
            
            const supplier = normalizeSupplier(resultWithCustomFields);
            return toSchemaSupplier(supplier);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching supplier ${id}:`, error);
        throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update an existing supplier
 * @param id - Supplier UUID
 * @param params - Fields to update
 * @param userId - ID of user making the update
 * @returns Updated supplier with normalized structure
 */
export async function updateSupplier(
    id: string,
    params: {
        supplier_name?: string;
        supplier_description?: string;
        websiteUrl?: string;
        contactInfo?: Record<string, JsonValue>;
        logoUrl?: string;
        updatedBy: string;
        customFields?: Record<string, JsonValue>;
    }
): Promise<Supplier | null> {
    // First check that the supplier exists with proper error handling
    const existing = await getSupplier(id);
    if (!existing) {
        throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
    }

    // Validate input data against schema if updating name (which is required)
    if (params.supplier_name !== undefined) {
        try {
            supplierSchema.parse({
                supplier_id: id,
                supplier_name: params.supplier_name,
                // Include other fields that might be required by the schema
                created_at: existing.created_at,
                updated_at: new Date()
            });
        } catch (validationError) {
            console.error('Supplier validation error:', validationError);
            throw new Error(`${SUPPLIER_ERRORS.VALIDATION_ERROR}: ${validationError instanceof Error ? validationError.message : 'Invalid supplier data'}`);
        }
    }

    // Return early if no updates
    if (Object.keys(params).length === 0) {
        return existing;
    }
    
    // Handle the update in a transaction for data integrity
    return await sql.begin(async sql => {
        try {
            // Build the SET parts of the query using a safer approach with sql fragments
            // Table name is quoted "Supplier" (capitalized) to match PostgreSQL case sensitivity
            let query = sql`UPDATE "Supplier" SET updated_by = ${params.updatedBy}, updated_at = NOW()`;
            
            // Conditionally add each field to update
            if (params.supplier_name !== undefined) {
                query = sql`${query}, supplier_name = ${params.supplier_name}`;
            }
            
            if (params.supplier_description !== undefined) {
                // Convert empty string to null for nullable fields
                const description = params.supplier_description === '' ? null : params.supplier_description;
                query = sql`${query}, supplier_description = ${description}`;
            }
            
            if (params.websiteUrl !== undefined) {
                // Convert empty string to null for nullable fields
                const websiteUrl = params.websiteUrl === '' ? null : params.websiteUrl;
                query = sql`${query}, website_url = ${websiteUrl}`;
            }
            
            if (params.contactInfo !== undefined) {
                query = sql`${query}, contact_info = ${params.contactInfo ? sql.json(params.contactInfo) : null}`;
            }
            
            if (params.logoUrl !== undefined) {
                // Convert empty string to null for nullable fields
                const logoUrl = params.logoUrl === '' ? null : params.logoUrl;
                query = sql`${query}, logo_url = ${logoUrl}`;
            }
            
            // Complete the query
            // Use supplier_id instead of id for the WHERE clause to match the database column name
            query = sql`${query} WHERE supplier_id = ${id} RETURNING *`;
            
            // Execute the query
            const result = await query;
            
            if (result.length === 0) {
                throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
            }
            
            // Update custom fields if provided (within the same transaction)
            if (params.customFields) {
                // Delete existing custom fields first
                await sql`DELETE FROM "SupplierCustomField" WHERE supplier_id = ${id}`;
                
                // Insert new custom fields
                for (const [fieldName, fieldValue] of Object.entries(params.customFields)) {
                    // Skip null or undefined values
                    if (fieldValue === null || fieldValue === undefined) {
                        continue;
                    }
                    
                    // Determine the data type
                    let dataType: string;
                    if (typeof fieldValue === 'string') dataType = 'text';
                    else if (typeof fieldValue === 'number') dataType = 'number';
                    else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                    else if (fieldValue instanceof Date) dataType = 'date';
                    else dataType = 'text';  // Default to text
                    
                    // First find or create the CustomField entry
                    let fieldId: string;
                    const existingField = await sql`
                        SELECT custom_field_id FROM "CustomField" 
                        WHERE field_name = ${fieldName} AND applies_to = 'supplier'
                    `;
                    
                    if (existingField.length > 0) {
                        fieldId = existingField[0].custom_field_id;
                    } else {
                        // Create new custom field definition
                        const newField = await sql`
                            INSERT INTO "CustomField" (
                                field_name, 
                                data_type, 
                                applies_to
                            ) 
                            VALUES (
                                ${fieldName}, 
                                ${dataType}, 
                                'supplier'
                            )
                            RETURNING custom_field_id
                        `;
                        fieldId = newField[0].custom_field_id;
                    }
                    
                    // Insert into SupplierCustomField with the correct schema
                    await sql`
                        INSERT INTO "SupplierCustomField" (
                            supplier_id,
                            field_id,
                            custom_field_value
                        )
                        VALUES (
                            ${id},
                            ${fieldId},
                            ${sql.json(fieldValue)}
                        )
                    `;
                }
            }

            // Get custom fields with the correct join and schema
            const customFields = await sql`
                SELECT cf.field_name, scf.custom_field_value, cf.data_type
                FROM "SupplierCustomField" scf
                JOIN "CustomField" cf ON scf.field_id = cf.custom_field_id
                WHERE scf.supplier_id = ${id}
            `;
            
            // Build the custom fields object
            const customFieldsRecord: Record<string, JsonValue> = {};
            for (const field of customFields) {
                const fieldName = field.field_name as string;
                let fieldValue: JsonValue;
                
                // Parse the JSONB value from the database
                try {
                    fieldValue = typeof field.custom_field_value === 'string' 
                        ? JSON.parse(field.custom_field_value) 
                        : field.custom_field_value;
                } catch (e) {
                    // If parsing fails, use the raw value
                    fieldValue = field.custom_field_value;
                }
                
                // Convert the field value based on data_type
                if (field.data_type === 'number' && typeof fieldValue === 'string') {
                    fieldValue = Number(fieldValue);
                } else if (field.data_type === 'boolean') {
                    if (typeof fieldValue === 'string') {
                        fieldValue = fieldValue === 'true';
                    } else {
                        fieldValue = Boolean(fieldValue);
                    }
                }
                
                customFieldsRecord[fieldName] = fieldValue;
            }
            
            // Combine the supplier data with custom fields
            const resultWithCustomFields = {
                ...result[0],
                custom_fields: customFieldsRecord
            };
            
            // Return the complete supplier object
            const supplier = normalizeSupplier(resultWithCustomFields);
            return toSchemaSupplier(supplier);
        } catch (error) {
            // Transaction will be automatically rolled back on error
            throw error;
        }
    });
}

/**
 * Delete a supplier by ID
 * @param id - Supplier UUID
 * @throws Error if supplier doesn't exist or is referenced by parts
 */
export async function deleteSupplier(id: string): Promise<void> {
    // Validate input
    if (!id || typeof id !== 'string') {
        throw new Error(`${SUPPLIER_ERRORS.VALIDATION_ERROR}: Invalid supplier ID`);
    }

    // Use a transaction to ensure all operations succeed or fail together
    return await sql.begin(async sql => {
        try {
            // First check that the supplier exists
            const supplier = await sql`
                SELECT supplier_id FROM "Supplier" WHERE supplier_id = ${id}
            `;
            
            if (supplier.length === 0 || !supplier[0].supplier_id) {
                throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
            }
            
            // Check if the supplier is referenced by any parts
            const partRefs = await sql`
                SELECT COUNT(*) FROM "SupplierPart" 
                WHERE supplier_id = ${id}
            `;
            
            if (parseInt(partRefs[0].count as string, 10) > 0) {
                throw new Error(SUPPLIER_ERRORS.REFERENCED_BY_PARTS);
            }
            
            // Delete custom fields first (if any)
            await sql`DELETE FROM "SupplierCustomField" WHERE supplier_id = ${id}`;
            
            // Then delete the supplier
            const result = await sql`DELETE FROM "Supplier" WHERE supplier_id = ${id}`;
            
            // Verify deletion was successful
            if (result.count === 0) {
                throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
            }
            
            // If we get here, all operations succeeded
            return;
        } catch (error) {
            // Log the specific error for debugging
            console.error(`Error deleting supplier ${id}:`, error);
            
            // Re-throw with more specific error message
            if (error instanceof Error) {
                // Pass through specific error messages
                throw error;
            } else {
                // Generic error
                throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: Unable to delete supplier`);
            }
        }
    });
}

/**
 * List all suppliers with their custom fields
 * @param limit - Optional limit on number of records to return
 * @param offset - Optional offset for pagination
 * @param nameFilter - Optional filter by name (case-insensitive partial match)
 * @returns Array of supplier objects with normalized structure
 */
export async function listSuppliers(options?: { 
    limit?: number; 
    offset?: number; 
    nameFilter?: string;
    userId?: string; // Optional user ID to filter by created_by
}): Promise<Supplier[]> {
    try {
        // Build query conditionally based on options
        let query = sql`
            SELECT 
                s.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, scf.custom_field_value)
                    FROM "SupplierCustomField" scf
                    JOIN "CustomField" cf ON scf.field_id = cf.custom_field_id
                    WHERE scf.supplier_id = s.supplier_id
                    ), '{}'::json) AS custom_fields
            FROM "Supplier" s
            WHERE 1=1
        `;
        
        // Add conditional filters if provided
        if (options?.nameFilter) {
            query = sql`${query} AND s.supplier_name ILIKE ${`%${options.nameFilter}%`}`;
        }
        
        if (options?.userId) {
            query = sql`${query} AND s.created_by = ${options.userId}`;
        }
        
        // Add sorting
        query = sql`${query} ORDER BY s.supplier_name ASC`;
        
        // Add pagination if specified
        if (options?.limit) {
            query = sql`${query} LIMIT ${options.limit}`;
            
            if (options?.offset) {
                query = sql`${query} OFFSET ${options.offset}`;
            }
        }
        
        const result = await query;

        // Process and normalize each supplier
        const validSuppliers = result.map(row => {
            // For each supplier, ensure we have proper custom fields handling
            let customFields: Record<string, JsonValue> = {};
            
            // Parse custom_fields if it exists in the row
            if (row.custom_fields) {
                try {
                    if (typeof row.custom_fields === 'string') {
                        customFields = JSON.parse(row.custom_fields as string);
                    } else if (typeof row.custom_fields === 'object') {
                        customFields = row.custom_fields as Record<string, JsonValue>;
                    }
                } catch (e) {
                    console.error('Error parsing custom fields:', e);
                    // Keep empty object as fallback
                }
            }
            
            // Add custom fields to the row
            const rowWithCustomFields = {
                ...row,
                custom_fields: customFields
            };
            
            // Normalize the supplier
            const supplier = normalizeSupplier(rowWithCustomFields);
            
            // Make sure created_by is always a string
            if (!supplier.created_by) {
                supplier.created_by = 'system';
                supplier.createdBy = 'system';
            }
            
            return supplier;
        });

        // Convert to schema-compatible type
        return validSuppliers.map(supplier => toSchemaSupplier(supplier));
    } catch (error) {
        console.error('Error listing suppliers:', error);
        throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get supplier custom fields
 * @param supplierId - Supplier UUID
 * @returns Object containing custom field name/value pairs
 */
export async function getSupplierCustomFields(supplierId: string): Promise<Record<string, JsonValue>> {
    try {
        // Join with the CustomField table to get the field names and data types
        const result = await sql`
            SELECT cf.field_name, scf.custom_field_value, cf.data_type
            FROM "SupplierCustomField" scf
            JOIN "CustomField" cf ON scf.field_id = cf.custom_field_id
            WHERE scf.supplier_id = ${supplierId}
        `;
        
        // Build the custom fields object
        const customFields: Record<string, JsonValue> = {};
        for (const row of result) {
            const fieldName = row.field_name as string;
            let fieldValue: JsonValue;
            
            // Parse the JSONB value from the database
            try {
                fieldValue = typeof row.custom_field_value === 'string' 
                    ? JSON.parse(row.custom_field_value) 
                    : row.custom_field_value;
            } catch (e) {
                // If parsing fails, use the raw value
                fieldValue = row.custom_field_value;
            }
            
            // Convert the field value based on data_type
            if (row.data_type === 'number' && typeof fieldValue === 'string') {
                fieldValue = Number(fieldValue);
            } else if (row.data_type === 'boolean') {
                if (typeof fieldValue === 'string') {
                    fieldValue = fieldValue === 'true';
                } else {
                    fieldValue = Boolean(fieldValue);
                }
            }
            
            customFields[fieldName] = fieldValue;
        }
        
        return customFields;
    } catch (error) {
        console.error(`Error fetching custom fields for supplier ${supplierId}:`, error);
        throw new Error(`Error fetching supplier custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update supplier custom fields
 * @param supplierId - Supplier UUID
 * @param customFields - Object containing custom field name/value pairs
 * @returns Updated supplier with custom fields
 * @throws Error if supplier doesn't exist or another error occurs
 */
export async function updateSupplierCustomFields(
    supplierId: string, 
    customFields: Record<string, JsonValue>
): Promise<Supplier | null> {
    try {
        // First verify that the supplier exists
        const supplierResult = await sql`SELECT supplier_id FROM "Supplier" WHERE supplier_id = ${supplierId}`;
        if (supplierResult.length === 0 || !supplierResult[0].supplier_id) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }
        
        // Start a transaction to ensure atomicity
        await sql.begin(async (sql) => {
            // Delete existing custom fields
            await sql`
                DELETE FROM "SupplierCustomField"
                WHERE supplier_id = ${supplierId}
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
                    WHERE field_name = ${fieldName} AND applies_to = 'supplier'
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
                        VALUES (${fieldName}, ${dataType}, 'supplier')
                        RETURNING id
                    `;
                    fieldId = newField[0].id;
                }
                
                // Insert the custom field value using sql.json for proper JSONB formatting
                await sql`
                    INSERT INTO "SupplierCustomField" (supplier_id, field_id, value)
                    VALUES (${supplierId}, ${fieldId}, ${sql.json(fieldValue)})
                `;
            }
        });
        
        // Query the supplier with custom fields directly
        const result = await sql`
            SELECT s.*
            FROM "Supplier" s
            WHERE s.supplier_id = ${supplierId}
        `;
        
        if (result.length === 0) {
            return null;
        }
        
        // Get custom fields
        const customFieldsResult = await sql`
            SELECT field_name, field_value, data_type
            FROM "SupplierCustomField"
            WHERE supplier_id = ${supplierId}
        `;
        
        // Build the custom fields object
        const customFieldsRecord: Record<string, JsonValue> = {};
        for (const field of customFieldsResult) {
            const fieldName = field.field_name as string;
            let fieldValue: JsonValue = field.field_value;
            
            // Convert the field value based on data_type
            if (field.data_type === 'number') {
                fieldValue = Number(fieldValue);
            } else if (field.data_type === 'boolean') {
                fieldValue = fieldValue === 'true' || fieldValue === true;
            }
            
            customFieldsRecord[fieldName] = fieldValue;
        }
        
        // Add custom fields to the result
        const resultWithCustomFields = {
            ...result[0],
            custom_fields: customFieldsRecord
        };
        
        // Return the normalized supplier
        const supplier = normalizeSupplier(resultWithCustomFields);
        return toSchemaSupplier(supplier);
    } catch (error) {
        // Re-throw specific errors we recognize
        if (error instanceof Error && error.message.includes(SUPPLIER_ERRORS.NOT_FOUND)) {
            throw error;
        }
        
        // Generic error with original message
        console.error(`Error updating custom fields for supplier ${supplierId}:`, error);
        throw new Error(`Error updating supplier custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Create a supplier with custom fields in a single transaction
 * @param data - Form data for creating the supplier
 * @returns The created supplier with normalized structure
 */
export async function createSupplierWithCustomFields(data: SupplierFormData): Promise<Supplier> {
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
        
        // Create the supplier and add custom fields in a transaction
        return await sql.begin(async (sql) => {
            // Create the supplier first with required fields
            const supplier = await createSupplier({
                supplier_name: data.supplier_name,
                supplier_description: data.supplier_description || undefined,
                websiteUrl: data.website_url || undefined,
                logoUrl: data.logo_url || undefined,
                contactInfo: data.contact_info ? (typeof data.contact_info === 'string' ? JSON.parse(data.contact_info) : data.contact_info) : undefined,
                createdBy: data.created_by || 'system'
            });
            
            // Add custom fields if any exist
            if (Object.keys(customFields).length > 0) {
                await updateSupplierCustomFields(supplier.supplier_id, customFields);
            }
            
            // Ensure all required fields are present before conversion
            // TypeScript doesn't recognize that we've already set a default in createSupplier
            // So we need to ensure it's definitely a string here too
            supplier.created_by = supplier.created_by || 'system';
            
            // Return the supplier with its newly assigned custom fields
            // Use type assertion to explicitly tell TypeScript that created_by is now guaranteed to be a string
            return toSchemaSupplier({
                ...supplier,
                created_by: supplier.created_by // We've already ensured this is a string
            });
        });
    } catch (error) {
        console.error('Error creating supplier with custom fields:', error);
        throw new Error(`Error creating supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Helper function to convert between SupplierFormData and Supplier
 * @param formData The form data from SuperForm
 * @returns Supplier data structure
 */
export function supplierFormDataToSupplier(formData: SupplierFormData): Supplier {
    // Parse contact info safely
    let contactInfo: Record<string, JsonValue> | undefined = undefined;
    if (formData.contact_info) {
        try {
            contactInfo = typeof formData.contact_info === 'string' ? 
                JSON.parse(formData.contact_info) : 
                formData.contact_info;
        } catch (e) {
            console.error('Error parsing contact info JSON:', e);
            // Leave as undefined if parsing fails
        }
    }
    
    // Parse custom fields safely - always ensure it's a non-null object
    let customFields: Record<string, JsonValue> = {};
    if (formData.custom_fields_json) {
        try {
            const parsed = typeof formData.custom_fields_json === 'string' ? 
                JSON.parse(formData.custom_fields_json) : 
                formData.custom_fields_json;
            if (typeof parsed === 'object' && parsed !== null) {
                customFields = parsed;
            }
        } catch (e) {
            console.error('Error parsing custom fields JSON:', e);
            // Already using empty object as fallback
        }
    }
    
    // Handle dates properly
    const createdDate = formData.created_at ? 
        (formData.created_at instanceof Date ? 
            formData.created_at : 
            new Date(formData.created_at)) : 
        new Date();
    
    const updatedDate = formData.updated_at ? 
        (formData.updated_at instanceof Date ? 
            formData.updated_at : 
            new Date(formData.updated_at)) : 
        new Date();
    
    // Generate a random ID if needed
    const id = formData.supplier_id || crypto.randomUUID();
    
    // Ensure createdBy is never undefined
    const createdBy = formData.created_by || 'system';
    
    // Create a normalized supplier object with both internal and schema properties
    const supplierWithId: SupplierWithId = {
        id: id,
        supplier_id: id,
        name: formData.supplier_name,
        supplier_name: formData.supplier_name,
        description: formData.supplier_description || undefined,
        supplier_description: formData.supplier_description || undefined,
        websiteUrl: formData.website_url || undefined,
        website_url: formData.website_url || undefined,
        logoUrl: formData.logo_url || undefined,
        logo_url: formData.logo_url || undefined,
        contactInfo: contactInfo,
        contact_info: contactInfo,
        customFields: customFields,
        createdBy: createdBy,
        created_by: createdBy,
        createdAt: createdDate,
        created_at: createdDate,
        updatedBy: formData.updated_by || undefined,
        updated_by: formData.updated_by || undefined,
        updatedAt: updatedDate,
        updated_at: updatedDate
    };
    
    // Convert to schema-compatible type
    return toSchemaSupplier(supplierWithId);
}