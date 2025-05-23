/**
 * Core functionality for category management
 */
import sql from '$lib/server/db';
import crypto from 'crypto';

// Import schema-driven types
import type { Category } from '$lib/types/schemaTypes';

// Create a Category type alias for components to use
export interface UiCategory {
    id: string;
    name: string;
    path: string;
    parentId?: string | null;
    description?: string | null;
    isPublic: boolean;
    createdBy: string;
    createdAt: Date;
    updatedBy?: string | null;
    updatedAt: Date;
    isDeleted: boolean;
    customFields?: Record<string, any> | null;
    parentName?: string;
    childCount?: number;
    depth?: number;
}

// Import JSON specific types
import type { JsonValue } from '$lib/types/primitive';

/**
 * Error messages for category operations
 */
export const CATEGORY_ERRORS = {
    NOT_FOUND: 'Category not found',
    DUPLICATE_NAME: 'Category with this name already exists under this parent',
    HAS_CHILDREN: 'Category cannot be deleted as it has child categories',
    REFERENCED_BY_PARTS: 'Category cannot be deleted as it is referenced by existing parts',
    INVALID_PARENT: 'Invalid parent category',
    CIRCULAR_REFERENCE: 'Cannot move category to its own descendant',
    VALIDATION_ERROR: 'Category validation error',
    CUSTOM_FIELDS_ERROR: 'Error updating custom fields for category',
    SEARCH_ERROR: 'Error searching for categories',
    BREADCRUMBS_ERROR: 'Error retrieving category breadcrumbs',
    GENERAL_ERROR: 'An error occurred during the category operation'
};

/**
 * Extended Category interface for internal use with both camelCase and snake_case properties
 * This provides backwards compatibility with existing code while maintaining type safety
 * Uses schema-driven design from categorySchema
 * Added index signature to make it compatible with DbRow
 */
interface CategoryWithId extends Omit<Category, 'custom_fields'> {
    // Index signature for DbRow compatibility
    [key: string]: any;
    // Standard API properties (camelCase)
    id: string;
    name: string;
    parentId?: string | null; // Allow null for DB compatibility
    description?: string | null;
    path: string;
    createdBy: string;
    createdAt: Date;
    updatedBy?: string | null;
    updatedAt: Date;
    isPublic: boolean;
    isDeleted: boolean;
    deletedAt?: Date | null;
    deletedBy?: string | null;
    
    // UI helper properties
    parentName?: string;
    childCount?: number;
    partsCount?: number;
    depth?: number;
    breadcrumbs?: CategoryWithId[];
    customFields?: Record<string, JsonValue> | null;
    
    // Database column names (snake_case) - extended from Category with more precise null handling
    category_id: string;
    category_name: string;
    parent_id: string | null;
    category_description: string | null;
    category_path: string;
    created_by: string;
    created_at: Date;
    updated_by: string | null;
    updated_at: Date;
    is_public: boolean;
    is_deleted: boolean;
    deleted_at: Date | null;
    deleted_by: string | null;
    custom_fields?: Record<string, JsonValue> | null; // Strongly typed JSON field
    
    // Database join fields
    parent_name?: string;
    child_count?: number;
    parts_count?: number;
}

/**
 * Sanitizes a category name for use in ltree paths.
 * Ensures the label is valid by replacing invalid characters, collapsing underscores,
 * converting to lowercase, and truncating to 255 characters.
 * @param name The category name to sanitize.
 * @returns A sanitized string suitable for ltree paths.
 */
export function sanitizeLtreeLabel(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars with underscore
        .replace(/_+/g, '_')            // Collapse multiple underscores
        .toLowerCase()                  // Convert to lowercase
        .substring(0, 255);             // Truncate if too long
}

/**
 * Create a new category
 * @param params - Category creation parameters
 * @returns Newly created category
 */
/**
 * Create a new category with all its properties
 * 
 * @param params Parameters for category creation
 * @returns Newly created category with normalized structure
 * @throws Error if validation fails or database operation fails
 */
export async function createCategory(params: {
    name: string;
    createdBy: string;
    parentId?: string;
    description?: string | null;
    isPublic?: boolean;
    customFields?: Record<string, JsonValue> | null;
}): Promise<CategoryWithId> {
    // Log incoming parameters for debugging
    console.log('createCategory called with params:', {
        name: params.name,
        parentId: params.parentId,
        parentIdType: typeof params.parentId,
        description: params.description,
        isPublic: params.isPublic,
        createdBy: params.createdBy
    });
    const { 
        name, 
        createdBy, 
        parentId, 
        description = null, 
        isPublic = true,
        customFields = null
    } = params;

    try {
        // Generate a UUID for the new category
        const id = crypto.randomUUID();
        
        // Check parent category exists if specified
        if (parentId) {
            const parentExists = await sql`
                SELECT EXISTS(SELECT 1 FROM "Category" WHERE category_id = ${parentId}) as exists
            `;
            
            if (!parentExists[0].exists) {
                throw new Error(CATEGORY_ERRORS.INVALID_PARENT);
            }
        }

        // Sanitize name for ltree path
        const sanitizedLabel = sanitizeLtreeLabel(name);

        /**
 * Helper function to normalize a category record from the database
 * This ensures we have consistent property names in both snake_case (DB) and camelCase (UI) formats
 * @param category Raw category data from database
 * @returns Normalized CategoryWithId with consistent property access
 */
function normalizeCategory(category: any): CategoryWithId {
    // Helper to convert null to undefined for optional string fields
    const nullToUndefined = (val: string | null | undefined): string | undefined => {
        return val === null ? undefined : val;
    };
    
    return {
        // Original DB fields - snake_case
        ...category,
        
        // UI fields - camelCase (normalize from DB fields if not present)
        id: category.id || category.category_id,
        name: category.name || category.category_name,
        // Convert null to undefined for parentId to satisfy TypeScript
        parentId: nullToUndefined(category.parentId || category.parent_id),
        description: nullToUndefined(category.description || category.category_description),
        path: category.path || category.category_path,
        isPublic: category.isPublic !== undefined ? category.isPublic : category.is_public,
        createdBy: category.createdBy || category.created_by,
        createdAt: category.createdAt || category.created_at,
        updatedBy: nullToUndefined(category.updatedBy || category.updated_by),
        updatedAt: category.updatedAt || category.updated_at,
        isDeleted: category.isDeleted !== undefined ? category.isDeleted : category.is_deleted,
        deletedAt: category.deletedAt || category.deleted_at,
        deletedBy: nullToUndefined(category.deletedBy || category.deleted_by),
        customFields: category.customFields || category.custom_fields,
        parentName: nullToUndefined(category.parentName || category.parent_name),
        childCount: category.childCount || category.child_count || 0,
        partsCount: category.partsCount || category.parts_count || 0,
        
        // Make sure all DB fields are also present
        category_id: category.category_id || category.id,
        category_name: category.category_name || category.name,
        parent_id: category.parent_id || category.parentId,
        category_description: category.category_description || category.description,
        category_path: category.category_path || category.path,
        is_public: category.is_public !== undefined ? category.is_public : category.isPublic,
        created_by: category.created_by || category.createdBy,
        created_at: category.created_at || category.createdAt,
        updated_by: category.updated_by || category.updatedBy,
        updated_at: category.updated_at || category.updatedAt,
        is_deleted: category.is_deleted !== undefined ? category.is_deleted : category.isDeleted,
        deleted_at: category.deleted_at || category.deletedAt,
        deleted_by: category.deleted_by || category.deletedBy,
        custom_fields: category.custom_fields || category.customFields,
        parent_name: category.parent_name || category.parentName
    };
}

// Determine path based on parent
        let path;
        if (parentId) {
            // For child categories, construct path by appending to parent path
            const parentResult = await sql`
                SELECT category_path FROM "Category" WHERE category_id = ${parentId} AND is_deleted = false
            `;
            
            if (parentResult.length === 0) {
                throw new Error(CATEGORY_ERRORS.INVALID_PARENT);
            }
            
            const parentPath = parentResult[0].category_path;
            path = `${parentPath}.${sanitizedLabel}`;
        } else {
            // For root categories, use the sanitized label as path
            path = sanitizedLabel;
        }

        // Perform the insert in a transaction to ensure atomicity with any custom fields
        const result = await sql.begin(async sql => {
            // Insert the main category record
            const categoryResult = await sql`
                INSERT INTO "Category" (
                    category_id,
                    category_name,
                    parent_id,
                    category_description,
                    category_path,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at,
                    is_public,
                    is_deleted
                    -- custom_fields column doesn't exist in the actual database schema
                ) VALUES (
                    ${id},
                    ${name},
                    ${parentId || null},
                    ${description},
                    ${path},
                    ${createdBy},
                    NOW(),
                    ${createdBy},
                    NOW(),
                    ${isPublic},
                    false
                    -- Removed custom_fields value to match actual database schema
                )
                RETURNING *
            `;

            const category = categoryResult[0];
            
            // Handle custom fields if provided - store in separate table only
            // Note: There is no custom_fields column in the Category table itself
            if (customFields && Object.keys(customFields).length > 0) {
                try {
                    for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                        // Determine data type
                        let dataType = 'text';
                        if (typeof fieldValue === 'number') dataType = 'number';
                        else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                        else if (fieldValue instanceof Date) dataType = 'date';
                        
                        await sql`
                            INSERT INTO "CategoryCustomField" (
                                category_id,
                                field_name,
                                field_value,
                                data_type,
                                created_by
                            )
                            VALUES (
                                ${category.category_id},
                                ${fieldName},
                                ${JSON.stringify(fieldValue)},
                                ${dataType},
                                ${createdBy}
                            )
                        `;
                    }
                } catch (err) {
                    console.error('Error storing custom fields:', err);
                    // Continue even if custom fields fail - the category was created successfully
                }
            }
            
            // Custom fields are not part of the Category object in database
            // Add them to the return object for API consistency
            return {
                ...category,
                customFields: customFields || null
            };
        });

        return normalizeCategory(result);
    } catch (error) {
        // Handle specific error cases
        if (error instanceof Error) {
            if ('code' in error && error.code === '23505') {
                throw new Error(CATEGORY_ERRORS.DUPLICATE_NAME);
            }
            
            if (error.message.includes(CATEGORY_ERRORS.INVALID_PARENT)) {
                throw error; // Re-throw specific errors as is
            }
        }
        
        console.error('Error creating category:', error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Type definition for database row data to ensure type safety
 */
type DbRow = Record<string, unknown>;

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
 * Helper function to map database rows to Category objects with normalized property names
 * Uses type-safe deserialization for complex JSON fields
 * 
 * @param row - Raw database row
 * @returns Normalized category object
 */
function normalizeCategory(row: DbRow): CategoryWithId {
    // Ensure we have all required fields or throw an error
    if (!row.category_id || !row.category_name || !row.category_path ||
        !row.created_by || !row.created_at || !row.updated_at) {
        throw new Error('Invalid category data from database');
    }

    // Convert any ISO date strings to Date objects
    const created_at = row.created_at instanceof Date ? 
        row.created_at : new Date(row.created_at as string);
    
    const updated_at = row.updated_at instanceof Date ? 
        row.updated_at : new Date(row.updated_at as string);
    
    const deleted_at = row.deleted_at ? 
        (row.deleted_at instanceof Date ? row.deleted_at : new Date(row.deleted_at as string)) : 
        null;

    // Process custom fields with type safety
    const customFields = deserializeCustomFields(row.custom_fields);
    
    // Helper function to safely convert string numbers to number type
    function safeParseInt(value: unknown): number | undefined {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? undefined : parsed;
        }
        return undefined;
    }
    
    // Create a normalized category object with both styles of property names
    const category: CategoryWithId = {
        // Standard API properties (camelCase)
        id: row.category_id as string,
        name: row.category_name as string,
        parentId: (row.parent_id as string) || undefined,
        description: (row.category_description as string) || undefined,
        path: row.category_path as string,
        createdBy: row.created_by as string,
        createdAt: created_at,
        updatedBy: (row.updated_by as string) || undefined,
        updatedAt: updated_at,
        isPublic: Boolean(row.is_public),
        isDeleted: Boolean(row.is_deleted),
        deletedAt: deleted_at || undefined,
        deletedBy: (row.deleted_by as string) || undefined,
        
        // UI helper properties from joins with safer parsing
        parentName: (row.parent_name as string) || undefined,
        childCount: safeParseInt(row.child_count),
        partsCount: safeParseInt(row.parts_count),
        depth: safeParseInt(row.depth),
        customFields: customFields,
        
        // Database column names (snake_case) with proper typing
        category_id: row.category_id as string,
        category_name: row.category_name as string,
        parent_id: (row.parent_id as string) || null,
        category_description: (row.category_description as string) || null,
        category_path: row.category_path as string,
        created_by: row.created_by as string,
        created_at: created_at,
        updated_by: (row.updated_by as string) || null,
        updated_at: updated_at,
        is_public: Boolean(row.is_public),
        is_deleted: Boolean(row.is_deleted),
        deleted_at: deleted_at,
        deleted_by: (row.deleted_by as string) || null,
        custom_fields: customFields,
        
        // Database join fields with safer parsing
        parent_name: (row.parent_name as string) || undefined,
        child_count: safeParseInt(row.child_count),
        parts_count: safeParseInt(row.parts_count)
    };

    return category;
}

/**
 * Get a category by ID
 * @param id - Category UUID
 * @returns The category with normalized structure or null if not found
 */
export async function getCategory(id: string): Promise<CategoryWithId | null> {
    try {
        const result = await sql`
            SELECT * 
            FROM "Category" 
            WHERE category_id = ${id} AND is_deleted = false
        `;
        return result.length > 0 ? normalizeCategory(result[0]) : null;
    } catch (error) {
        console.error(`Error fetching category ${id}:`, error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update an existing category
 * @param id - Category UUID
 * @param updates - Fields to update
 * @param userId - ID of user making the update
 * @returns Updated category with normalized structure
 */
/**
 * Update an existing category with improved type safety
 * 
 * @param id Category UUID to update
 * @param updates Fields to update with proper typing
 * @param userId User making the update (for audit trail)
 * @returns Updated category with normalized structure
 * @throws Error if category not found or validation fails
 */
export async function updateCategory(
    id: string,
    updates: {
        name?: string;
        description?: string | null;
        isPublic?: boolean;
    },
    userId: string
): Promise<CategoryWithId> {
    // First check that the category exists
    const existing = await getCategory(id);
    if (!existing) {
        throw new Error(CATEGORY_ERRORS.NOT_FOUND);
    }

    // Return early if no updates
    if (Object.keys(updates).length === 0) {
        return existing;
    }
    
    try {
        // Build the SET parts of the query using a safer approach with sql fragments
        let query = sql`UPDATE "Category" SET updated_by = ${userId}, updated_at = NOW()`;
        
        // Conditionally add each field to update
        if (updates.name !== undefined) {
            // If updating name, also update the path based on parent path
            const newLabel = sanitizeLtreeLabel(updates.name);
            
            // If parent exists, need to update path correctly
            if (existing.parent_id) {
                const parentResult = await sql`
                    SELECT category_path FROM "Category" 
                    WHERE category_id = ${existing.parent_id} AND is_deleted = FALSE
                `;
                
                if (parentResult.length === 0) {
                    throw new Error(CATEGORY_ERRORS.INVALID_PARENT);
                }
                
                const parentPath = parentResult[0].category_path;
                query = sql`${query}, category_path = ${`${parentPath}.${newLabel}`}, category_name = ${updates.name}`;
            } else {
                // No parent, just update the name as the path
                query = sql`${query}, category_path = ${newLabel}, category_name = ${updates.name}`;
            }
        }
        
        if (updates.description !== undefined) {
            query = sql`${query}, category_description = ${updates.description}`;
        }
        
        if (updates.isPublic !== undefined) {
            query = sql`${query}, is_public = ${updates.isPublic}`;
        }
        
        // Complete the query
        query = sql`${query} WHERE category_id = ${id} AND is_deleted = FALSE RETURNING *`;
        
        // Execute the query
        const result = await query;
        
        if (result.length === 0) {
            throw new Error(CATEGORY_ERRORS.NOT_FOUND);
        }
        
        return normalizeCategory(result[0]);
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23505') {
                throw new Error(CATEGORY_ERRORS.DUPLICATE_NAME);
            }
            if (error.message.includes(CATEGORY_ERRORS.NOT_FOUND) || 
                error.message.includes(CATEGORY_ERRORS.INVALID_PARENT)) {
                throw error; // Re-throw specific errors as is
            }
        }
        
        // Generic error with original message
        console.error(`Error updating category ${id}:`, error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Soft-delete a category by marking is_deleted
 * @param id - Category UUID
 * @param userId - User making the deletion
 * @throws Error if category doesn't exist or has children
 */
export async function deleteCategory(
    id: string,
    userId: string
): Promise<void> {
    try {
        // First check if the category exists
        const category = await getCategory(id);
        if (!category) {
            throw new Error(CATEGORY_ERRORS.NOT_FOUND);
        }

        // Check if category has children
        const children = await sql`
            SELECT COUNT(*) as count 
            FROM "Category" 
            WHERE parent_id = ${id}
        `;
        
        if (children[0].count > 0) {
            throw new Error(CATEGORY_ERRORS.HAS_CHILDREN);
        }

        // Check if category is referenced by parts
        const parts = await sql`
            SELECT COUNT(*) as count 
            FROM "PartVersionCategory" 
            WHERE category_id = ${id}
        `;
        
        if (parts[0].count > 0) {
            throw new Error(CATEGORY_ERRORS.REFERENCED_BY_PARTS);
        }

        // Perform hard delete - completely remove from database
        const result = await sql`
            DELETE FROM "Category"
            WHERE category_id = ${id}
            RETURNING category_id
        `;
        
        if (result.length === 0) {
            throw new Error(CATEGORY_ERRORS.NOT_FOUND);
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === CATEGORY_ERRORS.NOT_FOUND || 
                error.message === CATEGORY_ERRORS.HAS_CHILDREN || 
                error.message === CATEGORY_ERRORS.REFERENCED_BY_PARTS) {
                throw error; // Re-throw specific errors as is
            }
        }
        
        console.error(`Error deleting category ${id}:`, error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all categories with optional filtering
 * @param options - Optional filters for categories
 * @returns Array of categories matching the filter criteria
 */
export async function getAllCategories(options?: {
    isPublic?: boolean;
    excludeDeleted?: boolean;
    createdBy?: string;
    parentId?: string | null;
}): Promise<CategoryWithId[]> {
    try {
        const { isPublic, excludeDeleted = false, createdBy, parentId } = options || {};
        
        // NOTE: With hard delete, excludeDeleted is no longer needed but kept for backward compatibility
        
        // Use table aliases throughout the query for clarity and to avoid ambiguity
        let query = sql`
            SELECT c.*, p.category_name as parent_name
            FROM "Category" c
            LEFT JOIN "Category" p ON c.parent_id = p.category_id
        `;
        
        // Build WHERE clauses based on options, with table aliases to avoid ambiguity
        const whereClauses = [];
        // Hard delete: no need to check for is_deleted as deleted records are fully removed
        if (isPublic !== undefined) whereClauses.push(sql`c.is_public = ${isPublic}`);
        if (createdBy) whereClauses.push(sql`c.created_by = ${createdBy}`);
        if (parentId !== undefined) {
            if (parentId === null) {
                whereClauses.push(sql`c.parent_id IS NULL`);
            } else {
                whereClauses.push(sql`c.parent_id = ${parentId}`);
            }
        }
        
        // Add WHERE clause if any conditions exist
        if (whereClauses.length > 0) {
            // Combine WHERE clauses with AND operator
            let whereClause = whereClauses[0];
            for (let i = 1; i < whereClauses.length; i++) {
                whereClause = sql`${whereClause} AND ${whereClauses[i]}`;
            }
            query = sql`${query} WHERE ${whereClause}`;
        }
        
        // Add ORDER BY
        query = sql`${query} ORDER BY category_path`;
        
        const result = await query;
        return result.map(normalizeCategory);
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all hierarchical children of a category using ltree path matching
 * @param categoryId - Parent category ID
 * @returns Array of child categories in path order
 */
export async function getCategoryChildren(categoryId: string): Promise<CategoryWithId[]> {
    try {
        const result = await sql`
            SELECT * FROM "Category"
            WHERE is_deleted = false
            AND category_path <@ (SELECT category_path FROM "Category" WHERE category_id = ${categoryId} AND is_deleted = false)
            AND category_id != ${categoryId}
            ORDER BY category_path
        `;

        if (result.length === 0) {
            return [];
        }

        return result.map(normalizeCategory);
    } catch (error) {
        console.error(`Error fetching children of category ${categoryId}:`, error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Move category hierarchy with full transaction support
/**
 * Move a category to a new parent with full transaction support
 * Updates category path and closure table atomically
 * 
 * @param categoryId The ID of the category to move
 * @param newParentId The ID of the new parent, or null for root level
 * @param userId User making the change (for audit trail)
 * @returns Updated category with new path information
 * @throws Error if validation fails (e.g., circular reference)
 */
export async function moveCategory(
    categoryId: string,
    newParentId: string | null,
    userId: string
): Promise<CategoryWithId> {
    // Use transactions with porsager/postgres
    await sql`BEGIN`;
    try {
        // Validate move operation
        const category = await getCategory(categoryId);
        if (!category) throw new Error(CATEGORY_ERRORS.NOT_FOUND);

        if (newParentId) {
            const newParent = await getCategory(newParentId);
            if (!newParent) throw new Error(CATEGORY_ERRORS.INVALID_PARENT);
            if (await isDescendant(categoryId, newParentId)) {
                throw new Error(CATEGORY_ERRORS.CIRCULAR_REFERENCE);
            }
        }

        // Calculate new path
        const newParentPath = newParentId ? (await getCategory(newParentId))?.path || '' : '';
        const newPath = newParentPath
            ? `${newParentPath}.${sanitizeLtreeLabel(category.name)}`
            : sanitizeLtreeLabel(category.name);

        // Update category and descendants
        await sql`
            UPDATE "Category"
            SET parent_id = ${newParentId}, 
                category_path = ${newPath}, 
                updated_by = ${userId}, 
                updated_at = NOW()
            WHERE category_id = ${categoryId}
        `;

        // Update descendant paths using ltree using array of parameters
        const updateQuery = `
            UPDATE "Category"
            SET category_path = text2ltree($1 || subpath(category_path, nlevel($2)))
            WHERE category_path <@ $2 AND category_id != $3
        `;
        
        await sql.unsafe(updateQuery, [
            newPath,
            category.path,
            categoryId
        ]);

        await sql`COMMIT`;
        return (await getCategory(categoryId))!;
    } catch (error) {
        await sql`ROLLBACK`;
        if (error instanceof Error) {
            if (error.message === CATEGORY_ERRORS.NOT_FOUND || 
                error.message === CATEGORY_ERRORS.INVALID_PARENT || 
                error.message === CATEGORY_ERRORS.CIRCULAR_REFERENCE) {
                throw error; // Re-throw specific errors as is
            }
        }
        
        console.error(`Error moving category ${categoryId}:`, error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get breadcrumb trail for a category (all ancestor categories in path order)
 * @param categoryId - The ID of the category to get breadcrumbs for
 * @returns Array of ancestor categories in path order, including the target category
 */
export async function getCategoryBreadcrumbs(categoryId: string): Promise<CategoryWithId[]> {
    try {
        // First validate the category exists
        const category = await getCategory(categoryId);
        if (!category) {
            throw new Error(CATEGORY_ERRORS.NOT_FOUND);
        }

        // Query for all ancestors using ltree operator @>
        // This gets all categories whose path is an ancestor of our category's path
        // along with the category itself
        const result = await sql`
            SELECT * FROM "Category"
            WHERE category_path @> (SELECT category_path FROM "Category" WHERE category_id = ${categoryId})
            OR category_id = ${categoryId}
            ORDER BY category_path
        `;

        return result.map(normalizeCategory);
    } catch (error) {
        console.error(`Error getting breadcrumbs for category ${categoryId}:`, error);
        
        // Re-throw specific errors
        if (error instanceof Error && error.message === CATEGORY_ERRORS.NOT_FOUND) {
            throw error;
        }
        
        throw new Error(`${CATEGORY_ERRORS.BREADCRUMBS_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper function to check descendant relationship
async function isDescendant(
    ancestorId: string,
    descendantId: string
): Promise<boolean> {
    const result = await sql`
        SELECT 1 FROM "CategoryClosure"
        WHERE ancestor_id = ${ancestorId} AND descendant_id = ${descendantId}
    `;
    return result.length > 0;
}

/**
 * Search categories by name with optional filters
 * @param params - Search parameters
 * @returns Array of matching categories
 */
/**
 * Search categories by name with optimized performance
 * Uses PostgreSQL trigram similarity for fuzzy matching
 * 
 * @param params Search parameters with filtering options
 * @returns Array of matching categories with normalized structure
 * @throws Error if search operation fails
 */
export async function searchCategories(params: {
    query: string;
    isPublic?: boolean;
    excludeDeleted?: boolean;
    limit?: number;
    offset?: number;
    createdBy?: string;
}): Promise<CategoryWithId[]> {
    const {
        query,
        isPublic = true,
        excludeDeleted = true,
        limit = 20,
        offset = 0,
        createdBy
    } = params;

    try {
        // Build the query conditions
        let conditions = sql`
            category_name ILIKE ${'%' + query + '%'}
        `;

        if (isPublic !== undefined) {
            conditions = sql`${conditions} AND is_public = ${isPublic}`;
        }

        if (excludeDeleted) {
            conditions = sql`${conditions} AND is_deleted = false`;
        }

        if (createdBy) {
            conditions = sql`${conditions} AND created_by = ${createdBy}`;
        }

        // Execute the query with the constructed conditions
        const result = await sql`
            SELECT c.*, p.category_name as parent_name,
                (SELECT COUNT(*) FROM "Category" WHERE parent_id = c.category_id AND is_deleted = false) as child_count
            FROM "Category" c
            LEFT JOIN "Category" p ON c.parent_id = p.category_id
            WHERE ${conditions}
            ORDER BY c.category_name
            LIMIT ${limit} OFFSET ${offset}
        `;

        return result.map(normalizeCategory);
    } catch (error) {
        console.error(`Error searching categories with query "${query}":`, error);
        throw new Error(`${CATEGORY_ERRORS.SEARCH_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get custom fields for a specific category
 * @param categoryId - The ID of the category to get custom fields for
 * @returns Record of custom field names and their values
 */
export async function getCategoryCustomFields(categoryId: string): Promise<Record<string, JsonValue>> {
    try {
        // First check that the category exists
        const category = await getCategory(categoryId);
        if (!category) {
            throw new Error(CATEGORY_ERRORS.NOT_FOUND);
        }

        // Fetch custom fields
        const results = await sql`
            SELECT field_name, field_value, data_type 
            FROM "CategoryCustomField" 
            WHERE category_id = ${categoryId}
        `;

        // Convert to a Record type for easy use
        const customFields: Record<string, JsonValue> = {};
        
        for (const row of results) {
            // Parse the field value according to its data type
            let value: JsonValue = row.field_value;
            
            try {
                // If the value is stored as a JSON string, parse it
                if (typeof row.field_value === 'string' && 
                   (row.field_value.startsWith('{') || 
                    row.field_value.startsWith('[') || 
                    row.field_value.startsWith('"'))) {
                    value = JSON.parse(row.field_value);
                }
                
                // Convert values based on the stored data type
                if (row.data_type === 'number' && typeof row.field_value === 'string') {
                    value = parseFloat(row.field_value);
                } else if (row.data_type === 'boolean' && typeof row.field_value === 'string') {
                    value = row.field_value.toLowerCase() === 'true';
                } else if (row.data_type === 'date' && typeof row.field_value === 'string') {
                    // Store date as ISO string since JsonValue doesn't support Date objects
                    const date = new Date(row.field_value);
                    value = date.toISOString();
                }
            } catch (e) {
                // If parsing fails, use the original value
                console.warn(`Failed to parse custom field value for ${row.field_name}:`, e);
            }
            
            customFields[row.field_name] = value;
        }

        return customFields;
    } catch (error) {
        console.error(`Error getting custom fields for category ${categoryId}:`, error);
        
        // Re-throw specific errors
        if (error instanceof Error && error.message === CATEGORY_ERRORS.NOT_FOUND) {
            throw error;
        }
        
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update custom fields for a category
 * @param categoryId - The ID of the category to update custom fields for
 * @param customFields - The custom fields to set
 * @param userId - The ID of the user making the update
 * @returns void
 */
/**
 * Build a hierarchical tree of categories
 * @returns Array of root categories with their children nested
 */
export async function getCategoryTree(): Promise<CategoryWithId[]> {
    try {
        // Get all categories ordered by path
        const categories = await getAllCategories({ excludeDeleted: true });
        
        // Create a map for fast lookups - use string keys only
        const categoryMap = new Map<string, CategoryWithId & { children: CategoryWithId[] }>();
        
        // Initialize result array for root categories
        const rootCategories: (CategoryWithId & { children: CategoryWithId[] })[] = [];
        
        // First pass: create category objects with empty children arrays
        for (const category of categories) {
            // Extract id first since we need it as the map key
            const id = category.id || category.category_id;
            
            // Convert DB snake_case to UI camelCase using normalize function
            const normalizedCategory = normalizeCategory(category);
            
            // Add to map with children array
            categoryMap.set(id, { 
                ...normalizedCategory,
                children: []
            });
        }
        
        // Second pass: build the tree structure
        for (const category of categories) {
            // Get the normalized category with children array
            const id = category.id || category.category_id;
            const categoryWithChildren = categoryMap.get(id);
            
            if (!categoryWithChildren) continue; // Skip if not found for some reason
            
            // Convert null to undefined to make TypeScript happy
            const parentId = categoryWithChildren.parentId;
            
            if (parentId) {
                // Only process if parentId is a valid string
                const parent = categoryMap.get(parentId);
                if (parent) {
                    // Add as child to parent
                    parent.children.push(categoryWithChildren);
                }
            } else {
                // This is a root category
                rootCategories.push(categoryWithChildren);
            }
        }
        
        return rootCategories;
    } catch (error) {
        console.error('Error building category tree:', error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateCategoryCustomFields(
    categoryId: string,
    customFields: Record<string, JsonValue>,
    userId: string
): Promise<void> {
    // First check that the category exists
    const category = await getCategory(categoryId);
    if (!category) {
        throw new Error(CATEGORY_ERRORS.NOT_FOUND);
    }

    try {
        // Use a transaction to ensure all operations are atomic
        await sql.begin(async sql => {
            // Delete existing custom fields first
            await sql`
                DELETE FROM "CategoryCustomField"
                WHERE category_id = ${categoryId}
            `;

            // If no custom fields provided, we're done
            if (!customFields || Object.keys(customFields).length === 0) {
                return;
            }

            // Insert new custom fields
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Skip null or undefined values
                if (fieldValue === null || fieldValue === undefined) {
                    continue;
                }

                // Determine data type
                let dataType = 'text';
                if (typeof fieldValue === 'number') dataType = 'number';
                else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                else if (fieldValue instanceof Date) dataType = 'date';

                // Convert to JSON string for storage
                const storedValue = typeof fieldValue === 'object' 
                    ? JSON.stringify(fieldValue) 
                    : String(fieldValue);

                await sql`
                    INSERT INTO "CategoryCustomField" (
                        category_id,
                        field_name,
                        field_value,
                        data_type,
                        created_by
                    )
                    VALUES (
                        ${categoryId},
                        ${fieldName},
                        ${storedValue},
                        ${dataType},
                        ${userId}
                    )
                `;
            }
            
            // Update the category's updated_by and updated_at fields
            await sql`
                UPDATE "Category"
                SET updated_by = ${userId}, updated_at = NOW()
                WHERE category_id = ${categoryId}
            `;
        });
    } catch (error) {
        console.error(`Error updating custom fields for category ${categoryId}:`, error);
        throw new Error(`${CATEGORY_ERRORS.CUSTOM_FIELDS_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get a category with counts of associated parts and child categories
 * @param categoryId - The ID of the category to retrieve
 * @returns The category with counts or null if not found
 */
export async function getCategoryWithCounts(categoryId: string): Promise<CategoryWithId | null> {
    try {
        /**
         * Execute query with JOINs for efficient data retrieval
         * Gets category details with parent name and counts in a single query
         */
        const result = await sql`
            SELECT c.*, p.category_name as parent_name,
                (SELECT COUNT(*) FROM "Category" cc WHERE cc.parent_id = c.category_id AND cc.is_deleted = false) as child_count,
                (SELECT COUNT(*) FROM "PartVersionCategory" pvc 
                 JOIN "PartVersion" pv ON pvc.part_version_id = pv.part_version_id 
                 WHERE pvc.category_id = c.category_id) as parts_count
            FROM "Category" c
            LEFT JOIN "Category" p ON c.parent_id = p.category_id
            WHERE c.category_id = ${categoryId} AND c.is_deleted = false
        `;

        if (result.length === 0) {
            return null;
        }

        // Get custom fields for this category
        const customFields = await getCategoryCustomFields(categoryId);
        
        // Normalize category and add custom fields
        const category = normalizeCategory(result[0]);
        category.customFields = customFields;
        
        return category;
    } catch (error) {
        console.error(`Error getting category with counts ${categoryId}:`, error);
        throw new Error(`${CATEGORY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
