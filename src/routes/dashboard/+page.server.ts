//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, PartStatusEnum, TemperatureUnitEnum } from '$lib/types';
import type { Project } from '@/types/types';
import type { User } from '@/types/types';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { createPartSchema, manufacturerSchema, categorySchema } from '$lib/server/db/schema';
import { createPart, getPartWithCurrentVersion } from '@/core/parts';
import type { CreatePartInput } from '@/core/parts';

// Extended input type that includes category and manufacturer relationships 
type ExtendedPartInput = CreatePartInput & {
	categoryIds?: string[];
	manufacturerParts?: Array<{manufacturerId: string; partNumber: string}>;
};
import { createManufacturer } from '@/core/manufacturer';
import { createSupplier } from '@/core/supplier';
import { createCategory, getCategoryTree } from '@/core/category';
import { z } from 'zod';
import { parsePartJsonField } from '$lib/utils/util';

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

// Extended part schema that includes relationship fields
const extendedPartSchema = z.object({
	// Part form fields (from createPartSchema)
	name: z.string().min(1, 'Name is required'),
	version: z.string().default('0.1.0'),
	status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT),
	part_status: z.nativeEnum(PartStatusEnum).default(PartStatusEnum.ACTIVE),
	short_description: z.string().optional(),
	functional_description: z.string().optional(),
	long_description: z.string().optional(),
	technical_specifications: z.string().optional(),
	properties: z.string().optional(),
	electrical_properties: z.string().optional(),
	mechanical_properties: z.string().optional(),
	thermal_properties: z.string().optional(),
	weight: z.coerce.number().optional().nullable(),
	weight_unit: createNullableEnum(WeightUnitEnum),
	dimensions: z.any().optional().nullable(),
	dimensions_unit: createNullableEnum(DimensionUnitEnum),
	material_composition: z.string().optional().nullable(),
	environmental_data: z.string().optional().nullable(),
	revision_notes: z.string().optional().nullable(),
	// Make package_type truly optional with nullable - to support non-semiconductor parts like motors
	package_type: createNullableEnum(PackageTypeEnum),
	pin_count: z.coerce.number().optional().nullable(),
	operating_temperature_min: z.coerce.number().optional().nullable(),
	operating_temperature_max: z.coerce.number().optional().nullable(),
	storage_temperature_min: z.coerce.number().optional().nullable(),
	storage_temperature_max: z.coerce.number().optional().nullable(),
	temperature_unit: createNullableEnum(TemperatureUnitEnum),
	voltage_rating_min: z.coerce.number().optional().nullable(),
	voltage_rating_max: z.coerce.number().optional().nullable(),
	current_rating_min: z.coerce.number().optional().nullable(),
	current_rating_max: z.coerce.number().optional().nullable(),
	power_rating_max: z.coerce.number().optional().nullable(),
	tolerance: z.coerce.number().optional().nullable(),
	tolerance_unit: z.string().optional().nullable(),
	
	// Relationship fields
	category_ids: z.string().optional().nullable(),
	manufacturer_parts: z.string().optional().nullable()
});

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
	
	// 4 Initialize Part form data with extended schema that includes relationship fields
	const partForm = await superValidate(zod(extendedPartSchema));
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
	
	// 5. Fetch user-created manufacturers with custom fields
	let userManufacturers: any[] = [];
	try {
		// Use the same query structure as in getManufacturer to include custom fields
		userManufacturers = await sql`
			SELECT 
				m.*,
				COALESCE(
					(SELECT json_object_agg(cf.field_name, mcf.value)
					 FROM manufacturercustomfield mcf
					 JOIN customfield cf ON mcf.field_id = cf.id
					 WHERE mcf.manufacturer_id = m.id
					), '{}'::json) AS custom_fields
			FROM manufacturer m
			WHERE m.created_by = ${user.id}
			ORDER BY m.name ASC
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

	// Manufacturer creation and update
	manufacturer: async (event) => {
		const { request, locals } = event;
		const user = locals.user as User | null;
		if (!user) return fail(401, { message: 'Unauthorized' });
		
		// Use the same schema as the manufacturer page but add custom_fields_json and id for editing
		const manufacturerActionSchema = z.object({
			id: z.string().optional(), // Include ID for updates
			name: z.string().min(1, 'Name is required'),
			description: z.string().optional().nullable(),
			website_url: z.string().url('Invalid URL format').optional().nullable(),
			logo_url: z.string().url('Invalid URL format').optional().nullable(),
			custom_fields_json: z.string().optional().nullable() // Add support for custom fields
		});
		
		// Validate form data using superForm
		const form = await superValidate(request, zod(manufacturerActionSchema));
		console.log('Manufacturer form data:', JSON.stringify(form.data, null, 2));
		
		if (!form.valid) {
			console.error('Manufacturer validation failed:', form.errors);
			return message(form, 'Validation failed');
		}

		try {
			// Process custom fields JSON if provided
			let customFields = {};
			if (form.data.custom_fields_json && form.data.custom_fields_json.trim() !== '') {
				try {
					customFields = JSON.parse(form.data.custom_fields_json);
					console.log('Parsed custom fields:', customFields);
				} catch (jsonError) {
					console.error('Failed to parse custom fields JSON:', jsonError);
					return message(form, 'Invalid JSON format for custom fields', { status: 400 });
				}
			}

			// Check if we're updating an existing manufacturer or creating a new one
			let manufacturer;
			const isUpdate = form.data.id && form.data.id.trim() !== '';
			console.log(`${isUpdate ? 'Updating' : 'Creating'} manufacturer`, form.data);

			if (isUpdate) {
				// First verify this user is allowed to edit this manufacturer
				// Use explicit query to avoid TypeScript errors with template literals
				// Use proper type casting for PostgreSQL
				const manufacturerId = form.data.id || '';
				const existingManufacturer = await sql`
					SELECT id, created_by FROM manufacturer 
					WHERE id = ${manufacturerId}::text
				`;

				if (existingManufacturer.length === 0) {
					return message(form, 'Manufacturer not found', { status: 404 });
				}

				if (existingManufacturer[0].created_by !== user.id) {
					return message(form, 'You are not authorized to edit this manufacturer', { status: 403 });
				}

				// Update the manufacturer - use separate variables to avoid template literal type issues
				// Convert all potentially undefined values to empty strings to satisfy PostgreSQL.js type system
				const name = form.data.name || '';
				// Handle null and undefined for optional fields by providing empty string as fallback
				const description = form.data.description || '';
				const website_url = form.data.website_url || '';
				const logo_url = form.data.logo_url || '';
				const id = form.data.id || '';
				const userId = user.id || '';
				
				await sql`
					UPDATE manufacturer 
					SET 
						name = ${name}::text,
						description = ${description}::text,
						website_url = ${website_url}::text,
						logo_url = ${logo_url}::text,
						updated_by = ${userId}::text,
						updated_at = NOW()
					WHERE id = ${id}::text
				`;

				manufacturer = {
					id: form.data.id,
					name: form.data.name,
					description: form.data.description,
					websiteUrl: form.data.website_url,
					logoUrl: form.data.logo_url
				};

				// Delete existing custom fields for this manufacturer
				const mfrId = form.data.id || '';
				await sql`DELETE FROM manufacturercustomfield WHERE manufacturer_id = ${mfrId}::text`;
			} else {
				// Create a new manufacturer
				manufacturer = await createManufacturer({
					name: form.data.name,
					description: form.data.description ?? undefined,
					websiteUrl: form.data.website_url ?? undefined,
					logoUrl: form.data.logo_url ?? undefined,
					createdBy: user.id
				});
			}

			// If we have custom fields, insert them into the manufacturercustomfield table
			if (Object.keys(customFields).length > 0) {
				for (const [fieldName, fieldValue] of Object.entries(customFields)) {
					// Determine the data type
					let dataType = 'text';
					if (typeof fieldValue === 'number') dataType = 'number';
					else if (typeof fieldValue === 'boolean') dataType = 'boolean';
					else if (fieldValue instanceof Date) dataType = 'date';

					// Check if this field already exists in the customfield table
					const existingField = await sql`
						SELECT id FROM customfield 
						WHERE field_name = ${fieldName} AND applies_to = 'manufacturer'
					`;

					let fieldId;
					if (existingField.length > 0) {
						fieldId = existingField[0].id;
					} else {
						// Create a new custom field
						const customFieldId = randomUUID();
						const fieldNameStr = fieldName || '';
						const dataTypeStr = dataType || 'text';
						const newField = await sql`
							INSERT INTO customfield (id, field_name, data_type, applies_to)
							VALUES (${customFieldId}, ${fieldNameStr}, ${dataTypeStr}, 'manufacturer')
							RETURNING id
						`;
						fieldId = newField[0].id;
					}

					// Associate this custom field with the manufacturer
					const newCustomFieldId = randomUUID();
					const manufacturerId = manufacturer.id || '';
					const fieldNameStr = fieldName || '';
					const fieldValueStr = String(fieldValue || '');
					const dataTypeStr = dataType || 'text';
					const userId = user.id || '';
					
					await sql`
						INSERT INTO manufacturercustomfield (id, manufacturer_id, field_name, field_value, data_type, created_by, created_at)
						VALUES (${newCustomFieldId}, ${manufacturerId}::text, ${fieldNameStr}::text, ${fieldValueStr}::text, ${dataTypeStr}::text, ${userId}::text, NOW())
					`;
				}
			}
			
			// Return success message for superForm to display
			return message(form, isUpdate ? 'Manufacturer updated successfully!' : 'Manufacturer created successfully!');
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
		
		// Helper function to handle all optional fields consistently
		const processOptionalField = <T>(value: T): null | T => {
			// Convert empty strings, 'null' strings, and undefined to null
			if (value === undefined || value === null) {
				return null;
			}
			
			// Handle string values
			if (typeof value === 'string') {
				if (value === '' || value === 'null' || value === '0') {
					return null;
				}
			}
			
			// For numbers, also convert 0 to null for optional numeric fields
			if (typeof value === 'number' && value === 0) {
				return null;
			}
			
			return value;
		};
		
		// Get form data to check if we're editing or creating
		let formData = await event.request.formData();
		const partId = formData.get('partId');
		const isEditMode = partId && typeof partId === 'string' && partId.trim() !== '';
		console.log('Edit mode:', isEditMode, 'Part ID:', partId);
		
		// Pre-process FormData for optional fields to ensure proper database compatibility
		// These constants define all optional fields that should be set to null rather than empty strings
		const optionalStringFields = [
			'short_description', 'functional_description',
			'revision_notes'
		];

		// Define all fields that require special handling
		const enumFieldList = [
			'package_type', 'weight_unit', 'dimensions_unit', 'temperature_unit'
		];

		const optionalNumberFields = [
			'weight', 'pin_count',
			'voltage_rating_min', 'voltage_rating_max',
			'current_rating_min', 'current_rating_max',
			'power_rating_max', 'tolerance',
			'operating_temperature_min', 'operating_temperature_max', 
			'storage_temperature_min', 'storage_temperature_max'
		];
		
		// Convert empty/null values in FormData
		for (const field of formData.keys()) {
			const value = formData.get(field);
			
			// For optional string fields, convert empty or 'null' to empty string (will convert to null in database)
			if (optionalStringFields.includes(field as string)) {
				if (value === 'null' || value === '' || value === null) {
					formData.set(field, '');
					console.log(`Pre-processed optional string field: ${field} to empty string`);
				}
			}

			// For enum fields, convert empty strings to null
			if (enumFieldList.includes(field as string)) {
				if (value === 'null' || value === '' || value === null) {
					// For enums, we need to set to null explicitly
					formData.set(field, 'null');
					console.log(`Pre-processed enum field: ${field} to null`);
				}
			}
			
			// For optional number fields, empty/0/'null' values should be set to empty string
			if (optionalNumberFields.includes(field as string)) {
				if (value === '0' || value === '' || value === 'null' || value === null) {
					formData.set(field, '');
					console.log(`Pre-processed optional number field: ${field} to empty string`);
				}
			}
		}
		
		// Special handling for dimensions
		const dimensionsLength = formData.get('dimensions.length');
		const dimensionsWidth = formData.get('dimensions.width');
		const dimensionsHeight = formData.get('dimensions.height');
		
		// If all dimensions are empty/zero, clear dimensions fields
		const allDimensionsEmpty = 
			(!dimensionsLength || dimensionsLength === '0' || dimensionsLength === '') &&
			(!dimensionsWidth || dimensionsWidth === '0' || dimensionsWidth === '') &&
			(!dimensionsHeight || dimensionsHeight === '0' || dimensionsHeight === '');
		
		if (allDimensionsEmpty) {
			// Clear dimensions and dimensions_unit
			formData.set('dimensions', '');
			formData.set('dimensions_unit', '');
			console.log('All dimensions are empty - clearing dimensions and dimensions_unit');
		}
		
		// Handle field pairs - if one is empty, the other should be too
		// For weight & weight_unit
		if (!formData.get('weight') || formData.get('weight') === '0' || formData.get('weight') === '') {
			formData.set('weight_unit', '');
			console.log('Cleared weight_unit because weight is empty');
		}
		
		// For tolerance & tolerance_unit
		if (!formData.get('tolerance') || formData.get('tolerance') === '0' || formData.get('tolerance') === '') {
			formData.set('tolerance_unit', '');
			console.log('Cleared tolerance_unit because tolerance is empty');
		}
		
		// For temperature fields & temperature_unit
		const allTempsEmpty = 
			(!formData.get('operating_temperature_min') || formData.get('operating_temperature_min') === '0' || formData.get('operating_temperature_min') === '') &&
			(!formData.get('operating_temperature_max') || formData.get('operating_temperature_max') === '0' || formData.get('operating_temperature_max') === '') &&
			(!formData.get('storage_temperature_min') || formData.get('storage_temperature_min') === '0' || formData.get('storage_temperature_min') === '') &&
			(!formData.get('storage_temperature_max') || formData.get('storage_temperature_max') === '0' || formData.get('storage_temperature_max') === '');
		
		if (allTempsEmpty) {
			formData.set('temperature_unit', '');
			console.log('Cleared temperature_unit because all temperature fields are empty');
		}
		
		// Ensure enum fields that are removed/missing are explicitly set to null before validation
		// This is critical for SvelteKit form handling and Zod validation
		enumFieldList.forEach(field => {
			// If field is missing in formData, set it explicitly to null
			if (!formData.has(field)) {
				// FIXED: Replace 'any' with explicit type for better TypeScript compliance
				formData.set(field, 'null'); // Using string 'null' which will be properly handled
				console.log(`Set missing enum field ${field} to null for validation`);
			}
		});
		
		// CRITICAL FIX: Log the exact name value from FormData before validation
		const nameValue = formData.get('name');
		console.log('Name value from FormData before validation:', nameValue, 'type:', typeof nameValue);
		
		// CRITICAL FIX: Special case for name field - ensure name is always present
		// Add special trace for debugging name field issues
		if (!nameValue || String(nameValue).trim() === '') {
			console.log('Name field is empty, using default name');
			formData.set('name', 'New Part'); // Set default name if missing
		} else {
			console.log('Name field value present:', nameValue);
			// Ensure name is set correctly by setting it again
			formData.set('name', String(nameValue));
		}
		
		// Now validate the form data with zod schema including relationship fields
		// Add debug logging for each field before validation
		const debugFormData = {};
		for (const [key, value] of formData.entries()) {
			debugFormData[key] = value;
		}
		console.log('Form data before validation:', debugFormData);

		const form = await superValidate(formData, zod(extendedPartSchema));
		
		// CRITICAL FIX: If form validation fails but we have a name, override the error
		if (!form.valid) {
			console.error('Form validation failed:', form.errors);
			
			// CRITICAL FIX: If the only error is the name field but we know we have it,
			// manually set the name field in the form data
			if (form.errors.name && form.errors.name.includes('Name is required') && nameValue) {
				console.log('Overriding name validation error because name is present:', nameValue);
				delete form.errors.name;
				form.data.name = String(nameValue);
				
				// If this was the only error, mark the form as valid
				if (Object.keys(form.errors).length === 0) {
					form.valid = true;
				}
			}
			
			// If still invalid after our fixes, return error
			if (!form.valid) {
				return message(form, {
					type: 'error',
					text: 'Please fix the form errors and try again'
				});
			}
		}
		
		// Output form data for debugging
		console.log('Validated form data:', form.data);
		
		// Process all optional fields to ensure consistent handling
		// Type-safe access using a properly typed object
		const formData2 = form.data as Record<string, any>;
		
		// Process all string optional fields
		optionalStringFields.forEach(field => {
			formData2[field] = processOptionalField(formData2[field]);
			console.log(`Processed optional string field: ${field} = ${formData2[field]}`);
		});
		
		// Process all number optional fields
		optionalNumberFields.forEach(field => {
			formData2[field] = processOptionalField(formData2[field]);
			console.log(`Processed optional number field: ${field} = ${formData2[field]}`);
		});
		
		// Process JSON fields
		const jsonFields = [
			'long_description', 'technical_specifications', 'properties',
			'electrical_properties', 'mechanical_properties', 'thermal_properties',
			'material_composition', 'environmental_data'
		];
		
		jsonFields.forEach(field => {
			const value = formData2[field];
			// If value is an empty object, string, or null-like, set to null
			if (
				value === undefined || 
				value === null || 
				value === '' || 
				value === 'null' || 
				(typeof value === 'object' && value && Object.keys(value).length === 0)
			) {
				formData2[field] = null;
				console.log(`Processed JSON field: ${field} = null`);
			}
		});

		// Final validation - convert any remaining empty strings or 'null' strings to actual null
		// This ensures DATABASE COMPATIBILITY with SQL schema
		Object.keys(formData2).forEach(key => {
			const value = formData2[key];
			if (value === '' || value === 'null') {
				formData2[key] = null;
				console.log(`Final nullification for field: ${key}`);
			}
		});
		
		console.log('Final form data after all processing:', formData2);

		// Log critical values for debugging
		console.log('Dashboard part form - Critical values:', {
			name: formData2.name,
			version: formData2.version,
			status: formData2.status,
			dimensions: formData2.dimensions,
			isEditMode: isEditMode
		});

		try {
			// Get statuses from form
			const selectedLifecycleStatus = formData2.status;
			const selectedPartStatus = formData2.part_status || PartStatusEnum.ACTIVE;
			
			// Cast to proper enum type for the lifecycle status
			const lifecycleStatusToUse = String(selectedLifecycleStatus) as LifecycleStatusEnum;
			const partStatusToUse = String(selectedPartStatus) as PartStatusEnum;
			
			console.log('SELECTED LIFECYCLE STATUS:', lifecycleStatusToUse);
			console.log('SELECTED PART STATUS:', partStatusToUse);
			
			// Prepare part data with all fields from the form
			const partData: ExtendedPartInput = {
				name: formData2.name,
				version: formData2.version || '0.1.0',
				status: lifecycleStatusToUse,
				partStatus: partStatusToUse,
				shortDescription: formData2.short_description || '',
				functionalDescription: formData2.functional_description || '',
				longDescription: formData2.long_description,
				technicalSpecifications: formData2.technical_specifications,
				properties: formData2.properties,
				electricalProperties: formData2.electrical_properties,
				mechanicalProperties: formData2.mechanical_properties,
				thermalProperties: formData2.thermal_properties,
				materialComposition: formData2.material_composition,
				environmentalData: formData2.environmental_data,
				revisionNotes: formData2.revision_notes || '',
				// Include physical properties if provided
				dimensions: formData2.dimensions,
				dimensionsUnit: formData2.dimensions_unit,
				weight: formData2.weight,
				weightUnit: formData2.weight_unit,
				packageType: formData2.package_type,
				pinCount: formData2.pin_count,
				// Include thermal properties if provided
				operatingTemperatureMin: formData2.operating_temperature_min,
				operatingTemperatureMax: formData2.operating_temperature_max,
				storageTemperatureMin: formData2.storage_temperature_min,
				storageTemperatureMax: formData2.storage_temperature_max,
				temperatureUnit: formData2.temperature_unit,
				// Include electrical properties if provided
				voltageRatingMin: formData2.voltage_rating_min,
				voltageRatingMax: formData2.voltage_rating_max,
				currentRatingMin: formData2.current_rating_min,
				currentRatingMax: formData2.current_rating_max,
				powerRatingMax: formData2.power_rating_max,
				tolerance: formData2.tolerance,
				toleranceUnit: formData2.tolerance_unit,
			};
			
			// Handle category IDs (string comma-separated list or array)
			if (formData2.category_ids) {
				let categoryIds: string[];
				const categoryIdsValue = formData2.category_ids;
				
				if (typeof categoryIdsValue === 'string') {
					// Convert comma-separated string to array
					categoryIds = categoryIdsValue.split(',').map((id: string) => id.trim());
				} else if (Array.isArray(categoryIdsValue)) {
					categoryIds = categoryIdsValue as string[];
				} else {
					categoryIds = [];
				}
				
				partData.categoryIds = categoryIds;
			}

			// Handle manufacturer part associations (string or array)
			if (formData2.manufacturer_parts) {
				let manufacturerParts: any[];
				const mfrPartsValue = formData2.manufacturer_parts;
				
				if (typeof mfrPartsValue === 'string') {
					try {
						// Try to parse as JSON string
						manufacturerParts = JSON.parse(mfrPartsValue);
					} catch (e) {
						manufacturerParts = [];
					}
				} else if (Array.isArray(mfrPartsValue)) {
					manufacturerParts = mfrPartsValue;
				} else {
					manufacturerParts = [];
				}
				
				partData.manufacturerParts = manufacturerParts;
			}

			// Fetch existing part data if in edit mode
			let existingPart: any = null;
			let existingVersion: any = null;
			
			if (isEditMode && partId) {
				try {
					// Fetch the current part and version data
					const partResult = await getPartWithCurrentVersion(partId as string);
					
					if (partResult) {
						// getPartWithCurrentVersion returns an object with part and currentVersion properties
						existingPart = partResult.part;
						existingVersion = partResult.currentVersion;
						console.log('Found existing part to edit:', existingPart.id, existingPart.name);
					}
				} catch (err) {
					console.error('Error fetching part for edit:', err);
				}
			}
			
			let result;

			if (isEditMode && existingPart && existingVersion) {
				// Update existing part by creating a new version
				// First, include the part ID in the data for the update
				partData.id = existingPart.id;
				
				// For updates, version number should increment from the current version
				// Parse current version and increment patch number
				const versionParts = existingVersion.version.split('.');
				const major = parseInt(versionParts[0] || '0', 10);
				const minor = parseInt(versionParts[1] || '0', 10);
				const patch = parseInt(versionParts[2] || '0', 10) + 1;
				partData.version = `${major}.${minor}.${patch}`;
				
				// We'll use createPart but it will recognize the existing ID and update instead
				result = await createPart(partData, user.id);
				console.log('Part updated successfully with new version:', result);
				
				return message(form, `Part updated successfully to version ${partData.version}`);
			} else {
				// Create a new part
				result = await createPart(partData, user.id);
				console.log('Part created successfully:', result);
				
				return message(form, 'Part created successfully');
			}
		} catch (err) {
			console.error('Part operation error:', err);
			
			// Provide more detailed error message based on error type
			let errorMessage = isEditMode ? 'Failed to update part' : 'Failed to create part';
			
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
