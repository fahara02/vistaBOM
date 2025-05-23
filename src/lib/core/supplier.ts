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
 * Error messages for supplier operations
 */
const SUPPLIER_ERRORS = {
    CREATE_FAILED: 'Failed to create supplier',
    DUPLICATE_NAME:'Supplier with same name already exisit',
    NAME_EXISTS: 'Supplier name already exists',
    NOT_FOUND: 'Supplier not found',
    NOT_FOUND_AFTER_UPDATE: 'Supplier not found after update',
    DELETE_REFERENCED: 'Supplier cannot be deleted as it is referenced by existing parts',
    VALIDATION_ERROR: 'Invalid supplier data',
    REFERENCED_BY_PARTS: 'supplier cannot be deleted as it is referenced by existing parts',
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
 * Extended Supplier interface for internal use with both camelCase and snake_case properties
 * This provides backwards compatibility with existing code while maintaining type safety
 */
interface SupplierWithId {
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
    
    // Database column names (snake_case) with precise null handling
    supplier_id: string;
    supplier_name: string;
    supplier_description?: string | null;
    website_url?: string | null;
    contact_info?: JsonValue | null;
    logo_url?: string | null;
    created_by: string;
    created_at: Date;
    updated_by?: string | null;
    updated_at: Date;
    custom_fields?: Record<string, JsonValue> | null; // Strongly typed JSON field
}







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
 * @param sup - The extended supplier object
 * @returns A schema-compatible supplier object
 */
function toSchemaSupplier(sup: SupplierWithId): Supplier {
    // Create a schema-compatible supplier object
    return {
        supplier_id: sup.supplier_id,
        supplier_name: sup.supplier_name,
        supplier_description: sup.supplier_description !== null ? sup.supplier_description : undefined,
        website_url: sup.website_url !== null ? sup.website_url : undefined,
        contact_info: sup.contact_info !== null ? sup.contact_info : undefined,
        logo_url: sup.logo_url !== null ? sup.logo_url : undefined,
        created_by:sup.created_by,
        created_at: sup.created_at,
        updated_by: sup.updated_by !== null ? sup.updated_by : undefined,
        updated_at: sup.updated_at,
        custom_fields: sup.custom_fields !== null ? sup.custom_fields : undefined
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
 * @param params - Supplier data for creation
 * @returns The created supplier with normalized structure
 */
export async function createSupplier(params: {
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
    contactInfo?: Record<string, JsonValue>;
    createdBy: string;
}): Promise<Supplier> {
    try {

        // Generate a new UUID for the supplier
        const newSupplierId = crypto.randomUUID();
        // Use porsager/postgres template literals with proper table name quoting
        const result = await sql`
            INSERT INTO "Supplier" (
                supplier_id,
                supplier_name, 
                supplier_description, 
                website_url, 
                logo_url, 
                contact_info,
                created_by,
                created_at, 
                updated_at, 
                updated_by
            )
            VALUES (
                ${newSupplierId},
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
            throw new Error(SUPPLIER_ERRORS.CREATE_FAILED);
        }

        const supplier = normalizeSupplier(result[0]);
        return toSchemaSupplier(supplier);
    } catch (error) {
        // Type guard for postgres error with code property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const pgError = error as { code: string; message: string };
            
            // Handle duplicate key violation
            if (pgError.code === '23505') {
                throw new Error(`${SUPPLIER_ERRORS.NAME_EXISTS}: "${params.name}"`);
            }
        }
        
        // Generic error with original message
        if (error instanceof Error) {
            throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error.message}`);
        }
        
        // Fallback for unknown error types
        throw new Error(SUPPLIER_ERRORS.GENERAL_ERROR);
    }
}

/**
 * Get a supplier by ID
 * @param id - Supplier UUID
 * @returns Supplier data with custom fields or null if not found
 */
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
    try {
        // Query with properly quoted table names and field names
        const result = await sql`
            SELECT s.*
            FROM "Supplier" s
            WHERE s.supplier_id = ${supplierId}
        `;
        
        // Return normalized result or null if not found
        if (result.length > 0) {
            // Log the raw result for debugging
            console.log('Raw supplier result:', JSON.stringify(result[0], null, 2));
            
            // Normalize the supplier data
            const supplier = normalizeSupplier(result[0]);
            
            // Load custom fields from the database
            supplier.custom_fields = await getSupplierCustomFields(supplierId);
            
            // Convert to schema-compatible format
            const schemaSupplier = toSchemaSupplier(supplier);
            
            // Log the final supplier object
            console.log('Supplier by ID:', 
                schemaSupplier.supplier_name, 
                '- custom fields loaded from database');
            
            return schemaSupplier;
        } else {
            console.log(`No supplier found with ID ${supplierId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching supplier with ID ${supplierId}:`, error);
        throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            SELECT s.*
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
        console.log(`Found ${result.length} suppliers matching criteria`);
        
        // Process each supplier and add custom fields
        const suppliers = [];
        for (const row of result) {
            const normalizedSupplier = normalizeSupplier(row);
            
            // Load custom fields from the database for this supplier
            const customFields = await getSupplierCustomFields(row.supplier_id);
            
            // Set both properties to ensure consistency
            normalizedSupplier.customFields = customFields;
            normalizedSupplier.custom_fields = customFields;
            
            suppliers.push(normalizedSupplier);
        }
        
        // Log the first supplier for debugging
        if (suppliers.length > 0) {
            console.log(`First supplier (${suppliers[0].supplier_name}) details:`, 
                JSON.stringify(suppliers[0], null, 2));
        }

        // Convert to schema-compatible type
        return suppliers.map((supplier: SupplierWithId) => toSchemaSupplier(supplier));
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
        console.log(`Fetching custom fields for supplier ${supplierId}`);
        const result = await sql`
            SELECT cf.field_name, scf.custom_field_value
            FROM "SupplierCustomField" scf
            JOIN "CustomField" cf ON scf.field_id = cf.custom_field_id
            WHERE scf.supplier_id = ${supplierId}
        `;
        
        console.log(`Found ${result.length} custom fields for supplier ${supplierId}`);
        
        // Build the custom fields object
        const customFields: Record<string, JsonValue> = {};
        for (const row of result) {
            customFields[row.field_name] = row.custom_field_value;
            console.log(`- Custom field: ${row.field_name} = ${JSON.stringify(row.custom_field_value)}`);
        }
        
        return customFields;
    } catch (error) {
        console.error(`Error fetching custom fields for supplier ${supplierId}:`, error);
        // Return empty object on error to prevent app crashes
        return {};
    }
}

/**
 * Update an existing supplier
 * @param id - Supplier UUID
 * @param params - Fields to update
 * @param userId - ID of user making the update
 * @returns Updated supplier with normalized structure
 */
export async function updateSupplier(supplierId: string, params: {
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
    contactInfo?: Record<string, JsonValue>;
    updatedBy: string;
}): Promise<Supplier> {
    try {
        // First verify that the supplier exists
        const supplier = await getSupplierById(supplierId);
        if (!supplier) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }
        
        // Update the supplier data
        const result = await sql`
            UPDATE "Supplier"
            SET 
                supplier_name = ${params.name},
                supplier_description = ${params.description || null},
                website_url = ${params.websiteUrl || null},
                logo_url = ${params.logoUrl || null},
                contact_info = ${params.contactInfo ? sql.json(params.contactInfo) : null},
                updated_by = ${params.updatedBy},
                updated_at = NOW()::timestamptz
            WHERE supplier_id = ${supplierId}
            RETURNING *
        `;
        
        if (result.length === 0) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND_AFTER_UPDATE);
        }
        
        const updatedSupplier = normalizeSupplier(result[0]);
        return toSchemaSupplier(updatedSupplier);
    } catch (error) {
        // Type guard for postgres error with code property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const pgError = error as { code: string; message: string };
            
            // Handle duplicate key violation
            if (pgError.code === '23505') {
                throw new Error(`${SUPPLIER_ERRORS.NAME_EXISTS}: "${params.name}"`);
            }
        }
        
        // Re-throw specific errors we recognize
        if (error instanceof Error && 
            (error.message.includes(SUPPLIER_ERRORS.NOT_FOUND) || 
             error.message.includes(SUPPLIER_ERRORS.NOT_FOUND_AFTER_UPDATE))) {
            throw error;
        }
        
        // Generic error with original message
        if (error instanceof Error) {
            throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error.message}`);
        }
        
        // Fallback for unknown error types
        throw new Error(SUPPLIER_ERRORS.GENERAL_ERROR);
    }
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
 * Update supplier custom fields
 * @param supplierId - Supplier UUID
 * @param customFields - Object containing custom field name/value pairs
 * @returns Updated supplier with custom fields
 */
export async function updateSupplierCustomFields(
    supplierId: string, 
    customFields: Record<string, JsonValue>
): Promise<Supplier | null> {
    try {
        // First verify that the supplier exists
        const supplier = await getSupplierById(supplierId);
        if (!supplier) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }
        
        console.log('Updating custom fields for supplier:', supplierId);
        console.log('Custom fields to update:', JSON.stringify(customFields, null, 2));
        
        // Start a transaction to ensure atomicity
        await sql.begin(async (sql) => {
            // Delete existing custom fields
            await sql`
                DELETE FROM "SupplierCustomField"
                WHERE supplier_id = ${supplierId}
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
                    AND applies_to = 'supplier'
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
                            ${'supplier'}
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
                
                // Now insert the supplier custom field value
                console.log(`Adding custom field ${fieldName} to supplier ${supplierId}`);
                await sql`
                    INSERT INTO "SupplierCustomField" (
                        supplier_id,
                        field_id,
                        custom_field_value
                    ) VALUES (
                        ${supplierId},
                        ${fieldId},
                        ${sql.json(fieldValue)}
                    )
                `;
            }
        });
        
        // Return the updated supplier with custom fields
        return await getSupplierById(supplierId);
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
            // Create the supplier first
            const supplier= await createSupplier({
                name: data.supplier_name,
                description: data.supplier_description || undefined,
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
                        AND applies_to = 'supplier'
                    `;
                    
                    let fieldId;
                    if (customFieldResult.length === 0) {
                        // Create a new custom field definition
                        const newCustomFieldResult = await sql`
                            INSERT INTO "CustomField" (field_name, data_type, applies_to)
                            VALUES (${fieldName}, ${dataType}, 'supplier')
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
                        INSERT INTO "SupplierCustomField" (supplier_id, field_id, custom_field_value)
                        VALUES (
                            ${supplier.supplier_id}, 
                            ${fieldId},
                            ${sql.json(jsonValue)}
                        )
                    `;
                }
            }
            
            // Return the supplier with custom fields
            return await getSupplierById(supplier.supplier_id) || supplier;
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