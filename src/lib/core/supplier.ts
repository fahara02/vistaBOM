/**
 * Core functionality for supplier management
 */
import sql from '$lib/server/db';
import crypto from 'crypto';
// Import schema-defined types for type safety
import type { SupplierFormData } from '$lib/types/formTypes';
import type { JsonValue, Supplier } from '$lib/types/schemaTypes';

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
 * Convert SupplierWithId to schema-compatible Supplier
 * This function handles type compatibility between our extended interface and the schema type
 * 
 * @param supplier - The extended supplier object or a partial supplier object
 * @returns A schema-compatible supplier object
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
        id: row.id as string, // Database ID for internal use
        supplier_id: row.id as string, // Match with SupplierFormData
        name: row.name as string,
        supplier_name: row.name as string, // Match with SupplierFormData
        description: row.description as string | undefined,
        supplier_description: row.description as string | undefined, // Match with SupplierFormData
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
 * Create a new supplier
 * @param params - Parameters for creating a supplier
 * @returns The created supplier with normalized structure
 */
export async function createSupplier(
    params: {
        name: string;
        description?: string;
        websiteUrl?: string;
        contactInfo?: Record<string, JsonValue>;
        logoUrl?: string;
        createdBy: string;
    }
): Promise<Supplier> {
    try {
        // Validate input
        if (!params.name?.trim()) {
            throw new Error(SUPPLIER_ERRORS.VALIDATION_ERROR + ': Name is required');
        }

        // Use porsager/postgres template literals
        const result = await sql`
            INSERT INTO "Supplier" (
                name, 
                description, 
                website_url, 
                contact_info, 
                logo_url, 
                created_by
            )
            VALUES (
                ${params.name},
                ${params.description || null},
                ${params.websiteUrl || null},
                ${params.contactInfo ? sql.json(params.contactInfo) : null},
                ${params.logoUrl || null},
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error(SUPPLIER_ERRORS.GENERAL_ERROR + ': Failed to create supplier');
        }

        const supplier = normalizeSupplier(result[0]);
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
}

/**
 * Get a supplier by ID with custom fields
 * @param id - Supplier UUID
 * @returns The supplier with normalized structure or null if not found
 */
export async function getSupplier(id: string): Promise<Supplier | null> {
    try {
        const result = await sql`
            SELECT 
                s.*,
                COALESCE(
                    (SELECT json_object_agg(cf.field_name, scf.value)
                     FROM "SupplierCustomField" scf
                     JOIN "CustomField" cf ON scf.field_id = cf.field_id
                     WHERE scf.supplier_id = s.supplier_id
                    ), '{}'::json) AS custom_fields
            FROM "Supplier" s
            WHERE s.supplier_id = ${id}
        `;
        if (result.length > 0) {
            const supplier = normalizeSupplier(result[0]);
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
        name?: string;
        description?: string;
        websiteUrl?: string;
        contactInfo?: Record<string, JsonValue>;
        logoUrl?: string;
        updatedBy: string;
    }
): Promise<Supplier | null> {
    // First check that the supplier exists
    const existing = await getSupplier(id);
    if (!existing) {
        throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
    }

    // Return early if no updates
    if (Object.keys(params).length === 0) {
        return await getSupplier(id);
    }
    
    try {
        // Build the SET parts of the query using a safer approach with sql fragments
        let query = sql`UPDATE "Supplier" SET updated_by = ${params.updatedBy}, updated_at = NOW()`;
        
        // Conditionally add each field to update
        if (params.name !== undefined) {
            query = sql`${query}, name = ${params.name}`;
        }
        
        if (params.description !== undefined) {
            query = sql`${query}, description = ${params.description}`;
        }
        
        if (params.websiteUrl !== undefined) {
            query = sql`${query}, website_url = ${params.websiteUrl}`;
        }
        
        if (params.contactInfo !== undefined) {
            query = sql`${query}, contact_info = ${params.contactInfo ? sql.json(params.contactInfo) : null}`;
        }
        
        if (params.logoUrl !== undefined) {
            query = sql`${query}, logo_url = ${params.logoUrl}`;
        }
        
        // Complete the query
        query = sql`${query} WHERE id = ${id} RETURNING *`;
        
        // Execute the query
        const result = await query;
        
        if (result.length === 0) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }
        
        // Get updated supplier with custom fields
        const updated = await getSupplier(id);
        if (!updated) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }
        return updated;
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23505') {
                throw new Error(SUPPLIER_ERRORS.DUPLICATE_NAME);
            }
            if (error.message.includes(SUPPLIER_ERRORS.NOT_FOUND)) {
                throw error; // Re-throw not found errors as is
            }
        }
        
        // Generic error with original message
        console.error(`Error updating supplier ${id}:`, error);
        throw new Error(`${SUPPLIER_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete a supplier by ID
 * @param id - Supplier UUID
 * @throws Error if supplier doesn't exist or is referenced by parts
 */
export async function deleteSupplier(id: string): Promise<void> {
    try {
        // First check that the supplier exists
        const supplier = await getSupplier(id);
        if (!supplier || !supplier.supplier_id) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }

        // Attempt to delete
        const result = await sql`DELETE FROM "Supplier" WHERE id = ${id}`;
        
        // Verify deletion was successful
        if (result.count === 0) {
            throw new Error(SUPPLIER_ERRORS.NOT_FOUND);
        }
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23503') {
                throw new Error(SUPPLIER_ERRORS.REFERENCED_BY_PARTS);
            }
            if (error.message.includes(SUPPLIER_ERRORS.NOT_FOUND)) {
                throw error; // Re-throw not found errors as is
            }
        }
        
        // Generic error with original message
        console.error(`Error deleting supplier ${id}:`, error);
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

// Ensure we have valid suppliers with required fields
const validSuppliers = result.map(row => {
    const supplier = normalizeSupplier(row);
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
        const result = await sql`
            SELECT cf.field_name, scf.custom_field_value
            FROM "SupplierCustomField" scf
            JOIN "CustomField" cf ON scf.field_id = cf.custom_field_id
            WHERE scf.supplier_id = ${supplierId}
        `;
        
        // Build the custom fields object
        const customFields: Record<string, JsonValue> = {};
        for (const row of result) {
            customFields[row.field_name as string] = row.value as JsonValue;
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
        const supplier = await getSupplier(supplierId);
        if (!supplier || !supplier.supplier_id) {
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
        
        // Return the updated supplier with custom fields
        return await getSupplier(supplierId);
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
                name: data.supplier_name,
                description: data.supplier_description || undefined,
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