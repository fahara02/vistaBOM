<script lang="ts">
	// Import type definitions
	import type { Category, UnifiedPart, PartVersion, PartWithCurrentVersion } from '$lib/types/schemaTypes';
	import { DimensionUnitEnum, WeightUnitEnum, PackageTypeEnum, MountingTypeEnum, TemperatureUnitEnum } from '$lib/types/enums';
	import type { PageData } from './$types';

	// Import components and utilities
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { PartForm } from '$lib/components/forms';
	import CategoryComboBox from '$lib/components/forms/CategoryComboBox.svelte';
	import CategoryComponent from '$lib/components/cards/category.svelte';
	import CategoriesTab from '$lib/components/dashboard/categories-tab.svelte';
	import ManufacturersTab from '$lib/components/dashboard/manufacturers-tab.svelte';
	import SuppliersTab from '$lib/components/dashboard/suppliers-tab.svelte';
	import PartsTab from '$lib/components/dashboard/parts-tab.svelte';
	import { categoryFormSchema } from '$lib/schema/schema';
	import { z } from 'zod';
	import { superForm } from 'sveltekit-superforms/client';
	import type { SuperForm, SuperValidated } from 'sveltekit-superforms';
	import { enhance } from '$app/forms';
	import { LifecycleStatusEnum, PartStatusEnum } from '$lib/types/enums';
    // Import form types and schema types
	import type { SupplierFormData, ManufacturerFormData, DashboardManufacturer, DashboardSupplier } from '$lib/types/formTypes';
	import type { PartFormData } from '$lib/types/schemaTypes';
	// Import part schema for form validation
	import { unifiedPartSchema } from '$lib/schema/unifiedPartSchema';
	import type { JsonValue, Manufacturer, Supplier } from '$lib/types/types';
	import { adaptManufacturer } from '$lib/types/componentTypes';
	// Safe enum parser that doesn't use banned 'any' or 'unknown' types
	// It converts a string to the appropriate enum type if valid, otherwise returns undefined
	function safeParseEnum<T>(value: string | undefined, enumType: Record<string, string>): T | undefined {
		if (!value) return undefined;
		
		// Check if the value exists in the enum
		const enumValues = Object.values(enumType);
		if (enumValues.includes(value)) {
			return value as unknown as T;
		}
		
		return undefined;
	}

	// Debug function to log dimensions data from an object
	function logDimensionFields(obj: any, label: string): void {
		const dimensions = obj.dimensions || {};
		console.log(`${label} dimensions:`, {
			dimensions,
			dimensions_unit: obj.dimensions_unit,
			// Extract individual dimensions if they exist in the complex object
			height: dimensions.height,
			width: dimensions.width,
			length: dimensions.length,
		
		});
	}

	// Type definitions for form data
	type CategoryFormType = z.infer<typeof categoryFormSchema>;
	
	

	export let data: PageData;
	const user = data.user!;

	// Ensure fullName is a string for rendering
	const fullName = user.username || user.email || '';
	const initial = fullName.charAt(0) || '';
	
	// Variables for handling data based on the structure returned from the server
	let categories: Category[] = data?.categories || [];
	// For backward compatibility, alias categories as allCategories 
	let allCategories: Category[] = categories;
	// Extract projects data from page data
	const projects = data?.projects || [];
	// Define typed user items - use proper types instead of any
	let userParts: UnifiedPart[] = data?.userParts || [];
	
	/**
	 * Transform manufacturer data from server format (with snake_case property names)
	 * to the DashboardManufacturer interface format needed for our UI
	 * Ensuring proper handling of null values to match expected component types
	 */
	function transformManufacturerData(manufacturers: any[]): DashboardManufacturer[] {
	
		
		// Create a Set to track used IDs and avoid duplicates
		const usedIds = new Set<string>();
		
		return manufacturers.map(manufacturer => {
			// The server returns fields in camelCase but our component expects snake_case
			// Handle the camelCase to snake_case conversion for IDs
			let manufacturerId = manufacturer.manufacturerId || manufacturer.manufacturer_id || '';
			
			// Ensure we have a valid ID - generate UUID if missing
			if (!manufacturerId) {
				manufacturerId = crypto.randomUUID();
			}
			
			// Check for duplicate IDs and generate a new one if needed
			if (usedIds.has(manufacturerId)) {
				manufacturerId = crypto.randomUUID();
			}
			usedIds.add(manufacturerId);
			
			// Convert server data to our DashboardManufacturer interface with consistent snake_case properties
			const transformedManufacturer: DashboardManufacturer = {
				manufacturer_id: manufacturerId,
				manufacturer_name: manufacturer.name || manufacturer.manufacturer_name || '',
				// Convert null to undefined to match expected type in components
				manufacturer_description: manufacturer.description === null ? undefined : (manufacturer.description || manufacturer.manufacturer_description),
				website_url: manufacturer.website === null ? undefined : (manufacturer.website || manufacturer.website_url),
				logo_url: manufacturer.logoUrl === null ? undefined : (manufacturer.logoUrl || manufacturer.logo_url),
				contact_info: manufacturer.contact_info === null ? undefined : manufacturer.contact_info as JsonValue,
				custom_fields: manufacturer.custom_fields === null ? undefined : manufacturer.custom_fields as JsonValue,
				created_at: new Date(manufacturer.createdAt || manufacturer.created_at || Date.now()),
				updated_at: manufacturer.updatedAt ? new Date(manufacturer.updatedAt) 
						 : (manufacturer.updated_at ? new Date(manufacturer.updated_at) : new Date()), // Ensure it's always a Date
				created_by: manufacturer.createdBy || manufacturer.created_by || user?.user_id || '',
				updated_by: manufacturer.updatedBy === null ? undefined : (manufacturer.updatedBy || manufacturer.updated_by)
			};
			return transformedManufacturer;
		});
	}

	/**
	 * Transform supplier data from server format to the DashboardSupplier interface
	 * Ensuring proper handling of null values and consistent data types
	 */
	function transformSupplierData(suppliers: any[]): DashboardSupplier[] {
		
		
		// Create a Set to track used IDs and avoid duplicates
		const usedIds = new Set<string>();
		
		return suppliers.map(supplier => {
			// Handle ID field which might be in different formats
			let supplierId = supplier.supplierId || supplier.supplier_id || '';
			
		// Ensure we have a valid ID
			if (!supplierId) {
				supplierId = crypto.randomUUID();
			}
			
			// Check for duplicate IDs
			if (usedIds.has(supplierId)) {
				supplierId = crypto.randomUUID();
			}
			usedIds.add(supplierId);
			
			// Process contact_info to ensure it's a string or null
			let contactInfo: string | null = null;
			if (supplier.contact_info !== null && supplier.contact_info !== undefined) {
				if (typeof supplier.contact_info === 'string') {
					contactInfo = supplier.contact_info;
				} else if (typeof supplier.contact_info === 'object') {
					// Convert object to JSON string
					try {
						contactInfo = JSON.stringify(supplier.contact_info);
					} catch (e) {
						console.error('Error stringifying contact_info:', e);
						contactInfo = '{}';
					}
				}
			}
			
			// Process custom_fields to ensure it's a Record<string, unknown> or null
			let customFields: Record<string, unknown> | null = null;
			if (supplier.custom_fields !== null && supplier.custom_fields !== undefined) {
				if (typeof supplier.custom_fields === 'string') {
					try {
						customFields = JSON.parse(supplier.custom_fields);
					} catch (e) {
						console.error('Error parsing custom_fields string:', e);
						customFields = {};
					}
				} else if (typeof supplier.custom_fields === 'object') {
					customFields = supplier.custom_fields;
				}
			}
			
			// Transform to match the DashboardSupplier interface
			const transformedSupplier: DashboardSupplier = {
				supplier_id: supplierId,
				supplier_name: supplier.name || supplier.supplier_name || '',
				supplier_description: supplier.description === null ? undefined : (supplier.description || supplier.supplier_description),
				website_url: supplier.website === null ? undefined : (supplier.website || supplier.website_url),
				logo_url: supplier.logoUrl === null ? undefined : (supplier.logoUrl || supplier.logo_url),
				contact_info: contactInfo === null ? undefined : contactInfo as JsonValue,
				custom_fields: customFields === null ? undefined : customFields as JsonValue,
				created_at: new Date(supplier.createdAt || supplier.created_at || Date.now()),
				updated_at: supplier.updatedAt ? new Date(supplier.updatedAt) 
						 : (supplier.updated_at ? new Date(supplier.updated_at) : new Date()),
				created_by: supplier.createdBy || supplier.created_by || user?.user_id || '',
				updated_by: supplier.updatedBy === null ? undefined : (supplier.updatedBy || supplier.updated_by)
			};
			return transformedSupplier;
		});
	}

	// Transform the raw manufacturer data to match our DashboardManufacturer interface
	let userManufacturers: DashboardManufacturer[] = transformManufacturerData(data?.userManufacturers || []);
	// Transform supplier data to match our DashboardSupplier interface
	let userSuppliers: DashboardSupplier[] = transformSupplierData(data?.userSuppliers || []);
	
	// Create a reactive binding for the manufacturer form data to directly pass to the component
	$: manufacturerFormData = $manufacturerForm;
	
	// Transform category data function
	function transformCategoryData(categories: any[]): Category[] {
		// First pass: Create a map of category_id to category_name for parent lookups
		const categoryIdToNameMap = new Map<string, string>();
		for (const category of categories) {
			const id = category.categoryId || category.category_id || '';
			const name = category.categoryName || category.category_name || '';
			if (id && name) {
				categoryIdToNameMap.set(id, name);
			}
		}

		// Second pass: Create the transformed categories with parent_name lookups
		return categories.map(category => {
			// Get parent_id from either camelCase or snake_case property
			const parentId = category.parentId || category.parent_id || null;

			// Get parent_name directly from the database result
			// The SQL JOIN in +page.server.ts provides this
			let parentName = category.parent_name;
			
			// If not available, look up in our map as a fallback
			if ((!parentName || parentName === '') && parentId) {
				// Use the map we built in the first pass for lookups
				parentName = categoryIdToNameMap.get(parentId) || 'Unknown Parent';
			}
			
			// Create properly typed Category object from the camelCase data
			const transformedCategory: Category = {
				category_id: category.categoryId || category.category_id || '',
				category_name: category.categoryName || category.category_name || '',
				category_description: category.categoryDescription || category.category_description || '',
				category_path: category.categoryPath || category.category_path || '',
				parent_id: parentId,
				is_public: typeof category.is_public === 'boolean' ? category.is_public : false,
				created_at: category.createdAt ? new Date(category.createdAt) : (category.created_at ? new Date(category.created_at) : new Date()), 
				updated_at: category.updatedAt ? new Date(category.updatedAt) : (category.updated_at ? new Date(category.updated_at) : new Date()),
				created_by: category.createdBy || category.created_by || '',
				updated_by: category.updatedBy || category.updated_by || null,
				is_deleted: Boolean(category.isDeleted || category.is_deleted) || false,
				deleted_at: category.deletedAt || category.deleted_at || null,
				deleted_by: category.deletedBy || category.deleted_by || null,
			};
			return transformedCategory;
		});
	}

	// Create a reactive binding for user categories (used for display in grid)
	$: transformedCategories = transformCategoryData(data?.userCategories || []);
	
	// Also transform all categories (including public ones) for parent selection
	$: allCategoriesTransformed = transformCategoryData(data?.categories || []);
	
	// Store all categories for use in stores
	$: allCategories = allCategoriesTransformed;

	// Reference to form element
	let partFormElement: HTMLFormElement;
	
	// Initialize forms using superForm
	const { form: categoryForm, errors: categoryErrors, enhance: categoryEnhance, submitting: categorySubmitting, message: categoryMessage } = superForm<z.infer<typeof categoryFormSchema>>(data.forms?.category, {
		dataType: 'json',
		onResult: ({ result }) => {
			if (result.type === 'success') {
				showCategoryForm = false;
				editCategoryMode = false;
				currentCategoryId = null;
				refreshData();
			}
			return result;
		}
	});
	
	// Store the complete SuperForm result so we can access its full interface
	const partSuperForm = superForm(data.forms?.part, {
		dataType: 'json',
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				// Close the form and reset edit mode
				showPartForm = false;
				editPartMode = false;
				currentPartId = null;
				
				// Refresh the data to show the new/updated part
				refreshData();
			}
			return result;
		}
	});
	
	// Destructure for convenience in the rest of the code
	const { form: partForm, errors: partErrors, enhance: partEnhance, submitting: partSubmitting, message: partMessage } = partSuperForm;
	
	// Create a reference to the complete SuperForm instance to pass to the PartsTab component
	// Pass the SuperForm instance directly to the PartsTab component
	// The typing issue needs to be fixed in a more precise way
	const partFormInstance = partSuperForm;
	
	const { form: manufacturerForm, errors: manufacturerErrors, enhance: manufacturerEnhance, submitting: manufacturerSubmitting, message: manufacturerMessage } = superForm(data.forms?.manufacturer || {
			manufacturer_id: '',
			manufacturer_name: '',
			manufacturer_description: '',
			website_url: '',
			logo_url: '',
			contact_info: '{}',
			custom_fields: {},
			created_by: user.user_id,
			updated_by: user.user_id
		}, {
		dataType: 'json',
		resetForm: true,
		// Properly handle form validation before submission
		validationMethod: 'submit-only',
		onSubmit: ({ formData, cancel }) => {
			
			
			// Ensure manufacturer_name is present
			if (!formData.get('manufacturer_name') || String(formData.get('manufacturer_name')).trim() === '') {
				cancel();
				return {
					manufacturer_name: ['Manufacturer name is required']
				};
			}
		},
		onResult: ({ result }) => {
			
			
			// Handle the result of form submission
			if (result.type === 'success') {
				// Close the form and reset edit mode
				showManufacturerForm = false;
				editManufacturerMode = false;
				currentManufacturerId = null;
				
				// Refresh the data to show the new/updated manufacturer
				refreshData();
			} else if (result.type === 'error') {
				console.error('Manufacturer form submission error:', result.error);
			}
			return result;
		}
	});
	
	// Function to directly set form values to bypass store subscription issues
	function updateManufacturerForm(formData: any) {
	
		
		// Create a complete form object first to ensure all fields are properly set
		const updatedForm = {
			// Required fields
			manufacturer_id: formData.manufacturer_id || '',
			manufacturer_name: formData.manufacturer_name || '',
			
			// Optional fields with proper type handling
			manufacturer_description: formData.manufacturer_description || '',
			website_url: formData.website_url || '',
			logo_url: formData.logo_url || '',
			
			// JSON fields with proper format handling
			contact_info: processJsonField(formData.contact_info),
			custom_fields: processJsonField(formData.custom_fields),
			
			// User tracking fields
			created_by: formData.created_by || user.user_id,
			updated_by: user.user_id, // Always set to current user for updates
			
			// Add timestamp fields to satisfy TypeScript
			created_at: formData.created_at || new Date(),
			updated_at: formData.updated_at || new Date()
		};
		
		// Update the form with the complete object
		$manufacturerForm = updatedForm;
		
	}
	
	// Helper function to process JSON fields consistently
	function processJsonField(value: any): string {
		if (!value) return '{}';
		
		// If it's already a string, check if it's valid JSON
		if (typeof value === 'string') {
			if (value.trim() === '') return '{}';
			
			try {
				// Try to parse and re-stringify to ensure valid JSON format
				const parsed = JSON.parse(value);
				return JSON.stringify(parsed);
			} catch (e) {
				// If it's not valid JSON but looks like it might be key-value pairs
				if (value.includes(':') && !value.startsWith('{')) {
					try {
						// Try to convert key-value format to JSON
						const pairs = value.split(/[;\n]+/);
						const obj: Record<string, string> = {};
						
						for (const pair of pairs) {
							const [key, val] = pair.split(':').map(s => s.trim());
							if (key && val) {
								obj[key] = val;
							}
						}
						return JSON.stringify(obj);
					} catch {
						// If conversion fails, store as notes
						return JSON.stringify({ notes: value });
					}
				} else {
					// If not in key-value format, store as notes
					return JSON.stringify({ notes: value });
				}
			}
		}
		
		// If it's an object, stringify it
		if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		
		// For other types, convert to string and wrap in JSON
		return JSON.stringify({ value: String(value) });
	}
	
	// Create a variable to hold the complete SuperForm instance reference 
	// This is needed to pass to the PartsTab component

	const { form: supplierForm, errors: supplierErrors, enhance: supplierEnhance, submitting: supplierSubmitting, message: supplierMessage } = superForm(data.forms?.supplier, {
		dataType: 'json',
		resetForm: true,
		// Handle form data before submission to ensure conformity with schema
		onSubmit: ({ formData }) => {
			// Generate a valid UUID for supplier_id if empty or missing
			const supplierIdValue = formData.get('supplier_id');
			if (!supplierIdValue || supplierIdValue === '') {
				const uuid = crypto.randomUUID();
				formData.set('supplier_id', uuid);
				// Also update the reactive store
				$supplierForm.supplier_id = uuid;
			}

			// Handle contact info field - ensure it's properly formatted as JSON
			const contactInfo = formData.get('contact_info');
			if (contactInfo && typeof contactInfo === 'string' && contactInfo.trim() !== '') {
				try {
					// Try to parse it as JSON to validate it
					JSON.parse(contactInfo);
					// It's valid JSON, so we'll keep it as is
				} catch (e) {
					// Not valid JSON, so we'll wrap it as a note
					formData.set('contact_info', JSON.stringify({ notes: contactInfo }));
				}
			} else if (contactInfo === '') {
				// Empty string should be null for schema compliance
				// Can't use undefined with FormData.set()
				formData.set('contact_info', '');
			}

			// No need to process empty fields anymore - we just leave them as empty strings
			// and let the server handle the conversion to null where appropriate
			// The server's processEmptyString function will properly convert these
		},
		onResult: ({ result }) => {
			if (result.type === 'success') {
				showSupplierForm = false;
				refreshData();
			}
			return result;
		}
	});
	
	// Variables for edit mode tracking
	let editCategoryMode = false;
	let currentCategoryId: string | null = null;
	
	// Manufacturer edit mode tracking
	let editManufacturerMode = false;
	let currentManufacturerId: string | null = null;
	
	// Supplier edit mode tracking
	let editSupplierMode = false;
	let currentSupplierId: string | null = null;
	
	// Function to edit a supplier - called when user clicks edit on a supplier
	function editSupplier(event: CustomEvent<any>) {
		// Get supplier data from event - handle different event formats
		const supplier = event.detail.supplier || event.detail.item || event.detail;
		
		
		// Store the original contact_info and custom_fields as they are
		// This prevents double stringification which causes issues with input
		const contact_info = supplier.contact_info || '{}';
		const custom_fields = supplier.custom_fields || '{}';
		
		// Set the current supplier ID for tracking edit mode
		currentSupplierId = supplier.supplier_id;
		
		// Update the supplier form with the data from the selected supplier
		$supplierForm = {
			supplier_id: supplier.supplier_id || '',
			supplier_name: supplier.supplier_name || '',
			supplier_description: supplier.supplier_description || null,
			website_url: supplier.website_url || null,
			logo_url: supplier.logo_url || null,
			
			// Only stringify if not already a string, avoid double-stringification
			contact_info: typeof contact_info === 'string' ? contact_info : JSON.stringify(contact_info),
			custom_fields: typeof custom_fields === 'string' ? custom_fields : JSON.stringify(custom_fields),
			
			// User tracking fields
			created_by: supplier.created_by || user.user_id,
			updated_by: user.user_id, // Always set to current user for updates
			
			// Required timestamp fields
			created_at: supplier.created_at ? new Date(supplier.created_at) : new Date(),
			updated_at: new Date()
		};
		
	
	}
	
	// Function to cancel supplier edit and reset the form
	function cancelSupplierEdit() {
		
		
		// Reset the supplier form to default values
		$supplierForm = {
			supplier_id: '',
			supplier_name: '',
			supplier_description: '',
			website_url: '',
			logo_url: '',
			contact_info: '{}',
			custom_fields: {},
			created_by: user.user_id,
			updated_by: user.user_id,
			// Required timestamp fields
			created_at: new Date(),
			updated_at: new Date()
		};
		
		// Reset edit mode tracking variables
		editSupplierMode = false;
		currentSupplierId = null;
	}

	// Tab management with localStorage persistence
	type TabType = 'projects' | 'parts' | 'manufacturers' | 'suppliers' | 'categories';
	
	// Initialize activeTab from localStorage if available, otherwise default to 'projects'
	let activeTab: TabType = 'projects';
	
	// Only access localStorage in browser environment
	if (typeof window !== 'undefined') {
		const storedTab = localStorage.getItem('vistaBOM_activeTab');
		if (storedTab && ['projects', 'parts', 'manufacturers', 'suppliers', 'categories'].includes(storedTab)) {
			activeTab = storedTab as TabType;
		}
	}
	
	// Function to set active tab and save to localStorage
	function setActiveTab(tab: TabType): void {
		activeTab = tab;
		if (typeof window !== 'undefined') {
			localStorage.setItem('vistaBOM_activeTab', tab);
		}
	}

	// Form visibility toggles
	let showPartForm = false;
	let showManufacturerForm = false;
	let showCategoryForm = false;
	let showSupplierForm = false;

	// Part edit mode tracking
	let editPartMode = false;
	let currentPartId: string | null = null;

	// Function to handle editing a part with proper typing based on the schema
	function editPart(event: CustomEvent<{part: UnifiedPart}>) {
		// Get UnifiedPart data from event
		const eventDetail = event.detail || {};
		// Extract the UnifiedPart data directly from the event detail
		const partData = eventDetail.part;
		
		// Set the current part ID for tracking edit mode if it exists
		currentPartId = partData.part_id || null;
		
		console.log('Editing part with full data:', {partData});
		
		// Update the part form with the data from the selected part
		// Include ALL fields expected by the PartForm component based on the schema
		$partForm = {
			// Using UnifiedPart fields directly with proper type safety
			part_name: partData.part_name || '',
			part_version: partData.part_version || '0.1.0',
			internal_part_number: partData.internal_part_number || '',
			version_status: partData.version_status || LifecycleStatusEnum.DRAFT,
			status_in_bom: partData.status_in_bom || PartStatusEnum.CONCEPT,
			is_public: partData.is_public === true,
			short_description: partData.short_description || '',
			long_description: partData.long_description || '',
			functional_description: partData.functional_description || '',
			compliance_info: partData.compliance_info || [],
			attachments: (partData.attachments || []).map(a => ({
				file_name: a.file_name,
				file_url: a.file_url,
				is_primary: a.is_primary === true,
				attachment_type: a.attachment_type || undefined,
				file_size_bytes: a.file_size || undefined,
				file_type: a.file_type || undefined,
				attachment_description: a.description || undefined,
				thumbnail_url: a.thumbnail_url || undefined,
				attachment_checksum: undefined
			})),
			representations: (partData.representations || []).map(r => {
				// Create a type-safe metadata object that matches the schema
				let metadataObj: {
					notes?: string;
					dimensions?: Record<string, number>;
					software?: string;
					version?: string;
					creation_date?: string | Date;
				} | string | null = null;
				
				if (typeof r.metadata === 'string') {
					// If metadata is a string, keep it as is
					metadataObj = r.metadata;
				} else if (r.metadata && typeof r.metadata === 'object') {
					// Normalize object to expected shape with strict typing
					const md = r.metadata as Record<string, any>;
					metadataObj = {
						notes: typeof md.notes === 'string' ? md.notes : undefined,
						software: typeof md.software === 'string' ? md.software : undefined,
						version: typeof md.version === 'string' ? md.version : undefined,
						// Only include dimensions if it's a valid record
						dimensions: md.dimensions && typeof md.dimensions === 'object' ? md.dimensions as Record<string, number> : undefined,
						creation_date: md.creation_date || undefined
					};
				}
				
				return {
					representation_type: r.representation_type as "3D Model" | "Footprint" | "Schematic Symbol" | "Simulation Model",
					is_recommended: r.is_recommended === true,
					metadata: metadataObj,
					file_url: r.file_url || undefined,
					format: r.format || undefined
				};
			}),
			structure: partData.structure || [],
			manufacturer_parts: (partData.manufacturer_parts || []).map(mp => ({
				manufacturer_part_number: mp.manufacturer_part_number,
				manufacturer_id: mp.manufacturer_id,
				is_recommended: mp.is_recommended === true,
				description: mp.manufacturer_part_description || undefined,
				datasheet_url: mp.datasheet_url || undefined,
				product_url: mp.product_url || undefined
			})),
			supplier_parts: partData.supplier_parts || [],
			technical_specifications: partData.technical_specifications ? (typeof partData.technical_specifications === 'string' ? JSON.parse(partData.technical_specifications) : partData.technical_specifications) : {},
			dimensions: partData.dimensions,
			dimensions_unit: partData.dimensions_unit,
			pin_count: partData.pin_count || undefined,
			part_weight: partData.part_weight || undefined,
			weight_unit: partData.weight_unit,
			package_type: partData.package_type,
			mounting_type: partData.mounting_type,
			voltage_rating_min: partData.voltage_rating_min || undefined,
			voltage_rating_max: partData.voltage_rating_max || undefined,
			current_rating_min: partData.current_rating_min || undefined,
			current_rating_max: partData.current_rating_max || undefined,
			power_rating_max: partData.power_rating_max || undefined,
			operating_temperature_min: partData.operating_temperature_min || undefined,
			operating_temperature_max: partData.operating_temperature_max || undefined,
			storage_temperature_min: partData.storage_temperature_min || undefined,
			storage_temperature_max: partData.storage_temperature_max || undefined,
			temperature_unit: partData.temperature_unit,
			tolerance: partData.tolerance || undefined,
			tolerance_unit: partData.tolerance_unit || undefined,
			// Custom properties handled via technical_specifications
			// termination_style and material are not part of UnifiedPart schema
		};
		
		console.log('Part form updated with all available fields');
	}

	// Function to cancel part editing
	function cancelPartEdit() {
		// Reset the form data - include ALL properties from the schema with empty/default values
		$partForm = {
			// Core part information
			// Note: Not setting part_id or creator_id to avoid TypeScript errors with the schema
			part_name: '',
			part_version: '0.1.0',
			internal_part_number: '',
			version_status: LifecycleStatusEnum.DRAFT,
			status_in_bom: PartStatusEnum.CONCEPT,
			is_public: false,
			short_description: '',
			long_description: '',
			functional_description: '',
			compliance_info: [],
			attachments: [],
			representations: [],
			structure: [],
			manufacturer_parts: [],
			supplier_parts: [],
			technical_specifications: {},
			dimensions: { length: null, width: null, height: null },
			dimensions_unit: undefined,
			pin_count: undefined,
			part_weight: undefined,
			weight_unit: undefined,
			package_type: undefined,
			mounting_type: undefined,
			voltage_rating_min: undefined,
			voltage_rating_max: undefined,
			current_rating_min: undefined,
			current_rating_max: undefined,
			power_rating_max: undefined,
			operating_temperature_min: undefined,
			operating_temperature_max: undefined,
			storage_temperature_min: undefined,
			storage_temperature_max: undefined,
			temperature_unit: undefined,
			tolerance: undefined,
			tolerance_unit: undefined,
			termination_style: undefined,
			material: undefined
		};
		
		// Reset edit mode tracking
		editPartMode = false;
		currentPartId = null;
		console.log('Part form reset with empty values for all fields');
	}

	// Data refresh function to handle updates without page reload
	async function refreshData() {
		try {
			// Store current tab
			const currentTab = activeTab;
			
			// Force a more aggressive cache invalidation
			await Promise.all([
				invalidate('data:dashboard'),
				invalidateAll(), // More aggressive invalidation to ensure all data is refreshed
				new Promise(resolve => setTimeout(resolve, 300)) // Slightly longer delay
			]);
			
			// Create new array with corrected field naming for grid component
			// Ensure category names are never null or undefined (direct fix for the unnamed bug)
			categories = (data.categories || []).map((cat: Category) => {
				// Ensure we're returning a category with a valid name
				return {
					...cat,
					// Explicitly set category_name to a non-null value
					category_name: cat.category_name || cat.category_path || 'Category ' + cat.category_id.substring(0, 8) || ''
				};
			});
			allCategories = [...categories];
			
			userParts = [...(data.userParts || [])];
			
			// Create a completely new array for manufacturers to ensure reactivity
			const freshManufacturers = transformManufacturerData(data.userManufacturers || []);
			userManufacturers = [...freshManufacturers]; // Explicit new array reference
			userSuppliers = transformSupplierData(data.userSuppliers || []);
			
			// Restore tab state from localStorage or use current tab as fallback
			if (typeof window !== 'undefined') {
				activeTab = (localStorage.getItem('vistaBOM_activeTab') as TabType) || currentTab;
			} else {
				activeTab = currentTab;
			}
			
		} catch (error) {
			console.error('Error refreshing dashboard data:', error);
		}
	}
	
	// For backward compatibility - can be replaced with refreshData() in the future
	async function refreshCategoryData() {
		await refreshData();
	}



	// Function to toggle supplier form visibility
	function toggleSupplierForm() {
		showSupplierForm = !showSupplierForm;
		
		// Reset form to initial values when opening
		if (showSupplierForm) {
			// CRITICAL: Force complete form reset first, don't rely on previous state
			// This resets all fields including any persisted values in the form state
			const emptyForm = {
				supplier_id: '', // ALWAYS empty for new suppliers
				supplier_name: '',
				supplier_description: '',
				website_url: '',
				contact_info: '',
				logo_url: '',
				created_at: new Date(),
				updated_at: new Date(),
				custom_fields: {},
				created_by: '',
				updated_by: ''
			};
			
			// Apply the complete reset by assigning the entire object
			$supplierForm = emptyForm;
			
			// Force a DOM refresh to ensure the form is truly reset
			setTimeout(() => {
				// Double-check that supplier_id is still empty after reset
				if ($supplierForm.supplier_id) {
					console.warn('WARNING: supplier_id was not empty after reset, forcing empty again');
					$supplierForm.supplier_id = '';
				}
			}, 0);
		}
	}
	
	// Event handlers for entity deletion
	function handleCategoryDeleted(event: CustomEvent<{ categoryId: string }>) {
		transformedCategories = transformedCategories.filter(cat => cat.category_id !== event.detail.categoryId);
		refreshData();
	}
	
	// Function to cancel category edit mode
	function cancelCategoryEdit() {
		editCategoryMode = false;
		currentCategoryId = null;
		$categoryForm = {
			category_name: '',
			category_description: '',
			parent_id: null, // Using null instead of undefined to satisfy TypeScript string | null type
			is_public: true
		};
	}
	
	// Function to toggle part form visibility
	function togglePartForm() {
		showPartForm = !showPartForm;
		if (!showPartForm) {
			editPartMode = false;
			cancelPartEdit();
		}
	}
	
	// Function to handle supplier deletion event
	function handleSupplierDeleted(event: CustomEvent<{ supplierId: string }>) {
		refreshData();
	}

	// Function to handle manufacturer edit - use proper type from schema
	function editManufacturer(event: CustomEvent<any>) {
		// Get manufacturer data from event - handling different event formats safely
		const eventDetail = event.detail || {};
		// Extract the manufacturer data from the event, handling different formats
		const mfgData = eventDetail.manufacturer || eventDetail.item || eventDetail;
		
		// Safely extract properties using type checking to avoid runtime errors
		const safeGetString = (obj: any, prop: string): string => {
			return obj && typeof obj[prop] === 'string' ? obj[prop] : '';
		};
		
		const safeGetJson = (obj: any, prop: string): string => {
			if (!obj) return '{}';
			const value = obj[prop];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') return JSON.stringify(value);
			return '{}';
		};
		
		// Update the manufacturer form with safe type checking
		$manufacturerForm = {
			manufacturer_id: safeGetString(mfgData, 'manufacturer_id'),
			manufacturer_name: safeGetString(mfgData, 'manufacturer_name'),
			manufacturer_description: safeGetString(mfgData, 'manufacturer_description') || undefined,
			website_url: safeGetString(mfgData, 'website_url') || undefined,
			logo_url: safeGetString(mfgData, 'logo_url') || undefined,
			
			// Handle JSON fields with proper type safety
			contact_info: safeGetJson(mfgData, 'contact_info'),
			custom_fields: safeGetJson(mfgData, 'custom_fields'),
			
			// Set metadata fields safely
			created_by: safeGetString(mfgData, 'created_by') || user.user_id,
			updated_by: user.user_id,
			created_at: mfgData && mfgData.created_at ? new Date(mfgData.created_at) : new Date(),
			updated_at: new Date()
		};
		
		// Scroll to the form
		setTimeout(() => {
			const formContainer = document.querySelector('.form-container');
			if (formContainer) {
				console.log('Scrolling to form container');
				formContainer.scrollIntoView({ behavior: 'smooth' });
			} else {
				console.warn('Form container not found for scrolling');
			}
		}, 100);
	}
	
	// Function to cancel manufacturer edit mode
	function cancelManufacturerEdit() {
		editManufacturerMode = false;
		currentManufacturerId = null;
		showManufacturerForm = false;
		
		// Reset form data - need to keep the base structure from SuperForm
		// Only reset the editable fields
		$manufacturerForm = {
			...$manufacturerForm,
			manufacturer_id: '',
			manufacturer_name: '',
			manufacturer_description: '',
			website_url: '',
			contact_info: '',
			logo_url: '',
			custom_fields: {}
		};
	}
	
	// Function to handle category edit event
	function handleCategoryEdit(event: CustomEvent<{ category: Category }>) {
		const categoryToEdit = event.detail.category;
		
		// Set edit mode and current category ID
		editCategoryMode = true;
		currentCategoryId = categoryToEdit.category_id;
		
		// Set form data using standard CategoryFormType from schema.ts
		// The schema now includes category_id field
		$categoryForm = {
			category_id: categoryToEdit.category_id,
			category_name: categoryToEdit.category_name,
			category_description: categoryToEdit.category_description || '',
			parent_id: categoryToEdit.parent_id || '',
			is_public: Boolean(categoryToEdit.is_public)
		};
		
		// Show the form
		showCategoryForm = true;
		
		// Signal to the CategoryComponent that we've handled the edit event
		// This prevents the component from showing its own edit form
		window.dispatchEvent(new CustomEvent('category:edit:handled'));
	}

	// Function to handle part form updates from different sources
	function updatePartFormData(event: CustomEvent<{ data: Record<string, unknown> }>) {
		// Check if we have data from either pattern (detail or detail.data)
		const data = event.detail.data || event.detail;
		
		// Only update if we received valid data
		if (data) {
			console.log('Updating part form with event data', data);
			
			// Ensure the part form is updated with ALL fields from the schema
			$partForm = {
				// Start with existing form data
				...$partForm,
				
				// Core part information - accepting multiple field name patterns
				part_name: typeof data.part_name === 'string' ? data.part_name : 
					(typeof data.name === 'string' ? data.name : $partForm.part_name || ''),
				
				part_version: typeof data.part_version === 'string' ? data.part_version : 
					(typeof data.version === 'string' ? data.version : $partForm.part_version || '0.1.0'),
				
				internal_part_number: typeof data.internal_part_number === 'string' ? data.internal_part_number : 
					(typeof data.partNumber === 'string' ? data.partNumber : $partForm.internal_part_number || ''),
				
				version_status: typeof data.version_status === 'string' ? data.version_status : 
					(typeof data.lifecycle_status === 'string' ? data.lifecycle_status : $partForm.version_status || LifecycleStatusEnum.DRAFT),
				
				status_in_bom: typeof data.status_in_bom === 'string' ? data.status_in_bom : 
					(typeof data.status === 'string' ? data.status : $partForm.status_in_bom || PartStatusEnum.CONCEPT),
				
				is_public: typeof data.is_public === 'boolean' ? data.is_public : 
					($partForm.is_public === true),
				
				// Descriptions - accept multiple field name patterns
				short_description: typeof data.short_description === 'string' ? data.short_description : 
					(typeof data.description === 'string' ? data.description : $partForm.short_description || ''),
				
				functional_description: typeof data.functional_description === 'string' ? data.functional_description : 
					($partForm.functional_description || ''),
				long_description: data.long_description || $partForm.long_description || '',
				
				// Array fields - handle null or empty arrays correctly
				compliance_info: Array.isArray(data.compliance_info) ? data.compliance_info : 
					(Array.isArray($partForm.compliance_info) ? $partForm.compliance_info : []),
				
				attachments: Array.isArray(data.attachments) ? data.attachments : 
					(Array.isArray($partForm.attachments) ? $partForm.attachments : []),
				
				representations: Array.isArray(data.representations) ? data.representations : 
					(Array.isArray($partForm.representations) ? $partForm.representations : []),
				
				structure: Array.isArray(data.structure) ? data.structure : 
					(Array.isArray($partForm.structure) ? $partForm.structure : []),
				
				manufacturer_parts: Array.isArray(data.manufacturer_parts) ? data.manufacturer_parts : 
					(Array.isArray($partForm.manufacturer_parts) ? $partForm.manufacturer_parts : []),
				
				supplier_parts: Array.isArray(data.supplier_parts) ? data.supplier_parts : 
					(Array.isArray($partForm.supplier_parts) ? $partForm.supplier_parts : []),
				
				// JSON fields - ensure proper handling
				technical_specifications: (() => {
					// Handle technical_specifications with strict type checking
					if (typeof data.technical_specifications === 'string') {
						return data.technical_specifications; 
					} else if (data.technical_specifications && typeof data.technical_specifications === 'object') {
						// Ensure it's a valid Record type
						const techSpec: Record<string, string | number | boolean | null> = {};
						
						// Only copy valid properties
						Object.entries(data.technical_specifications).forEach(([key, value]) => {
							if (typeof value === 'string' || typeof value === 'number' || 
								typeof value === 'boolean' || value === null) {
								techSpec[key] = value;
							}
						});
						
						return techSpec;
					} else {
						// Fall back to existing value or null
						return $partForm.technical_specifications || null;
					}
				})(),
				
				// Dimensional data - handle both objects and separate fields
				dimensions: (() => {
					// Create a properly typed dimensions object with either all numbers or all nulls
					const emptyDimensions = { length: null, width: null, height: null } as const;
					
					if (data.dimensions && typeof data.dimensions === 'object') {
						// If we have a complete set of numeric dimensions, use them
						if ('length' in data.dimensions && typeof data.dimensions.length === 'number' &&
						    'width' in data.dimensions && typeof data.dimensions.width === 'number' &&
						    'height' in data.dimensions && typeof data.dimensions.height === 'number') {
							
							// All values are numbers, return a dimensions object with numbers
							return {
								length: data.dimensions.length,
								width: data.dimensions.width,
								height: data.dimensions.height
							};
						} else {
							// Otherwise return null dimensions object
							return emptyDimensions;
						}
					} else if ($partForm.dimensions) {
						// Use existing dimensions
						return $partForm.dimensions;
					} else {
						// Default to empty dimensions
						return emptyDimensions;
					}
				})(),
				dimensions_unit: data.dimensions_unit || $partForm.dimensions_unit
			};
			console.log('Part form updated with all available fields');
		}
	}
	
	// Function to reset category form
	function resetCategoryForm() {
		// Reset the form with all fields from schema
		$categoryForm = {
			category_id: undefined, // Make sure it's properly cleared for new entries
			category_name: '',
			category_description: '',
			parent_id: '',
			is_public: false
		};
		
		// Reset edit mode
		editCategoryMode = false;
		currentCategoryId = null;
	}

	// Function to toggle category form visibility
	function toggleCategoryForm() {
		// Toggle the form visibility first
		showCategoryForm = !showCategoryForm;
		
		// If we're closing the form, reset everything
		if (!showCategoryForm) {
			// Reset edit mode
			editCategoryMode = false;
			currentCategoryId = null;
			
			// Reset form values - only include fields that are part of the form schema
			$categoryForm = {
				category_name: '',
				category_description: '',
				parent_id: '',
				is_public: false,
				category_id: ''
			};
		} else if (showCategoryForm && !editCategoryMode) {
			// If we're opening the form for a new category
			editCategoryMode = false;
			currentCategoryId = null;
			// Reset form with proper initialization - only include fields that are part of the form schema
			$categoryForm = {
				category_name: '',
				category_description: '',
				parent_id: '',
				is_public: false,
				category_id: ''
			};
		}
	}
</script>

<div class="dashboard-container">
	<header class="dashboard-header">
		<div class="user-info">
			{#if user.avatar_url}
				<img class="avatar" src={user.avatar_url} alt="Avatar" />
			{:else}
				<div class="avatar-placeholder">{initial}</div>
			{/if}
			<div class="user-details">
				<h1 class="welcome">Welcome, {fullName}</h1>
				<button class="logout-button" on:click={() => goto('/logout')}>Logout</button>
			</div>
		</div>
	</header>

	<div class="dashboard-tabs">
		<button 
			class="tab-button {activeTab === 'projects' ? 'active' : ''}" 
			on:click={() => setActiveTab('projects')}
		>
			Projects
		</button>
		<button 
			class="tab-button {activeTab === 'parts' ? 'active' : ''}" 
			on:click={() => setActiveTab('parts')}
		>
			Parts
		</button>
		<button 
			class="tab-button {activeTab === 'manufacturers' ? 'active' : ''}" 
			on:click={() => setActiveTab('manufacturers')}
		>
			Manufacturers
		</button>
		<button 
			class="tab-button {activeTab === 'suppliers' ? 'active' : ''}" 
			on:click={() => setActiveTab('suppliers')}
		>
			Suppliers
		</button>
		<button 
			class="tab-button {activeTab === 'categories' ? 'active' : ''}" 
			on:click={() => setActiveTab('categories')}
		>
			Categories
		</button>
	</div>

	<section class="dashboard-content">
		<!-- Projects Tab -->
		{#if activeTab === 'projects'}
			<div class="tab-content">
				<h2>Your Projects</h2>
				{#if projects.length > 0}
					<ul class="projects-grid">
						{#each projects as project (project.project_id)}
							<li class="project-card">
								<a class="project-link" href={`/dashboard/${project.project_id}`}>{project.project_name}</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="no-items">You have no projects yet.</p>
				{/if}

				<h2>Add New Project</h2>
				<form class="project-form" method="POST" action="?/project">
					<input class="project-input" type="text" name="name" placeholder="Project Name" required />
					<button class="primary-btn" type="submit">Add Project</button>
				</form>
			</div>
		{/if}

		<!-- Parts Tab -->
		{#if activeTab === 'parts'}
			<div class="tab-content">
				<!-- Pass manufacturers and categories to PartsTab -->
				<PartsTab
					parts={userParts.map((unifiedPart) => {
						// Pass UnifiedPart objects directly to the PartsTab component
						// No type assertion needed as we're using the standard UnifiedPart type
						// The getUnifiedPart function now returns complete UnifiedPart objects
						
						// Validate that we have a valid UnifiedPart object
						if (!unifiedPart || !unifiedPart.part_id) {
							console.warn('Invalid UnifiedPart data:', unifiedPart);
							return null;
						}
						
						// Return the UnifiedPart object directly - no transformation needed
						return unifiedPart;
					}).filter(p => p !== null)}
					currentUserId={user.user_id}
					manufacturers={data.userManufacturers || []}
					categories={categories}
					formInstance={partSuperForm}
					on:updateForm={(event) => {
						// Handle form update request from PartsTab
						if (event.detail && event.detail.part) {
							// Update the form with part data
							partForm.update(form => ({
								...form,
								...event.detail.part
							}));
							// Set current part ID and edit mode
							currentPartId = event.detail.part.part_id || null;
							editPartMode = true;
							showPartForm = true;
						}
					}}
					on:refreshData={refreshData}
					on:toggleForm={() => {
						showPartForm = !showPartForm;
						if (!showPartForm) {
							editPartMode = false;
							cancelPartEdit();
						}
					}}
					on:editPart={editPart}
					on:formUpdate={updatePartFormData}
					on:submit={function(event: CustomEvent<Record<string, unknown>>) {
						// Form submission is handled by SuperForm
					}}
				/>
			</div>
		{/if}

		<!-- Manufacturers Tab -->
		{#if activeTab === 'manufacturers'}
			<div class="tab-content">
			
				
				<!-- Updated manufacturers-tab with SuperForm integration -->
				<ManufacturersTab
					manufacturers={[...userManufacturers]} 
					currentUserId={user.user_id}
					showForm={showManufacturerForm}
					editMode={editManufacturerMode}
					
					
					useInternalForm={true}
					formId="manufacturer-form"
					formAction="?/manufacturer"
					superFormData={data.forms?.manufacturer ? {
						...data.forms.manufacturer,
						data: {
							...data.forms.manufacturer.data,
							// Ensure all JSON fields are properly stringified for the form
							contact_info: typeof data.forms.manufacturer.data.contact_info === 'string' 
								? data.forms.manufacturer.data.contact_info 
								: JSON.stringify(data.forms.manufacturer.data.contact_info || {}),
							custom_fields: typeof data.forms.manufacturer.data.custom_fields === 'string' 
								? data.forms.manufacturer.data.custom_fields 
								: JSON.stringify(data.forms.manufacturer.data.custom_fields || {}),
							// Note: custom_fields_json is not in the server data structure
							// We'll use the same value as custom_fields for backward compatibility
							custom_fields_json: typeof data.forms.manufacturer.data.custom_fields === 'string'
								? data.forms.manufacturer.data.custom_fields
								: JSON.stringify(data.forms.manufacturer.data.custom_fields || {})
						}
					} : undefined}
					
					
					manufacturerForm={{
						// Create a new object with only the properties expected by ManufacturerForm
						manufacturer_id: $manufacturerForm.manufacturer_id,
						manufacturer_name: $manufacturerForm.manufacturer_name,
						manufacturer_description: $manufacturerForm.manufacturer_description,
						website_url: $manufacturerForm.website_url,
						logo_url: $manufacturerForm.logo_url,
						created_by: $manufacturerForm.created_by,
						updated_by: $manufacturerForm.updated_by,
						// Ensure JSON fields are explicitly converted to strings
						custom_fields: typeof $manufacturerForm.custom_fields === 'string'
							? $manufacturerForm.custom_fields
							: JSON.stringify($manufacturerForm.custom_fields || {}),
						contact_info: typeof $manufacturerForm.contact_info === 'string'
							? $manufacturerForm.contact_info
							: JSON.stringify($manufacturerForm.contact_info || {}),
						// Include custom_fields_json if needed for backward compatibility
						custom_fields_json: typeof $manufacturerForm.custom_fields === 'string'
							? $manufacturerForm.custom_fields
							: JSON.stringify($manufacturerForm.custom_fields || {})
					}}
					on:refreshData={refreshData}
					on:toggleForm={() => {
						showManufacturerForm = !showManufacturerForm;
						if (!showManufacturerForm) {
							editManufacturerMode = false;
							cancelManufacturerEdit();
						}
					}}
					on:edit={(event) => {
						
						// Set edit mode and show form
						editManufacturerMode = true;
						showManufacturerForm = true;
						
						// Use the existing editManufacturer function
						editManufacturer(event);
					}}
					on:editManufacturer={(event) => {
						
						// Set edit mode and show form
						editManufacturerMode = true;
						showManufacturerForm = true;
						
						// Get manufacturer data directly from the event
						const manufacturer = event.detail.manufacturer || event.detail.item || event.detail;
					
						
						// Process the manufacturer data to ensure proper formats for all fields
						// Following strict type safety with explicit handling for all field types
						const processedData = {
							manufacturer_id: manufacturer.manufacturer_id || '',
							manufacturer_name: manufacturer.manufacturer_name || '',
							manufacturer_description: manufacturer.manufacturer_description || null,
							website_url: manufacturer.website_url || null,
							logo_url: manufacturer.logo_url || null,
							// Proper JSON handling with explicit type checks
							contact_info: typeof manufacturer.contact_info === 'object' 
								? JSON.stringify(manufacturer.contact_info) 
								: (manufacturer.contact_info || '{}'),
							custom_fields: typeof manufacturer.custom_fields === 'object'
								? JSON.stringify(manufacturer.custom_fields)
								: (manufacturer.custom_fields || '{}'),
							custom_fields_json: typeof manufacturer.custom_fields === 'object'
								? JSON.stringify(manufacturer.custom_fields)
								: (manufacturer.custom_fields || '{}'),
							// Add required timestamp fields
							created_at: manufacturer.created_at ? new Date(manufacturer.created_at) : new Date(),
							updated_at: new Date(),
							// User fields
							created_by: manufacturer.created_by || user.user_id,
							updated_by: user.user_id
						};
						
						
						
						// Set form data in the store - this is the canonical source of truth
						$manufacturerForm = processedData;
						
						// Important: Force component update by creating a timing gap
						setTimeout(() => {
							
						}, 50);
					}}
					on:formUpdate={(event) => {
						// Update the store with the form data from the component
						
						$manufacturerForm = {
							...$manufacturerForm,
							...event.detail.data
						};
					}}
					on:submit={(event) => {
						
					}}
					on:delete={(event) => {
						
						refreshData();
					}}
				/>
			</div>
		{/if}

		<!-- Suppliers Tab -->
		{#if activeTab === 'suppliers'}
			<div class="tab-content">

				<SuppliersTab
					suppliers={userSuppliers} 
					currentUserId={user.user_id}
					showForm={showSupplierForm}
					editMode={editSupplierMode}
					useInternalForm={true}
					formId="supplier-form"
					formAction="?/supplier"
					superFormData={data.forms?.supplier ? {
						...data.forms.supplier,
						data: {
							...data.forms.supplier.data,
							// Ensure all JSON fields are properly converted to strings
							custom_fields: typeof data.forms.supplier.data.custom_fields === 'string' 
								? data.forms.supplier.data.custom_fields 
								: JSON.stringify(data.forms.supplier.data.custom_fields || {}),
							custom_fields_json: typeof data.forms.supplier.data.custom_fields === 'string' 
								? data.forms.supplier.data.custom_fields 
								: JSON.stringify(data.forms.supplier.data.custom_fields || {}),
							contact_info: typeof data.forms.supplier.data.contact_info === 'string' 
								? data.forms.supplier.data.contact_info 
								: JSON.stringify(data.forms.supplier.data.contact_info || {})
						}
					} : undefined}
					supplierForm={{
						// Required fields with default empty values
						supplier_id: $supplierForm.supplier_id || '',
						supplier_name: $supplierForm.supplier_name || '',
						
						// Optional fields with null fallbacks
						supplier_description: $supplierForm.supplier_description || null,
						website_url: $supplierForm.website_url || null,
						logo_url: $supplierForm.logo_url || null,
						
						// JSON fields - ensure they're strings
						contact_info: typeof $supplierForm.contact_info === 'string' 
							? $supplierForm.contact_info 
							: JSON.stringify($supplierForm.contact_info || {}),
						custom_fields: typeof $supplierForm.custom_fields === 'string' 
							? $supplierForm.custom_fields 
							: JSON.stringify($supplierForm.custom_fields || {}),
						custom_fields_json: typeof $supplierForm.custom_fields === 'string'
							? $supplierForm.custom_fields
							: JSON.stringify($supplierForm.custom_fields || {}),
						
						// Include user and timestamp fields
						created_by: $supplierForm.created_by || user.user_id,
						updated_by: user.user_id
					} as const}
					on:refreshData={refreshData}
					on:toggleForm={() => {
						showSupplierForm = !showSupplierForm;
						if (!showSupplierForm) {
							editSupplierMode = false;
							cancelSupplierEdit();
						}
					}}
					on:edit={(event) => {
						
						// Set edit mode and show form
						editSupplierMode = true;
						showSupplierForm = true;
						
						// Use the existing editSupplier function
						editSupplier(event);
					}}
					on:editSupplier={(event) => {
						
						// Set edit mode and show form
						editSupplierMode = true;
						showSupplierForm = true;
						
						// Use the existing editSupplier function
						editSupplier(event);
					}}
					on:formUpdate={(event) => {
						
						$supplierForm = {
							...$supplierForm,
							...event.detail.data
						};
					}}
					on:submit={(event) => {
					
					}}
					on:delete={(event) => {
						// Handle supplier deletion
						
						refreshData();
					}}
				/>

				
			</div>
		{/if}

		<!-- Categories Tab -->
		{#if activeTab === 'categories'}
			<div class="tab-content">
				<CategoriesTab
					categories={transformedCategories}
					allCategories={allCategoriesTransformed}
					currentUserId={user.user_id}
					showForm={showCategoryForm}
					editMode={editCategoryMode}
					categoryForm={{
						// Create a properly typed object that matches the expected schema
						category_id: $categoryForm.category_id || '',
						category_name: $categoryForm.category_name || '',
						category_description: $categoryForm.category_description || null,
						parent_id: $categoryForm.parent_id || null,
						is_public: $categoryForm.is_public ?? true
					}}
					parentCategoryName={$categoryForm.parent_id ? 
						transformedCategories.find((c) => c.category_id === $categoryForm.parent_id)?.category_name || null : null}
					on:editCategory={(event: CustomEvent<{category?: any, item?: {originalEntity?: any}}>) => {
						
						// Set edit mode and show form
						editCategoryMode = true;
						showCategoryForm = true;
						
						// Get category data from event
						const categoryToEdit = event.detail.category || event.detail.item?.originalEntity;
						if (categoryToEdit) {
							currentCategoryId = categoryToEdit.category_id;
							// Update form data
							$categoryForm = {
								category_id: categoryToEdit.category_id || '',
								category_name: categoryToEdit.category_name || '',
								category_description: categoryToEdit.category_description || null,
								parent_id: categoryToEdit.parent_id || null,
								is_public: categoryToEdit.is_public ?? true
							};
						}
					}}
					on:formUpdate={(event: CustomEvent<{data: any}>) => {
						// Update the store with the form data from the component
						
						$categoryForm = {
							category_id: event.detail.data.category_id || '',
							category_name: event.detail.data.category_name || '',
							category_description: event.detail.data.category_description || null,
							parent_id: event.detail.data.parent_id || null,
							is_public: event.detail.data.is_public ?? true
						};
					}}
					on:submit={(event: CustomEvent) => {
						
					}}
					on:deleteCategory={(event: CustomEvent<{category_id: string}>) => {
						// Handle category deletion
						
						refreshData();
					}}
					on:toggleForm={(event: CustomEvent) => {
						showCategoryForm = !showCategoryForm;
						if (!showCategoryForm) {
							editCategoryMode = false;
							currentCategoryId = null;
							resetCategoryForm();
						}
					}}
					on:refreshData={(event: CustomEvent) => refreshData()}
				/>
				<div class="view-all-link">
					<a href="/category" class="secondary-btn">View All Categories</a>
				</div>
			</div>
		{/if}
	</section>
</div>

<style lang="postcss">
	.dashboard-container {
		max-width: 1000px;
		margin: 2rem auto;
		padding: 0;
		color: hsl(var(--foreground));
		transition: color 0.3s, background-color 0.3s, border-color 0.3s;
	}

	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)));
		border-radius: 8px 8px 0 0;
		color: hsl(var(--primary-foreground));
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 50px;
		height: 50px;
		background: hsl(var(--muted));
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: hsl(var(--muted-foreground));
	}



	.user-details {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.welcome {
		margin: 0;
		font-size: 1.5rem;
	}

	.logout-button {
		background: hsl(var(--background));
		color: hsl(var(--primary-dark));
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.3s, color 0.3s;
	}

	.logout-button:hover {
		background: hsl(var(--muted));
	}

	/* Dashboard Tabs Styling */
	.dashboard-tabs {
		display: flex;
		justify-content: space-between;
		background: hsl(var(--surface-100));
		border-bottom: 1px solid hsl(var(--border));
	}

	.tab-button {
		flex: 1;
		padding: 1rem 0.5rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s ease;
		color: hsl(var(--muted-foreground));
	}

	.tab-button:hover {
		background: hsl(var(--muted));
		color: hsl(var(--primary));
	}

	.tab-button.active {
		border-bottom: 2px solid hsl(var(--primary));
		color: hsl(var(--primary));
	}

	/* Dashboard Content Styling */
	.dashboard-content {
		background: hsl(var(--background));
		padding: 2rem;
		border-radius: 0 0 8px 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: background-color 0.3s, color 0.3s;
	}

	.tab-content {
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.tab-content h2 {
		margin-top: 0;
		color: hsl(var(--foreground));
		margin-bottom: 1.5rem;
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin: 1rem 0 2rem 0;
	}

	
	.project-card {
		background: hsl(var(--surface-100));
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		transition: box-shadow 0.3s, border-color 0.3s, background-color 0.3s;
		border: 1px solid hsl(var(--border));
	}

	.project-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: hsl(var(--primary));
	}

	.project-link {
		color: hsl(var(--primary));
		font-weight: bold;
		text-decoration: none;
	}

	.project-link:hover {
		text-decoration: underline;
	}

	.no-items {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		padding: 1rem;
		background: hsl(var(--surface-100));
		border-radius: 8px;
		text-align: center;
		margin-bottom: 2rem;
	}


	

	

	

	
	/* Contact styling moved to component level for better modularity */


	

	
	.project-form {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.project-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid hsl(var(--input-border));
		border-radius: 6px;
		font-size: 1rem;
	}















	.primary-btn {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.3s;
	}

	.primary-btn:hover {
		background: hsl(var(--primary-dark));
	}



	
	


	.secondary-btn {
		background: hsl(var(--background));
		color: hsl(var(--primary));
		border: 1px solid hsl(var(--primary));
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 600;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.secondary-btn:hover {
		background: hsl(var(--primary) / 0.1);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.dashboard-tabs {
			flex-wrap: wrap;
		}

		.tab-button {
			flex: 1 0 33.333%;
			padding: 0.75rem 0.5rem;
		}

	
	}

	@media (max-width: 600px) {
		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.tab-button {
			flex: 1 0 50%;
			font-size: 0.9rem;
		}

		.dashboard-content {
			padding: 1.25rem;
		}

		.projects-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			gap: 1rem;
		}
	}
</style>
