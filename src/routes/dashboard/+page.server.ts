//src/routes/dashboard/+page.server.ts
import sql from '$lib/server/db/index';
import { DimensionUnitEnum, LifecycleStatusEnum, PackageTypeEnum, PartStatusEnum, WeightUnitEnum } from '$lib/types';
// Import sanitizeLtreeLabel function along with other category functions
import { createCategory, getAllCategories, sanitizeLtreeLabel } from '$lib/core/category';
import { createManufacturer } from '$lib/core/manufacturer';
import { createPart, getPartWithCurrentVersion } from '$lib/core/parts';
import { createSupplier } from '$lib/core/supplier';
import { categorySchema, categoryFormSchema, createPartSchema, manufacturerSchema, supplierSchema } from '$lib/schema/schema';
import type { Category, Manufacturer, Part, Supplier, User } from '$lib/types/schemaTypes';
import type { DbProject } from '$lib/types/types';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate, message } from 'sveltekit-superforms/server';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

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



// Define supplier schema for the form
const supplierFormSchema = z.object({
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
	
	// 4 Initialize Part form data with extended schema that includes relationship fields
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
				pv.part_name,
				pv.part_version,
				pv.short_description AS "shortDescription"
			FROM "Part" p
			-- Left join to get the current version details if available
			LEFT JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
			WHERE p.creator_id = ${user.user_id}
			ORDER BY p.created_at DESC
		`;
		
		console.log(`Found ${userParts.length} parts created by the user`);
	} catch (error) {
		console.error('Error fetching user parts:', error);
		// Return empty array on error
		userParts = [];
	}
	
	// 5. Fetch user-created manufacturers with custom fields
	let userManufacturers: Manufacturer[] = [];
	try {
		// Use the same query structure as in getManufacturer to include custom fields
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
		// userManufacturers is already initialized to an empty array
	}
	
	// 6. Fetch user-created suppliers
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
		// userSuppliers is already initialized to an empty array
	}
	
	// 7. Fetch user-created categories with parent names (excluding deleted categories)
	let userCategories: Category[] = [];
	try {
		userCategories = await sql`
			SELECT c.*, p.category_name as parent_name
			FROM "Category" c
			LEFT JOIN "Category" p ON c.parent_id = p.category_id
			WHERE c.created_by = ${user.user_id} AND c.is_deleted = false
			ORDER BY c.category_name ASC
		`;
		
		console.log(`Found ${userCategories.length} active categories created by user`);
	} catch (error) {
		console.error('Error fetching categories:', error);
		// userCategories is already initialized to an empty array
	}
	
	// 8. Fetch all categories for parent selection in category form (excluding deleted categories)
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
				INSERT INTO "Project"(project_id, project_name, owner_id) 
				VALUES (${newId}, ${name}, ${user.user_id})
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
					// If it starts with '{', it's likely a JSON string
					if (form.data.custom_fields_json.trim().startsWith('{')) {
						const parsed = JSON.parse(form.data.custom_fields_json);
						if (typeof parsed === 'object' && parsed !== null) {
							customFields = parsed;
						} else {
							// If it's not an object, create a structured object
							customFields = { value: parsed };
						}
					}
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
					SELECT id, created_by FROM "Manufacturer"
					WHERE id = ${manufacturerId}::text
				`;

				if (existingManufacturer.length === 0) {
					return message(form, 'Manufacturer not found', { status: 404 });
				}

				if (existingManufacturer[0].created_by !== user.user_id) {
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
				const userId = user.user_id || '';
				
				await sql`
					UPDATE "Manufacturer" 
					SET 
						manufacturer_name = ${name}::text,
						manufacturer_description = ${description}::text,
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
				await sql`DELETE FROM "ManufacturerCustomField" WHERE manufacturer_id = ${mfrId}::text`;
			} else {
				// Create a new manufacturer
				manufacturer = await createManufacturer({
					name: form.data.name,
					description: form.data.description ?? undefined,
					websiteUrl: form.data.website_url ?? undefined,
					logoUrl: form.data.logo_url ?? undefined,
					createdBy: user.user_id
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
					const manufacturerId = manufacturer.manufacturer_id || '';
					const fieldNameStr = fieldName || '';
					const fieldValueStr = String(fieldValue || '');
					const dataTypeStr = dataType || 'text';
					const userId = user.user_id || '';
					
					await sql`
						INSERT INTO "ManufacturerCustomField" (id, manufacturer_id, field_name, field_value, data_type, created_by, created_at)
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
		const form = await superValidate(request, zod(supplierFormSchema));
		console.log('Supplier form data:', JSON.stringify(form.data, null, 2));
		
		if (!form.valid) {
			console.error('Supplier validation failed:', form.errors);
			return message(form, 'Validation failed');
		}

		try {
			// Parse contact info if provided
			let contactInfo: Record<string, any> = {};
			if (form.data.contact_info) {
				try {
					// Try to parse as JSON first
					const parsed = JSON.parse(form.data.contact_info);
					if (typeof parsed === 'object' && parsed !== null) {
						contactInfo = parsed;
					} else {
						// If it's not an object, create a structured object
						contactInfo = { value: parsed };
					}
				} catch (e) {
					// If not valid JSON, store as a value in an object
					contactInfo = { value: form.data.contact_info };
				}
			}
			
			// Use the existing createSupplier function
			await createSupplier({
				name: form.data.name,
				description: form.data.description ?? undefined,
				websiteUrl: form.data.website_url ?? undefined,
				contactInfo: contactInfo,
				logoUrl: form.data.logo_url ?? undefined,
				createdBy: user.user_id
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
		const formData = await event.request.formData();
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
		// Add debug logging for each field before validation and process JSON fields
		// Use a Record to ensure TypeScript knows this object can have string keys
		const debugFormData: Record<string, string> = {};
		const processedFormData = new FormData();
		
		// IMPORTANT: Process all form data, parsing JSON fields as needed
		for (const [key, value] of formData.entries()) {
			// Convert to string for logging
			debugFormData[key] = value.toString();
			
			// Handle potential JSON fields properly
			if (typeof value === 'string' && 
				(key === 'dimensions' || 
				key === 'technical_specifications' || 
				key === 'properties' || 
				key === 'electrical_properties' ||
				key === 'mechanical_properties' || 
				key === 'thermal_properties' || 
				key === 'material_composition' || 
				key === 'environmental_data')) {
				try {
					// If it starts with '{', it's likely a JSON string
					if (value.trim().startsWith('{')) {
						const parsedValue = JSON.parse(value);
						console.log(`Parsed JSON field ${key}:`, parsedValue);
						// Use the parsed object directly with SuperForm
						processedFormData.append(key, value);
						continue;
					}
				} catch (e) {
					console.warn(`Failed to parse ${key} as JSON:`, e);
					// Keep original value if parsing fails
				}
			}
			
			// Add to processed form data
			processedFormData.append(key, value);
		}
		
		console.log('Form data before validation:', debugFormData);

		// Use processed form data for validation instead of the original
		const form = await superValidate(processedFormData, zod(createPartSchema));
		
		// CRITICAL FIX: If form validation fails but we have a name, override the error
		if (!form.valid) {
			console.error('Form validation failed:', form.errors);
			
			// CRITICAL FIX: If the only error is the name field but we know we have it,
			// manually set the name field in the form data
			if (form.errors.part_name && form.errors.part_name.includes('Name is required') && nameValue) {
				console.log('Overriding name validation error because name is present:', nameValue);
				delete form.errors.part_name;
				form.data.part_name = String(nameValue);
				
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
			// Create an object with the correct type structure
			const partData: any = {
				part_name: formData2.name,
				part_version: formData2.version || '0.1.0',
				version_status: lifecycleStatusToUse,
				status_in_bom: partStatusToUse,
				// Add required fields
				is_public: true,
				// Initialize arrays for required object collections
				compliance_info: [] as any[],
				attachments: [] as any[],
				representations: [] as any[],
				validations: [] as any[],
				manufacturer_parts: [] as any[],
				supplier_parts: [] as any[],
				// Add empty category_ids property
				category_ids: '',
				short_description: formData2.short_description || '',
				functional_description: formData2.functional_description || '',
				long_description: formData2.long_description,
				technical_specifications: formData2.technical_specifications,
				// These fields were removed because they're not supported in the schema
				// Store custom properties in a compliant format if needed
				notes: formData2.properties ? JSON.stringify(formData2.properties) : '',
				revision_notes: formData2.revision_notes || '',
				// Include physical properties if provided
				dimensions: formData2.dimensions,
				dimensions_unit: formData2.dimensions_unit,
				part_weight: formData2.weight,
				weight_unit: formData2.weight_unit,
				package_type: formData2.package_type,
				pin_count: formData2.pin_count,
				// Include thermal properties if provided
				operating_temperature_min: formData2.operating_temperature_min,
				operating_temperature_max: formData2.operating_temperature_max,
				storage_temperature_min: formData2.storage_temperature_min,
				storage_temperature_max: formData2.storage_temperature_max,
				temperature_unit: formData2.temperature_unit,
				// Include electrical properties if provided
				voltage_rating_min: formData2.voltage_rating_min,
				voltage_rating_max: formData2.voltage_rating_max,
				current_rating_min: formData2.current_rating_min,
				current_rating_max: formData2.current_rating_max,
				power_rating_max: formData2.power_rating_max,
				tolerance: formData2.tolerance,
				tolerance_unit: formData2.tolerance_unit,
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
				
				// Convert array to comma-separated string to match the expected type
				partData.category_ids = categoryIds.join(',');
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
				
				// Override the manufacturer_parts array
				partData.manufacturer_parts = manufacturerParts;
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
						console.log('Found existing part to edit:', existingPart.part_id, existingPart.part_name);
					}
				} catch (err) {
					console.error('Error fetching part for edit:', err);
				}
			}
			
			let result;

			if (isEditMode && existingPart && existingVersion) {
				// Update existing part by creating a new version
				// First, include the part ID in the data for the update
				// Add part_id as a non-schema property for internal tracking
				partData.part_id = existingPart.part_id;
				
				// For updates, version number should increment from the current version
				// Parse current version and increment patch number
				const versionParts = existingVersion.part_version.split('.');
				const major = parseInt(versionParts[0] || '0', 10);
				const minor = parseInt(versionParts[1] || '0', 10);
				const patch = parseInt(versionParts[2] || '0', 10) + 1;
				partData.part_version = `${major}.${minor}.${patch}`;
				
				// We'll use createPart but it will recognize the existing ID and update instead
				// Cast to PartFormData to satisfy TypeScript
				result = await createPart(partData, user.user_id);
				console.log('Part updated successfully with new version:', result);
				
				return message(form, `Part updated successfully to version ${partData.part_version}`);
			} else {
				// Create a new part
				// Cast to PartFormData to satisfy TypeScript
				result = await createPart(partData, user.user_id);
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
		const isDeleteMode = formData.get('delete') === 'true';
		const isEditMode = categoryId && typeof categoryId === 'string' && categoryId.trim() !== '';
		
		// Handle deletion first if delete flag is set
		if (isEditMode && isDeleteMode) {
			try {
				// First, check if the category has any children
				const childrenCheck = await sql`
					SELECT COUNT(*) AS child_count FROM "Category" 
					WHERE parent_id = ${categoryId} AND is_deleted = false
				`;
				
				// Prevent deletion if category has children
				if (childrenCheck[0]?.child_count > 0) {
					console.log(`Cannot delete category ${categoryId}: has ${childrenCheck[0].child_count} children`);
					return fail(400, { message: 'Cannot delete a category that has children. Please delete child categories first or move them to another parent.' });
				}
				
				// Check if the category exists and belongs to the user
				const categoryCheck = await sql`
					SELECT * FROM "Category" WHERE category_id = ${categoryId} AND created_by = ${user.user_id}
				`;
				
				if (categoryCheck.length === 0) {
					return fail(403, { message: 'Category not found or you do not have permission to delete it.' });
				}
				
				// Soft delete the category with transaction
				try {
					// Begin a transaction for atomic operations
					await sql.begin(async sql => {
						// First, make sure the category exists and isn't already deleted
						const existingCheck = await sql`
							SELECT category_id 
							FROM "Category" 
							WHERE category_id = ${categoryId} 
							AND is_deleted = false
							FOR UPDATE
						`;
						
						// If category not found or already deleted, throw error
						if (existingCheck.length === 0) {
							throw new Error('Category not found or already deleted');
						}
						
						// Check for child categories within the transaction
						const childrenCount = await sql`
							SELECT COUNT(*) AS child_count 
							FROM "Category" 
							WHERE parent_id = ${categoryId} 
							AND is_deleted = false
						`;
						
						if (childrenCount[0]?.child_count > 0) {
							throw new Error(`Cannot delete category - it has ${childrenCount[0].child_count} child categories.`);
						}
						
						// Check if category is used in any parts
						const partsCheck = await sql`
							SELECT COUNT(*) AS parts_count 
							FROM "PartVersionCategory" 
							WHERE category_id = ${categoryId}
						`;
						
						if (partsCheck[0]?.parts_count > 0) {
							// This is a soft warning - we will proceed with deletion but log a warning
							console.warn(`Category ${categoryId} is used by ${partsCheck[0].parts_count} parts.`);
						}
						
						// Mark as deleted and record who deleted it and when
						await sql`
							UPDATE "Category" 
							SET 
								is_deleted = true, 
								updated_at = NOW(), 
								updated_by = ${user.user_id},
								deleted_at = NOW(),
								deleted_by = ${user.user_id}
							WHERE category_id = ${categoryId}
						`;
						
						// NOTE: Custom fields are stored in the Category table's custom_fields JSONB column
						// No need to update a separate table
					});
					
					// Transaction completed successfully
					console.log(`Category ${categoryId} successfully soft-deleted with all related data`);
					
					// Return success message that will be shown to the user
					return { success: true, message: 'Category successfully deleted' };
				} catch (dbError) {
					console.error('Database error deleting category:', dbError);
					
					// Provide more specific error message based on error type
					let errorMessage = 'Failed to delete category';
					if (dbError instanceof Error) {
						if (dbError.message.includes('child categories')) {
							return fail(400, { message: dbError.message });
						} else if (dbError.message.includes('not found')) {
							return fail(404, { message: 'Category not found or already deleted' });
						}
						errorMessage += ': ' + dbError.message;
					}
					
					return fail(500, { message: errorMessage });
				}
			} catch (error) {
				// Log the actual error
				console.error('Error deleting category:', error);
				
				// Return a user-friendly error message
				return fail(500, { success: false, message: 'Failed to delete category' });
			}
		}

		// SuperValidate the form data with the category schema
		// Need to transform parent_id for union type handling
		const form = await superValidate(formData, zod(categoryFormSchema));

		console.log('Category form validation result:', {
			valid: form.valid,
			data: form.data,
			errors: form.errors
		});
		
		if (!form.valid) {
			console.error('Category validation errors:', form.errors);
			return message(form, 'Invalid form data. Please check the fields.');
		}
		
		try {
			if (isEditMode) {
				// EDIT MODE: Check if the category exists and belongs to the user
				const categoryCheck = await sql`
					SELECT * FROM "Category" WHERE category_id = ${categoryId} AND created_by = ${user.user_id}
				`;
				
				if (categoryCheck.length === 0) {
					return message(form, 'Category not found or you do not have permission to edit it.', { status: 403 });
				}
				
				// Validate and process parent_id from form data
				let parentId;
				
				// SuperForm may return parent_id as string, null, or undefined
				if (form.data.parent_id && form.data.parent_id !== '') {
					// Check if it's a valid UUID
					const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
					if (uuidRegex.test(String(form.data.parent_id))) {
						parentId = String(form.data.parent_id);
						
						// Check that the parent isn't the category itself (circular reference)
						if (parentId === categoryId) {
							return message(form, 'Category cannot be its own parent', { status: 400 });
						}
						
						console.log(`Using parent ID: ${parentId}`);
					} else {
						return message(form, 'Invalid parent category ID format', { status: 400 });
					}
				} else {
					// No parent selected, this will be a root category
					parentId = null;
					console.log('No parent selected, will create/update as root category');
				}
				
				const categoryName = form.data.category_name;
				
				// Use the sanitizeLtreeLabel function from core/category.ts for consistent formatting
				// This ensures the label is properly formatted for PostgreSQL ltree paths
				const sanitizedLabel = sanitizeLtreeLabel(categoryName);
				console.log(`Original name: "${categoryName}" -> Sanitized ltree label: "${sanitizedLabel}"`);
				
				// Update category path based on parent
				let path;
				
				if (parentId) {
					// Get parent path for constructing the category path
					const parentResult = await sql`
						SELECT category_path FROM "Category" WHERE category_id = ${parentId} AND is_deleted = false
					`;
					
					if (parentResult.length === 0) {
						return message(form, 'Invalid parent category', { status: 400 });
					}
					
					const parentPath = parentResult[0].category_path;
					path = `${parentPath}.${sanitizedLabel}`;
				} else {
					// For root categories, use just the sanitized label
					path = sanitizedLabel;
				}

				// Begin a transaction to update the category and all child paths
				await sql.begin(async sql => {
					// First get the old category path before updating
					const oldPathResult = await sql`
						SELECT category_path FROM "Category" WHERE category_id = ${categoryId}
					`;
					const oldPath = oldPathResult[0]?.category_path;
					console.log('Old path:', oldPath, 'New path:', path);

					// Update the current category with the new path
					await sql`
						UPDATE "Category" 
						SET 
							category_name = ${form.data.category_name},
							category_description = ${form.data.category_description || null},
							parent_id = ${parentId},
							category_path = ${path},
							is_public = ${Boolean(form.data.is_public)},
							updated_at = NOW(),
							updated_by = ${user.user_id}
						WHERE category_id = ${categoryId}
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
								    updated_at = NOW(),
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
					
					// Call createCategory with all properly validated parameters
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
	},
};
