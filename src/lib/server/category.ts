// src/lib/server/category.ts
import sql from '$lib/server/db/index';
import type { Category } from '$lib/server/db/types';

/**
 * Sanitizes a category name for use in ltree paths.
 * Ensures the label is valid by replacing invalid characters, collapsing underscores,
 * converting to lowercase, and truncating to 255 characters.
 * @param name The category name to sanitize.
 * @returns A sanitized string suitable for ltree paths.
 */

// Sanitize ltree label helper
function sanitizeLtreeLabel(name: string): string {
	return name
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/_+/g, '_')
		.toLowerCase()
		.substring(0, 255);
}

/**
 * Creates a new category in the database with an optional parent.
 * @param params Object containing category details.
 * @returns A Promise resolving to the created Category object.
 * @throws Error if validation fails, parent is not found, or a duplicate name exists.
 */
export async function createCategory(
    params: {
      name: string;
      createdBy: string;
      parentId?: string;
      description?: string;
      isPublic?: boolean;
    }
  ): Promise<Category> {
    const { name, createdBy, parentId, description, isPublic = true } = params;
  
    // **Step 1: Validate Input**
    if (!name.trim()) {
      throw new Error('Category name cannot be empty');
    }
  
    // Sanitize the name for ltree path
    const sanitizedLabel = sanitizeLtreeLabel(name);
  
    // **Step 2: Handle Parent Category**
    let parentPath: string | null = null;
    if (parentId) {
      const parentResult = await sql`
        SELECT path::text AS path 
        FROM Category 
        WHERE id = ${parentId} AND is_deleted = false
      `;
  
      if (parentResult.length === 0) {
        throw new Error(`Parent category with ID ${parentId} not found`);
      }
  
      parentPath = parentResult[0].path as string;
    }
  
    // **Step 3: Construct ltree Path**
    const newPath = parentPath
      ? `${parentPath}.${sanitizedLabel}`
      : sanitizedLabel;
  
    // **Step 4: Insert New Category**
    try {
      // Create a properly formatted query using escape for ltree paths 
      const query = `
        INSERT INTO Category (
          name, parent_id, path, created_by, description, is_public
        ) VALUES (
          $1, $2, '${newPath}', $3, $4, $5
        ) RETURNING
          id,
          name,
          parent_id,
          description,
          created_by,
          created_at,
          updated_by,
          updated_at,
          is_public,
          is_deleted,
          deleted_at,
          deleted_by
      `;
      
      // Use plain query execution with array of parameters
      const result = await sql.unsafe(query, [
        name,
        parentId || null,
        createdBy,
        description || null,
        isPublic
      ]);
  
      if (result.length === 0) {
        throw new Error('Failed to create category');
      }
  
      const row = result[0];
  
      // **Step 5: Map to Category Type**
      return {
        id: row.id as string,
        name: row.name as string,
        parentId: row.parent_id as string | undefined,
        path: newPath,
        description: row.description as string | undefined,
        createdBy: row.created_by as string,
        createdAt: row.created_at as Date,
        updatedBy: row.updated_by as string | undefined,
        updatedAt: row.updated_at as Date,
        isPublic: row.is_public as boolean,
        isDeleted: row.is_deleted as boolean,
        deletedAt: row.deleted_at as Date | undefined,
        deletedBy: row.deleted_by as string | undefined
      };
    } catch (error: any) {
      // **Step 6: Handle Errors**
      if (error.code === '23505') {
        throw new Error(`Category name "${name}" already exists under this parent`);
      }
      throw new Error(`Error creating category: ${error.message}`);
    }
  }



// Helper function to map database rows to Category objects
function normalizeCategory(row: any): Category {
	return {
		id: row.id,
		name: row.name,
		parentId: row.parent_id || undefined,
		description: row.description || undefined,
		path: row.path,
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

// Get category by ID with transaction support
export async function getCategory(id: string): Promise<Category | null> {
	const result = await sql`
		SELECT * FROM Category 
		WHERE id = ${id} AND is_deleted = false
	`;
	return result.length > 0 ? normalizeCategory(result[0]) : null;
}

// Update category with transaction and error handling
export async function updateCategory(
	id: string,
	updates: {
		name?: string;
		description?: string;
		isPublic?: boolean;
	},
	userId: string
): Promise<Category> {
	// Return early if no updates
	if (Object.keys(updates).length === 0) {
		const existing = await getCategory(id);
		if (!existing) throw new Error('Category not found');
		return existing;
	}

	// Build dynamic SET clause with porsager/postgres approach
	const setParts = [];
	const updateValues: any = {};

	if (updates.name !== undefined) {
		setParts.push('name = ${name}');
		updateValues.name = updates.name;
	}

	if (updates.description !== undefined) {
		setParts.push('description = ${description}');
		updateValues.description = updates.description;
	}

	if (updates.isPublic !== undefined) {
		setParts.push('is_public = ${isPublic}');
		updateValues.isPublic = updates.isPublic;
	}

	// Always add updated_by and updated_at
	setParts.push('updated_by = ${userId}');
	updateValues.userId = userId;
	setParts.push('updated_at = NOW()');

	// Add ID for WHERE clause
	updateValues.id = id;

	// Use sql.unsafe for dynamic queries
	const result = await sql.unsafe(`
		UPDATE Category
		SET ${setParts.join(', ')}
		WHERE id = \${id}
		RETURNING *
	`, updateValues);

	if (result.length === 0) throw new Error('Category update failed');
	return normalizeCategory(result[0]);
}

// Soft-delete a category by marking is_deleted
export async function deleteCategory(
  id: string,
  userId: string
): Promise<void> {
  await sql`
    UPDATE Category 
    SET is_deleted = true, deleted_by = ${userId}, deleted_at = NOW() 
    WHERE id = ${id}
  `;
}

// Get hierarchical children with ltree
export async function getChildCategories(parentId?: string): Promise<Category[]> {
	let result;
	
	if (parentId) {
		result = await sql`
			SELECT * FROM Category 
			WHERE parent_id = ${parentId} 
			AND is_deleted = false 
			ORDER BY name
		`;
	} else {
		result = await sql`
			SELECT * FROM Category 
			WHERE parent_id IS NULL 
			AND is_deleted = false 
			ORDER BY name
		`;
	}

	return result.map(normalizeCategory);
}

// Get full hierarchy using ltree
export async function getCategoryTree(): Promise<Category[]> {
	const result = await sql`
		SELECT * FROM Category 
		WHERE is_deleted = false 
		ORDER BY path
	`;

	return result.map(normalizeCategory);
}

// Move category hierarchy with full transaction support
export async function moveCategory(
	categoryId: string,
	newParentId: string | null,
	userId: string
): Promise<Category> {
	// Use transactions with porsager/postgres
	await sql`BEGIN`;
	try {
		// Validate move operation
		const category = await getCategory(categoryId);
		if (!category) throw new Error('Category not found');

		if (newParentId) {
			const newParent = await getCategory(newParentId);
			if (!newParent) throw new Error('New parent category not found');
			if (await isDescendant(categoryId, newParentId)) {
				throw new Error('Cannot move category to its own descendant');
			}
		}

		// Calculate new path
		const newParentPath = newParentId ? (await getCategory(newParentId))?.path || '' : '';
		const newPath = newParentPath
			? `${newParentPath}.${sanitizeLtreeLabel(category.name)}`
			: sanitizeLtreeLabel(category.name);

		// Update category and descendants
		await sql`
			UPDATE Category
			SET parent_id = ${newParentId}, 
			    path = ${newPath}, 
			    updated_by = ${userId}, 
			    updated_at = NOW()
			WHERE id = ${categoryId}
		`;

		// Update descendant paths using ltree using array of parameters
		const updateQuery = `
			UPDATE Category
			SET path = text2ltree($1 || subpath(path, nlevel($2)))
			WHERE path <@ $2 AND id != $3
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
		throw error;
	}
}

// Helper function to check descendant relationship
async function isDescendant(
	ancestorId: string,
	descendantId: string
): Promise<boolean> {
	const result = await sql`
		SELECT 1 FROM CategoryClosure
		WHERE ancestor_id = ${ancestorId} AND descendant_id = ${descendantId}
	`;
	return result.length > 0;
}
