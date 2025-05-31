/**
 * Core functionality for part family management
 */
import sql from '$lib/server/db';
import type { JsonValue } from '$lib/types/types';
import type { PartFamily, PartFamilyFormData, PartFamilyLink } from '@/types/schemaTypes';

/**
 * Error messages for part family operations
 */
export const PART_FAMILY_ERRORS = {
    NOT_FOUND: 'Part family not found',
    DUPLICATE_NAME: 'Part family with this name already exists',
    REFERENCED_BY_PARTS: 'Part family cannot be deleted as it is referenced by existing parts',
    VALIDATION_ERROR: 'Part family validation error',
    GENERAL_ERROR: 'An error occurred during the part family operation'
};



/**
 * Helper to normalize part family data from postgres result
 * @param row - Raw database row
 * @returns Normalized part family object
 */
function normalizePartFamily(row: Record<string, unknown>): PartFamily {
    return {
        id: row.part_family_id as string,
        part_family_id: row.part_family_id as string,
        family_name: row.family_name as string,
        family_description: row.family_description as string | undefined,
        family_code: row.family_code as string | undefined,
        family_image_url: row.family_image_url as string | undefined,
        createdBy: row.created_by as string | undefined,
        created_by: row.created_by as string | undefined,
        createdAt: row.created_at as Date,
        created_at: row.created_at as Date,
        updatedBy: row.updated_by as string | undefined,
        updated_by: row.updated_by as string | undefined,
        updatedAt: row.updated_at as Date | undefined,
        updated_at: row.updated_at as Date | undefined,
        is_public: row.is_public as boolean ?? true,
        is_active: row.is_active as boolean ?? true
    };
}

/**
 * Create a new part family
 * @param params - Parameters for creating a part family
 * @returns The created part family with normalized structure
 */
export async function createPartFamily(
    params: {
        family_name: string;
        family_description?: string | null;
        family_code?: string | null;
        family_image_url?: string | null;
        is_public?: boolean;
        is_active?: boolean;
        createdBy: string;
    }
): Promise<PartFamily> {
    try {
        // Validate input
        if (!params.family_name?.trim()) {
            throw new Error(PART_FAMILY_ERRORS.VALIDATION_ERROR + ': Family name is required');
        }

        // Use porsager/postgres template literals
        const result = await sql`
            INSERT INTO "PartFamily" (
                family_name, 
                family_description, 
                family_code, 
                family_image_url, 
                is_public,
                is_active,
                created_by
            )
            VALUES (
                ${params.family_name},
                ${params.family_description || null},
                ${params.family_code || null},
                ${params.family_image_url || null},
                ${params.is_public ?? true},
                ${params.is_active ?? true},
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error(PART_FAMILY_ERRORS.GENERAL_ERROR + ': Failed to create part family');
        }

        return normalizePartFamily(result[0]);
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23505') {
                throw new Error(PART_FAMILY_ERRORS.DUPLICATE_NAME);
            }
            if (error.message.includes(PART_FAMILY_ERRORS.VALIDATION_ERROR)) {
                throw error; // Re-throw validation errors as is
            }
        }
        // Generic error with original message
        console.error('Error creating part family:', error);
        throw new Error(`${PART_FAMILY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get a part family by ID
 * @param id - Part family UUID
 * @returns The part family with normalized structure or null if not found
 */
export async function getPartFamily(id: string): Promise<PartFamily | null> {
    try {
        const result = await sql`
            SELECT * 
            FROM "PartFamily"
            WHERE part_family_id = ${id}
        `;
        return result.length > 0 ? normalizePartFamily(result[0]) : null;
    } catch (error) {
        console.error(`Error fetching part family ${id}:`, error);
        throw new Error(`${PART_FAMILY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update an existing part family
 * @param id - Part family UUID
 * @param updates - Fields to update
 * @param userId - ID of user making the update
 * @returns Updated part family with normalized structure
 */
export async function updatePartFamily(
    id: string,
    updates: {
        family_name?: string;
        family_description?: string | null;
        family_code?: string | null;
        family_image_url?: string | null;
        is_public?: boolean;
        is_active?: boolean;
    },
    userId: string
): Promise<PartFamily> {
    // First check that the part family exists
    const existing = await getPartFamily(id);
    if (!existing) {
        throw new Error(PART_FAMILY_ERRORS.NOT_FOUND);
    }

    // Return early if no updates
    if (Object.keys(updates).length === 0) {
        return existing;
    }
    
    try {
        // Build the SET parts of the query using a safer approach with sql fragments
        let query = sql`UPDATE "PartFamily" SET updated_by = ${userId}, updated_at = NOW()`;
        
        // Conditionally add each field to update
        if (updates.family_name !== undefined) {
            query = sql`${query}, family_name = ${updates.family_name}`;
        }
        
        if (updates.family_description !== undefined) {
            query = sql`${query}, family_description = ${updates.family_description}`;
        }
        
        if (updates.family_code !== undefined) {
            query = sql`${query}, family_code = ${updates.family_code}`;
        }
        
        if (updates.family_image_url !== undefined) {
            query = sql`${query}, family_image_url = ${updates.family_image_url}`;
        }
        
        if (updates.is_public !== undefined) {
            query = sql`${query}, is_public = ${updates.is_public}`;
        }
        
        if (updates.is_active !== undefined) {
            query = sql`${query}, is_active = ${updates.is_active}`;
        }
        
        // Complete the query
        query = sql`${query} WHERE part_family_id = ${id} RETURNING *`;
        
        // Execute the query
        const result = await query;
        
        if (result.length === 0) {
            throw new Error(PART_FAMILY_ERRORS.NOT_FOUND);
        }
        
        return normalizePartFamily(result[0]);
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23505') {
                throw new Error(PART_FAMILY_ERRORS.DUPLICATE_NAME);
            }
            if (error.message.includes(PART_FAMILY_ERRORS.NOT_FOUND)) {
                throw error; // Re-throw not found errors as is
            }
        }
        
        // Generic error with original message
        console.error(`Error updating part family ${id}:`, error);
        throw new Error(`${PART_FAMILY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete a part family by ID
 * @param id - Part family UUID
 * @throws Error if part family doesn't exist or is referenced by parts
 */
export async function deletePartFamily(id: string): Promise<void> {
    try {
        // First check that the part family exists
        const partFamily = await getPartFamily(id);
        if (!partFamily) {
            throw new Error(PART_FAMILY_ERRORS.NOT_FOUND);
        }

        // Attempt to delete
        const result = await sql`DELETE FROM "PartFamily" WHERE part_family_id = ${id}`;
        
        // Verify deletion was successful
        if (result.count === 0) {
            throw new Error(PART_FAMILY_ERRORS.NOT_FOUND);
        }
    } catch (error) {
        // Handle specific known errors
        if (error instanceof Error) {
            if ('code' in error && error.code === '23503') {
                throw new Error(PART_FAMILY_ERRORS.REFERENCED_BY_PARTS);
            }
            if (error.message.includes(PART_FAMILY_ERRORS.NOT_FOUND)) {
                throw error; // Re-throw not found errors as is
            }
        }
        
        // Generic error with original message
        console.error(`Error deleting part family ${id}:`, error);
        throw new Error(`${PART_FAMILY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * List all part families
 * @param limit - Optional limit on number of records to return
 * @param offset - Optional offset for pagination
 * @param nameFilter - Optional filter by name (case-insensitive partial match)
 * @returns Array of part family objects with normalized structure
 */
export async function listPartFamilies(options?: { 
    limit?: number; 
    offset?: number; 
    nameFilter?: string;
    userId?: string; // Optional user ID to filter by created_by
    isActive?: boolean; // Optional filter for active part families
}): Promise<PartFamily[]> {
    try {
        // Build query conditionally based on options
        let query = sql`
            SELECT * 
            FROM "PartFamily"
            WHERE 1=1
        `;
        
        // Add conditional filters if provided
        if (options?.nameFilter) {
            query = sql`${query} AND family_name ILIKE ${`%${options.nameFilter}%`}`;
        }
        
        if (options?.userId) {
            query = sql`${query} AND created_by = ${options.userId}`;
        }
        
        if (options?.isActive !== undefined) {
            query = sql`${query} AND is_active = ${options.isActive}`;
        }
        
        // Add sorting
        query = sql`${query} ORDER BY family_name ASC`;
        
        // Add pagination if specified
        if (options?.limit) {
            query = sql`${query} LIMIT ${options.limit}`;
            
            if (options?.offset) {
                query = sql`${query} OFFSET ${options.offset}`;
            }
        }
        
        const result = await query;
        return result.map(normalizePartFamily);
    } catch (error) {
        console.error('Error listing part families:', error);
        throw new Error(`${PART_FAMILY_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Add a part to a part family
 * @param partId - Part UUID
 * @param familyId - Part family UUID
 * @param userId - User making the change
 * @returns The created link
 */
export async function addPartToFamily(
    partId: string,
    familyId: string,
    userId: string
): Promise<PartFamilyLink> {
    try {
        // Check that the part family exists
        const family = await getPartFamily(familyId);
        if (!family) {
            throw new Error(PART_FAMILY_ERRORS.NOT_FOUND);
        }
        
        // Check if the link already exists
        const existingLink = await sql`
            SELECT * FROM "PartFamilyLink"
            WHERE part_id = ${partId} AND family_id = ${familyId}
        `;
        
        if (existingLink.length > 0) {
            // Link already exists, just return it
            return existingLink[0] as PartFamilyLink;
        }
        
        // Create the link
        const result = await sql`
            INSERT INTO "PartFamilyLink" (
                part_id,
                family_id,
                created_by
            )
            VALUES (
                ${partId},
                ${familyId},
                ${userId}
            )
            RETURNING *
        `;
        
        if (result.length === 0) {
            throw new Error('Failed to create part family link');
        }
        
        return result[0] as PartFamilyLink;
    } catch (error) {
        // Handle foreign key violations
        if (error instanceof Error && 'code' in error) {
            if (error.code === '23503' && error.message.includes('part_id')) {
                throw new Error('Part not found');
            }
            if (error.code === '23503' && error.message.includes('family_id')) {
                throw new Error(PART_FAMILY_ERRORS.NOT_FOUND);
            }
        }
        
        console.error('Error adding part to family:', error);
        throw new Error(`Error adding part to family: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Remove a part from a part family
 * @param partId - Part UUID
 * @param familyId - Part family UUID
 */
export async function removePartFromFamily(
    partId: string,
    familyId: string
): Promise<void> {
    try {
        await sql`
            DELETE FROM "PartFamilyLink"
            WHERE part_id = ${partId} AND family_id = ${familyId}
        `;
    } catch (error) {
        console.error('Error removing part from family:', error);
        throw new Error(`Error removing part from family: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all part families for a part
 * @param partId - Part UUID
 * @returns Array of part families
 */
export async function getPartFamiliesForPart(partId: string): Promise<PartFamily[]> {
    try {
        const result = await sql`
            SELECT pf.*
            FROM "PartFamily" pf
            JOIN "PartFamilyLink" pfl ON pf.part_family_id = pfl.family_id
            WHERE pfl.part_id = ${partId}
            ORDER BY pf.family_name ASC
        `;
        
        return result.map(normalizePartFamily);
    } catch (error) {
        console.error(`Error getting part families for part ${partId}:`, error);
        throw new Error(`Error getting part families: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all parts in a part family
 * @param familyId - Part family UUID
 * @returns Array of part IDs
 */
export async function getPartsInFamily(familyId: string): Promise<string[]> {
    try {
        const result = await sql`
            SELECT part_id
            FROM "PartFamilyLink"
            WHERE family_id = ${familyId}
        `;
        
        return result.map(row => row.part_id as string);
    } catch (error) {
        console.error(`Error getting parts in family ${familyId}:`, error);
        throw new Error(`Error getting parts in family: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Convert from PartFamilyFormData to PartFamily
 * @param formData - Form data
 * @returns PartFamily object
 */
export function partFamilyFormDataToPartFamily(formData: PartFamilyFormData): PartFamily {
    return {
        id: formData.part_family_id || '',
        part_family_id: formData.part_family_id || '',
        family_name: formData.family_name,
        family_description: formData.family_description || null,
        family_code: formData.family_code || null,
        family_image_url: formData.family_image_url || null,
        createdBy: formData.created_by,
        created_by: formData.created_by,
        createdAt: formData.created_at instanceof Date ? formData.created_at : new Date(formData.created_at || ''),
        created_at: formData.created_at instanceof Date ? formData.created_at : new Date(formData.created_at || ''),
        updatedBy: formData.updated_by,
        updated_by: formData.updated_by,
        updatedAt: formData.updated_at instanceof Date ? formData.updated_at : formData.updated_at ? new Date(formData.updated_at) : undefined,
        updated_at: formData.updated_at instanceof Date ? formData.updated_at : formData.updated_at ? new Date(formData.updated_at) : undefined,
        is_public: formData.is_public ?? true,
        is_active: formData.is_active ?? true
    };
}
