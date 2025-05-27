// src/lib/actions/dashboard/category.ts
import sql from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { Category, User } from '$lib/types/schemaTypes';
import { createCategory, getAllCategories, sanitizeLtreeLabel } from '$lib/core/category';
import { categoryFormSchema } from '$lib/schema/schema';

// Using categoryFormSchema which now includes category_id for edit operations

/**
 * Handles category creation, updating, and deletion
 */
export async function categoryAction(event: RequestEvent) {
    console.log('\n\n=================== CATEGORY ACTION CALLED ===================');
    
    // Access the user from locals
    const user = event.locals.user as User | null;
    if (!user) {
        console.log('Authentication failed: No user in locals');
        return fail(401, { message: 'You must be logged in to manage categories' });
    }
    console.log('Authenticated user:', user.user_id);

    // Debug all incoming request data
    const formData = await event.request.formData();
    console.log('\nFORM DATA RECEIVED:');
    for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    
    // Check for delete operation with extensive debugging
    const hasActionField = formData.has('action');
    const actionValue = formData.get('action');
    const hasDeleteField = formData.has('delete');
    const deleteValue = formData.get('delete');
    
    console.log('\nDELETE CHECK:');
    console.log('- Has action field:', hasActionField);
    console.log('- Action value:', actionValue);
    console.log('- Has delete field:', hasDeleteField);
    console.log('- Delete value:', deleteValue);
    
    const isDeleteAction = (hasActionField && actionValue === 'delete') || 
                        (hasDeleteField && deleteValue === 'true');
    console.log('Is delete action:', isDeleteAction);
    
    if (isDeleteAction) {
        console.log('\nPROCESSING DELETE REQUEST:');
        // This is a delete category request
        const categoryId = formData.get('categoryId')?.toString();
        if (!categoryId) {
            return fail(400, { message: 'Category ID is required for deletion' });
        }
        
        try {
            console.log(`Deleting category ${categoryId}`);
            
            // First check if the category exists
            const categoryCheck = await sql`
                SELECT category_id, category_path 
                FROM "Category" 
                WHERE category_id = ${categoryId}
                AND is_deleted = false`;

            if (categoryCheck.length === 0) {
                return fail(404, { message: 'Category not found' });
            }
            
            // Check if this category has children - we should prevent deletion if it has children
            // unless a force flag is provided
            const force = formData.get('force') === 'true';
            const categoryPath = categoryCheck[0].category_path;
            
            if (!force && categoryId) { // Fixed condition
                // Check for child categories
                const childQuery = `${categoryPath}.*`;
                const childCategories = await sql`
                    SELECT COUNT(*) as count
                    FROM "Category" 
                    WHERE category_path ~ ${childQuery}::lquery
                    AND is_deleted = false`;
                    
                if (childCategories[0].count > 0) {
                    return fail(400, { 
                        message: `Cannot delete category with children. This category has ${childCategories[0].count} child categories.`,
                        hasChildren: true,
                        childCount: childCategories[0].count
                    });
                }
            }
            
            // Perform soft delete by setting is_deleted flag
            await sql`
                UPDATE "Category"
                SET 
                    is_deleted = true,
                    updated_at = NOW()::timestamptz,
                    updated_by = ${user.user_id}
                WHERE category_id = ${categoryId}`;
                
            // Get fresh list of categories after deletion
            const updatedCategories = await getAllCategories();
            
            // Create and validate a form for message return
            const form = await superValidate(zod(categoryFormSchema));
            // Return success message without using the data property
            return message(form, 'Category deleted successfully');
            // Note: If needed, frontend can call getAllCategories() again after deletion
        } catch (err) {
            console.error('Error deleting category:', err);
            return fail(500, { 
                message: `Failed to delete category: ${err instanceof Error ? err.message : 'Unknown error'}` 
            });
        }
    }

    // Handle create/update operations
    // Use the categoryFormSchema which now includes category_id field for editing mode
    const form = await superValidate(formData, zod(categoryFormSchema));
    
    // Debug validation issues
    console.log('Form validation result:', form.valid);
    console.log('Form data after validation:', form.data);
    console.log('Form errors:', form.errors);
    
    // Validate the form data
    if (!form.valid) {
        return message(form, `Invalid form data: ${JSON.stringify(form.errors)}`, { status: 400 });
    }
    
    // Check if we're in edit mode
    const isEditMode = form.data.category_id ? true : false;
    
    try {
        if (isEditMode) {
            // EDIT MODE: Update existing category
            
            // Get validated data
            const categoryId = form.data.category_id!;
            
            // Process parent_id - may be null for root categories
            let parentId = form.data.parent_id || null;
            
            // Handle non-null parent: verify it exists and get its path
            let parentPath = '';
            if (parentId) {
                // Verify parent exists
                const parentResult = await sql`
                    SELECT category_path 
                    FROM "Category" 
                    WHERE category_id = ${parentId} 
                    AND is_deleted = false
                `;
                
                if (parentResult.length === 0) {
                    return message(form, 'Parent category not found', { status: 404 });
                }
                
                parentPath = parentResult[0].category_path;
            }
            
            // Get current info about the category being edited
            const categoryCheck = await sql`
                SELECT category_id, category_path, category_name
                FROM "Category" 
                WHERE category_id = ${categoryId}
                AND is_deleted = false
            `;

            if (categoryCheck.length === 0) {
                return message(form, 'Category not found', { status: 404 });
            }
            
            const oldPath = categoryCheck[0].category_path;                                
            // Create the new path based on sanitized name and parent path
            const sanitizedLabel = sanitizeLtreeLabel(form.data.category_name);
            // Construct new path based on provided parent
            let path: string;
            if (parentId) {
                const parentData = await sql`
                    SELECT category_path FROM "Category" 
                    WHERE category_id = ${parentId}
                `;
                if (parentData.length === 0) {
                    return message(form, 'Parent category not found', { status: 404 });
                }
                // Construct path using parent path + new sanitized name
                path = `${parentData[0].category_path}.${sanitizedLabel}`;
            } else {
                // Root level category
                path = sanitizedLabel;
            }

            // Begin transaction to update category and its children
            await sql.begin(async (sql) => {
                // Attempt to update category with explicitly typed parameters
                // CRITICAL FIX: Use original category_name, NOT sanitizedLabel which is only for paths
                const updatedCategory = await sql`
                    UPDATE "Category"
                    SET 
                        category_name = ${form.data.category_name}, 
                        parent_id = ${parentId || null},
                        category_description = ${form.data.category_description || null},
                        is_public = ${Boolean(form.data.is_public)},
                        category_path = ${path}, -- Only path uses sanitized value
                        updated_at = NOW()::timestamptz,
                        updated_by = ${user.user_id}
                    WHERE category_id = ${form.data.category_id || null}
                    RETURNING *
                `;

                // If path has changed, update all child category paths
                if (oldPath && oldPath !== path) {
                    // Find all child categories using PostgreSQL ltree pattern matching
                    // We use the ltree pattern matching with ~ to find all descendants
                    const childQuery = `${oldPath}.*`;
                    console.log(`Looking for child categories with pattern: ${childQuery}`);
                    
                    const childCategories = await sql`
                        SELECT category_id, category_path 
                        FROM "Category" 
                        WHERE category_path ~ ${childQuery}::lquery
                        AND category_path != ${oldPath}
                        AND is_deleted = false
                    `;

                    console.log(`Found ${childCategories.length} child categories to update`); 

                    // Update each child path by replacing the prefix
                    for (const child of childCategories) {
                        const newChildPath = child.category_path.replace(oldPath, path);
                        await sql`
                            UPDATE "Category"
                            SET category_path = ${newChildPath},
                                updated_at = NOW()::timestamptz,
                                updated_by = ${user.user_id}
                            WHERE category_id = ${child.category_id}
                        `;
                        console.log(`Updated child path from ${child.category_path} to ${newChildPath}`);
                    }
                }
            });
            
            // Return success message
            return message(form, 'Category updated successfully');
        } else {
            // CREATE MODE: Create new category
            try {
                // Use validated form data from SuperForm rather than raw form data
                const categoryName = form.data.category_name;
                
                // Process parent_id from validated form data
                let parentId = form.data.parent_id || null;
                
                // Validate parent ID if provided
                if (parentId) {
                    // Check if it's a valid UUID
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (!uuidRegex.test(String(parentId))) {
                        return message(form, 'Invalid parent category ID format', { status: 400 });
                    }
                    
                    // Verify parent category exists
                    const parentCheck = await sql`
                        SELECT category_id, category_path FROM "Category" 
                        WHERE category_id = ${parentId} AND is_deleted = false
                    `;
                    
                    if (parentCheck.length === 0) {
                        return message(form, 'Parent category not found', { status: 400 });
                    }
                }
                
                // Use the sanitizeLtreeLabel function for consistent path formatting
                const sanitizedLabel = sanitizeLtreeLabel(categoryName);
                console.log(`Creating category: "${categoryName}" (sanitized as "${sanitizedLabel}") with parentId:`, parentId || 'none');
                
                // Convert form data to match the expected parameters for createCategory
                await createCategory({
                    name: categoryName,
                    parentId: parentId || undefined, // Ensure null becomes undefined
                    description: form.data.category_description || undefined,
                    isPublic: Boolean(form.data.is_public), // Use the actual value from form
                    createdBy: user.user_id
                });
                
                console.log('Category created successfully with path updates');
            } catch (err) {
                console.error('Error creating category:', err);
                return message(form, `Category creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 500 });
            }
            
            // Return success message
            return message(form, 'Category created successfully');
        }
    } catch (err) {
        console.error(isEditMode ? 'Update category error:' : 'Create category error:', err);
        // Return form with error message
        return message(form, `Failed to ${isEditMode ? 'update' : 'create'} category: ` + (err instanceof Error ? err.message : 'Unknown error'));
    }
}
