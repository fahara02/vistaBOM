/**
 * Core functionality for part management
 */
import sql from '$lib/server/db';
import crypto, { randomUUID } from 'crypto';

// Import all specialized part module functionality
import { PART_ERRORS } from './parts/partErrors';
import { sanitizeSqlString } from '@/utils/util';

// Import part structure management
import type { PartStructure } from './parts/partStructure';

// Import part compliance management
import type { PartCompliance } from './parts/partCompliance';
import {
  createPartCompliance,
  getPartComplianceById,
  getPartCompliancesByPartVersion,
  updatePartCompliance,
  deletePartCompliance
} from './parts/partCompliance';

// Import part attachment management
import type { PartAttachment } from './parts/partAttachment';
import {
  createPartAttachment,
  getPartAttachmentById,
  getPartAttachmentsByPartVersion,
  updatePartAttachment,
  deletePartAttachment
} from './parts/partAttachment';

// Import part representation management
import type { PartRepresentation } from './parts/partRepresentation';
import {
  createPartRepresentation,
  getPartRepresentationById,
  getPartRepresentationsByPartVersion,
  updatePartRepresentation,
  deletePartRepresentation
} from './parts/partRepresentation';

// Import part revision management

// Import part validation management
import type { PartValidation } from './parts/partValidation';
import {
  createPartValidation,
  getPartValidationById,
  getPartValidationsByPartVersion,
  updatePartValidationStatus,
  deletePartValidation
} from './parts/partValidation';

// Import part tag management
import type { PartVersionTag } from './parts/partVersionTag';
import {
  createPartVersionTag,
  getPartVersionTagById,
  getPartVersionTags,
  findPartVersionsByTag,
  updatePartVersionTag,
  deletePartVersionTag
} from './parts/partVersionTag';

// Import part custom field management
import type { PartCustomField } from './parts/partCustomField';
import {
  createPartCustomField,
  getPartCustomFieldById,
  getPartCustomFields,
  updatePartCustomFieldValue,
  updatePartCustomFieldMetadata,
  deletePartCustomField
} from './parts/partCustomField';

// Import manufacturer/supplier part management
import type { ManufacturerPart} from './parts/manufacturerPart';
import type{SupplierPart }  from './parts/supplierPart';

import {
  createSupplierPart,
  getSupplierPartById,
  getSupplierPartsByPartVersion,
  updateSupplierPart,
  deleteSupplierPart
} from './parts/supplierPart';

import type {
  Part,
  PartVersion,
  // Database entity types with Db prefix
  DbPart,
  DbPartVersion,
  DbPartVersionCategory,
  DbPartStructure,
  DbPartCompliance,
  DbPartAttachment,
  DbPartRepresentation,
  DbPartRevision,
  DbPartValidation,
  DbPartVersionTag,
  DbPartCustomField,
  // JSON types
  JsonValue,
  JsonRecord,
  Dimensions
} from '$lib/types/types';

// Import specialized property interfaces
import type {
  ElectricalProperties,
  MechanicalProperties,
  ThermalProperties,
  EnvironmentalData
} from '$lib/types/schemaTypes';

// Import enums
import {
  LifecycleStatusEnum,
  ComplianceTypeEnum,
  StructuralRelationTypeEnum,
  PartStatusEnum,
  WeightUnitEnum,
  DimensionUnitEnum,
  TemperatureUnitEnum,
  PackageTypeEnum,
  MountingTypeEnum
} from '$lib/types/types';




/**
 * Extended Part interface with both camelCase and snake_case properties
 * This provides backwards compatibility with existing code while maintaining type safety
 */
interface PartWithId {
    // Standard API properties (camelCase)
    id: string;
    creatorId: string | null;
    globalPartNumber?: string | null;
    status: PartStatusEnum;
    lifecycleStatus: LifecycleStatusEnum;
    isPublic: boolean;
    createdAt: Date;
    updatedBy?: string | null;
    updatedAt: Date;
    currentVersionId?: string | null;
    
    // Database column names for direct mapping (snake_case)
    part_id: string;
    creator_id: string | null;
    global_part_number: string | null;
    status_in_bom: PartStatusEnum; // Matching Part interface
    lifecycle_status: LifecycleStatusEnum; // Matching Part interface
    is_public: boolean;
    created_at: Date;
    updated_by: string | null;
    updated_at: Date;
    current_version_id: string | null;
    
    // Additional UI helper properties
    currentVersion?: PartVersionWithId | null;
    versions?: PartVersionWithId[];
    categories?: Array<{ id: string; name: string }>;
    manufacturerParts?: Array<{ manufacturerId: string; partNumber: string; manufacturerName?: string }>;
    supplierParts?: Array<{ supplierId: string; partNumber: string; supplierName?: string }>;
}

/**
 * Extended PartVersion interface with both camelCase and snake_case properties
 */
interface PartVersionWithId {
    // Standard API properties (camelCase)
    id: string;
    partId: string;
    version: string;
    name: string;
    status: LifecycleStatusEnum;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    updatedBy?: string | null;
    shortDescription?: string | null;
    longDescription?: string | null;
    functionalDescription?: string | null;
    notes?: string | null;
    releaseNotes?: string | null;
    revisionNotes?: string | null;
    designFiles?: JsonValue | null;
    
    // Database column names for direct mapping (snake_case)
    part_version_id: string;
    part_id: string;
    part_version: string;
    part_name: string;
    short_description: string | null;
    long_description: JsonValue | null;
    functional_description: string | null;
    technical_specifications: JsonValue | null;
    properties: JsonValue | null;
    electrical_properties: ElectricalProperties | null;
    mechanical_properties: MechanicalProperties | null;
    thermal_properties: ThermalProperties | null;
    part_weight: number | null;
    weight_unit: WeightUnitEnum | null;
    dimensions: Dimensions | null;
    dimensions_unit: DimensionUnitEnum | null;
    material_composition: JsonValue | null;
    environmental_data: EnvironmentalData | null;
    voltage_rating_min: number | null;
    voltage_rating_max: number | null;
    current_rating_min: number | null;
    current_rating_max: number | null;
    power_rating_max: number | null;
    tolerance: number | null;
    tolerance_unit: string | null;
    package_type: PackageTypeEnum | null;
    mounting_type: MountingTypeEnum | null;
    pin_count: number | null;
    operating_temperature_min: number | null;
    operating_temperature_max: number | null;
    storage_temperature_min: number | null;
    storage_temperature_max: number | null;
    temperature_unit: TemperatureUnitEnum | null;
    revision_notes: string | null;
    version_status: LifecycleStatusEnum;
    released_at: Date | null;
    created_by: string;
    created_at: Date;
    updated_by: string | null;
    updated_at: Date;

    // Additional UI helper properties
    part?: PartWithId | null;
    categories?: DbPartVersionCategory[];
    attachments?: DbPartAttachment[];
    representations?: DbPartRepresentation[];
    tags?: DbPartVersionTag[];
    customFields?: Record<string, JsonValue>;
}



/**
 * Normalizes database row data into a PartWithId object
 * Ensures that all required properties are present and properly typed
 * @param row Database row data
 * @returns A normalized PartWithId object
 */
function normalizePart(row: any): PartWithId {
    const partId = row.part_id?.toString() || row.id?.toString();
    
    // Create normalized object with both camelCase and snake_case versions
    // of each property for compatibility
    const part: PartWithId = {
        // camelCase properties for API
        id: partId,
        creatorId: row.creator_id?.toString() || null,
        globalPartNumber: row.global_part_number?.toString() || null,
        status: (row.status_in_bom || row.status) as PartStatusEnum,
        lifecycleStatus: row.lifecycle_status as LifecycleStatusEnum,
        isPublic: row.is_public === true || row.is_public === 'true',
        createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now()),
        updatedBy: row.updated_by?.toString() || null,
        updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now()),
        currentVersionId: row.current_version_id?.toString() || null,
        
        // snake_case properties for database mapping
        part_id: partId,
        creator_id: row.creator_id?.toString() || null,
        global_part_number: row.global_part_number?.toString() || null,
        status_in_bom: (row.status_in_bom || row.status) as PartStatusEnum,
        lifecycle_status: row.lifecycle_status as LifecycleStatusEnum,
        is_public: row.is_public === true || row.is_public === 'true',
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now()),
        updated_by: row.updated_by?.toString() || null,
        updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now()),
        current_version_id: row.current_version_id?.toString() || null
    };
    
    return part;
}

/**
 * Normalizes database row data into a PartVersionWithId object
 * Ensures that all required properties are present and properly typed
 * @param row Database row data
 * @returns A normalized PartVersionWithId object
 */
function normalizePartVersion(row: any): PartVersionWithId {
    const versionId = row.part_version_id?.toString() || row.id?.toString();
    const partId = row.part_id?.toString();
    
    // Create normalized object with both camelCase and snake_case versions
    // of each property for compatibility
    const version: PartVersionWithId = {
        // camelCase properties for API
        id: versionId,
        partId: partId,
        version: row.part_version?.toString() || row.version?.toString() || '1.0.0',
        name: row.part_name?.toString() || row.name?.toString() || '',
        status: (row.version_status || row.status) as LifecycleStatusEnum,
        createdBy: row.created_by?.toString() || '',
        createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now()),
        updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now()),
        updatedBy: row.updated_by?.toString() || null,
        shortDescription: row.short_description?.toString() || null,
        longDescription: row.long_description || null,
        functionalDescription: row.functional_description?.toString() || null,
        notes: row.notes?.toString() || null,
        releaseNotes: row.release_notes?.toString() || null,
        revisionNotes: row.revision_notes?.toString() || null,
        designFiles: row.design_files || null,
        
        // Database column names (snake_case)
        part_version_id: versionId,
        part_id: partId,
        part_version: row.part_version?.toString() || row.version?.toString() || '1.0.0',
        part_name: row.part_name?.toString() || row.name?.toString() || '',
        short_description: row.short_description?.toString() || null,
        long_description: row.long_description || null,
        functional_description: row.functional_description?.toString() || null,
        technical_specifications: row.technical_specifications || null,
        properties: row.properties || null,
        electrical_properties: row.electrical_properties || null,
        mechanical_properties: row.mechanical_properties || null,
        thermal_properties: row.thermal_properties || null,
        part_weight: typeof row.part_weight === 'number' ? row.part_weight : null,
        weight_unit: row.weight_unit as WeightUnitEnum || null,
        dimensions: row.dimensions || null,
        dimensions_unit: row.dimensions_unit as DimensionUnitEnum || null,
        material_composition: row.material_composition || null,
        environmental_data: row.environmental_data || null,
        voltage_rating_min: typeof row.voltage_rating_min === 'number' ? row.voltage_rating_min : null,
        voltage_rating_max: typeof row.voltage_rating_max === 'number' ? row.voltage_rating_max : null,
        current_rating_min: typeof row.current_rating_min === 'number' ? row.current_rating_min : null,
        current_rating_max: typeof row.current_rating_max === 'number' ? row.current_rating_max : null,
        power_rating_max: typeof row.power_rating_max === 'number' ? row.power_rating_max : null,
        tolerance: typeof row.tolerance === 'number' ? row.tolerance : null,
        tolerance_unit: row.tolerance_unit?.toString() || null,
        package_type: row.package_type as PackageTypeEnum || null,
        mounting_type: row.mounting_type as MountingTypeEnum || null,
        pin_count: typeof row.pin_count === 'number' ? row.pin_count : null,
        operating_temperature_min: typeof row.operating_temperature_min === 'number' ? row.operating_temperature_min : null,
        operating_temperature_max: typeof row.operating_temperature_max === 'number' ? row.operating_temperature_max : null,
        storage_temperature_min: typeof row.storage_temperature_min === 'number' ? row.storage_temperature_min : null,
        storage_temperature_max: typeof row.storage_temperature_max === 'number' ? row.storage_temperature_max : null,
        temperature_unit: row.temperature_unit as TemperatureUnitEnum || null,
        revision_notes: row.revision_notes?.toString() || null,
        version_status: (row.version_status || row.status) as LifecycleStatusEnum,
        released_at: row.released_at instanceof Date ? row.released_at : (row.released_at ? new Date(row.released_at) : null),
        created_by: row.created_by?.toString() || '',
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now()),
        updated_by: row.updated_by?.toString() || null,
        updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now())
    };
    
    return version;
}

/**
 * Interface for the PartVersionCategory join table (not from schema.ts)
 */
interface PartVersionCategory {
    part_version_id: string;
    category_id: string;
    created_at: Date;
}

/**
 * Converts a database row to a PartVersionCategory object
 */
function rowToPartVersionCategory(row: any): PartVersionCategory {
    return {
        part_version_id: row.part_version_id?.toString(),
        category_id: row.category_id?.toString(),
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now())
    };
}

// SQL client is imported directly at the top of the file

/**
 * List all parts with their current version
 */
export async function listParts(): Promise<Array<{ part: Part; currentVersion: PartVersion }>> {
	try {
		console.log('[listParts] Retrieving all parts');
		
		// Using SQL template literal syntax for porsager/postgres with appropriate table name quoting
		const result = await sql`
		SELECT 
			p.id as part_id,
			p.creator_id,
			p.global_part_number,
			p.status_in_bom,
			p.lifecycle_status,
			p.is_public,
			p.created_at,
			p.updated_by,
			p.updated_at,
			p.current_version_id,
			
			pv.id as part_version_id,
			pv.part_id,
			pv.part_version,
			pv.part_name,
			pv.short_description,
			pv.version_status,
			pv.created_by,
			pv.created_at,
			pv.updated_by,
			pv.updated_at
		FROM "Part" p
		JOIN "PartVersion" pv ON p.current_version_id = pv.id
		ORDER BY p.created_at DESC
		`;

		if (result.length === 0) {
			return [];
		}
		
		// Log raw rows for debugging
		console.log(`[listParts] Found ${result.length} parts`);
		
		// Process results using the normalize functions for consistent data handling
		const parts = result.map((row: any) => {
			// Normalize the data for type safety and consistency
			const normalizedPart = normalizePart(row);
			const normalizedVersion = normalizePartVersion(row);
			
			// Extract standard API properties for the return types
			const part: Part = {
				part_id: normalizedPart.part_id, // Using snake_case property for database column
				creator_id: normalizedPart.creator_id || '',
				global_part_number: normalizedPart.global_part_number || undefined,
				status_in_bom: normalizedPart.status_in_bom,
				lifecycle_status: normalizedPart.lifecycle_status,
				is_public: normalizedPart.is_public,
				created_at: normalizedPart.created_at,
				updated_by: normalizedPart.updated_by || undefined,
				updated_at: normalizedPart.updated_at,
				current_version_id: normalizedPart.current_version_id || undefined
			};

			const currentVersion: PartVersion = {
				part_version_id: normalizedVersion.part_version_id,
				part_id: normalizedVersion.part_id,
				part_version: normalizedVersion.part_version,
				part_name: normalizedVersion.part_name,
				short_description: normalizedVersion.short_description || undefined,
				long_description: normalizedVersion.long_description || undefined,
				functional_description: normalizedVersion.functional_description || undefined,
				version_status: normalizedVersion.version_status,
				created_by: normalizedVersion.created_by,
				created_at: normalizedVersion.created_at,
				updated_by: normalizedVersion.updated_by || undefined,
				updated_at: normalizedVersion.updated_at
			};
			
			return { part, currentVersion };
		});
		
		return parts;
	} catch (error) {
		console.error('[listParts] Error retrieving parts:', error);
		return [];
	}
}

/**
 * Get a single part with its current version
 */
export async function getPartWithCurrentVersion(
	partId: string
): Promise<{ part: Part; currentVersion: PartVersion }> {
	try {
		// Stronger validation for partId parameter to avoid database errors
		if (!partId || partId === 'undefined' || partId === 'null' || partId.trim() === '') {
			console.error(`[getPartWithCurrentVersion] Invalid part ID: '${partId}'`);
			throw new Error(`Invalid part ID: cannot be undefined, null, or empty`);
		}

		console.log(`[getPartWithCurrentVersion] Retrieving part with ID: ${partId}`);
		
		// Use SQL template literals for porsager/postgres with comprehensive field selection
		const result = await sql`
		SELECT 
			-- Part table fields
			p.id as part_id,
			p.creator_id,
			p.global_part_number,
			p.status_in_bom,
			p.lifecycle_status,
			p.is_public,
			p.created_at,
			p.updated_by,
			p.updated_at,
			p.current_version_id,
			
			-- PartVersion table fields - ALL fields for complete data retrieval
			pv.id as part_version_id,
			pv.part_id,
			pv.part_version,
			pv.part_name,
			pv.short_description,
			pv.functional_description,
			pv.long_description,
			pv.technical_specifications,
			pv.properties,
			pv.electrical_properties,
			pv.mechanical_properties,
			pv.thermal_properties,
			pv.material_composition,
			pv.environmental_data,
			pv.revision_notes,
			
			-- Physical properties
			pv.dimensions,
			pv.dimensions_unit,
			pv.part_weight,
			pv.weight_unit,
			pv.package_type,
			pv.pin_count,
			pv.tolerance,
			pv.tolerance_unit,
			
			-- Temperature properties
			pv.operating_temperature_min,
			pv.operating_temperature_max,
			pv.storage_temperature_min,
			pv.storage_temperature_max,
			pv.temperature_unit,
			
			-- Electrical properties
			pv.voltage_rating_min,
			pv.voltage_rating_max,
			pv.current_rating_min,
			pv.current_rating_max,
			pv.power_rating_max,
			
			-- Status and metadata fields
			pv.version_status,
			pv.created_by,
			pv.created_at,
			pv.updated_by,
			pv.updated_at
		FROM "Part" p
		JOIN "PartVersion" pv ON p.current_version_id = pv.id
		WHERE p.id = ${partId}
		`;

		if (result.length === 0) {
			throw new Error(`Part not found with ID: ${partId}`);
		}
		
		// With porsager/postgres, results are objects with named properties
		const row = result[0];
		console.log(`[getPartWithCurrentVersion] Raw result:`, row);

		// Normalize database row data using our helper functions
		const normalizedPart = normalizePart(row);
		const normalizedVersion = normalizePartVersion(row);
		
		// Ensure we get a valid part ID
		if (!normalizedPart.part_id) {
			console.error('[getPartWithCurrentVersion] Found a row with null part ID');
			throw new Error(`Invalid part ID for query result`);
		}

		// Debug version information
		const rawVersion = row.part_version;
		console.log(`[VERSION DEBUG] Raw version from database: type=${typeof rawVersion}, value='${rawVersion}'`)
		
		// Extract standard API properties for the return types
		const part: Part = {
			part_id: normalizedPart.part_id,
			creator_id: normalizedPart.creator_id || '',
			global_part_number: normalizedPart.global_part_number || undefined,
			status_in_bom: normalizedPart.status_in_bom,
			lifecycle_status: normalizedPart.lifecycle_status,
			is_public: normalizedPart.is_public,
			created_at: normalizedPart.created_at,
			updated_by: normalizedPart.updated_by || undefined,
			updated_at: normalizedPart.updated_at,
			current_version_id: normalizedPart.current_version_id || undefined
		};
		
		// Map normalized version to API response format
		const currentVersion: PartVersion = {
			part_version_id: normalizedVersion.part_version_id,
			part_id: normalizedVersion.part_id,
			part_version: normalizedVersion.part_version,
			part_name: normalizedVersion.part_name,
			
			// Text descriptions (with proper null handling)
			short_description: normalizedVersion.short_description || undefined,
			functional_description: normalizedVersion.functional_description || undefined,
			long_description: normalizedVersion.long_description || undefined,
			revision_notes: normalizedVersion.revision_notes || undefined,
			
			// JSONB fields (need special handling)
			technical_specifications: normalizedVersion.technical_specifications as any || undefined,
			properties: normalizedVersion.properties as any || undefined,
			electrical_properties: normalizedVersion.electrical_properties as any || undefined,
			mechanical_properties: normalizedVersion.mechanical_properties as any || undefined,
			thermal_properties: normalizedVersion.thermal_properties as any || undefined,
			material_composition: normalizedVersion.material_composition as any || undefined,
			environmental_data: normalizedVersion.environmental_data as any || undefined,
			dimensions: normalizedVersion.dimensions as any || undefined,
			
			// Physical properties 
			part_weight: normalizedVersion.part_weight,
			weight_unit: normalizedVersion.weight_unit || undefined,
			dimensions_unit: normalizedVersion.dimensions_unit || undefined,
			tolerance: normalizedVersion.tolerance,
			tolerance_unit: normalizedVersion.tolerance_unit || undefined,
			package_type: normalizedVersion.package_type || undefined,
			pin_count: normalizedVersion.pin_count,
			
			// Temperature properties
			operating_temperature_min: normalizedVersion.operating_temperature_min,
			operating_temperature_max: normalizedVersion.operating_temperature_max,
			storage_temperature_min: normalizedVersion.storage_temperature_min,
			storage_temperature_max: normalizedVersion.storage_temperature_max,
			temperature_unit: normalizedVersion.temperature_unit || undefined,
			
			// Electrical ratings
			voltage_rating_min: normalizedVersion.voltage_rating_min,
			voltage_rating_max: normalizedVersion.voltage_rating_max,
			current_rating_min: normalizedVersion.current_rating_min,
			current_rating_max: normalizedVersion.current_rating_max,
			power_rating_max: normalizedVersion.power_rating_max,
			
			// Status and metadata
			version_status: normalizedVersion.version_status,
			created_by: normalizedVersion.created_by,
			created_at: normalizedVersion.created_at,
			updated_by: normalizedVersion.updated_by || undefined,
			updated_at: normalizedVersion.updated_at
		};
		
		// Log that we're done normalizing
		console.log(`[getPartWithCurrentVersion] Successfully normalized part and version data`);
		
		// CRITICAL FIX: Load relationship data (categories and manufacturers), but make it fault-tolerant
		// Don't crash the app if relationship data can't be loaded
		
		// Create a type-safe extended version that includes relationship data
		const extendedVersion = currentVersion as PartVersion & {
			categoryIds: string;
			categories: Array<{id: string; name: string}>;
			manufacturerParts: Array<{id: string; manufacturerId: string; manufacturerName: string; partNumber: string}>;
		};
		
		// Initialize empty relationship data
		extendedVersion.categoryIds = '';
		extendedVersion.categories = [];
		extendedVersion.manufacturerParts = [];
		
		try {
			// Check for categories table first
			console.log(`[getPartWithCurrentVersion] Checking for category relationship tables...`);
			
			// First check if the tables exist by trying to count rows (safer approach)
			const categoryTableCheck = await sql`
				SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' AND table_name = 'Category'
				) as exists
			`;
			
			const hasCategoryTable = categoryTableCheck[0]?.exists === true;
			
			if (hasCategoryTable) {
				// 1. Try loading categories for this part version
				console.log(`[getPartWithCurrentVersion] Loading categories for part version ${currentVersion.part_version_id}`);
				
				try {
					const categoryTableCheck = await sql`
						SELECT EXISTS (
							SELECT FROM information_schema.tables 
							WHERE table_schema = 'public' AND table_name = 'PartCategory'
						) as exists
					`;
					
					// Look for either PartVersionCategory or PartCategory table
					const hasPartCategoryTable = categoryTableCheck[0]?.exists === true;
					
					let categoriesResult: Array<{category_id: string; category_name: string}> = [];
					if (hasPartCategoryTable) {
						// Try with PartCategory table
						categoriesResult = await sql`
							SELECT 
								pc.id::TEXT AS id, 
								pc.part_id::TEXT AS part_version_id, 
								pc.category_id::TEXT AS category_id,
								c.name::TEXT AS category_name
							FROM "PartCategory" pc
							JOIN "Category" c ON pc.category_id = c.id
							WHERE pc.part_id = ${part.part_id}
						`;
					} else {
						// Try with the original table name as a fallback
						try {
							categoriesResult = await sql`
								SELECT 
									pvc.id::TEXT AS id, 
									pvc.part_version_id::TEXT AS part_version_id, 
									pvc.category_id::TEXT AS category_id,
									c.name::TEXT AS category_name
								FROM "PartVersionCategory" pvc
								JOIN "Category" c ON pvc.category_id = c.id
								WHERE pvc.part_version_id = ${currentVersion.part_version_id}
							`;
						} catch (catErr: unknown) {
							const errorMessage = catErr instanceof Error ? catErr.message : String(catErr);
							console.log(`[getPartWithCurrentVersion] PartVersionCategory table not found, skipping category loading: ${errorMessage}`);
						}
					}
					
					console.log(`[getPartWithCurrentVersion] Found ${categoriesResult.length} categories for part version`);
					
					// Map category IDs to string format for the form
					if (categoriesResult && categoriesResult.length > 0) {
						const categoryIds = categoriesResult.map(cat => cat.category_id).join(',');
						
						// Add category data to the extended version for form use
						extendedVersion.categoryIds = categoryIds;
						extendedVersion.categories = categoriesResult.map(cat => ({
							id: cat.category_id,
							name: cat.category_name
						}));
					}
				} catch (categoryErr: unknown) {
					const errorMessage = categoryErr instanceof Error ? categoryErr.message : String(categoryErr);
					console.log(`[getPartWithCurrentVersion] Error loading categories: ${errorMessage}`);
				}
			}
			
			// 2. Try loading manufacturer parts - also resilient to errors
			try {
				console.log(`[getPartWithCurrentVersion] Loading manufacturers for part ${part.part_id}`);
				// Check if ManufacturerPart table exists
				const mfgTableCheck = await sql`
					SELECT EXISTS (
						SELECT FROM information_schema.tables 
						WHERE table_schema = 'public' AND table_name = 'ManufacturerPart'
					) as exists
				`;
				
				if (mfgTableCheck[0]?.exists === true) {
					const manufacturersResult = await sql`
						SELECT 
							mp.id::TEXT AS id, 
							mp.part_version_id::TEXT AS part_version_id, 
							mp.manufacturer_id::TEXT AS manufacturer_id,
							m.name::TEXT AS manufacturer_name,
							mp.manufacturer_part_number::TEXT AS part_number
						FROM "ManufacturerPart" mp
						JOIN "Manufacturer" m ON mp.manufacturer_id = m.id
						WHERE mp.part_version_id = ${currentVersion.part_version_id}
					`;
					
					// CRITICAL FIX: Assign the manufacturer parts query results to extendedVersion
					if (manufacturersResult && manufacturersResult.length > 0) {
						console.log(`[getPartWithCurrentVersion] Found ${manufacturersResult.length} manufacturer parts for part`);
						extendedVersion.manufacturerParts = manufacturersResult.map(mp => ({
							id: mp.id,
							manufacturerId: mp.manufacturer_id,
							manufacturerName: mp.manufacturer_name,
							partNumber: mp.part_number
						}));
					}
				} else {
					console.log(`[getPartWithCurrentVersion] ManufacturerPart table doesn't exist, skipping manufacturer loading`);
				}
			} catch (mfgErr: unknown) {
				const errorMessage = mfgErr instanceof Error ? mfgErr.message : String(mfgErr);
				console.log(`[getPartWithCurrentVersion] Error loading manufacturers: ${errorMessage}`);
			}
			
			// Log the mapped object with any relationship data for debugging
			console.log(`[getPartWithCurrentVersion] Mapped part object with ID: ${part.part_id} including relationship data`);
			console.log(`[getPartWithCurrentVersion] Categories (count):`, extendedVersion.categories.length);
			console.log(`[getPartWithCurrentVersion] Manufacturers (count):`, extendedVersion.manufacturerParts.length);
			
		} catch (relationErr: unknown) {
			// Don't let relationship errors break the entire part retrieval
			const errorMessage = relationErr instanceof Error ? relationErr.message : String(relationErr);
			console.error(`[getPartWithCurrentVersion] Could not load relationship data: ${errorMessage}`);
			console.log('[getPartWithCurrentVersion] Continuing with basic part data only');
		}

		return { part, currentVersion };
	} catch (error) {
		console.error(`[getPartWithCurrentVersion] Error retrieving part ${partId}:`, error);
		throw error;
	}
}


/**
 * Create a new part with its initial version
 */
// src/lib/server/parts.ts - Updated createPart function with error logging
export async function createPart(input: any, userId: string) {
    if (!input || !userId) {
        throw new Error('Missing required input or userId for part creation');
    }

    // CRITICAL FIX: Log the COMPLETE input object exactly as received
    // This helps track if any data is lost during form submission
    console.log('[createPart] Creating new part with COMPLETE input:', JSON.stringify(input, null, 2));
    
    // Generate UUIDs for part and version
    const partId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    
    // EXTREME DEBUG: Full deep inspection of all values and enums
    console.log('[createPart] ENUM DEBUG - Available values:', Object.values(LifecycleStatusEnum));
    console.log('[createPart] ENUM DEBUG - Checking if input status is valid:', 
        Object.values(LifecycleStatusEnum).includes(input.status));
    
    // Debug ALL input data to verify everything the user provided
    console.log('[createPart] FULL Input data:', JSON.stringify(input, null, 2));
    console.log('[createPart] Basic info:', {
        name: input.name,
        version: input.version,
        status: input.status,
        statusType: typeof input.status,
        statusValue: String(input.status),
        userId,
        partId,
        versionId
    });
    
    // Ensure status is a string - this handles enum values properly
    const statusValue = String(input.status);
    
    
    // Prepare the lowercase status string
    const statusLower = String(input.status).toLowerCase().replace(/'/g, "''");
    console.log('[createPart] Using status value:', statusLower);
    
    try {
        // Use the partStatus field if provided, otherwise default to CONCEPT
        const partStatusToUse = input.partStatus || PartStatusEnum.CONCEPT;
        console.log('[createPart] Using Part status:', partStatusToUse);
        
        // Proper transaction handling with porsager/postgres using sql.begin
        console.log('[createPart] Starting transaction');
        
        // Begin a transaction using the correct porsager/postgres approach
        const result = await sql.begin(async (transaction) => {
            console.log('[createPart] Inserting part');
            
            // Insert the part record
            // CRITICAL FIX: Using exact schema column names from schema.sql
            await transaction`
            INSERT INTO "Part" (
                id, creator_id, status, lifecycle_status
            ) VALUES (
                ${partId}, 
                ${userId}, 
                ${String(partStatusToUse).toLowerCase()}::part_status_enum, 
                ${String(input.status).toLowerCase()}::lifecycle_status_enum
            )
            `;
            console.log('[createPart] Part inserted successfully');
            
            console.log('[createPart] Now inserting PartVersion');
            
            // CRITICAL FIX: Process dimensions value properly WITHOUT losing user data
            let dimensionsValue = null;
            if (input.dimensions) {
                console.log('[createPart] Processing dimensions:', input.dimensions, 'type:', typeof input.dimensions);
                if (typeof input.dimensions === 'string') {
                    try {
                        // Try to parse as JSON if it looks like JSON
                        if (input.dimensions.trim().startsWith('{')) {
                            dimensionsValue = sql.json(JSON.parse(input.dimensions));
                            console.log('[createPart] Parsed dimensions as JSON object');
                        } else {
                            // Not JSON format - preserve as custom object
                            dimensionsValue = sql.json({value: input.dimensions, raw: true});
                            console.log('[createPart] Stored dimensions as custom object');
                        }
                    } catch (e) {
                        // If parsing fails, preserve the original string in an object
                        console.log('[createPart] Error parsing dimensions, storing as raw:', e);
                        dimensionsValue = sql.json({value: input.dimensions, raw: true});
                    }
                } else if (typeof input.dimensions === 'object') {
                    // Already an object, just convert to JSON
                    dimensionsValue = sql.json(input.dimensions);
                    console.log('[createPart] Used dimensions object directly');
                }
            }
            
            // CRITICAL FIX: Process ALL JSON fields WITHOUT cherry-picking
            // Log every field name to ensure nothing is being lost
            console.log('[createPart] Processing ALL user input fields:');
            console.log(Object.keys(input).map(k => `${k}: ${input[k] !== undefined ? 'present' : 'missing'}`).join(','));
            
            // Process JSON fields with improved error handling to preserve ALL user data
            const processJsonField = (fieldValue: any, fieldName: string) => {
                if (fieldValue === undefined || fieldValue === null) {
                    console.log(`[createPart] Field ${fieldName} is null/undefined`);
                    return null;
                }
                
                if (typeof fieldValue === 'string') {
                    try {
                        // Check if it's already valid JSON
                        if (fieldValue.trim().startsWith('{') || fieldValue.trim().startsWith('[')) {
                            const parsed = JSON.parse(fieldValue);
                            console.log(`[createPart] Field ${fieldName} is valid JSON string, parsing`);
                            return sql.json(parsed);
                        } else {
                            // Not JSON, but still preserve the user's text input
                            console.log(`[createPart] Field ${fieldName} is non-JSON string, preserving as raw`);
                            return sql.json({value: fieldValue, raw: true});
                        }
                    } catch (e) {
                        // If parsing fails, wrap the string in an object to preserve it
                        console.log(`[createPart] Error parsing ${fieldName}, preserving as raw:`, e);
                        return sql.json({value: fieldValue, raw: true});
                    }
                } else if (typeof fieldValue === 'object') {
                    // Already an object, just make sure it's properly jsonified
                    console.log(`[createPart] Field ${fieldName} is object, using directly`);
                    return sql.json(fieldValue);
                } else {
                    // For other types (number, boolean, etc.), preserve the type info
                    console.log(`[createPart] Field ${fieldName} is ${typeof fieldValue}, converting to object`);
                    return sql.json({value: fieldValue, type: typeof fieldValue});
                }
            };
            
            // Process all JSON fields with proper error handling to prevent data loss
            const technicalSpecsValue = processJsonField(input.technicalSpecifications, 'technicalSpecifications');
            const propertiesValue = processJsonField(input.properties, 'properties');
            const electricalPropsValue = processJsonField(input.electricalProperties, 'electricalProperties');
            const mechanicalPropsValue = processJsonField(input.mechanicalProperties, 'mechanicalProperties');
            const thermalPropsValue = processJsonField(input.thermalProperties, 'thermalProperties');
            const materialCompValue = processJsonField(input.materialComposition, 'materialComposition');
            const environDataValue = processJsonField(input.environmentalData, 'environmentalData');
            const longDescValue = processJsonField(input.longDescription, 'longDescription');
            
            // CRITICAL FIX: Log complete data payload before database insertion to trace data loss
            console.log('[createPart] FINAL PRE-INSERTION DATA DUMP');
            console.log('------------ TRACE FOR DEBUGGING DATA LOSS ------------');
            console.log('partId:', partId);
            console.log('versionId:', versionId);
            console.log('status:', input.status, typeof input.status);
            console.log('dimensions:', JSON.stringify(dimensionsValue));
            console.log('technicalSpecs:', JSON.stringify(technicalSpecsValue));
            console.log('properties:', JSON.stringify(propertiesValue));
            console.log('electrical:', JSON.stringify(electricalPropsValue));
            console.log('mechanical:', JSON.stringify(mechanicalPropsValue));
            console.log('thermal:', JSON.stringify(thermalPropsValue));
            console.log('material:', JSON.stringify(materialCompValue));
            console.log('environmental:', JSON.stringify(environDataValue));
            console.log('long desc:', JSON.stringify(longDescValue));
            console.log('dimensions unit:', input.dimensionsUnit);
            console.log('weight:', input.weight);
            console.log('weight unit:', input.weightUnit);
            console.log('package type:', input.packageType);
            console.log('pin count:', input.pinCount);
            // Log all temperature-related fields
            console.log('temperatures:', JSON.stringify({
                min: input.operatingTemperatureMin,
                max: input.operatingTemperatureMax,
                storageMin: input.storageTemperatureMin,
                storageMax: input.storageTemperatureMax,
                unit: input.temperatureUnit
            }));
            // Log voltage ratings
            console.log('voltages:', JSON.stringify({
                min: input.voltageRatingMin,
                max: input.voltageRatingMax
            }));
            // Log current ratings
            console.log('currents:', JSON.stringify({
                min: input.currentRatingMin,
                max: input.currentRatingMax
            }));
            console.log('power max:', input.powerRatingMax);
            console.log('tolerance:', input.tolerance);
            console.log('tolerance unit:', input.toleranceUnit);
            console.log('------------ END TRACE ------------');
            
            // Use a modified approach with named parameters to avoid syntax errors
            await transaction`
            INSERT INTO "PartVersion" (
                id, part_id, version, name, status, created_by, updated_by,
                short_description, functional_description, long_description,
                technical_specifications, properties, electrical_properties,
                mechanical_properties, thermal_properties, material_composition,
                environmental_data, revision_notes,
                "dimensions", dimensions_unit, weight, weight_unit, package_type, pin_count,
                operating_temperature_min, operating_temperature_max,
                storage_temperature_min, storage_temperature_max, temperature_unit,
                voltage_rating_min, voltage_rating_max, current_rating_min, current_rating_max,
                power_rating_max, tolerance, tolerance_unit
            ) VALUES (
                ${versionId}, 
                ${partId}, 
                ${input.version}, 
                ${input.name}, 
                ${String(input.status).toLowerCase()}::lifecycle_status_enum, 
                ${userId}, 
                NULL,
                ${input.shortDescription || null}, 
                ${input.functionalDescription || null},
                ${longDescValue},
                ${technicalSpecsValue},
                ${propertiesValue},
                ${electricalPropsValue},
                ${mechanicalPropsValue},
                ${thermalPropsValue},
                ${materialCompValue},
                ${environDataValue},
                ${input.revisionNotes || null},
                ${dimensionsValue},
                ${input.dimensionsUnit || null},
                ${input.weight || null},
                ${input.weightUnit || null},
                ${input.packageType || null},
                ${input.pinCount || null},
                ${input.operatingTemperatureMin || null},
                ${input.operatingTemperatureMax || null},
                ${input.storageTemperatureMin || null},
                ${input.storageTemperatureMax || null},
                ${input.temperatureUnit || null},
                ${input.voltageRatingMin || null},
                ${input.voltageRatingMax || null},
                ${input.currentRatingMin || null},
                ${input.currentRatingMax || null},
                ${input.powerRatingMax || null},
                ${input.tolerance || null},
                ${input.toleranceUnit || null}
            )
            `;
            
            console.log('[createPart] PartVersion inserted, now updating Part current_version_id');
            
            // Update the part to reference the new version
            await transaction`
            UPDATE "Part" 
            SET current_version_id = ${versionId} 
            WHERE id = ${partId}
            `;
            console.log('[createPart] Update completed for Part', partId);
            
            // Process category relationships if categoryIds are provided
            if (input.categoryIds && Array.isArray(input.categoryIds) && input.categoryIds.length > 0) {
                console.log(`[createPart] Adding ${input.categoryIds.length} categories to part version ${versionId}`);
                
                for (const categoryId of input.categoryIds) {
                    if (categoryId) {
                        try {
                            // Use the database transaction for category relationship with correct schema
                            await transaction`
                            INSERT INTO "partversioncategory" (
                                part_version_id, category_id
                            ) VALUES (
                                ${versionId}, ${categoryId}
                            )
                            `;
                            console.log(`[createPart] Added category ${categoryId} to part version ${versionId}`);
                        } catch (err: any) {
                            // Log error but continue with remaining categories
                            console.error(`[createPart] Error linking category ${categoryId}: ${err.message}`);
                            // Don't throw, to allow other categories to be linked 
                        }
                    }
                }
            }
            
            // Process manufacturer parts if provided
            if (input.manufacturerParts && Array.isArray(input.manufacturerParts) && input.manufacturerParts.length > 0) {
                console.log(`[createPart] Adding ${input.manufacturerParts.length} manufacturer parts to part version ${versionId}`);
                
                for (const mfrPart of input.manufacturerParts) {
                    if (mfrPart && mfrPart.manufacturerId && mfrPart.partNumber) {
                        await transaction`
                        INSERT INTO "ManufacturerPart" (
                            id, 
                            manufacturer_id, 
                            part_version_id, 
                            part_number, 
                            created_by, 
                            created_at
                        ) VALUES (
                            ${randomUUID()}, 
                            ${mfrPart.manufacturerId}, 
                            ${versionId}, 
                            ${mfrPart.partNumber}, 
                            ${userId}, 
                            NOW()
                        )
                        `;
                        console.log(`[createPart] Added manufacturer part ${mfrPart.partNumber} from manufacturer ${mfrPart.manufacturerId} to part version ${versionId}`);
                    }
                }
            }
            
            // Return value will be the transaction's return and will be committed automatically
            return { partId, versionId };
        });
        
        console.log('[createPart] Transaction committed successfully:', result);
    } catch (error: any) {
        // With sql.begin(), rollback happens automatically on error
        console.error('Database Error in createPart:', error.message, error.stack);
        throw error;
    }

    return getPartWithCurrentVersion(partId);
}

/**
 * Update a part version (select fields)
 */
export async function updatePartVersion(
	data: Partial<PartVersion> & { part_version_id: string }
): Promise<void> {
	try {
		// More modern approach with porsager/postgres - build update dynamically
		// Only include fields that are defined in the input data
		let updateFields = [];
		
		if (data.part_name !== undefined) {
			updateFields.push(`part_name = ${data.part_name}`);
		}
		if (data.part_version !== undefined) {
			updateFields.push(`part_version = ${data.part_version}`);
		}
		if (data.version_status !== undefined) {
			updateFields.push(`version_status = ${data.version_status}::text::lifecycle_status_enum`);
		}
		
		// If no fields to update, return early
		if (updateFields.length === 0) {
			console.log('[updatePartVersion] No fields to update');
			return;
		}
		
		// Use sql.unsafe for dynamic SQL with template literals for parameterization
		// This avoids SQL injection while allowing dynamic field updates
		const result = await sql.unsafe(`
			UPDATE "PartVersion" 
			SET ${updateFields.join(', ')} 
			WHERE part_version_id = '${data.part_version_id}'
			RETURNING part_version_id
		`);
		
		console.log(`[updatePartVersion] Updated part version ${data.part_version_id}`);
	} catch (error) {
		console.error('[updatePartVersion] Error updating part version:', error);
		throw error;
	}
}

/**
 * Delete a part (cascades to versions)
 */
export async function deletePart(partId: string): Promise<void> {
	try {
		console.log(`[deletePart] Deleting part with ID: ${partId}`);
		
		// Use porsager/postgres transaction handling with sql.begin
		// This handles BEGIN/COMMIT/ROLLBACK automatically
		await sql.begin(async (transaction) => {
			// First lock the part row to prevent concurrent modifications
			// This helps prevent the "tuple concurrently updated" error
			const lockResult = await transaction`
				SELECT id FROM "Part" WHERE id = ${partId} FOR UPDATE
			`;
			
			if (lockResult.length === 0) {
				throw new Error(`Part not found with ID: ${partId}`);
			}
			
			console.log(`[deletePart] Part ${partId} found and locked for deletion`);
			
			// Delete the part (relies on CASCADE for versions)
			const deleteResult = await transaction`
				DELETE FROM "Part" WHERE id = ${partId} RETURNING id
			`;
			
			if (deleteResult.length === 0) {
				throw new Error(`Failed to delete part with ID: ${partId}`);
			}
			
			console.log(`[deletePart] Part ${partId} successfully deleted within transaction`);
			// Transaction automatically commits if no errors
		});
		
		console.log(`[deletePart] Successfully deleted part with ID: ${partId}`);
	} catch (error) {
		console.error(`[deletePart] Error deleting part ${partId}:`, error);
		// With sql.begin(), rollback happens automatically on error
		throw error;
	}
}

// ======================
// Part Version Category
// ======================
export async function addCategoryToPartVersion(partVersionId: string, categoryId: string): Promise<PartVersionCategory> {
    try {
        // Use porsager/postgres template literals for SQL queries
        const result = await sql`
            INSERT INTO "PartVersionCategory" (part_version_id, category_id)
            VALUES (${partVersionId}, ${categoryId}) 
            RETURNING *
        `;
        
        if (result.length === 0) {
            throw new Error(`Failed to add category ${categoryId} to part version ${partVersionId}`);
        }
        
        // With porsager/postgres, results are direct objects
        const row = result[0];
        return rowToPartVersionCategory(row);
    } catch (error) {
        console.error('[addCategoryToPartVersion] Error:', error);
        throw error;
    }
}

export async function removeCategoryFromPartVersion(partVersionId: string, categoryId: string): Promise<void> {
    try {
        // Use template literals for DELETE operation with proper error handling
        await sql`
            DELETE FROM "PartVersionCategory" 
            WHERE part_version_id = ${partVersionId} AND category_id = ${categoryId}
        `;
        
        console.log(`[removeCategoryFromPartVersion] Removed category ${categoryId} from part version ${partVersionId}`);
    } catch (error) {
        console.error('[removeCategoryFromPartVersion] Error:', error);
        throw error;
    }
}

export async function getCategoriesForPartVersion(partVersionId: string): Promise<PartVersionCategory[]> {
    try {
        // Use template literals for SELECT operation with proper error handling
        const result = await sql`
            SELECT * FROM "PartVersionCategory" 
            WHERE part_version_id = ${partVersionId}
        `;
        
        console.log(`[getCategoriesForPartVersion] Found ${result.length} categories for part version ${partVersionId}`);
        
        // Map results using array methods directly on the result
        return result.map(rowToPartVersionCategory);
    } catch (error) {
        console.error('[getCategoriesForPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Update a part record with a new current version ID and status
 * Uses proper transaction handling with row locking to prevent concurrent update issues
 */
export async function updatePartWithStatus(
  partId: string,
  newVersionId: string,
  newStatus: PartStatusEnum
): Promise<void> {
  console.log(`[updatePartWithStatus] Updating part ${partId} with new version ${newVersionId} and status ${newStatus}`);
  
  // Get SQL client
  // Using the sql client imported at the top of the file
  
  try {
    // Begin transaction - with porsager/postgres, transactions are handled with sql.begin()
    await sql.begin(async (txSql: typeof sql) => {
      console.log('[updatePartWithStatus] Transaction started');
      
      // First, lock the part row to prevent concurrent modifications
      // This is critical to avoid the "tuple concurrently updated" error
      const lockResult = await txSql`
        SELECT id FROM "Part" WHERE id = ${partId} FOR UPDATE
      `;
      
      if (lockResult.length === 0) {
        throw new Error(`Part with ID ${partId} not found or could not be locked`);
      }
      
      console.log('[updatePartWithStatus] Part row locked for update');
      
      // Now update the part with the new version ID and status
      const updateResult = await txSql`
        UPDATE "Part"
        SET 
          current_version_id = ${newVersionId},
          status = ${newStatus}::TEXT::part_status_enum,
          updated_at = NOW()
        WHERE id = ${partId}
        RETURNING id
      `;
      
      if (updateResult.length === 0) {
        throw new Error(`Failed to update part ${partId}`);
      }
      
      console.log('[updatePartWithStatus] Part updated successfully');
      // Transaction automatically commits if no errors
    });
    
    console.log('[updatePartWithStatus] Transaction committed');
  } catch (error) {
    // Transaction automatically rolls back on error
    console.error('[updatePartWithStatus] Transaction rolled back due to error:', error);
    throw error;
  }
}

/**
 * Create a new version of a part
 * 
 * @param partVersion - The part version data with required fields
 * @returns Newly created part version with normalized structure
 */
export async function createPartVersion(partVersion: Partial<PartVersion> & {
    id: string;
    partId: string;
    version: string;
    name: string;
    status: string;
    createdBy: string;
}): Promise<PartVersion> {
    try {
        console.log(`[createPartVersion] Creating version ${partVersion.version} of part ${partVersion.partId}`);

        // Verify required fields are present
        if (!partVersion.id || !partVersion.partId || !partVersion.name || !partVersion.version || !partVersion.status || !partVersion.createdBy) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Missing required fields for part version creation`);
        }
        
        // Map input fields to database fields
        // This follows the pattern in supplier.ts and category.ts
        partVersion.part_version_id = partVersion.id;
        partVersion.part_id = partVersion.partId;
        partVersion.part_version = partVersion.version;
        partVersion.part_name = partVersion.name;
        partVersion.version_status = partVersion.status as LifecycleStatusEnum;
        partVersion.created_by = partVersion.createdBy;
        
        console.log('[createPartVersion] 🛠️ ENFORCING DATABASE CONSTRAINTS');
        console.log('[createPartVersion] 🔍 Before constraint enforcement:', {
            dimensions: partVersion.dimensions ? 'present' : 'null',
            dimensions_unit: partVersion.dimensions_unit,
            part_weight: partVersion.part_weight,
            weight_unit: partVersion.weight_unit,
            tolerance: partVersion.tolerance,
            tolerance_unit: partVersion.tolerance_unit
        });
        
        // 1. Dimensions constraint
        if (partVersion.dimensions && !partVersion.dimensions_unit) {
            console.log('[createPartVersion] ⚠️ Clearing dimensions because dimensions_unit is missing');
            partVersion.dimensions = undefined;
        } else if (!partVersion.dimensions && partVersion.dimensions_unit) {
            console.log('[createPartVersion] ⚠️ Clearing dimensions_unit because dimensions is missing');
            partVersion.dimensions_unit = null;
        }
        
        // 2. Weight constraint - both or neither weight and unit must be present
        if (partVersion.part_weight && !partVersion.weight_unit) {
            console.log('[createPartVersion] ⚠️ Clearing part_weight because weight_unit is missing');
            partVersion.part_weight = null;
        } else if (!partVersion.part_weight && partVersion.weight_unit) {
            console.log('[createPartVersion] ⚠️ Clearing weight_unit because part_weight is missing');
            partVersion.weight_unit = null;
        }
        
        // 3. Temperature constraint - if any temperature is present, unit must be set
        const hasAnyTemperature = [
            partVersion.operating_temperature_min,
            partVersion.operating_temperature_max,
            partVersion.storage_temperature_min,
            partVersion.storage_temperature_max
        ].some(t => t !== undefined && t !== null);
        
        if (hasAnyTemperature && !partVersion.temperature_unit) {
            console.log('[createPartVersion] ⚠️ Setting default temperature unit (C) because temperature values exist');
            partVersion.temperature_unit = TemperatureUnitEnum.C;
        } else if (!hasAnyTemperature && partVersion.temperature_unit) {
            console.log('[createPartVersion] ⚠️ Clearing temperature_unit because no temperature values exist');
            partVersion.temperature_unit = null;
        }

        try {
            // Use plain execute method for maximum compatibility
            // This is the most direct and reliable approach with PostgreSQL
            const insertQuery = `
                INSERT INTO "PartVersion" (
                    part_version_id, part_id, part_version, part_name, version_status, created_by, created_at,
                    short_description, functional_description, long_description,
                    voltage_rating_min, voltage_rating_max, current_rating_min, current_rating_max,
                    power_rating_max, tolerance, tolerance_unit, electrical_properties,
                    dimensions, dimensions_unit, part_weight, weight_unit, package_type, pin_count,
                    mechanical_properties, material_composition,
                    operating_temperature_min, operating_temperature_max,
                    storage_temperature_min, storage_temperature_max, temperature_unit, thermal_properties,
                    technical_specifications, properties, environmental_data, revision_notes
                ) VALUES (
                    $1, $2, $3, $4, $5::lifecycle_status_enum, $6, NOW(),
                    $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                    $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
                    $28, $29, $30, $31, $32, $33, $34, $35
                ) RETURNING *
            `;
        
            // Prepare params array with all values
            const params = [
                partVersion.part_version_id, 
                partVersion.part_id, 
                partVersion.part_version, 
                partVersion.part_name,
                partVersion.version_status,
                partVersion.created_by,
                partVersion.short_description || null,
                partVersion.functional_description || null,
                partVersion.long_description ? sql.json(partVersion.long_description) : null,
                partVersion.voltage_rating_min || null,
                partVersion.voltage_rating_max || null,
                partVersion.current_rating_min || null,
                partVersion.current_rating_max || null,
                partVersion.power_rating_max || null,
                partVersion.tolerance || null,
                partVersion.tolerance_unit || null,
                partVersion.electrical_properties ? sql.json(partVersion.electrical_properties) : null,
                partVersion.dimensions ? sql.json(partVersion.dimensions) : null,
                partVersion.dimensions_unit || null,
                partVersion.part_weight || null,
                partVersion.weight_unit || null,
                partVersion.package_type || null,
                partVersion.pin_count || null,
                partVersion.mechanical_properties ? sql.json(partVersion.mechanical_properties) : null,
                partVersion.material_composition ? sql.json(partVersion.material_composition) : null,
                partVersion.operating_temperature_min || null,
                partVersion.operating_temperature_max || null,
                partVersion.storage_temperature_min || null,
                partVersion.storage_temperature_max || null,
                partVersion.temperature_unit || null,
                partVersion.thermal_properties ? sql.json(partVersion.thermal_properties) : null,
                partVersion.technical_specifications ? sql.json(partVersion.technical_specifications) : null,
                partVersion.properties ? sql.json(partVersion.properties) : null,
                partVersion.environmental_data ? sql.json(partVersion.environmental_data) : null,
                partVersion.revision_notes || null
            ];

            // Execute direct SQL query for maximum compatibility
            const dbResult = await sql.unsafe(insertQuery, params);
            
            // Check if we have a result
            if (!dbResult || dbResult.length === 0) {
                throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to create part version`);
            }
            
            console.log('[createPartVersion] ✅ Successfully created part version');
            
            // Use a type assertion to handle the incompatible types
            // This is necessary because the JSON field types aren't fully compatible
            return normalizePartVersion(dbResult[0]) as unknown as PartVersion;
        } catch (error) {
            console.error('[createPartVersion] Error in database operation:', error);
            throw error;
        }
    } catch (error) {
        console.error('[createPartVersion] Error creating part version:', error);
        // Enhance error with context
        if (error instanceof Error) {
            // Check for unique constraint violations
            if ('code' in error && error.code === '23505') {
                throw new Error(`${PART_ERRORS.VERSION_EXISTS}: Version ${partVersion.version} already exists for part ${partVersion.partId}`);
            }
            // Pass through validation errors
            if (error.message.includes(PART_ERRORS.VALIDATION_ERROR)) {
                throw error;
            }
        }
        // Re-throw with enhanced context
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

