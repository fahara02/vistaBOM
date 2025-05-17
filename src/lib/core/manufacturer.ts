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
 * Normalize manufacturer data from database result
 * Converts snake_case DB fields to camelCase for the application
 * Uses type-safe JSON handling
 * 
 * @param row - Database row data
 * @returns Normalized manufacturer object with both camelCase and snake_case properties
 */
function normalizeManufacturer(row: DbRow): ManufacturerWithId {
    // Process JSON fields with type safety
    const contactInfo = deserializeContactInfo(row.contact_info);
    const customFields = deserializeCustomFields(row.custom_fields);
    
    // Ensure dates are properly converted to Date objects
    const createdAt = row.created_at instanceof Date ? 
        row.created_at : new Date(row.created_at as string);
    
    const updatedAt = row.updated_at instanceof Date ? 
        row.updated_at : new Date(row.updated_at as string);

    // Create and return a normalized manufacturer object
    const manufacturer: ManufacturerWithId = {
        // Standard API properties (camelCase)
        id: row.manufacturer_id as string,
        name: row.manufacturer_name as string,
        description: (row.manufacturer_description as string) || undefined,
        websiteUrl: (row.website_url as string) || undefined,
        contactInfo,
        logoUrl: (row.logo_url as string) || undefined,
        createdBy: row.created_by as string,
        createdAt,
        updatedBy: (row.updated_by as string) || undefined,
        updatedAt,
        customFields,
        
        // Database column names (snake_case) with proper typing
        manufacturer_id: row.manufacturer_id as string,
        manufacturer_name: row.manufacturer_name as string,
        manufacturer_description: (row.manufacturer_description as string) || null,
        website_url: (row.website_url as string) || null,
        contact_info: contactInfo,
        logo_url: (row.logo_url as string) || null,
        created_by: row.created_by as string,
        created_at: createdAt,
        updated_by: (row.updated_by as string) || null,
        updated_at: updatedAt,
        custom_fields: customFields
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
            SELECT 
                m.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, mcf.value)
                    FROM "ManufacturerCustomField" mcf
                    JOIN "CustomField" cf ON mcf.field_id = cf.id
                    WHERE mcf.manufacturer_id = m.id
                    ), '{}'::json) AS custom_fields
            FROM "Manufacturer" m
            WHERE m.id = ${manufacturerId}
        `;
        
        // Return normalized result or null if not found
        if (result.length > 0) {
            const manufacturer = normalizeManufacturer(result[0]);
            return toSchemaManufacturer(manufacturer);
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching manufacturer with ID ${manufacturerId}:`, error);
        throw new Error(`${MANUFACTURER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const manufacturers = result.map(row => normalizeManufacturer(row));
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
 * @returns Updated manufacturer with custom fields
 * @throws Error if manufacturer doesn't exist or another error occurs
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
        
        // Return the updated manufacturer with custom fields
        return await getManufacturerById(manufacturerId);
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
                await updateManufacturerCustomFields(manufacturer.manufacturer_id, customFields);
            }
            
            // Return the manufacturer with custom fields
            return manufacturer;
        });
    } catch (error) {
        console.error('Error creating manufacturer with custom fields:', error);
        throw new Error(`Error creating manufacturer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}