//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import { DimensionUnitEnum, LifecycleStatusEnum, PackageTypeEnum, PartStatusEnum, WeightUnitEnum } from '$lib/types';
import type { JsonValue } from '$lib/types/primitive';
import { createCategory, getAllCategories } from '$lib/core/category';
import { createManufacturer } from '$lib/core/manufacturer';
import { createUnifiedPart, getPartWithCurrentVersion, getUnifiedPart } from '$lib/core/parts';
import { createSupplier } from '$lib/core/supplier';
import { categoryFormSchema, createPartSchema, manufacturerSchema, supplierSchema } from '$lib/schema/schema';

import type { Category, Manufacturer, Part, Supplier, User, UnifiedPart } from '$lib/types/schemaTypes';
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
    // Initialize dimensions as null since they are optional in the database schema
    // This follows the constraint that if a unit is null, the value must also be null
    partForm.data.dimensions = null;
    partForm.data.dimensions_unit = null;
    // Add default status if not set
    if (!partForm.data.version_status) {
        partForm.data.version_status = LifecycleStatusEnum.DRAFT;
    }
    
    // 5. Initialize Category form data using the imported schema from types
    const categoryForm = await superValidate(zod(categoryFormSchema));
    
    // 6. Get category tree for parent selection
    const categories = await getAllCategories();
    
    // Use the UnifiedPart type from schemaTypes.ts as the single source of truth
    // This replaces the custom PartWithVersionFields interface with the standard type
    
    // 7. Fetch user-created parts using the getUnifiedPart function
    let userParts: UnifiedPart[] = [];
    try {
        // First, get all part IDs created by the user
        const userPartIds = await sql`
            SELECT part_id
            FROM "Part"
            WHERE creator_id = ${user.user_id}
            ORDER BY created_at DESC
        `;
        
        console.log(`Retrieved ${userPartIds.length} part IDs for user ${user.user_id}`);
        
        // Then fetch complete UnifiedPart data for each part
        const partPromises = userPartIds.map(async (row) => {
            const partId = row.part_id;
            const unifiedPart = await getUnifiedPart(partId);
            return unifiedPart;
        });
        
        // Wait for all promises to resolve and filter out null results
        const partResults = await Promise.all(partPromises);
        userParts = partResults.filter((part): part is UnifiedPart => part !== null);
        
        // Log the first part to understand the structure
        if (userParts.length > 0) {
            console.log('Debug - First unified part data structure:', JSON.stringify(userParts[0], null, 2));
        }
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
        
        // Log manufacturers for debugging
        console.log(`Retrieved ${userManufacturers.length} manufacturers for user ${user.user_id}`);
        if (userManufacturers.length === 0) {
            console.warn('No manufacturers found for this user. This will affect manufacturer part selection in forms.');
        }
    } catch (error) {
        console.error('Error fetching user manufacturers:', error);
        userManufacturers = [];
    }

    // 9. Fetch user-created suppliers with custom fields
    let userSuppliers: Supplier[] = [];
    try {
        // Import the core function to list suppliers by user, matching manufacturer pattern
        const { listSuppliers } = await import('$lib/core/supplier');
        
        // Use the core function to get all suppliers created by this user
        userSuppliers = await listSuppliers({ userId: user.user_id });
        
        // Log the first supplier for debugging
        if (userSuppliers.length > 0) {
           
        }
    } catch (error) {
        console.error('Error fetching user suppliers:', error);
        userSuppliers = [];
    }

    // 10. Fetch user-created categories
    let userCategories: Category[] = [];
    try {
        // Get user categories with parent info included via JOIN
        // FIX: Use explicit column aliases and casts to ensure parent_name is properly included
        userCategories = await sql`
            SELECT 
                c.category_id,
                c.category_name,
                c.category_description,
                c.category_path,
                c.parent_id,
                p.category_name::text AS parent_name, -- Explicit cast to text type
                c.is_public,
                c.created_at,
                c.updated_at,
                c.created_by,
                c.updated_by
            FROM "Category" c
            LEFT JOIN "Category" p ON c.parent_id = p.category_id
            WHERE c.created_by = ${user.user_id}
            AND c.is_deleted = false
            ORDER BY c.category_name ASC
        `;
        
        // Log the first category to debug parent_name inclusion
        if (userCategories.length > 0) {
            // Type-safe way to access the SQL result properties
            const firstCategory = userCategories[0] as any;
          
        }
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
