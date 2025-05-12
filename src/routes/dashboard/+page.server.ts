//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, PartStatusEnum, TemperatureUnitEnum } from '$lib/types';
import type { Project } from '$lib/server/db/types';
import type { User } from '$lib/server/db/types';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { createPartSchema, manufacturerSchema, categorySchema } from '$lib/server/db/schema';
import { createPart, getPartWithCurrentVersion } from '$lib/server/parts';
import type { CreatePartInput } from '$lib/server/parts';
import { createManufacturer } from '$lib/server/manufacturer';
import { createSupplier } from '$lib/server/supplier';
import { createCategory, getCategoryTree } from '$lib/server/category';
import { z } from 'zod';
import { parsePartJsonField } from '$lib/utils/util';

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
	
	
	
	// 2. Initialize Manufacturer form data
	const manufacturerForm = await superValidate(zod(manufacturerSchema));
	
	// 3. Initialize Supplier form data
	const supplierForm = await superValidate(zod(supplierSchema));
	
	// 4 Initialize Part form data

	const partForm = await superValidate(zod(createPartSchema));
	// Initialize dimensions to prevent null reference errors
	if (!partForm.data.dimensions) {
		partForm.data.dimensions = { length: 0, width: 0, height: 0 };
	}
	// Add default status if not set
	if (!partForm.data.status) {
		partForm.data.status = LifecycleStatusEnum.DRAFT;
	}
	
	// 5. Initialize Category form data
	const createCategorySchema = categorySchema.pick({
		name: true,
		parent_id: true,
		description: true,
		is_public: true
	});
	const categoryForm = await superValidate(zod(createCategorySchema));
	
	// 6. Get category tree for parent selection
	const categories = await getCategoryTree();
	
	// 7. Fetch user-created parts with their current version data
	let userParts: any[] = [];
	try {
		// Following the pattern from other entities, fetch parts created by the user
		// with their most recent version details
		userParts = await sql`
			SELECT 
				p.id, 
				p.creator_id AS "creatorId", 
				p.status,
				p.lifecycle_status AS "lifecycleStatus",
				p.is_public AS "isPublic",
				p.created_at AS "createdAt",
				p.updated_at AS "updatedAt",
				p.current_version_id AS "currentVersionId",
				-- Include part version details
				pv.name,
				pv.version,
				pv.short_description AS "shortDescription"
			FROM "Part" p
			-- Left join to get the current version details if available
			LEFT JOIN "PartVersion" pv ON p.current_version_id = pv.id
			WHERE p.creator_id = ${user.id}
			ORDER BY p.created_at DESC
		`;
		
		console.log(`Found ${userParts.length} parts created by the user`);
	} catch (error) {
		console.error('Error fetching user parts:', error);
		// Return empty array on error
		userParts = [];
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
	
	// 7. Fetch user-created categories with parent names
	let userCategories: any[] = [];
	try {
		userCategories = await sql`
			SELECT c.*, p.name as parent_name
			FROM "category" c
			LEFT JOIN "category" p ON c.parent_id = p.id
			WHERE c.created_by = ${user.id}
			ORDER BY c.name ASC
		`;
	} catch (error) {
		console.error('Error fetching categories:', error);
		// userCategories is already initialized to an empty array
	}
	
	// 8. Fetch all categories for parent selection in category form
	let allCategories: any[] = [];
	try {
		allCategories = await sql`
			SELECT c.*, p.name as parent_name
			FROM "category" c
			LEFT JOIN "category" p ON c.parent_id = p.id
			ORDER BY c.name ASC
		`;
	} catch (error) {
		console.error('Error fetching all categories:', error);
		// allCategories is already initialized to an empty array
	}
	
	return {
		user,
		projects,
		userParts,
		userManufacturers,
		userSuppliers,
		categories,
		partForm,
		manufacturerForm,
		supplierForm,
		categoryForm,
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
	// All actions are now named explicitly, no default handler needed
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
	
	// Part creation and editing
	part: async (event) => {
		const user = event.locals.user as User | null;
		if (!user) throw redirect(302, '/');
		
		// Get form data to check if we're editing or creating
		const formData = await event.request.formData();
		const partId = formData.get('partId');
		const isEditMode = partId && typeof partId === 'string' && partId.trim() !== '';
		
		// First validate the form data with zod schema
		const form = await superValidate(formData, zod(createPartSchema));
		
		// If we're in edit mode and the form is valid, fetch the full part data for context
		if (isEditMode && form.valid) {
			console.log('Dashboard edit mode - Loading full part data for partId:', partId);
			try {
				const { part, currentVersion } = await getPartWithCurrentVersion(partId as string);
				if (!part) {
					return message(form, 'Part not found', { status: 404 });
				}
				
				// Check if the user is authorized to edit this part
				if (part.creatorId !== user.id) {
					return message(form, 'You are not authorized to edit this part', { status: 403 });
				}
				
				// Log that we're in edit mode for this part with full data context
				console.log('Editing existing part with ID:', part.id);
				console.log('Part current version data available:', {
					id: currentVersion.id,
					name: currentVersion.name,
					version: currentVersion.version,
					shortDescription: currentVersion.shortDescription,
					dimensions: currentVersion.dimensions
				});
			} catch (error) {
				console.error('Error loading part data for edit:', error);
				return message(form, 'Error loading part data: ' + (error as Error).message, { status: 500 });
			}
		}
		
		if (!form.valid) {
			// Use the message helper to return validation errors
			return message(form, 'Validation failed. Please check the form fields.');
		}
		
		// Process dimensions - convert empty dimensions to undefined
		if (form.data.dimensions && 
			(form.data.dimensions.length === 0 || form.data.dimensions.length === null) && 
			(form.data.dimensions.width === 0 || form.data.dimensions.width === null) && 
			(form.data.dimensions.height === 0 || form.data.dimensions.height === null)) {
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
		
		// Process any JSON fields using our new utility function for consistent implementation
		['technical_specifications', 'properties', 'electrical_properties', 
		'mechanical_properties', 'thermal_properties', 'material_composition', 
		'environmental_data'].forEach(field => {
			// Use our utility function to handle various input formats consistently
			// Use type assertion to avoid TypeScript error with the return type
			const jsonField = parsePartJsonField(form.data[field as keyof typeof form.data], field);
			
			// Use bracket notation with type assertion to set the field value
			(form.data as any)[field] = jsonField;
			console.log(`Processed ${field} using parsePartJsonField utility`);
		});

		// Log critical values for debugging
		console.log('Dashboard part form - Critical values:', {
			name: form.data.name,
			version: form.data.version,
			status: form.data.status,
			dimensions: form.data.dimensions,
			isEditMode: isEditMode
		});

		try {
			// Get statuses from form
			const selectedLifecycleStatus = form.data.status;
			const selectedPartStatus = form.data.partStatus || PartStatusEnum.CONCEPT;
			
			// Cast to proper enum type for the lifecycle status
			const lifecycleStatusToUse = String(selectedLifecycleStatus) as LifecycleStatusEnum;
			
			console.log('SELECTED LIFECYCLE STATUS:', lifecycleStatusToUse);
			console.log('SELECTED PART STATUS:', selectedPartStatus);
			
			// Prepare part data with all fields from the form
			const partData: CreatePartInput = {
				name: form.data.name,
				version: form.data.version || '0.1.0',
				status: lifecycleStatusToUse,
				partStatus: selectedPartStatus,
				shortDescription: form.data.short_description || '',
				functionalDescription: form.data.functional_description || '',
				longDescription: form.data.long_description,
				technicalSpecifications: form.data.technical_specifications,
				properties: form.data.properties,
				electricalProperties: form.data.electrical_properties,
				mechanicalProperties: form.data.mechanical_properties,
				thermalProperties: form.data.thermal_properties,
				materialComposition: form.data.material_composition,
				environmentalData: form.data.environmental_data,
				revisionNotes: form.data.revision_notes || '',
				// Include physical properties if provided
				dimensions: form.data.dimensions,
				dimensionsUnit: form.data.dimensions_unit,
				weight: form.data.weight,
				weightUnit: form.data.weight_unit,
				packageType: form.data.package_type,
				pinCount: form.data.pin_count,
				// Include thermal properties if provided
				operatingTemperatureMin: form.data.operating_temperature_min,
				operatingTemperatureMax: form.data.operating_temperature_max,
				storageTemperatureMin: form.data.storage_temperature_min,
				storageTemperatureMax: form.data.storage_temperature_max,
				temperatureUnit: form.data.temperature_unit,
				// Include electrical properties if provided
				voltageRatingMin: form.data.voltage_rating_min,
				voltageRatingMax: form.data.voltage_rating_max,
				currentRatingMin: form.data.current_rating_min,
				currentRatingMax: form.data.current_rating_max,
				powerRatingMax: form.data.power_rating_max,
				tolerance: form.data.tolerance,
				toleranceUnit: form.data.tolerance_unit,
			};
			
			// Create the part with all the form data
			const result = await createPart(partData, user.id);
			console.log('Part created successfully:', result);
			
			// For dashboard mode, we want to show a message and not redirect
			// because we're already in the dashboard and want to stay there
			return message(form, 'Part created successfully');
		} catch (err) {
			console.error('Create part error:', err);
			
			// Provide more detailed error message based on error type
			let errorMessage = 'Failed to create part';
			
			if (err instanceof Error) {
				errorMessage += ': ' + err.message;
				
				// Check for specific error types we can handle more gracefully
				if (err.message.includes('duplicate')) {
					errorMessage = 'A part with this name and version already exists';
				} else if (err.message.includes('not found')) {
					errorMessage = 'Referenced entity not found';
				} else if (err.message.includes('validation')) {
					errorMessage = 'Validation error: Please check all form fields';
				}
			} else {
				errorMessage += ': Unknown error';
			}
			
			// Return form with better error message for superForm to display
			return message(form, errorMessage, { status: 500 });
		}
	},
	
	// Category creation and editing action
	category: async (event) => {
		const user = event.locals.user as User | null;
		if (!user) throw redirect(302, '/');
		
		// Get form data to check if we're editing or creating
		const formData = await event.request.formData();
		const categoryId = formData.get('categoryId');
		const isEditMode = categoryId && typeof categoryId === 'string' && categoryId.trim() !== '';
		
		// Create schema for validation
		const categoryFormSchema = categorySchema.pick({
			name: true,
			parent_id: true,
			description: true,
			is_public: true
		});
		
		// Validate the form
		const form = await superValidate(formData, zod(categoryFormSchema));
		
		if (!form.valid) {
			return message(form, 'Invalid form data. Please check the fields.');
		}
		
		try {
			if (isEditMode) {
				// EDIT MODE: Check if the category exists and belongs to the user
				const categoryCheck = await sql`
					SELECT * FROM category WHERE id = ${categoryId} AND created_by = ${user.id}
				`;
				
				if (categoryCheck.length === 0) {
					return message(form, 'Category not found or you do not have permission to edit it.', { status: 403 });
				}
				
				// Update the category
				await sql`
					UPDATE category 
					SET 
						name = ${form.data.name},
						description = ${form.data.description || null},
						parent_id = ${form.data.parent_id || null},
						is_public = ${Boolean(form.data.is_public)},
						updated_at = NOW(),
						updated_by = ${user.id}
					WHERE id = ${categoryId}
				`;
				
				// Return success message
				return message(form, 'Category updated successfully');
			} else {
				// CREATE MODE: Create new category
				await createCategory({
					name: form.data.name,
					parentId: form.data.parent_id ?? undefined,
					description: form.data.description ?? undefined,
					isPublic: form.data.is_public,
					createdBy: user.id
				});
				
				// Return success message
				return message(form, 'Category created successfully');
			}
		} catch (err) {
			console.error(isEditMode ? 'Update category error:' : 'Create category error:', err);
			// Return form with error message
			return message(form, `Failed to ${isEditMode ? 'update' : 'create'} category: ` + (err instanceof Error ? err.message : 'Unknown error'));
		}
	},
};
