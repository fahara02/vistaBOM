//src/lib/core/manufacturer.ts

/**
 * Manufacturer core functionality
 * Handles all database operations for manufacturers
 */
import sql from '$lib/server/db/index';
import crypto from 'crypto';

// Import schema-defined type for type safety
import type { Manufacturer } from '$lib/types/schemaTypes';
import type { ManufacturerFormData } from '$lib/types/formTypes';

// Import JSON-specific type
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
  VALIDATION_ERROR: 'Invalid manufacturer data',
  REFERENCED_BY_PARTS: 'Manufacturer cannot be deleted as it is referenced by existing parts',
  GENERAL_ERROR: 'An error occurred during the manufacturer operation'
};

/**
 * Type definition for database row data to ensure type safety
 */
type DbRow = Record<string, unknown>;

/**
 * Extended Manufacturer interface for internal use with both camelCase and snake_case properties
 * This provides backwards compatibility with existing code while maintaining type safety
 * Uses schema-driven design from manufacturerSchema
 */
interface ManufacturerWithId {
  // API-friendly camelCase properties
  id: string;
  name: string;
  description?: string;
  websiteUrl?: string;
  contactInfo?: JsonValue;
  logoUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
  customFields?: Record<string, JsonValue> | null;
  
  // Database column names (snake_case) - extended from Manufacturer with more precise null handling
  manufacturer_id: string;
  manufacturer_name: string;
  manufacturer_description?: string | null;
  website_url?: string | null;
  contact_info?: JsonValue | null;
  logo_url?: string | null;
  created_by: string;
  created_at: Date;
  updated_by?: string | null;
  updated_at: Date;
  custom_fields?: Record<string, JsonValue> | null; // Strongly typed JSON field
};

/**
 * Helper function to safely deserialize contact info from database JSON
 * @param json The JSON value from the database
 * @returns Typed contact info object or null
 */
function deserializeContactInfo(json: unknown | null | undefined): JsonValue | null {
    if (!json) return null;
    
    try {
        // Handle string JSON
        if (typeof json === 'string') {
            return JSON.parse(json) as JsonValue;
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
        // Log the input for debugging
        console.log('[deserializeCustomFields] Input type:', typeof json);
        console.log('[deserializeCustomFields] Input value:', JSON.stringify(json, null, 2));
        
        // Handle string JSON
        if (typeof json === 'string') {
            try {
                const parsed = JSON.parse(json) as Record<string, JsonValue>;
                console.log('[deserializeCustomFields] Parsed from string:', parsed);
                
                // Process the parsed object to extract values from JSONB format
                const processedFields: Record<string, JsonValue> = {};
                for (const [key, value] of Object.entries(parsed)) {
                    if (value !== null && typeof value === 'object' && 'value' in value) {
                        processedFields[key] = (value as any).value;
                    } else {
                        processedFields[key] = value;
                    }
                }
                
                return processedFields;
            } catch (parseError) {
                console.error('[deserializeCustomFields] Error parsing JSON string:', parseError);
                return {}; // Return empty object instead of null for better UX
            }
        }
        
        // Already an object - handle PostgreSQL JSONB objects
        if (typeof json === 'object') {
            // PostgreSQL JSONB often returns objects with values that are themselves JSONB
            // We need to process these nested values
            const result: Record<string, JsonValue> = {};
            
            // Process each key-value pair
            for (const [key, value] of Object.entries(json as object)) {
                // If the value is a JSONB object with a 'value' property, extract it
                if (value !== null && typeof value === 'object') {
                    if ('value' in value) {
                        // Extract the actual value from the JSONB wrapper
                        result[key] = (value as any).value;
                    } else {
                        // For nested objects without a 'value' property
                        result[key] = value as JsonValue;
                    }
                } else {
                    result[key] = value as JsonValue;
                }
            }
            
            console.log('[deserializeCustomFields] Processed object:', JSON.stringify(result, null, 2));
            return result;
        }
        
        // Default case
        console.log('[deserializeCustomFields] Returning empty object (default case)');
        return {}; // Return empty object instead of null for better UX
    } catch (error) {
        console.error('[deserializeCustomFields] Error deserializing custom fields:', error);
        return {}; // Return empty object instead of null for better UX
    }
}

/**
 * Normalize manufacturer data from database result
 * Converts snake_case DB fields to camelCase for the application
 * Uses type-safe JSON handling
 * 
 * @param row - Database row data
 * @returns Normalized manufacturer object with both camelCase and snake_case properties
 */
function normalizeManufacturer(row: DbRow): ManufacturerWithId {
    // Convert contact_info to a proper object if it's a string or null
    const contactInfo = deserializeContactInfo(row.contact_info);
    
    // Handle custom fields (may be JSON, JSONB, string, or null)
    // This now handles the direct custom_fields column from the Manufacturer table
    const customFields = deserializeCustomFields(row.custom_fields);
    
    console.log(`Normalizing manufacturer [${row.manufacturer_id}] custom fields:`, 
        row.custom_fields ? JSON.stringify(row.custom_fields) : 'null/undefined');
    
    // Create a normalized manufacturer object with both snake_case and camelCase properties
    const manufacturer: ManufacturerWithId = {
        // Core ID field
        id: row.manufacturer_id as string,
        manufacturer_id: row.manufacturer_id as string,
        
        // Name and description
        name: row.manufacturer_name as string,
        manufacturer_name: row.manufacturer_name as string,
        description: row.manufacturer_description as string || undefined,
        manufacturer_description: row.manufacturer_description as string || null,
        
        // URLs
        websiteUrl: row.website_url as string || undefined,
        website_url: row.website_url as string || null,
        logoUrl: row.logo_url as string || undefined,
        logo_url: row.logo_url as string || null,
        
        // Complex data
        contactInfo: contactInfo,
        contact_info: contactInfo,
        customFields: customFields,
        custom_fields: customFields,
        
        // Metadata
        createdBy: row.created_by as string,
        created_by: row.created_by as string,
        createdAt: row.created_at as Date,
        created_at: row.created_at as Date,
        updatedBy: row.updated_by as string || undefined,
        updated_by: row.updated_by as string || null,
        updatedAt: row.updated_at as Date,
        updated_at: row.updated_at as Date
    };
    
    return manufacturer;
}

/**
 * Convert ManufacturerWithId to schema-compatible Manufacturer
 * This function handles type compatibility between our extended interface and the schema type
 * 
 * @param mfg - The extended manufacturer object
 * @returns A schema-compatible manufacturer object
 */
function toSchemaManufacturer(mfg: ManufacturerWithId): Manufacturer {
    // Create a schema-compatible manufacturer object
    return {
        manufacturer_id: mfg.manufacturer_id,
        manufacturer_name: mfg.manufacturer_name,
        manufacturer_description: mfg.manufacturer_description !== null ? mfg.manufacturer_description : undefined,
        website_url: mfg.website_url !== null ? mfg.website_url : undefined,
        contact_info: mfg.contact_info !== null ? mfg.contact_info : undefined,
        logo_url: mfg.logo_url !== null ? mfg.logo_url : undefined,
        created_by: mfg.created_by,
        created_at: mfg.created_at,
        updated_by: mfg.updated_by !== null ? mfg.updated_by : undefined,
        updated_at: mfg.updated_at,
        custom_fields: mfg.custom_fields !== null ? mfg.custom_fields : undefined
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

        // Generate a new UUID for the manufacturer
        const newManufacturerId = crypto.randomUUID();
        // Use porsager/postgres template literals with proper table name quoting
        const result = await sql`
            INSERT INTO "Manufacturer" (
                manufacturer_id,
                manufacturer_name, 
                manufacturer_description, 
                website_url, 
                logo_url, 
                contact_info,
                created_by,
                created_at, 
                updated_at, 
                updated_by
            )
            VALUES (
                ${newManufacturerId},
                ${params.name},
                ${params.description || null},
                ${params.websiteUrl || null},
                ${params.logoUrl || null},
                ${params.contactInfo ? sql.json(params.contactInfo) : null},
                ${params.createdBy},
                NOW()::timestamptz,
                NOW()::timestamptz,
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error(MANUFACTURER_ERRORS.CREATE_FAILED);
        }

        const manufacturer = normalizeManufacturer(result[0]);
        return toSchemaManufacturer(manufacturer);
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
export async function getManufacturerById(manufacturerId: string): Promise<Manufacturer | null> {
    try {
        // Query with properly quoted table names and field names
        const result = await sql`
            SELECT m.*
            FROM "Manufacturer" m
            WHERE m.manufacturer_id = ${manufacturerId}
        `;
        
        // Return normalized result or null if not found
        if (result.length > 0) {
            // Log the raw result for debugging
            console.log('Raw manufacturer result:', JSON.stringify(result[0], null, 2));
            
            // Normalize the manufacturer data
            const manufacturer = normalizeManufacturer(result[0]);
            
            // Load custom fields from the database
            manufacturer.custom_fields = await getManufacturerCustomFields(manufacturerId);
            
            // Convert to schema-compatible format
            const schemaManufacturer = toSchemaManufacturer(manufacturer);
            
            // Log the final manufacturer object
            console.log('Manufacturer by ID:', 
                schemaManufacturer.manufacturer_name, 
                '- custom fields loaded from database');
            
            return schemaManufacturer;
        } else {
            console.log(`No manufacturer found with ID ${manufacturerId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching manufacturer with ID ${manufacturerId}:`, error);
        throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * List all manufacturers with their custom fields
 * @param options - Optional parameters for filtering and pagination
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
        // Note: According to the database schema, custom_fields are not stored in a separate table
        // or as a column in the Manufacturer table.
        let query = sql`
            SELECT m.*
            FROM "Manufacturer" m
            WHERE 1=1
        `;
        
        // Add conditional filters if provided
        if (options?.nameFilter) {
            query = sql`${query} AND m.manufacturer_name ILIKE ${`%${options.nameFilter}%`}`;
        }
        
        if (options?.userId) {
            query = sql`${query} AND m.created_by = ${options.userId}`;
        }
        
        // Add sorting
        query = sql`${query} ORDER BY m.manufacturer_name ASC`;
        
        // Add pagination if specified
        if (options?.limit) {
            query = sql`${query} LIMIT ${options.limit}`;
            
            if (options?.offset) {
                query = sql`${query} OFFSET ${options.offset}`;
            }
        }
        
        const result = await query;
        console.log(`Found ${result.length} manufacturers matching criteria`);
        
        // For each manufacturer, initialize with empty custom fields
        // Process each manufacturer and add custom fields
        const manufacturers = [];
        for (const row of result) {
            const normalizedMfg = normalizeManufacturer(row);
            
            // Load custom fields from the database for this manufacturer
            normalizedMfg.custom_fields = await getManufacturerCustomFields(row.manufacturer_id);
            
            manufacturers.push(normalizedMfg);
        }
        
        // Log the first manufacturer for debugging
        if (manufacturers.length > 0) {
            console.log(`First manufacturer (${manufacturers[0].manufacturer_name}) details:`, 
                JSON.stringify(manufacturers[0], null, 2));
        }
        
        // Convert to schema-compatible format
        return manufacturers.map(mfg => toSchemaManufacturer(mfg));
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
        console.log(`Fetching custom fields for manufacturer ${manufacturerId}`);
        const result = await sql`
            SELECT cf.field_name, mcf.custom_field_value
            FROM "ManufacturerCustomField" mcf
            JOIN "CustomField" cf ON mcf.field_id = cf.custom_field_id
            WHERE mcf.manufacturer_id = ${manufacturerId}
        `;
        
        console.log(`Found ${result.length} custom fields for manufacturer ${manufacturerId}`);
        
        // Build the custom fields object
        const customFields: Record<string, JsonValue> = {};
        for (const row of result) {
            customFields[row.field_name] = row.custom_field_value;
            console.log(`- Custom field: ${row.field_name} = ${JSON.stringify(row.custom_field_value)}`);
        }
        
        return customFields;
    } catch (error) {
        console.error(`Error fetching custom fields for manufacturer ${manufacturerId}:`, error);
        // Return empty object on error to prevent app crashes
        return {};
    }
}


/**
 * Update an existing manufacturer
 * @param manufacturerId - ID of the manufacturer to update
 * @param params - Manufacturer data for update
 * @returns The updated manufacturer with normalized structure
 */
export async function updateManufacturer(manufacturerId: string, params: {
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
    contactInfo?: Record<string, JsonValue>;
    updatedBy: string;
}): Promise<Manufacturer> {
    try {
        // First verify that the manufacturer exists
        const manufacturer = await getManufacturerById(manufacturerId);
        if (!manufacturer) {
            throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
        }
        
        // Update the manufacturer data
        const result = await sql`
            UPDATE "Manufacturer"
            SET 
                manufacturer_name = ${params.name},
                manufacturer_description = ${params.description || null},
                website_url = ${params.websiteUrl || null},
                logo_url = ${params.logoUrl || null},
                contact_info = ${params.contactInfo ? sql.json(params.contactInfo) : null},
                updated_by = ${params.updatedBy},
                updated_at = NOW()::timestamptz
            WHERE manufacturer_id = ${manufacturerId}
            RETURNING *
        `;
        
        if (result.length === 0) {
            throw new Error(MANUFACTURER_ERRORS.NOT_FOUND_AFTER_UPDATE);
        }
        
        const updatedManufacturer = normalizeManufacturer(result[0]);
        return toSchemaManufacturer(updatedManufacturer);
    } catch (error) {
        // Type guard for postgres error with code property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const pgError = error as { code: string; message: string };
            
            // Handle duplicate key violation
            if (pgError.code === '23505') {
                throw new Error(`${MANUFACTURER_ERRORS.NAME_EXISTS}: "${params.name}"`);
            }
        }
        
        // Re-throw specific errors we recognize
        if (error instanceof Error && 
            (error.message.includes(MANUFACTURER_ERRORS.NOT_FOUND) || 
             error.message.includes(MANUFACTURER_ERRORS.NOT_FOUND_AFTER_UPDATE))) {
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
 * Update manufacturer custom fields
 * @param manufacturerId - Manufacturer UUID
 * @param customFields - Object containing custom field name/value pairs
 * @returns Updated manufacturer with custom fields
 */
export async function updateManufacturerCustomFields(
    manufacturerId: string, 
    customFields: Record<string, JsonValue>
): Promise<Manufacturer | null> {
    try {
        // First verify that the manufacturer exists
        const manufacturer = await getManufacturerById(manufacturerId);
        if (!manufacturer) {
            throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
        }
        
        console.log('Updating custom fields for manufacturer:', manufacturerId);
        console.log('Custom fields to update:', JSON.stringify(customFields, null, 2));
        
        // Start a transaction to ensure atomicity
        await sql.begin(async (sql) => {
            // Delete existing custom fields
            await sql`
                DELETE FROM "ManufacturerCustomField"
                WHERE manufacturer_id = ${manufacturerId}
            `;
            
            // Skip further processing if no custom fields to add
            if (Object.keys(customFields).length === 0) {
                console.log('No custom fields to add, skipping insertion');
                return;
            }
            
            // Insert new custom fields
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Determine data type based on the value
                let dataType = 'text'; // Default to text
                if (typeof fieldValue === 'number') dataType = 'number';
                else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                else if (fieldValue instanceof Date) dataType = 'date';
                
                console.log(`Processing field: ${fieldName}, type: ${dataType}, value:`, fieldValue);
                
                // First, get or create the custom field definition
                let customFieldResult = await sql`
                    SELECT custom_field_id 
                    FROM "CustomField" 
                    WHERE field_name = ${fieldName} 
                    AND applies_to = 'manufacturer'
                `;
                
                let fieldId;
                if (customFieldResult.length === 0) {
                    // Create the custom field definition
                    console.log(`Creating new custom field: ${fieldName}, type: ${dataType}`);
                    const newFieldResult = await sql`
                        INSERT INTO "CustomField" (
                            field_name,
                            data_type,
                            applies_to
                        ) VALUES (
                            ${fieldName},
                            ${dataType},
                            ${'manufacturer'}
                        )
                        RETURNING custom_field_id
                    `;
                    
                    if (newFieldResult.length === 0) {
                        throw new Error(`Failed to create custom field ${fieldName}`);
                    }
                    
                    fieldId = newFieldResult[0].custom_field_id;
                } else {
                    fieldId = customFieldResult[0].custom_field_id;
                }
                
                // Now insert the manufacturer custom field value
                console.log(`Adding custom field ${fieldName} to manufacturer ${manufacturerId}`);
                await sql`
                    INSERT INTO "ManufacturerCustomField" (
                        manufacturer_id,
                        field_id,
                        custom_field_value
                    ) VALUES (
                        ${manufacturerId},
                        ${fieldId},
                        ${sql.json(fieldValue)}
                    )
                `;
            }
        });
        
        // Return the updated manufacturer with custom fields
        return await getManufacturerById(manufacturerId);
    } catch (error) {
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
                // Process each custom field
                for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                    // Determine data type based on the value
                    let dataType = 'text'; // Default to text
                    if (typeof fieldValue === 'number') dataType = 'number';
                    else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                    else if (fieldValue instanceof Date) dataType = 'date';
                    
                    // First, get or create the custom field definition
                    let customFieldResult = await sql`
                        SELECT custom_field_id 
                        FROM "CustomField" 
                        WHERE field_name = ${fieldName} 
                        AND applies_to = 'manufacturer'
                    `;
                    
                    let fieldId;
                    if (customFieldResult.length === 0) {
                        // Create a new custom field definition
                        const newCustomFieldResult = await sql`
                            INSERT INTO "CustomField" (field_name, data_type, applies_to)
                            VALUES (${fieldName}, ${dataType}, 'manufacturer')
                            RETURNING custom_field_id
                        `;
                        fieldId = newCustomFieldResult[0].custom_field_id;
                    } else {
                        fieldId = customFieldResult[0].custom_field_id;
                    }
                    
                    // Now insert the custom field value
                    // Make sure we're using the correct format for JSONB values
                    console.log(`Creating custom field: ${fieldName} with value:`, fieldValue);
                    
                    // For primitive values, wrap them in an object with a 'value' property
                    // This ensures consistent extraction later
                    const jsonValue = typeof fieldValue === 'object' && fieldValue !== null
                        ? fieldValue
                        : { value: fieldValue };
                    
                    console.log(`Formatted JSONB value:`, jsonValue);
                    
                    await sql`
                        INSERT INTO "ManufacturerCustomField" (manufacturer_id, field_id, custom_field_value)
                        VALUES (
                            ${manufacturer.manufacturer_id}, 
                            ${fieldId},
                            ${sql.json(jsonValue)}
                        )
                    `;
                }
            }
            
            // Return the manufacturer with custom fields
            return await getManufacturerById(manufacturer.manufacturer_id) || manufacturer;
        });
    } catch (error) {
        console.error('Error creating manufacturer with custom fields:', error);
        throw new Error(`Error creating manufacturer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete a manufacturer and its associated custom fields
 * @param id - Manufacturer UUID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws Error if manufacturer doesn't exist, is referenced by parts, or another error occurs
 */
export async function deleteManufacturer(id: string): Promise<void> {
    // Validate input
    if (!id || typeof id !== 'string') {
        throw new Error(`${MANUFACTURER_ERRORS.VALIDATION_ERROR}: Invalid manufacturer ID`);
    }

    // Use a transaction to ensure all operations succeed or fail together
    return await sql.begin(async sql => {
        try {
            // First check that the manufacturer exists
            const manufacturer = await sql`
                SELECT manufacturer_id FROM "Manufacturer" WHERE manufacturer_id = ${id}
            `;
            
            if (manufacturer.length === 0 || !manufacturer[0].manufacturer_id) {
                throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
            }
            
            // Check if the manufacturer is referenced by any parts
            const partRefs = await sql`
                SELECT COUNT(*) FROM "ManufacturerPart" 
                WHERE manufacturer_id = ${id}
            `;
            
            if (parseInt(partRefs[0].count as string, 10) > 0) {
                throw new Error(MANUFACTURER_ERRORS.REFERENCED_BY_PARTS);
            }
            
            // Delete custom fields first (if any)
            await sql`DELETE FROM "ManufacturerCustomField" WHERE manufacturer_id = ${id}`;
            
            // Then delete the manufacturer
            const result = await sql`DELETE FROM "Manufacturer" WHERE manufacturer_id = ${id}`;
            
            // Verify deletion was successful
            if (result.count === 0) {
                throw new Error(MANUFACTURER_ERRORS.NOT_FOUND);
            }
            
            // If we get here, all operations succeeded
            return;
        } catch (error) {
            // Log the specific error for debugging
            console.error(`Error deleting manufacturer ${id}:`, error);
            
            // Re-throw with more specific error message
            if (error instanceof Error) {
                // Pass through specific error messages
                throw error;
            } else {
                // Generic error
                throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: Unable to delete manufacturer`);
            }
        }
    });
}

/**
 * List all manufacturers created by a specific user
 * @param userId - The user ID to filter by
 * @returns Array of manufacturer objects with normalized structure
 */
export async function listManufacturersByUser(userId: string): Promise<Manufacturer[]> {
    return listManufacturers({ userId });
}

/**
 * Get all manufacturer IDs created by a specific user
 * @param userId - The user ID to filter by
 * @returns Array of manufacturer IDs
 */
export async function getManufacturerIdsByUser(userId: string): Promise<string[]> {
    try {
        const result = await sql`
            SELECT manufacturer_id
            FROM "Manufacturer"
            WHERE created_by = ${userId}
            ORDER BY manufacturer_name ASC
        `;
        
        return result.map(row => row.manufacturer_id);
    } catch (error) {
        console.error('Error getting manufacturer IDs by user:', error);
        throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}