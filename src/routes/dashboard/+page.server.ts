//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import { DimensionUnitEnum, LifecycleStatusEnum, PackageTypeEnum, PartStatusEnum, WeightUnitEnum } from '$lib/types';
import type { JsonValue } from '$lib/types/primitive';
import { createCategory, getAllCategories } from '$lib/core/category';
import { createManufacturer } from '$lib/core/manufacturer';
import { createPart, getPartWithCurrentVersion } from '$lib/core/parts';
import { createSupplier } from '$lib/core/supplier';
import { categoryFormSchema, createPartSchema, manufacturerSchema, supplierSchema } from '$lib/schema/schema';

import type { Category, Manufacturer, Part, Supplier, User } from '$lib/types/schemaTypes';
import type { DbProject } from '$lib/types/types';
import { fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate, message } from 'sveltekit-superforms/server';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

// Import refactored action handlers
import { categoryAction } from '$lib/actions/dashboard/category';
import { manufacturerAction } from '$lib/actions/dashboard/manufacturer';
import { supplierAction } from '$lib/actions/dashboard/supplier';
import { projectAction } from '$lib/actions/dashboard/project';
import { partAction } from '$lib/actions/dashboard/part';

// Helper function for creating enum schemas that properly handle null/undefined/empty values
function createNullableEnum<T extends Record<string, string>>(enumType: T) {
    return z.union([
        z.nativeEnum(enumType),
        z.null(),
        z.undefined(),
        z.literal('null'),
        z.literal('')
    ]).optional().nullable().transform(value => {
        // Transform empty strings and 'null' to actual null
        if (value === '' || value === 'null') return null;
        return value;
    });
}

// Using the centralized schemas from schema.ts - no custom schemas

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user as User | null;
    if (!user) throw redirect(302, '/');
    
    // Initialize all forms and data needed for the dashboard
    
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
    
    // 2. Initialize Manufacturer form data
    const manufacturerForm = await superValidate(zod(manufacturerSchema));
    
    // 3. Initialize Supplier form data
    const supplierForm = await superValidate(zod(supplierSchema));
    // IMPORTANT: Always reset supplier_id to empty string for new form initialization
    // This prevents SuperForm from maintaining a previous supplier_id between page loads
    supplierForm.data.supplier_id = '';
    
    // 4. Initialize Part form data with extended schema that includes relationship fields
    const partForm = await superValidate(zod(createPartSchema));
    // Initialize dimensions to prevent null reference errors
    if (!partForm.data.dimensions) {
        partForm.data.dimensions = { length: 0, width: 0, height: 0 };
    }
    // Add default status if not set
    if (!partForm.data.version_status) {
        partForm.data.version_status = LifecycleStatusEnum.DRAFT;
    }
    
    // 5. Initialize Category form data using the imported schema from types
    const categoryForm = await superValidate(zod(categoryFormSchema));
    
    // 6. Get category tree for parent selection
    const categories = await getAllCategories();
    
    // 7. Fetch user-created parts with their current version data
    let userParts: Part[] = [];
    try {
        // Following the pattern from other entities, fetch parts created by the user
        // with their most recent version details
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
                pv.part_version AS "partVersion",
                pv.part_name AS "partName",
                pv.short_description AS "description",
                pv.revision_notes AS "remarks",
                -- Include category names as an array instead of just IDs
                (
                    SELECT jsonb_agg(jsonb_build_object(
                        'category_id', c.category_id, 
                        'category_name', c.category_name
                    ))
                    FROM "PartVersionCategory" pvc
                    JOIN "Category" c ON pvc.category_id = c.category_id
                    WHERE pvc.part_version_id = pv.part_version_id
                ) AS categories
            FROM "Part" p
            JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
            WHERE p.creator_id = ${user.user_id}
            ORDER BY pv.part_name ASC
        `;
    } catch (error) {
        console.error('Error fetching user parts:', error);
        userParts = [];
    }

    // 8. Fetch user-created manufacturers with custom fields
    let userManufacturers: Manufacturer[] = [];
    try {
        // Import the core function to list manufacturers by user
        const { listManufacturersByUser } = await import('$lib/core/manufacturer');
        
        // Use the core function to get all manufacturers created by this user
        userManufacturers = await listManufacturersByUser(user.user_id);
        
        // Log the first manufacturer for debugging
        if (userManufacturers.length > 0) {
            console.log('First manufacturer retrieved:', userManufacturers[0]);
            console.log('Custom fields from first manufacturer:', userManufacturers[0].custom_fields);
        }
    } catch (error) {
        console.error('Error fetching user manufacturers:', error);
        userManufacturers = [];
    }

    // 9. Fetch user-created suppliers
    let userSuppliers: Supplier[] = [];
    try {
        // The Supplier component expects snake_case field names
        userSuppliers = await sql`
            SELECT 
                supplier_id,
                supplier_name,
                supplier_description,
                website_url,
                contact_info,
                logo_url,
                created_at,
                updated_at,
                created_by,
                updated_by
            FROM "Supplier"
            WHERE created_by = ${user.user_id}
            ORDER BY supplier_name ASC
        `;
        // Log the first supplier for debugging
        if (userSuppliers.length > 0) {
            console.log('First supplier retrieved:', userSuppliers[0]);
        }
    } catch (error) {
        console.error('Error fetching user suppliers:', error);
        userSuppliers = [];
    }

    // 10. Fetch user-created categories
    let userCategories: Category[] = [];
    try {
        // Categories query with parent name included
        userCategories = await sql`
            SELECT 
                c.category_id AS "categoryId",
                c.category_name AS "categoryName",
                c.category_description AS "categoryDescription",
                c.category_path AS "categoryPath",
                c.parent_id AS "parentId",
                p.category_name AS "parentName",
                c.is_public AS "isPublic",
                c.created_at AS "createdAt",
                c.updated_at AS "updatedAt",
                c.created_by AS "createdBy",
                c.updated_by AS "updatedBy"
            FROM "Category" c
            LEFT JOIN "Category" p ON c.parent_id = p.category_id
            WHERE c.created_by = ${user.user_id}
            AND c.is_deleted = false
            ORDER BY c.category_name ASC
        `;
    } catch (error) {
        console.error('Error fetching user categories:', error);
        userCategories = [];
    }

    return {
        // Form data for direct use in forms
        forms: {
            manufacturer: manufacturerForm,
            supplier: supplierForm,
            part: partForm,
            category: categoryForm
        },
        // Data for building the dashboard UI
        projects,
        categories,
        // User-created data for display in dashboard tabs
        userParts,
        userManufacturers,
        userSuppliers,
        userCategories
    };
};

export const actions: Actions = {
    // All actions are now refactored to dedicated files
    // with clear responsibility separation

    // Project creation - use imported action handler
    project: projectAction,

    // Manufacturer creation and update - use imported action handler
    manufacturer: manufacturerAction,

    // Category creation, editing and deletion - use imported action handler
    category: categoryAction,
    
    // Supplier creation and update - use imported action handler
    supplier: supplierAction,
    
    // Part creation and editing - use imported action handler
    part: partAction
};
