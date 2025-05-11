// src/lib/server/categories.ts
import type { Client } from 'ts-postgres';
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
 * @param client The ts-postgres Client instance for database operations.
 * @param params Object containing category details.
 * @returns A Promise resolving to the created Category object.
 * @throws Error if validation fails, parent is not found, or a duplicate name exists.
 */
export async function createCategory(
    client: Client,
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
      const parentResult = await client.query(
        'SELECT path::text AS path FROM Category WHERE id = $1 AND is_deleted = false',
        [parentId]
      );
  
      if (parentResult.rows.length === 0) {
        throw new Error(`Parent category with ID ${parentId} not found`);
      }
  
      parentPath = parentResult.rows[0].get('path') as string;
    }
  
    // **Step 3: Construct ltree Path**
    const newPath = parentPath
      ? `${parentPath}.${sanitizedLabel}`
      : sanitizedLabel;
  
    // **Step 4: Insert New Category**
    try {
      // Inline path literal to bypass LTREE driver type error
      const insertSql = `
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
          deleted_by`;
      const result = await client.query(insertSql, [
        name,
        parentId || null,
        createdBy,
        description || null,
        isPublic
      ]);
  
      if (result.rows.length === 0) {
        throw new Error('Failed to create category');
      }
  
      const row = result.rows[0];
  
      // **Step 5: Map to Category Type**
      return {
        id: row.get('id') as string,
        name: row.get('name') as string,
        parentId: row.get('parent_id') as string | undefined,
        path: newPath,
        description: row.get('description') as string | undefined,
        createdBy: row.get('created_by') as string,
        createdAt: row.get('created_at') as Date,
        updatedBy: row.get('updated_by') as string | undefined,
        updatedAt: row.get('updated_at') as Date,
        isPublic: row.get('is_public') as boolean,
        isDeleted: row.get('is_deleted') as boolean,
        deletedAt: row.get('deleted_at') as Date | undefined,
        deletedBy: row.get('deleted_by') as string | undefined
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
function mapCategory(row: any): Category {
	return {
		id: row.get('id'),
		name: row.get('name'),
		parentId: row.get('parent_id') || undefined,
		description: row.get('description') || undefined,
		path: row.get('path'),
		createdBy: row.get('created_by'),
		createdAt: row.get('created_at'),
		updatedBy: row.get('updated_by') || undefined,
		updatedAt: row.get('updated_at'),
		isPublic: row.get('is_public'),
		isDeleted: row.get('is_deleted'),
		deletedAt: row.get('deleted_at') || undefined,
		deletedBy: row.get('deleted_by') || undefined
	};
}

// Get category by ID with transaction support
export async function getCategory(client: Client, id: string): Promise<Category | null> {
	const result = await client.query(`SELECT * FROM Category WHERE id = $1 AND is_deleted = false`, [
		id
	]);
	return result.rows.length > 0 ? mapCategory(result.rows[0]) : null;
}

// Update category with transaction and error handling
export async function updateCategory(
	client: Client,
	id: string,
	updates: {
		name?: string;
		description?: string;
		isPublic?: boolean;
	},
	userId: string
): Promise<Category> {
	const fields = [];
	const values = [];
	let paramIndex = 1;

	if (updates.name !== undefined) {
		fields.push(`name = $${paramIndex}`);
		values.push(updates.name);
		paramIndex++;
	}

	if (updates.description !== undefined) {
		fields.push(`description = $${paramIndex}`);
		values.push(updates.description);
		paramIndex++;
	}

	if (updates.isPublic !== undefined) {
		fields.push(`is_public = $${paramIndex}`);
		values.push(updates.isPublic);
		paramIndex++;
	}

	if (fields.length === 0) {
		const existing = await getCategory(client, id);
		if (!existing) throw new Error('Category not found');
		return existing;
	}

	fields.push(`updated_by = $${paramIndex}`);
	values.push(userId);
	paramIndex++;

	fields.push(`updated_at = NOW()`);

	values.push(id);

	const query = `
        UPDATE Category
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;

	const result = await client.query(query, values);
	if (result.rows.length === 0) throw new Error('Category update failed');
	return mapCategory(result.rows[0]);
}

// Soft delete category with transaction
export async function deleteCategory(client: Client, id: string, userId: string): Promise<void> {
	await client.query(
		`UPDATE Category
         SET is_deleted = true,
             deleted_at = NOW(),
             deleted_by = $1
         WHERE id = $2`,
		[userId, id]
	);
}

// Get hierarchical children with ltree
export async function getChildCategories(client: Client, parentId?: string): Promise<Category[]> {
	const query = parentId
		? `SELECT * FROM Category 
           WHERE parent_id = $1 
           AND is_deleted = false 
           ORDER BY name`
		: `SELECT * FROM Category 
           WHERE parent_id IS NULL 
           AND is_deleted = false 
           ORDER BY name`;

	const result = await client.query(query, parentId ? [parentId] : []);
	return result.rows.map(mapCategory);
}

// Get full hierarchy using ltree
export async function getCategoryTree(client: Client): Promise<Category[]> {
	const result = await client.query(
		`SELECT * FROM Category 
         WHERE is_deleted = false 
         ORDER BY path`
	);
	return result.rows.map(mapCategory);
}

// Move category hierarchy with full transaction support
export async function moveCategory(
	client: Client,
	categoryId: string,
	newParentId: string | null,
	userId: string
): Promise<Category> {
	await client.query('BEGIN');
	try {
		// Validate move operation
		const category = await getCategory(client, categoryId);
		if (!category) throw new Error('Category not found');

		if (newParentId) {
			const newParent = await getCategory(client, newParentId);
			if (!newParent) throw new Error('New parent category not found');
			if (await isDescendant(client, categoryId, newParentId)) {
				throw new Error('Cannot move category to its own descendant');
			}
		}

		// Calculate new path
		const newParentPath = newParentId ? (await getCategory(client, newParentId))?.path || '' : '';
		const newPath = newParentPath
			? `${newParentPath}.${sanitizeLtreeLabel(category.name)}`
			: sanitizeLtreeLabel(category.name);

		// Update category and descendants
		await client.query(
			`UPDATE Category
             SET parent_id = $1, path = $2, updated_by = $3, updated_at = NOW()
             WHERE id = $4`,
			[newParentId, newPath, userId, categoryId]
		);

		// Update descendant paths using ltree
		await client.query(
			`UPDATE Category
             SET path = text2ltree($1 || subpath(path, nlevel($2)))
             WHERE path <@ $2 AND id != $3`,
			[newPath, category.path, categoryId]
		);

		await client.query('COMMIT');
		return (await getCategory(client, categoryId))!;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	}
}

// Helper function to check descendant relationship
async function isDescendant(
	client: Client,
	ancestorId: string,
	descendantId: string
): Promise<boolean> {
	const result = await client.query(
		`SELECT 1 FROM CategoryClosure
         WHERE ancestor_id = $1 AND descendant_id = $2`,
		[ancestorId, descendantId]
	);
	return result.rows.length > 0;
}
