import sql from '$lib/server/db/postgres';
import type { Category } from '$lib/server/db/types';

// Map database row to Category type
function mapCategory(row: any): Category {
    return {
        id: row.id,
        name: row.name,
        parentId: row.parent_id || undefined,
        description: row.description || undefined,
        path: row.path || undefined,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedBy: row.updated_by || undefined,
        updatedAt: row.updated_at,
        isPublic: row.is_public,
        isDeleted: row.is_deleted,
        deletedAt: row.deleted_at || undefined,
        deletedBy: row.deleted_by || undefined
    };
}

export async function createCategory(
    params: {
        name: string;
        parentId?: string;
        description?: string;
        isPublic?: boolean;
        createdBy: string;
    }
): Promise<Category> {
    try {
        // If parent_id is provided, we need to ensure path is properly set
        let path;
        if (params.parentId) {
            // Find parent to build path
            const parentResult = await sql`
                SELECT path FROM "Category" WHERE id = ${params.parentId}
            `;
            if (parentResult.length === 0) {
                throw new Error('Parent category not found');
            }
            path = parentResult[0].path ? 
                `${parentResult[0].path}.${params.name.toLowerCase().replace(/\s+/g, '_')}` : 
                params.name.toLowerCase().replace(/\s+/g, '_');
        } else {
            path = params.name.toLowerCase().replace(/\s+/g, '_');
        }

        const result = await sql`
            INSERT INTO "Category" (
                name, 
                parent_id, 
                description, 
                path, 
                is_public, 
                created_by
            )
            VALUES (
                ${params.name}, 
                ${params.parentId || null}, 
                ${params.description || null}, 
                ${path}::ltree, 
                ${params.isPublic !== undefined ? params.isPublic : true}, 
                ${params.createdBy}
            )
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error('Failed to create category');
        }

        const category = mapCategory(result[0]);

        // If this is a new category, we need to create closure table entries
        await createCategoryClosureEntries(category.id, params.parentId);

        return category;
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Category name "${params.name}" already exists under the same parent`);
        }
        throw new Error(`Error creating category: ${error.message}`);
    }
}

// Helper for creating closure table entries
async function createCategoryClosureEntries(categoryId: string, parentId?: string): Promise<void> {
    // Self reference (depth 0)
    await sql`
        INSERT INTO "CategoryClosure" (ancestor_id, descendant_id, depth)
        VALUES (${categoryId}, ${categoryId}, 0)
    `;

    if (parentId) {
        // Copy all ancestor paths and add this category as descendant
        await sql`
            INSERT INTO "CategoryClosure" (ancestor_id, descendant_id, depth)
            SELECT ancestor_id, ${categoryId}, depth + 1
            FROM "CategoryClosure"
            WHERE descendant_id = ${parentId}
        `;
    }
}

export async function getCategory(id: string): Promise<Category | null> {
    const result = await sql`
        SELECT * FROM "Category" WHERE id = ${id} AND is_deleted = false
    `;
    
    return result.length > 0 ? mapCategory(result[0]) : null;
}

export async function updateCategory(
    id: string,
    updates: {
        name?: string;
        description?: string;
        isPublic?: boolean;
    },
    userId: string
): Promise<Category> {
    // If no updates provided, return existing category
    if (!updates.name && updates.description === undefined && updates.isPublic === undefined) {
        const existing = await getCategory(id);
        if (!existing) throw new Error('Category not found');
        return existing;
    }

    try {
        // Use sql helper for dynamic updates
        const updateObject: any = {};
        
        if (updates.name !== undefined) updateObject.name = updates.name;
        if (updates.description !== undefined) updateObject.description = updates.description;
        if (updates.isPublic !== undefined) updateObject.is_public = updates.isPublic;
        
        // Always update these fields
        updateObject.updated_by = userId;
        updateObject.updated_at = new Date();
        
        const result = await sql`
            UPDATE "Category"
            SET ${sql(updateObject)}
            WHERE id = ${id} AND is_deleted = false
            RETURNING *
        `;

        if (result.length === 0) {
            throw new Error('Category not found');
        }

        return mapCategory(result[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error(`Category name "${updates.name}" already exists under the same parent`);
        }
        throw new Error(`Error updating category: ${error.message}`);
    }
}

export async function softDeleteCategory(id: string, userId: string): Promise<void> {
    try {
        // Check for child categories
        const childrenResult = await sql`
            SELECT id FROM "Category" 
            WHERE parent_id = ${id} AND is_deleted = false
        `;
        
        if (childrenResult.length > 0) {
            throw new Error('Cannot delete category with child categories');
        }
        
        // Check for associated parts
        const partsResult = await sql`
            SELECT pv.id 
            FROM "PartVersionCategory" pvc
            JOIN "PartVersion" pv ON pvc.part_version_id = pv.id
            WHERE pvc.category_id = ${id}
            LIMIT 1
        `;
        
        if (partsResult.length > 0) {
            throw new Error('Cannot delete category with associated parts');
        }

        await sql`
            UPDATE "Category"
            SET 
                is_deleted = true,
                deleted_at = NOW(),
                deleted_by = ${userId}
            WHERE id = ${id} AND is_deleted = false
        `;
    } catch (error: any) {
        if (error.message.includes('Cannot delete')) {
            throw error;
        }
        throw new Error(`Error deleting category: ${error.message}`);
    }
}

export async function listCategories(params?: {
    parentId?: string;
    includeDeleted?: boolean;
}): Promise<Category[]> {
    // Build query based on provided parameters
    const filters = [];
    
    if (params?.parentId) {
        filters.push(sql`parent_id = ${params.parentId}`);
    } else {
        filters.push(sql`parent_id IS NULL`); // Root categories by default
    }
    
    if (!params?.includeDeleted) {
        filters.push(sql`is_deleted = false`);
    }
    
    // Combine filters with AND
    const whereClause = filters.length > 0 
        ? sql`WHERE ${sql.join(filters, sql` AND `)}` 
        : sql``;
    
    const result = await sql`
        SELECT * FROM "Category"
        ${whereClause}
        ORDER BY name
    `;
    
    return result.map(mapCategory);
}

export async function getChildCategories(parentId: string, includeDeleted = false): Promise<Category[]> {
    return listCategories({ parentId, includeDeleted });
}

export async function getCategoryPath(id: string): Promise<Category[]> {
    // Get the full path to this category using the closure table
    const result = await sql`
        SELECT c.*
        FROM "CategoryClosure" cc
        JOIN "Category" c ON cc.ancestor_id = c.id
        WHERE cc.descendant_id = ${id}
        ORDER BY cc.depth ASC
    `;
    
    return result.map(mapCategory);
}

export async function getDescendantCategories(id: string, maxDepth?: number): Promise<Category[]> {
    // Get all descendant categories (optionally limited by depth)
    const depthFilter = maxDepth !== undefined 
        ? sql`AND cc.depth <= ${maxDepth}` 
        : sql``;
    
    const result = await sql`
        SELECT c.*, cc.depth
        FROM "CategoryClosure" cc
        JOIN "Category" c ON cc.descendant_id = c.id
        WHERE cc.ancestor_id = ${id}
        AND cc.depth > 0
        ${depthFilter}
        AND c.is_deleted = false
        ORDER BY cc.depth, c.name
    `;
    
    return result.map(mapCategory);
}
