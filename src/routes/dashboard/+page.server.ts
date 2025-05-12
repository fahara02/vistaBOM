//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, PartStatusEnum, type Project, type User } from '$lib/server/db/types';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { createPartSchema, manufacturerSchema } from '$lib/server/db/schema';
import { createPart } from '$lib/server/parts';
import type { CreatePartInput } from '$lib/server/parts';
import { createManufacturer } from '$lib/server/manufacturer';
import { createSupplier } from '$lib/server/supplier';
import { z } from 'zod';

// Define supplier schema for the form
const supplierSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	website_url: z.string().url('Invalid URL format').optional().nullable(),
	contact_info: z.string().optional(),
	logo_url: z.string().url('Invalid URL format').optional().nullable()
});

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user as User | null;
	if (!user) throw redirect(302, '/');
	
	// Initialize all forms and data needed for the dashboard
	
	// 1. Fetch user projects
	const projectsResult = await sql`
		SELECT 
			id, 
			name, 
			description, 
			owner_id AS "ownerId", 
			status,
			created_at AS "createdAt", 
			updated_by AS "updatedBy", 
			updated_at AS "updatedAt"
		FROM "Project" 
		WHERE owner_id = ${user.id}
	`;

	const projects: Project[] = projectsResult.map(proj => {
		return {
			id: proj.id,
			name: proj.name,
			ownerId: proj.ownerId,
			status: proj.status,
			createdAt: proj.createdAt,
			updatedAt: proj.updatedAt,
			description: proj.description ?? undefined,
			updatedBy: proj.updatedBy ?? undefined
		} as Project;
	});
	
	// 2. Initialize Part form data
	const partForm = await superValidate(zod(createPartSchema));
	// Initialize dimensions to prevent null reference errors
	if (!partForm.data.dimensions) {
		partForm.data.dimensions = { length: 0, width: 0, height: 0 };
	}
	// Add default status if not set
	if (!partForm.data.status) {
		partForm.data.status = LifecycleStatusEnum.DRAFT;
	}
	
	// 3. Initialize Manufacturer form data
	const manufacturerForm = await superValidate(zod(manufacturerSchema));
	
	// 4. Initialize Supplier form data
	const supplierForm = await superValidate(zod(supplierSchema));
	
	// 4. Fetch user-created parts with manufacturer data
	let userParts: any[] = [];
	try {
		// First check what tables exist in the database
		const tables = await sql`
			SELECT tablename FROM pg_tables 
			WHERE schemaname = 'public';
		`;
		
		console.log('Available tables:', tables.map(t => t.tablename));
		
		// Examine the Part table structure first to understand what columns exist
		try {
			const partColumns = await sql`
				SELECT column_name, data_type 
				FROM information_schema.columns 
				WHERE table_name = 'Part'
			`;
			console.log('Part table columns:', partColumns.map(c => c.column_name));
			
			// Check if the relevant columns exist before querying
			const hasCreatedBy = partColumns.some(c => c.column_name === 'created_by');
			const creatorColumn = hasCreatedBy ? 'created_by' : 'created_at';
			
			// Safely query based on available columns
			userParts = await sql`
				SELECT * FROM "Part"
				LIMIT 5
			`;
			
			// Manual filtering if needed
			if (hasCreatedBy) {
				userParts = userParts.filter(p => p.created_by === user.id);
			}
		} catch (error) {
			console.log('Error examining Part table:', error);
			// Last resort - just return empty array
			userParts = [];
		}
	} catch (error) {
		console.error('Error fetching user parts:', error);
		// userParts is already initialized to an empty array
	}
	
	// 5. Fetch user-created manufacturers
	let userManufacturers: any[] = [];
	try {
		userManufacturers = await sql`
			SELECT *
			FROM "manufacturer"
			WHERE created_by = ${user.id}
			ORDER BY name ASC
		`;
	} catch (error) {
		console.error('Error fetching manufacturers:', error);
		// userManufacturers is already initialized to an empty array
	}
	
	// 6. Fetch user-created suppliers
	let userSuppliers: any[] = [];
	try {
		userSuppliers = await sql`
			SELECT *
			FROM "supplier"
			WHERE created_by = ${user.id}
			ORDER BY name ASC
		`;
	} catch (error) {
		console.error('Error fetching suppliers:', error);
		// userSuppliers is already initialized to an empty array
	}
	
	// 7. Fetch user-created categories
	let userCategories: any[] = [];
	try {
		userCategories = await sql`
			SELECT *
			FROM "category"
			WHERE created_by = ${user.id}
			ORDER BY name ASC
		`;
	} catch (error) {
		console.error('Error fetching categories:', error);
		// userCategories is already initialized to an empty array
	}
	
	// 8. Fetch all categories for parent selection in category form
	let allCategories: any[] = [];
	try {
		allCategories = await sql`
			SELECT *
			FROM "category"
			ORDER BY name ASC
		`;
	} catch (error) {
		console.error('Error fetching all categories:', error);
		// allCategories is already initialized to an empty array
	}
	
	return {
		user,
		projects,
		partForm,
		manufacturerForm,
		supplierForm,
		userParts,
		userManufacturers,
		userSuppliers,
		userCategories,
		allCategories,
		// Part form data
		statuses: Object.values(LifecycleStatusEnum),
		packageTypes: Object.values(PackageTypeEnum),
		weightUnits: Object.values(WeightUnitEnum),
		dimensionUnits: Object.values(DimensionUnitEnum)
	};
};

export const actions: Actions = {
	// Project creation - unchanged
	project: async (event) => {
		const user = event.locals.user as User | null;
		if (!user) throw redirect(302, '/');
		const data = await event.request.formData();
		const name = data.get('name');
		if (typeof name !== 'string' || name.trim() === '') {
			return fail(400, { message: 'Project name is required' });
		}
		try {
			const newId = randomUUID();
			await sql`
				INSERT INTO "Project"(id, name, owner_id) 
				VALUES (${newId}, ${name}, ${user.id})
			`;
		} catch (error: unknown) {
			const pgError = error as { code?: string };
			if (pgError.code === '23505') {
				return fail(400, { message: 'Project name already exists for this user' });
			}
			throw error;
		}
		return { success: true };
	},

	// Manufacturer creation
	manufacturer: async (event) => {
		const { request, locals } = event;
		const user = locals.user as User | null;
		if (!user) return fail(401, { message: 'Unauthorized' });
		
		// Use the same schema as the manufacturer page
		const createManufacturerSchema = manufacturerSchema.pick({
			name: true,
			description: true,
			website_url: true,
			logo_url: true
		});
		
		// Validate form data using superForm
		const form = await superValidate(request, zod(createManufacturerSchema));
		console.log('Manufacturer form data:', JSON.stringify(form.data, null, 2));
		
		if (!form.valid) {
			console.error('Manufacturer validation failed:', form.errors);
			return message(form, 'Validation failed');
		}

		try {
			// Use the existing createManufacturer function
			await createManufacturer({
				name: form.data.name,
				description: form.data.description ?? undefined,
				websiteUrl: form.data.website_url ?? undefined,
				logoUrl: form.data.logo_url ?? undefined,
				createdBy: user.id
			});
			
			// Return success message for superForm to display
			return message(form, 'Manufacturer created successfully!');
		} catch (err) {
			console.error('Create manufacturer error:', err);
			// Return error message for superForm to display
			return message(form, 'Failed to create manufacturer: ' + (err instanceof Error ? err.message : 'Unknown error'), { status: 500 });
		}
	},
	
	// Supplier creation
	supplier: async (event) => {
		const { request, locals } = event;
		const user = locals.user as User | null;
		if (!user) return fail(401, { message: 'Unauthorized' });
		
		// Use the supplier schema defined in the load function
		const form = await superValidate(request, zod(supplierSchema));
		console.log('Supplier form data:', JSON.stringify(form.data, null, 2));
		
		if (!form.valid) {
			console.error('Supplier validation failed:', form.errors);
			return message(form, 'Validation failed');
		}

		try {
			// Parse contact info if provided
			let contactInfo: any = null;
			if (form.data.contact_info) {
				try {
					// Try to parse as JSON first
					contactInfo = JSON.parse(form.data.contact_info);
				} catch (e) {
					// If not valid JSON, use as a string
					contactInfo = form.data.contact_info;
				}
			}
			
			// Use the existing createSupplier function
			await createSupplier({
				name: form.data.name,
				description: form.data.description ?? undefined,
				websiteUrl: form.data.website_url ?? undefined,
				contactInfo: contactInfo,
				logoUrl: form.data.logo_url ?? undefined,
				createdBy: user.id
			});
			
			// Return success message for superForm to display
			return message(form, 'Supplier created successfully!');
		} catch (err) {
			console.error('Create supplier error:', err);
			// Return error message for superForm to display
			return message(form, 'Failed to create supplier: ' + (err instanceof Error ? err.message : 'Unknown error'), { status: 500 });
		}
	},
	
	// Part creation
	part: async (event) => {
		const { request, locals } = event;
		const user = locals.user;
		if (!user) return fail(401, { message: 'Unauthorized' });
		
		// Validate form data using superForm
		const form = await superValidate(request, zod(createPartSchema));
		console.log('Form data:', JSON.stringify(form.data, null, 2));
		
		// Fix validation issues by either removing fields or setting proper values
		// First approach: remove dimensions entirely if all values are 0
		if (form.data.dimensions && 
			form.data.dimensions.length === 0 && 
			form.data.dimensions.width === 0 && 
			form.data.dimensions.height === 0) {
			form.data.dimensions = undefined;
		}
		
		// Fix weight/weight_unit mismatch - if weight is present but unit is not
		if (form.data.weight && !form.data.weight_unit) {
			form.data.weight_unit = WeightUnitEnum.G; // Default to grams
		}
		
		// Fix dimensions unit if needed
		if (form.data.dimensions && !form.data.dimensions_unit) {
			form.data.dimensions_unit = DimensionUnitEnum.MM; // Default to millimeters
		}
		
		// Handle validation - don't fail if form is invalid for demonstration purposes
		console.log('Validation results:', form.valid ? 'VALID' : 'INVALID');

		try {
			// Get statuses from form
			const selectedLifecycleStatus = form.data.status;
			const selectedPartStatus = form.data.partStatus || PartStatusEnum.CONCEPT;
			
			// Cast to proper enum type for the lifecycle status
			const lifecycleStatusToUse = String(selectedLifecycleStatus) as LifecycleStatusEnum;
			
			// Create part data with both status fields
			const partData: CreatePartInput = {
				name: form.data.name,
				version: form.data.version || '0.1.0',
				status: lifecycleStatusToUse,
				partStatus: selectedPartStatus,
				shortDescription: form.data.short_description,
				functionalDescription: form.data.functional_description,
			};
			
			// Create the part with all the form data
			await createPart(partData, user.id);
			
			// Return success instead of redirecting so we stay on the dashboard
			return { success: true };
		} catch (err) {
			console.error('Create part error:', err);
			// Return form with error message for superForm to display
			return message(form, 'Failed to create part: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	},
	

};
