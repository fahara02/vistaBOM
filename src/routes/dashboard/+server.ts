// src/routes/dashboard/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import { getAllCategories } from '$lib/core/category';
import type { Category, Manufacturer, Part, Supplier, User } from '$lib/types/schemaTypes';
import type { DbProject } from '$lib/types/types';

/**
 * GET handler for dashboard.json endpoint
 * Returns the same data as the main dashboard page load function
 * This enables refreshing dashboard data without a full page reload
 */
export async function GET({ locals }: RequestEvent) {
    const user = locals.user as User | null;
    if (!user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    try {
        // 1. Fetch user projects
        const projectsResult = await sql`
            SELECT 
                project_id, 
                project_name, 
                project_description, 
                owner_id, 
                project_status,
                created_at, 
                updated_at,
                updated_by
            FROM "Project" 
            WHERE owner_id = ${user.user_id}
        `;

        const projects: DbProject[] = projectsResult.map(proj => {
            return {
                project_id: proj.project_id,
                project_name: proj.project_name,
                owner_id: proj.owner_id,
                project_status: proj.project_status,
                created_at: proj.created_at,
                updated_at: proj.updated_at,
                project_description: proj.project_description ?? undefined,
                updated_by: proj.updated_by ?? undefined
            } as DbProject;
        });
        
        // 2. Get all categories for the dashboard
        const categories = await getAllCategories();
        
        // 3. Fetch user-created parts with their current version data
        let userParts: Part[] = [];
        try {
            userParts = await sql`
                SELECT 
                    p.part_id, 
                    p.creator_id AS "creatorId", 
                    p.status_in_bom,
                    p.lifecycle_status AS "lifecycleStatus",
                    p.is_public AS "isPublic",
                    p.created_at AS "createdAt",
                    p.updated_at AS "updatedAt",
                    p.current_version_id AS "currentVersionId",
                    -- Include part version details
                    pv.part_name,
                    pv.part_version,
                    pv.short_description AS "shortDescription"
                FROM "Part" p
                -- Left join to get the current version details if available
                LEFT JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
                WHERE p.creator_id = ${user.user_id}
                ORDER BY p.created_at DESC
            `;
        } catch (error) {
            console.error('Error fetching user parts:', error);
            userParts = [];
        }
        
        // 4. Fetch user-created manufacturers
        let userManufacturers: Manufacturer[] = [];
        try {
            userManufacturers = await sql`
                SELECT 
                    m.*,
                    COALESCE(
                        (SELECT json_object_agg(cf.field_name, mcf.custom_field_value)
                        FROM "ManufacturerCustomField" mcf
                        JOIN "CustomField" cf ON mcf.field_id = cf.custom_field_id
                        WHERE mcf.manufacturer_id = m.manufacturer_id
                        ), '{}'::json) AS custom_fields
                FROM "Manufacturer" m
                WHERE m.created_by = ${user.user_id}
                ORDER BY m.manufacturer_name ASC
            `;
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
        }
        
        // 5. Fetch user-created suppliers
        let userSuppliers: Supplier[] = [];
        try {
            userSuppliers = await sql`
                SELECT *
                FROM "Supplier"
                WHERE created_by = ${user.user_id}
                ORDER BY supplier_name ASC
            `;
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
        
        // 6. Fetch user-created categories (excluding deleted categories)
        let userCategories: Category[] = [];
        try {
            userCategories = await sql`
                SELECT c.*, p.category_name as parent_name
                FROM "Category" c
                LEFT JOIN "Category" p ON c.parent_id = p.category_id
                WHERE c.created_by = ${user.user_id} AND c.is_deleted = false
                ORDER BY c.category_name ASC
            `;
            
            console.log(`Found ${userCategories.length} categories created by the user`);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
        
        // 7. Fetch all categories (excluding deleted categories)
        let allCategories: Category[] = [];
        try {
            allCategories = await sql`
                SELECT c.*, p.category_name as parent_name
                FROM "Category" c
                LEFT JOIN "Category" p ON c.parent_id = p.category_id
                WHERE c.is_deleted = false
                ORDER BY c.category_name ASC
            `;
            
            console.log(`Found ${allCategories.length} total active categories`);
        } catch (error) {
            console.error('Error fetching all categories:', error);
        }
        
        // Return all the dashboard data as JSON
        return json({
            projects,
            categories,
            userParts,
            userManufacturers,
            userSuppliers,
            userCategories,
            allCategories
        });
    } catch (error) {
        console.error('Error in dashboard data endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

/**
 * POST handler for dashboard AJAX operations
 * Handles category deletions and other actions via fetch API
 */
export async function POST({ locals, request }: RequestEvent) {
    const user = locals.user as User | null;
    if (!user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    try {
        const formData = await request.formData();
        const action = formData.get('action');
        
        // Handle category deletion
        if (action === 'delete_category') {
            const categoryId = formData.get('category_id');
            if (!categoryId || typeof categoryId !== 'string') {
                return json({ error: 'Category ID is required' }, { status: 400 });
            }
            // Ensure categoryId is a string for SQL query
            
            // Check if user owns the category or is admin
            const category = await sql`
                SELECT * FROM "Category"
                WHERE category_id = ${categoryId.toString()}
            `;
            
            if (category.length === 0) {
                return json({ error: 'Category not found' }, { status: 404 });
            }
            
            if (category[0].created_by !== user.user_id && !user.is_admin) {
                return json({ error: 'Not authorized to delete this category' }, { status: 403 });
            }
            
            // Execute hard delete
            await sql`
                DELETE FROM "Category"
                WHERE category_id = ${categoryId.toString()}
            `;
            
            return json({ success: true, message: 'Category deleted successfully' });
        }
        
        // Handle supplier deletion
        if (action === 'delete_supplier') {
            const supplierId = formData.get('supplier_id');
            if (!supplierId || typeof supplierId !== 'string') {
                return json({ error: 'Supplier ID is required' }, { status: 400 });
            }
            
            // Check if user owns the supplier or is admin
            const supplier = await sql`
                SELECT * FROM "Supplier"
                WHERE supplier_id = ${supplierId.toString()}
            `;
            
            if (supplier.length === 0) {
                return json({ error: 'Supplier not found' }, { status: 404 });
            }
            
            if (supplier[0].created_by !== user.user_id && !user.is_admin) {
                return json({ error: 'Not authorized to delete this supplier' }, { status: 403 });
            }
            
            // Execute delete
            await sql`
                DELETE FROM "SupplierCustomField"
                WHERE supplier_id = ${supplierId.toString()}
            `;
            
            await sql`
                DELETE FROM "Supplier"
                WHERE supplier_id = ${supplierId.toString()}
            `;
            
            return json({ success: true, message: 'Supplier deleted successfully' });
        }
        
        // Return error for unknown actions
        return json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Error in dashboard POST endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
