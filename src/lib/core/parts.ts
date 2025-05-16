/**
 * Core functionality for part management
 */
import sql from '$lib/server/db';
import crypto from 'crypto';

// Import error constants
import { PART_ERRORS } from './parts/partErrors';

// Import utility functions
import { sanitizeSqlString } from '$lib/utils/util';

// Import enum values
import {
    LifecycleStatusEnum,
    PartStatusEnum,
    WeightUnitEnum,
    DimensionUnitEnum,
    PackageTypeEnum,
    MountingTypeEnum,
    TemperatureUnitEnum,
    ComplianceTypeEnum,
    StructuralRelationTypeEnum
} from '$lib/types/enums';

// Import type definitions
import type {
    Part,
    PartVersion,
    CreatePart,
    PartFormData,
    ElectricalProperties,
    MechanicalProperties,
    ThermalProperties,
    EnvironmentalData,
    Dimensions,
    PartVersionBase
} from '$lib/types/schemaTypes';

// Import utility types
import type { JsonValue, JsonRecord } from '$lib/types/types';

// Import database entity types
import type {
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
    DbManufacturerPart,
    DbSupplierPart
} from '$lib/types/types';



// Import part module types and functions
import type { PartStructure } from './parts/partStructure';
import { 
    createPartStructure, 
    getPartStructure, 
    getPartStructuresForPart, 
    updatePartStructure, 
    deletePartStructure 
} from './parts/partStructure';

import type { PartCompliance } from './parts/partCompliance';
import { 
    createPartCompliance, 
    getPartComplianceById, 
    getPartCompliancesByPartVersion,
    updatePartCompliance, 
    deletePartCompliance 
} from './parts/partCompliance';

import type { PartAttachment } from './parts/partAttachment';
import { 
    createPartAttachment, 
    getPartAttachmentById, 
    getPartAttachmentsByPartVersion,
    updatePartAttachment, 
    deletePartAttachment 
} from './parts/partAttachment';

import type { PartRepresentation } from './parts/partRepresentation';
import { 
    createPartRepresentation, 
    getPartRepresentationById, 
    getPartRepresentationsByPartVersion,
    updatePartRepresentation, 
    deletePartRepresentation 
} from './parts/partRepresentation';

import type { PartValidation } from './parts/partValidation';
import { 
    createPartValidation, 
    getPartValidationById, 
    getPartValidationsByPartVersion,
    updatePartValidationStatus, 
    deletePartValidation 
} from './parts/partValidation';

import type { PartVersionTag } from './parts/partVersionTag';
import { 
    createPartVersionTag, 
    getPartVersionTagById, 
    getPartVersionTags,
    findPartVersionsByTag, 
    updatePartVersionTag, 
    deletePartVersionTag 
} from './parts/partVersionTag';

import type { PartCustomField } from './parts/partCustomField';
import { 
    createPartCustomField, 
    getPartCustomFieldById, 
    getPartCustomFields,
    updatePartCustomFieldValue, 
    updatePartCustomFieldMetadata, 
    deletePartCustomField 
} from './parts/partCustomField';

import type { ManufacturerPart } from './parts/manufacturerPart';
import { 
    createManufacturerPart, 
    getManufacturerPartById, 
    getManufacturerPartsByPartVersion,
    updateManufacturerPart, 
    deleteManufacturerPart 
} from './parts/manufacturerPart';

import type { SupplierPart } from './parts/supplierPart';
import { 
    createSupplierPart, 
    getSupplierPartById, 
    getSupplierPartsByPartVersion,
    updateSupplierPart, 
    deleteSupplierPart 
} from './parts/supplierPart';

import { 
    createPartRevision, 
    getPartRevisionById, 
    getPartRevisionsByPartVersion,
    updatePartRevision
} from './parts/partRevision';

import type { PartFamily, PartFamilyLink } from './parts/partFamily';
import { 
    createPartFamily,
    getPartFamily,
    updatePartFamily,
    deletePartFamily,
    addPartToFamily,
    removePartFromFamily,
    getPartFamiliesForPart
} from './parts/partFamily';

// Add type definitions for validation input
interface ValidationInput {
    type: string;
    status: string;
    date?: string | Date;
    result?: JsonValue;
    notes?: string;
}

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
 * @returns Array of objects containing part and currentVersion data
 */
export async function listParts(): Promise<Array<{ part: Part; currentVersion: PartVersion }>> {
	try {
		console.log('[listParts] Retrieving all parts');
		
		// Get all parts with their current versions
		const result = await sql`
		SELECT 
			p.part_id,
			p.creator_id,
			p.global_part_number,
			p.status_in_bom,
			p.lifecycle_status,
			p.is_public,
			p.created_at,
			p.updated_by,
			p.updated_at,
			p.current_version_id,
			
			pv.part_version_id,
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
		JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
		ORDER BY p.created_at DESC
		`;

		if (result.length === 0) {
			console.log('[listParts] No parts found');
			return [];
		}
		
		console.log(`[listParts] Found ${result.length} parts`);
		
		// Process results using the normalize functions for consistent data handling
		const parts = result.map((row: any) => {
			// Normalize the data for type safety and consistency
			const normalizedPart = normalizePart(row);
			const normalizedVersion = normalizePartVersion(row);
			
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
		// Don't throw - return empty array to prevent app crashes
		return [];
	}
}

/**
 * Get a single part with its current version
 * @param partId The ID of the part to retrieve
 * @returns Object containing part and currentVersion data
 * @throws Error if part not found
 */
export async function getPartWithCurrentVersion(
	partId: string
): Promise<{ part: Part; currentVersion: PartVersion }> {
	try {
		// Validate partId parameter
		if (!partId || partId === 'undefined' || partId === 'null' || partId.trim() === '') {
			console.error(`[getPartWithCurrentVersion] Invalid part ID: '${partId}'`);
			throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
		}

		console.log(`[getPartWithCurrentVersion] Retrieving part with ID: ${partId}`);
		
		// Get part with current version data
		const result = await sql`
		SELECT 
			-- Part fields
			p.part_id,
			p.creator_id,
			p.global_part_number,
			p.status_in_bom,
			p.lifecycle_status,
			p.is_public,
			p.created_at,
			p.updated_by,
			p.updated_at,
			p.current_version_id,
			
			-- PartVersion fields
			pv.part_version_id,
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
			
			-- Status and metadata
			pv.version_status,
			pv.released_at,
			pv.created_by,
			pv.created_at,
			pv.updated_by,
			pv.updated_at
		FROM "Part" p
		JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
		WHERE p.part_id = ${partId}
		`;

		if (result.length === 0) {
			throw new Error(`${PART_ERRORS.NOT_FOUND}: Part not found with ID: ${partId}`);
		}
		
		const row = result[0];
		
		// Normalize database row data using our helper functions
		const normalizedPart = normalizePart(row);
		const normalizedVersion = normalizePartVersion(row);
		
		// Map to API response format
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
			
			// Text descriptions
			short_description: normalizedVersion.short_description || undefined,
			functional_description: normalizedVersion.functional_description || undefined,
			long_description: normalizedVersion.long_description || undefined,
			revision_notes: normalizedVersion.revision_notes || undefined,
			
			// JSONB fields
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
			released_at: normalizedVersion.released_at || undefined,
			created_by: normalizedVersion.created_by,
			created_at: normalizedVersion.created_at,
			updated_by: normalizedVersion.updated_by || undefined,
			updated_at: normalizedVersion.updated_at
		};
		
		// Load relationship data (categories, manufacturers, etc.) if needed
		await loadPartRelationships(part, currentVersion);
		
		return { part, currentVersion };
	} catch (error) {
		console.error(`[getPartWithCurrentVersion] Error retrieving part ${partId}:`, error);
		throw error;
	}
}

/**
 * Helper function to load relationship data for a part
 * @param part The part object
 * @param currentVersion The current version object
 */
async function loadPartRelationships(part: Part, currentVersion: PartVersion): Promise<void> {
	try {
		const extendedVersion = currentVersion as PartVersion & {
			categoryIds?: string;
			categories?: Array<{id: string; name: string}>;
			manufacturerParts?: Array<{id: string; manufacturerId: string; manufacturerName: string; partNumber: string}>;
		};
		
		// Initialize empty relationship data
		extendedVersion.categoryIds = '';
		extendedVersion.categories = [];
		extendedVersion.manufacturerParts = [];
		
		// Check for categories table
		const categoryTableCheck = await sql`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' AND table_name = 'Category'
			) as exists
		`;
		
		if (categoryTableCheck[0]?.exists) {
			await loadCategoriesForPart(currentVersion.part_version_id, extendedVersion);
		}
		
		// Check for manufacturers table
		const mfgTableCheck = await sql`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' AND table_name = 'ManufacturerPart'
			) as exists
		`;
		
		if (mfgTableCheck[0]?.exists) {
			await loadManufacturersForPart(currentVersion.part_version_id, extendedVersion);
		}
		
		console.log(`[loadPartRelationships] Loaded relationship data: categories=${extendedVersion.categories.length}, manufacturers=${extendedVersion.manufacturerParts.length}`);
	} catch (relationErr) {
		// Don't let relationship errors break the entire part retrieval
		console.error(`[loadPartRelationships] Could not load relationship data:`, relationErr);
	}
}

/**
 * Helper function to load categories for a part
 * @param partVersionId The part version ID
 * @param extendedVersion The extended version object to populate
 */
async function loadCategoriesForPart(
	partVersionId: string, 
	extendedVersion: PartVersion & {categoryIds?: string; categories?: Array<{id: string; name: string}>}
): Promise<void> {
	try {
		// Check if we should use PartCategory or PartVersionCategory
		const partCategoryTableCheck = await sql`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' AND table_name = 'PartCategory'
			) as exists
		`;
		
		const hasPartCategoryTable = partCategoryTableCheck[0]?.exists;
		
		let categoriesResult: Array<{category_id: string; category_name: string}> = [];
		
		if (hasPartCategoryTable) {
			// Try with PartCategory table
			categoriesResult = await sql`
				SELECT 
					pc.category_id::TEXT AS category_id,
					c.category_name::TEXT AS category_name
				FROM "PartCategory" pc
				JOIN "Category" c ON pc.category_id = c.category_id
				WHERE pc.part_id = ${partVersionId}
			`;
		} else {
			// Try with PartVersionCategory
			categoriesResult = await sql`
				SELECT 
					pvc.category_id::TEXT AS category_id,
					c.category_name::TEXT AS category_name
				FROM "PartVersionCategory" pvc
				JOIN "Category" c ON pvc.category_id = c.category_id
				WHERE pvc.part_version_id = ${partVersionId}
			`;
		}
		
		// Map category IDs to string format for the form
		if (categoriesResult && categoriesResult.length > 0) {
			extendedVersion.categoryIds = categoriesResult.map(cat => cat.category_id).join(',');
			
			// Add category data to the extended version
			extendedVersion.categories = categoriesResult.map(cat => ({
				id: cat.category_id,
				name: cat.category_name
			}));
		}
	} catch (err) {
		console.error(`[loadCategoriesForPart] Error loading categories:`, err);
	}
}

/**
 * Helper function to load manufacturers for a part
 * @param partVersionId The part version ID
 * @param extendedVersion The extended version object to populate
 */
async function loadManufacturersForPart(
	partVersionId: string, 
	extendedVersion: PartVersion & {manufacturerParts?: Array<{id: string; manufacturerId: string; manufacturerName: string; partNumber: string}>}
): Promise<void> {
	try {
		const manufacturersResult = await sql`
			SELECT 
				mp.manufacturer_part_id::TEXT AS id, 
				mp.manufacturer_id::TEXT AS manufacturer_id,
				m.manufacturer_name::TEXT AS manufacturer_name,
				mp.manufacturer_part_number::TEXT AS part_number
			FROM "ManufacturerPart" mp
			JOIN "Manufacturer" m ON mp.manufacturer_id = m.manufacturer_id
			WHERE mp.part_version_id = ${partVersionId}
		`;
		
		if (manufacturersResult && manufacturersResult.length > 0) {
			extendedVersion.manufacturerParts = manufacturersResult.map(mp => ({
				id: mp.id,
				manufacturerId: mp.manufacturer_id,
				manufacturerName: mp.manufacturer_name,
				partNumber: mp.part_number
			}));
		}
	} catch (err) {
		console.error(`[loadManufacturersForPart] Error loading manufacturers:`, err);
	}
}

// Import the createPartSchema for type inference
import { createPartSchema } from '$lib/schema/schema';
import type { PartFormData as BasePartFormData } from '$lib/types/formTypes';
import type { z } from 'zod';

// Create an extended version of PartFormData that includes all fields from createPartSchema
type ExtendedPartFormData = BasePartFormData & z.infer<typeof createPartSchema>;

/**
 * Create a new part with its initial version
 * @param input Form data containing part and version details
 * @param userId User ID of the creator
 * @returns The created part with its initial version
 * @throws Error if input validation fails or database operation fails
 */
export async function createPart(input: ExtendedPartFormData, userId: string) {
    try {
        // Validate input
        if (!input || !userId) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Missing required input or userId for part creation`);
        }

        console.log('[createPart] Creating new part with input data');
        
        // Generate UUIDs for part and version
        const partId = crypto.randomUUID();
        const versionId = crypto.randomUUID();
        
        // Begin a transaction for atomic operations
        const result = await sql.begin(async (transaction) => {
            console.log('[createPart] Starting transaction');
            
            // 1. Insert the part record
            await insertPartRecord(transaction, partId, userId, input);
            
            // 2. Insert the part version record
            await insertPartVersionRecord(transaction, versionId, partId, userId, input);
            
            // 3. Update the part's current version
            await transaction`
            UPDATE "Part" 
            SET current_version_id = ${versionId} 
            WHERE part_id = ${partId}
            `;
            console.log('[createPart] Current version updated successfully');

            // 4. Add related data
            await addPartRelationships(transaction, partId, versionId, userId, input);
            
            // 5. Return the created part with its version
            const createdPart = await transaction`
                SELECT p.*, pv.*
                FROM "Part" p
                LEFT JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
                WHERE p.part_id = ${partId}
            `;

            return normalizePart(createdPart[0]);
        });

        console.log('[createPart] ✅ Successfully created part with all related data');
        return result;
    } catch (error) {
        console.error('[createPart] Error creating part:', error);
        throw error;
    }
}

/**
 * Helper function to insert the part record
 */
async function insertPartRecord(transaction: any, partId: string, userId: string, input: ExtendedPartFormData) {
    await transaction`
    INSERT INTO "Part" (
        part_id, 
        creator_id, 
        global_part_number,
        status_in_bom, 
        lifecycle_status, 
        is_public,
        created_at,
        updated_at
    ) VALUES (
        ${partId}, 
        ${userId}, 
        ${input.global_part_number || null}, 
        ${input.status_in_bom}::part_status_enum, 
        ${input.version_status || LifecycleStatusEnum.DRAFT}::lifecycle_status_enum,
        ${input.is_public !== undefined ? input.is_public : true},
        NOW(),
        NOW()
    )
    `;
    console.log('[createPart] Part record inserted successfully');
}

/**
 * Helper function to insert the part version record
 */
async function insertPartVersionRecord(transaction: any, versionId: string, partId: string, userId: string, input: ExtendedPartFormData) {
    // Process JSON fields safely
    const processJsonField = (fieldValue: any, fieldName: string) => {
        if (fieldValue === undefined) {
            return sql.json({});
        }
        
        if (typeof fieldValue === 'string') {
            try {
                if (fieldValue.trim().startsWith('{') || fieldValue.trim().startsWith('[')) {
                    return sql.json(JSON.parse(fieldValue));
                } else {
                    return sql.json({value: fieldValue});
                }
            } catch (e) {
                console.log(`[createPart] Error parsing ${fieldName}, using as raw value:`, e);
                return sql.json({value: fieldValue});
            }
        } else if (typeof fieldValue === 'object' && fieldValue !== null) {
            return sql.json(fieldValue);
        } else if (fieldValue === null) {
            return sql.json({});
        } else {
            return sql.json({value: fieldValue});
        }
    };
    
    // Process numeric fields with proper type conversion
    const processNumericField = (value: any): number | null => {
        if (value === undefined) return null;
        if (value === null) return null;
        if (value === '') return null;
        
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    };

    // Insert the part version with all details
    await transaction`
    INSERT INTO "PartVersion" (
        part_version_id, 
        part_id, 
        part_version, 
        part_name,
        short_description,
        long_description,
        functional_description,
        technical_specifications,
        properties,
        electrical_properties,
        mechanical_properties,
        thermal_properties,
        part_weight,
        weight_unit,
        dimensions,
        dimensions_unit,
        material_composition,
        environmental_data,
        voltage_rating_min,
        voltage_rating_max,
        current_rating_min,
        current_rating_max,
        power_rating_max,
        tolerance,
        tolerance_unit,
        package_type,
        mounting_type,
        pin_count,
        operating_temperature_min,
        operating_temperature_max,
        storage_temperature_min,
        storage_temperature_max,
        temperature_unit,
        revision_notes,
        version_status,
        released_at,
        created_by,
        created_at,
        updated_by,
        updated_at
    ) VALUES (
        ${versionId}, 
        ${partId}, 
        ${input.part_version || '0.1.0'}, 
        ${input.part_name}, 
        ${input.short_description || null},
        ${processJsonField(input.long_description, 'long_description')},
        ${input.functional_description || null},
        ${processJsonField(input.technical_specifications, 'technical_specifications')},
        ${processJsonField(input.properties, 'properties')},
        ${processJsonField(input.electrical_properties, 'electrical_properties')},
        ${processJsonField(input.mechanical_properties, 'mechanical_properties')},
        ${processJsonField(input.thermal_properties, 'thermal_properties')},
        ${processNumericField(input.part_weight)},
        ${input.weight_unit ? input.weight_unit.toLowerCase() : null}::weight_unit_enum,
        ${processJsonField(input.dimensions, 'dimensions')},
        ${input.dimensions_unit ? input.dimensions_unit.toLowerCase() : null}::dimension_unit_enum,
        ${processJsonField(input.material_composition, 'material_composition')},
        ${processJsonField(input.environmental_data, 'environmental_data')},
        ${processNumericField(input.voltage_rating_min)},
        ${processNumericField(input.voltage_rating_max)},
        ${processNumericField(input.current_rating_min)},
        ${processNumericField(input.current_rating_max)},
        ${processNumericField(input.power_rating_max)},
        ${processNumericField(input.tolerance)},
        ${input.tolerance_unit || null},
        ${input.package_type ? input.package_type.toUpperCase() : null}::package_type_enum,
        ${input.mounting_type ? input.mounting_type.toUpperCase() : null}::mounting_type_enum,
        ${processNumericField(input.pin_count)},
        ${processNumericField(input.operating_temperature_min)},
        ${processNumericField(input.operating_temperature_max)},
        ${processNumericField(input.storage_temperature_min)},
        ${processNumericField(input.storage_temperature_max)},
        ${input.temperature_unit ? input.temperature_unit.toUpperCase() : null}::temperature_unit_enum,
        ${input.revision_notes || null},
        ${input.version_status || LifecycleStatusEnum.DRAFT}::lifecycle_status_enum,
        ${input.released_at ? new Date(input.released_at) : null},
        ${userId},
        NOW(),
        ${userId},
        NOW()
    )
    `;
    console.log('[createPart] PartVersion inserted successfully');
}

/**
 * Helper function to add part relationships
 */
async function addPartRelationships(transaction: any, partId: string, versionId: string, userId: string, input: ExtendedPartFormData) {
    // 1. Add categories if provided
    if (input.category_ids) {
        const categoryIds = input.category_ids.split(',').filter((id: string) => id.trim() !== '');
        for (const categoryId of categoryIds) {
            await addCategoryToPartVersion(versionId, categoryId.trim());
        }
        console.log(`[createPart] Added ${categoryIds.length} categories`);
    }

    // 2. Add manufacturer parts if provided
    const manufacturerParts = parseComplexField(input.manufacturer_parts);
    if (Array.isArray(manufacturerParts) && manufacturerParts.length > 0) {
        try {
            for (const mfgPart of manufacturerParts) {
                await createManufacturerPart(
                    versionId,
                    mfgPart.manufacturer_id,
                    mfgPart.part_number || mfgPart.manufacturer_part_number || '',
                    userId,
                    mfgPart.manufacturer_name || '',
                    mfgPart.description || ''
                );
            }
            console.log(`[createPart] Added ${manufacturerParts.length} manufacturer parts`);
        } catch (e) {
            console.error('[createPart] Error processing manufacturer parts:', e);
        }
    }

    // 3. Add supplier parts if provided 
    const supplierParts = parseComplexField(input.supplier_parts);
    if (Array.isArray(supplierParts) && supplierParts.length > 0) {
        try {
            for (const supPart of supplierParts) {
                await createSupplierPart(
                    versionId,
                    supPart.supplier_id,
                    supPart.part_number || supPart.supplier_part_number || '',
                    userId,
                    supPart.supplier_name || '',
                    supPart.manufacturer_part_id || '',
                    supPart.description || ''
                );
            }
            console.log(`[createPart] Added ${supplierParts.length} supplier parts`);
        } catch (e) {
            console.error('[createPart] Error processing supplier parts:', e);
        }
    }

    // 4. Add attachments if provided
    const attachments = parseComplexField(input.attachments);
    if (Array.isArray(attachments) && attachments.length > 0) {
        try {
            for (const attachment of attachments) {
                await createPartAttachment(
                    versionId,
                    attachment.file_name || 'unnamed_file',
                    attachment.file_size_bytes || 0,
                    attachment.file_type || 'application/octet-stream',
                    attachment.file_url || '',
                    userId,
                    attachment.description || attachment.attachment_description || '',
                    !!attachment.is_primary
                );
            }
            console.log(`[createPart] Added ${attachments.length} attachments`);
        } catch (e) {
            console.error('[createPart] Error processing attachments:', e);
        }
    }

    // 5. Add representations if provided
    const representations = parseComplexField(input.representations);
    if (Array.isArray(representations) && representations.length > 0) {
        try {
            for (const rep of representations) {
                await createPartRepresentation(
                    versionId,
                    rep.representation_type || 'Generic',
                    rep.file_name || 'representation',
                    rep.format || 'unknown',
                    rep.file_url || '',
                    rep.file_size_bytes || 0,
                    userId,
                    rep.metadata ? (typeof rep.metadata === 'string' ? rep.metadata : JSON.stringify(rep.metadata)) : '',
                    rep.additional_data ? (typeof rep.additional_data === 'string' ? rep.additional_data : JSON.stringify(rep.additional_data)) : '',
                    !!rep.is_primary
                );
            }
            console.log(`[createPart] Added ${representations.length} representations`);
        } catch (e) {
            console.error('[createPart] Error processing representations:', e);
        }
    }

    // Add more relationship handling as needed...
    await addComplianceInfo(versionId, input);
    await addValidationRecords(versionId, userId, input);
    await addTagsAndCustomFields(versionId, userId, input);
    await addPartFamiliesAndGroups(transaction, partId, userId, input);
    await addPartStructure(partId, userId, input);
    await addPartRevisions(versionId, userId, input);
}

/**
 * Helper function to parse complex fields that can be either string or object
 */
function parseComplexField(field: any): any[] {
    if (!field) return [];
    
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch (e) {
            console.error('[parseComplexField] Error parsing JSON string:', e);
            return [];
        }
    }
    
    if (Array.isArray(field)) {
        return field;
    }
    
    return [];
}

/**
 * Helper function to add compliance information
 */
async function addComplianceInfo(versionId: string, input: ExtendedPartFormData) {
    const complianceInfo = parseComplexField(input.compliance_info);
    if (complianceInfo.length > 0) {
        try {
            for (const comp of complianceInfo) {
                await createPartCompliance(
                    versionId,
                    comp.compliance_type || ComplianceTypeEnum.ROHS,
                    comp.certificate_url || '',
                    comp.certified_at ? new Date(comp.certified_at) : new Date(),
                    comp.expires_at ? new Date(comp.expires_at) : null,
                    comp.notes || ''
                );
            }
            console.log(`[createPart] Added ${complianceInfo.length} compliance records`);
        } catch (e) {
            console.error('[createPart] Error processing compliance info:', e);
        }
    }
}

/**
 * Helper function to add validation records
 */
async function addValidationRecords(versionId: string, userId: string, input: ExtendedPartFormData) {
    const validationRecords = parseComplexField(input.validation_records);
    if (validationRecords.length > 0) {
        try {
            for (const validation of validationRecords) {
                await createPartValidation(
                    versionId,
                    'GENERAL', // Default type
                    'PENDING', // Default status
                    userId,
                    'INSPECTION', // Default method
                    '', // test_procedure
                    validation.test_results || '',
                    [], // issuesFound (empty array instead of empty string)
                    [], // correctiveActions (empty array instead of empty string)
                    validation.certification_info || '',
                    validation.notes || '',
                    validation.is_compliant !== undefined ? validation.is_compliant : false
                );
            }
            console.log(`[createPart] Added ${validationRecords.length} validation records`);
        } catch (e) {
            console.error('[createPart] Error processing validation records:', e);
        }
    }
}

/**
 * Helper function to add tags and custom fields
 */
async function addTagsAndCustomFields(versionId: string, userId: string, input: ExtendedPartFormData) {
    // Add tags if provided
    if (input.tag_ids) {
        const tags = input.tag_ids.split(',').filter((tag: string) => tag.trim() !== '');
        for (const tag of tags) {
            try {
                // First ensure the tag exists
                await sql`
                INSERT INTO "Tag" (tag_name)
                VALUES (${tag.trim()})
                ON CONFLICT (tag_name) DO NOTHING
                `;

                // Then create the tag association
                await createPartVersionTag(
                    versionId,
                    tag.trim(),
                    userId,
                    '', // tagValue
                    '', // tagCategory
                    '' // tagColor
                );
            } catch (e) {
                console.error(`[createPart] Error adding tag ${tag}:`, e);
            }
        }
        console.log(`[createPart] Added ${tags.length} tags`);
    }

    // Add custom fields if provided
    if (input.custom_fields) {
        try {
            // Convert string to object if needed
            const customFields = typeof input.custom_fields === 'string'
                ? JSON.parse(input.custom_fields)
                : input.custom_fields;
                
            let fieldCount = 0;
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Use the imported module function
                await createPartCustomField(
                    versionId,
                    fieldName,
                    fieldValue as JsonValue, 
                    typeof fieldValue,
                    userId,
                    false, // required
                    '', // fieldGroup
                    0, // displayOrder
                    '', // validationRegex
                    '', // validationMessage
                    [] // options (empty array instead of empty string)
                );
                fieldCount++;
            }
            console.log(`[createPart] Added ${fieldCount} custom fields`);
        } catch (e) {
            console.error('[createPart] Error processing custom fields:', e);
        }
    }
}

/**
 * Helper function to add part families and groups
 */
async function addPartFamiliesAndGroups(transaction: any, partId: string, userId: string, input: ExtendedPartFormData) {
    // Add part family links if provided
    const partFamilies = parseComplexField(input.part_families);
    if (partFamilies.length > 0) {
        try {
            for (const family of partFamilies) {
                await addPartToFamily(partId, family.family_id, userId);
            }
            console.log(`[createPart] Added part to ${partFamilies.length} families (from part_families)`);
        } catch (e) {
            console.error('[createPart] Error processing part families:', e);
        }
    } else if (input.family_ids) {
        try {
            const familyIds = input.family_ids.split(',').filter((id: string) => id.trim() !== '');
            for (const familyId of familyIds) {
                await addPartToFamily(partId, familyId.trim(), userId);
            }
            console.log(`[createPart] Added part to ${familyIds.length} families (from family_ids)`);
        } catch (e) {
            console.error('[createPart] Error processing family_ids:', e);
        }
    }

    // Add part group links if provided
    const partGroups = parseComplexField(input.part_groups);
    if (partGroups.length > 0) {
        try {
            for (const group of partGroups) {
                const linkId = crypto.randomUUID();
                await transaction`
                INSERT INTO "PartGroupLink" (
                    part_group_link_id,
                    part_id,
                    group_id,
                    created_by,
                    position_index,
                    notes
                ) VALUES (
                    ${linkId},
                    ${partId},
                    ${group.group_id},
                    ${userId},
                    ${group.position_index || 0},
                    ${group.notes || ''}
                )
                `;
            }
            console.log(`[createPart] Added part to ${partGroups.length} groups (from part_groups)`);
        } catch (e) {
            console.error('[createPart] Error processing part groups:', e);
        }
    } else if (input.group_ids) {
        try {
            const groupIds = input.group_ids.split(',').filter((id: string) => id.trim() !== '');
            for (const groupId of groupIds) {
                const linkId = crypto.randomUUID();
                await transaction`
                INSERT INTO "PartGroupLink" (
                    part_group_link_id,
                    part_id,
                    group_id,
                    created_by
                ) VALUES (
                    ${linkId},
                    ${partId},
                    ${groupId.trim()},
                    ${userId}
                )
                `;
            }
            console.log(`[createPart] Added part to ${groupIds.length} groups (from group_ids)`);
        } catch (e) {
            console.error('[createPart] Error processing group_ids:', e);
        }
    }
}

/**
 * Helper function to add part structure
 */
async function addPartStructure(partId: string, userId: string, input: ExtendedPartFormData) {
    const structure = parseComplexField(input.structure);
    if (structure.length > 0) {
        try {
            for (const item of structure) {
                const childPartId = item.child_part_id || '';
                if (childPartId) {
                    await createPartStructure(
                        partId,
                        childPartId,
                        item.relation_type || StructuralRelationTypeEnum.COMPONENT,
                        item.quantity || 1,
                        userId,
                        item.notes || ''
                    );
                }
            }
            console.log(`[createPart] Added ${structure.length} structure relationships`);
        } catch (e) {
            console.error('[createPart] Error processing part structure:', e);
        }
    }
}

/**
 * Helper function to add part revisions
 */
async function addPartRevisions(versionId: string, userId: string, input: ExtendedPartFormData) {
    const revisionRecords = parseComplexField(input.revision_records);
    if (revisionRecords.length > 0) {
        try {
            for (const revision of revisionRecords) {
                await createPartRevision(
                    versionId,
                    '1.0', // Default revision number for initial creation
                    userId,
                    'INITIAL',
                    revision.change_description || 'Initial creation',
                    '', // changeJustification
                    typeof revision.changed_fields === 'string' 
                        ? JSON.parse(revision.changed_fields) 
                        : revision.changed_fields || [],
                    {}, // previousValues
                    {}, // newValues
                    'APPROVED', // Default for initial creation
                    userId,
                    new Date(),
                    '' // comments
                );
            }
            console.log(`[createPart] Added ${revisionRecords.length} revision records`);
        } catch (e) {
            console.error('[createPart] Error processing revision records:', e);
        }
    } else {
        // Add a default initial revision
        await createPartRevision(
            versionId,
            '1.0', // Default revision number for initial creation
            userId,
            'INITIAL',
            'Initial part creation',
            '', // changeJustification
            [], // changed_fields - use empty array instead of empty object
            {}, // previousValues
            {}, // newValues
            'APPROVED', // Default for initial creation
            userId,
            new Date(),
            '' // comments
        );
        console.log(`[createPart] Added default initial revision record`);
    }
}

/**
 * Extended PartVersion interface for updates
 */
interface ExtendedPartVersion extends PartVersion {
    categories?: Array<{ id?: string; category_id?: string }>;
}

/**
 * Update a part version with all related data
 * @param data The partial part version data with required part_version_id
 */
export async function updatePartVersion(
	data: Partial<ExtendedPartVersion> & { part_version_id: string }
): Promise<void> {
	try {
		console.log(`[updatePartVersion] Updating part version ${data.part_version_id} with data:`, data);
		
		// Use begin transaction for atomic updates
		await sql.begin(async (transaction) => {
			// 1. Lock the row for update to prevent concurrent modifications
			const lockResult = await transaction`
				SELECT part_version_id FROM "PartVersion"
				WHERE part_version_id = ${data.part_version_id}
				FOR UPDATE
			`;
			
			if (lockResult.length === 0) {
				throw new Error(`Part version not found with ID: ${data.part_version_id}`);
			}
			
			// 2. Process JSON fields similar to createPart
			const processJsonField = (fieldValue: any, fieldName: string) => {
				if (fieldValue === undefined || fieldValue === null) {
					return null;
				}
				
				if (typeof fieldValue === 'string') {
					try {
						if (fieldValue.trim().startsWith('{') || fieldValue.trim().startsWith('[')) {
							const parsed = JSON.parse(fieldValue);
							return sql.json(parsed);
						} else {
							return sql.json({value: fieldValue, raw: true});
						}
					} catch (e) {
						console.log(`[updatePartVersion] Error parsing ${fieldName}, preserving as raw:`, e);
						return sql.json({value: fieldValue, raw: true});
					}
				} else if (typeof fieldValue === 'object') {
					return sql.json(fieldValue);
				} else {
					return sql.json({value: fieldValue, type: typeof fieldValue});
				}
			};
			
			// 3. Prepare dynamic field updates
			const updateFields: string[] = [];
			const updateValues: Record<string, any> = {};
			
			// Text fields
			if (data.part_name !== undefined) {
			    updateFields.push('part_name = ${partName}');
			    updateValues.partName = data.part_name;
			}
			if (data.part_version !== undefined) {
			    updateFields.push('part_version = ${partVersion}');
			    updateValues.partVersion = data.part_version;
			}
			if (data.short_description !== undefined) {
			    updateFields.push('short_description = ${shortDescription}');
			    updateValues.shortDescription = data.short_description;
			}
			if (data.functional_description !== undefined) {
			    updateFields.push('functional_description = ${functionalDescription}');
			    updateValues.functionalDescription = data.functional_description;
			}
			if (data.revision_notes !== undefined) {
			    updateFields.push('revision_notes = ${revisionNotes}');
			    updateValues.revisionNotes = data.revision_notes;
			}
			
			// Numeric fields
			if (data.part_weight !== undefined) {
			    updateFields.push('part_weight = ${partWeight}');
			    updateValues.partWeight = data.part_weight;
			}
			if (data.pin_count !== undefined) {
			    updateFields.push('pin_count = ${pinCount}');
			    updateValues.pinCount = data.pin_count;
			}
			
			// Enum fields with type casting
			if (data.version_status !== undefined) {
			    updateFields.push('version_status = ${versionStatus}::text::lifecycle_status_enum');
			    updateValues.versionStatus = data.version_status;
			}
			
			// JSON fields with proper processing
			const jsonFields: Record<string, any> = {
				long_description: data.long_description,
				technical_specifications: data.technical_specifications,
				properties: data.properties,
				electrical_properties: data.electrical_properties,
				mechanical_properties: data.mechanical_properties,
				thermal_properties: data.thermal_properties,
				material_composition: data.material_composition,
				environmental_data: data.environmental_data,
				dimensions: data.dimensions
			};
			
			// Process each JSON field with an explicit paramName
			for (const [key, value] of Object.entries(jsonFields)) {
				if (value !== undefined) {
					const paramName = `json_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
					updateFields.push(`${key} = ${paramName}`);
					updateValues[paramName] = processJsonField(value, key);
				}
			}
			
			// Metadata
			if (data.updated_by !== undefined) {
			    updateFields.push('updated_by = ${updatedBy}');
			    updateValues.updatedBy = data.updated_by;
			}
			updateFields.push('updated_at = NOW()');
			
			// 4. Execute the update if there are fields to update
			if (updateFields.length > 0) {
				// Instead of transaction.unsafe, use multiple direct SET statements
				// which is safer and prevents SQL injection
				console.log(`[updatePartVersion] Updating ${updateFields.length} fields for part version ${data.part_version_id}`);
				
				// Update each field individually with SQL template literals
				for (const [key, value] of Object.entries(updateValues)) {
					// Create a parameterized SET statement for each field
					let fieldName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
					if (fieldName.startsWith('json_')) {
						// Extract the original field name from json_field_name format
						fieldName = fieldName.substring(5);
					}
					
					// Special handling for enums
					if (key === 'versionStatus') {
						await transaction`
							UPDATE "PartVersion" 
							SET version_status = ${value}::text::lifecycle_status_enum
							WHERE part_version_id = ${data.part_version_id}
						`;
					} else {
						// Standard field update
						// Use template literals directly instead of unsafe
						if (typeof value === 'object' && value !== null && 'toPostgres' in value) {
							// For JSON and other special types that have a toPostgres method
							await transaction`
								UPDATE "PartVersion" 
								SET "${fieldName}" = ${value}
								WHERE part_version_id = ${data.part_version_id}
							`;
						} else {
							// For normal scalar values
							await transaction`
								UPDATE "PartVersion" 
								SET "${fieldName}" = ${value}
								WHERE part_version_id = ${data.part_version_id}
							`;
						}
					}
				}
				
				// Always update the timestamp
				await transaction`
					UPDATE "PartVersion" 
					SET updated_at = NOW()
					WHERE part_version_id = ${data.part_version_id}
				`;
				
				console.log(`[updatePartVersion] Updated ${updateFields.length} fields for part version ${data.part_version_id}`);
			} else {
				console.log('[updatePartVersion] No fields to update');
			}
			
			// 5. Update related data if provided
			
			// Update categories if provided
			if (data.categories && Array.isArray(data.categories)) {
				// First, remove all existing categories
				await transaction`
					DELETE FROM "PartVersionCategory" 
					WHERE part_version_id = ${data.part_version_id}
				`;
				
				// Then add the new ones
				for (const category of data.categories) {
					const categoryId = category.id || category.category_id;
					if (categoryId) {
						await transaction`
							INSERT INTO "PartVersionCategory" (part_version_id, category_id) 
							VALUES (${data.part_version_id}, ${categoryId})
						`;
					}
				}
			}
			
			// TODO: Add similar handling for attachments, representations, etc.
			// This would follow the same pattern as in createPart
		});
		
		console.log(`[updatePartVersion] Successfully updated part version ${data.part_version_id}`);
	} catch (error) {
		console.error('[updatePartVersion] Error updating part version:', error);
		throw error;
	}
}

/**
 * Delete a part and all its related data (cascades to versions)
 * 
 * @param partId The ID of the part to delete
 * @throws Error if part not found or cannot be deleted
 */
export async function deletePart(partId: string): Promise<void> {
	try {
		// Validate the input
		if (!partId || partId.trim() === '') {
			throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
		}
	
		console.log(`[deletePart] Deleting part with ID: ${partId}`);
		
		// Use a transaction for atomic delete operation
		await sql.begin(async (transaction) => {
			// First lock the part row to prevent concurrent modifications
			// This helps prevent the "tuple concurrently updated" error
			const lockResult = await transaction`
				SELECT part_id FROM "Part" WHERE part_id = ${partId} FOR UPDATE
			`;
			
			if (lockResult.length === 0) {
				throw new Error(`${PART_ERRORS.NOT_FOUND}: Part not found with ID: ${partId}`);
			}
			
			console.log(`[deletePart] Part ${partId} found and locked for deletion`);
			
			try {
				// Delete part structure links (to avoid foreign key constraint issues)
				await transaction`
					DELETE FROM "PartStructure" 
					WHERE parent_part_id = ${partId} OR child_part_id = ${partId}
				`;
				console.log(`[deletePart] Deleted part structure links`);
				
				// Delete the part (relies on CASCADE for versions and other related data)
				const deleteResult = await transaction`
					DELETE FROM "Part" WHERE part_id = ${partId} RETURNING part_id
				`;
				
				if (deleteResult.length === 0) {
					throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to delete part with ID: ${partId}`);
				}
				
				console.log(`[deletePart] Part ${partId} successfully deleted within transaction`);
			} catch (deleteError) {
				// Log detailed error for database problems
				console.error(`[deletePart] Database error during deletion:`, deleteError);
				throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Database error during part deletion: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
			}
		});
		
		console.log(`[deletePart] Successfully deleted part with ID: ${partId} and all related data`);
	} catch (error) {
		console.error(`[deletePart] Error deleting part ${partId}:`, error);
		// With sql.begin(), rollback happens automatically on error
		throw error;
	}
}

// ======================
// Part Version Category
// ======================
/**
 * Add a category to a part version
 * 
 * @param partVersionId The part version ID to add the category to
 * @param categoryId The category ID to add
 * @returns The created part version category relationship
 * @throws Error if the operation fails
 */
export async function addCategoryToPartVersion(partVersionId: string, categoryId: string): Promise<PartVersionCategory> {
    try {
        // Validate inputs
        if (!partVersionId || partVersionId.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part version ID`);
        }
        
        if (!categoryId || categoryId.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid category ID`);
        }
        
        console.log(`[addCategoryToPartVersion] Adding category ${categoryId} to part version ${partVersionId}`);
        
        // Insert the category association
        const result = await sql`
            INSERT INTO "PartVersionCategory" (part_version_id, category_id)
            VALUES (${partVersionId}, ${categoryId}) 
            RETURNING *
        `;
        
        if (result.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to add category ${categoryId} to part version ${partVersionId}`);
        }
        
        // Convert the result to a PartVersionCategory object
        const row = result[0];
        console.log(`[addCategoryToPartVersion] Successfully added category ${categoryId} to part version ${partVersionId}`);
        
        return rowToPartVersionCategory(row);
    } catch (error) {
        // Check for duplicate key violation
        if (error instanceof Error && error.message.includes('duplicate key')) {
            console.warn(`[addCategoryToPartVersion] Category ${categoryId} is already associated with part version ${partVersionId}`);
            
            // Return the existing association instead of failing
            const existing = await sql`
                SELECT * FROM "PartVersionCategory" 
                WHERE part_version_id = ${partVersionId} AND category_id = ${categoryId}
            `;
            
            if (existing.length > 0) {
                return rowToPartVersionCategory(existing[0]);
            }
        }
        
        console.error(`[addCategoryToPartVersion] Error adding category ${categoryId} to part version ${partVersionId}:`, error);
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Extended interface for part version input with categories
 */
interface PartVersionInput extends Partial<PartVersion> {
    id: string;
    partId: string;
    version: string;
    name: string;
    status: string;
    createdBy: string;
    categories?: Array<{id?: string; category_id?: string}> | string;
}

/**
 * Create a new version of a part
 * 
 * @param partVersion - The part version data with required fields
 * @returns Newly created part version with normalized structure
 */
export async function createPartVersion(partVersion: PartVersionInput): Promise<PartVersion> {
    try {
        console.log(`[createPartVersion] Creating version ${partVersion.version} of part ${partVersion.partId}`);

        // Validate required fields
        if (!partVersion.id || !partVersion.partId || !partVersion.name || !partVersion.version || !partVersion.status || !partVersion.createdBy) {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Missing required fields for part version creation`);
        }
        
        // Map input fields to database fields
        const versionId = partVersion.id;
        const partId = partVersion.partId;
        
        try {
            // Begin a transaction for atomic operations
            return await sql.begin(async (transaction) => {
                console.log('[createPartVersion] Starting transaction');
                
                // Process JSON fields safely
                const processJsonField = (fieldValue: any, fieldName: string) => {
                    if (fieldValue === undefined) {
                        return null;
                    }
                    
                    if (typeof fieldValue === 'string') {
                        try {
                            if (fieldValue.trim().startsWith('{') || fieldValue.trim().startsWith('[')) {
                                return sql.json(JSON.parse(fieldValue));
                            } else {
                                return sql.json({value: fieldValue});
                            }
                        } catch (e) {
                            console.log(`[createPartVersion] Error parsing ${fieldName}, using as raw value:`, e);
                            return sql.json({value: fieldValue});
                        }
                    } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                        return sql.json(fieldValue);
                    } else if (fieldValue === null) {
                        return null;
                    } else {
                        return sql.json({value: fieldValue});
                    }
                };
                
                // Process numeric fields with proper type conversion
                const processNumericField = (value: any): number | null => {
                    if (value === undefined) return null;
                    if (value === null) return null;
                    if (value === '') return null;
                    
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        return isNaN(parsed) ? null : parsed;
                    }
                    return null;
                };

                // Enforce business rules and database constraints
                console.log('[createPartVersion] Enforcing database constraints');
                
                // 1. Dimensions constraint - both or neither dimensions and unit must be present
                if (partVersion.dimensions && !partVersion.dimensions_unit) {
                    console.log('[createPartVersion] Clearing dimensions because dimensions_unit is missing');
                    partVersion.dimensions = undefined;
                } else if (!partVersion.dimensions && partVersion.dimensions_unit) {
                    console.log('[createPartVersion] Clearing dimensions_unit because dimensions is missing');
                    partVersion.dimensions_unit = undefined;
                }
                
                // 2. Weight constraint - both or neither weight and unit must be present
                if (partVersion.part_weight && !partVersion.weight_unit) {
                    console.log('[createPartVersion] Clearing part_weight because weight_unit is missing');
                    partVersion.part_weight = undefined;
                } else if (!partVersion.part_weight && partVersion.weight_unit) {
                    console.log('[createPartVersion] Clearing weight_unit because part_weight is missing');
                    partVersion.weight_unit = undefined;
                }
                
                // 3. Temperature constraint - if any temperature is present, unit must be set
                const hasAnyTemperature = [
                    partVersion.operating_temperature_min,
                    partVersion.operating_temperature_max,
                    partVersion.storage_temperature_min,
                    partVersion.storage_temperature_max
                ].some(t => t !== undefined && t !== null);
                
                if (hasAnyTemperature && !partVersion.temperature_unit) {
                    console.log('[createPartVersion] Setting default temperature unit (C) because temperature values exist');
                    partVersion.temperature_unit = TemperatureUnitEnum.C;
                } else if (!hasAnyTemperature && partVersion.temperature_unit) {
                    console.log('[createPartVersion] Clearing temperature_unit because no temperature values exist');
                    partVersion.temperature_unit = undefined;
                }
                
                // Insert the part version with all details
                const result = await transaction`
                INSERT INTO "PartVersion" (
                    part_version_id, 
                    part_id, 
                    part_version, 
                    part_name,
                    short_description,
                    long_description,
                    functional_description,
                    technical_specifications,
                    properties,
                    electrical_properties,
                    mechanical_properties,
                    thermal_properties,
                    part_weight,
                    weight_unit,
                    dimensions,
                    dimensions_unit,
                    material_composition,
                    environmental_data,
                    voltage_rating_min,
                    voltage_rating_max,
                    current_rating_min,
                    current_rating_max,
                    power_rating_max,
                    tolerance,
                    tolerance_unit,
                    package_type,
                    mounting_type,
                    pin_count,
                    operating_temperature_min,
                    operating_temperature_max,
                    storage_temperature_min,
                    storage_temperature_max,
                    temperature_unit,
                    revision_notes,
                    version_status,
                    released_at,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                ) VALUES (
                    ${versionId}, 
                    ${partId}, 
                    ${partVersion.version}, 
                    ${partVersion.name}, 
                    ${partVersion.short_description || null},
                    ${processJsonField(partVersion.long_description, 'long_description')},
                    ${partVersion.functional_description || null},
                    ${processJsonField(partVersion.technical_specifications, 'technical_specifications')},
                    ${processJsonField(partVersion.properties, 'properties')},
                    ${processJsonField(partVersion.electrical_properties, 'electrical_properties')},
                    ${processJsonField(partVersion.mechanical_properties, 'mechanical_properties')},
                    ${processJsonField(partVersion.thermal_properties, 'thermal_properties')},
                    ${processNumericField(partVersion.part_weight)},
                    ${partVersion.weight_unit ? partVersion.weight_unit.toLowerCase() : null}::weight_unit_enum,
                    ${processJsonField(partVersion.dimensions, 'dimensions')},
                    ${partVersion.dimensions_unit ? partVersion.dimensions_unit.toLowerCase() : null}::dimension_unit_enum,
                    ${processJsonField(partVersion.material_composition, 'material_composition')},
                    ${processJsonField(partVersion.environmental_data, 'environmental_data')},
                    ${processNumericField(partVersion.voltage_rating_min)},
                    ${processNumericField(partVersion.voltage_rating_max)},
                    ${processNumericField(partVersion.current_rating_min)},
                    ${processNumericField(partVersion.current_rating_max)},
                    ${processNumericField(partVersion.power_rating_max)},
                    ${processNumericField(partVersion.tolerance)},
                    ${partVersion.tolerance_unit || null},
                    ${partVersion.package_type ? String(partVersion.package_type).toUpperCase() : null}::package_type_enum,
                    ${partVersion.mounting_type ? String(partVersion.mounting_type).toUpperCase() : null}::mounting_type_enum,
                    ${processNumericField(partVersion.pin_count)},
                    ${processNumericField(partVersion.operating_temperature_min)},
                    ${processNumericField(partVersion.operating_temperature_max)},
                    ${processNumericField(partVersion.storage_temperature_min)},
                    ${processNumericField(partVersion.storage_temperature_max)},
                    ${partVersion.temperature_unit ? String(partVersion.temperature_unit).toUpperCase() : null}::temperature_unit_enum,
                    ${partVersion.revision_notes || null},
                    ${partVersion.status || LifecycleStatusEnum.DRAFT}::lifecycle_status_enum,
                    ${partVersion.released_at ? new Date(partVersion.released_at) : null},
                    ${partVersion.createdBy},
                    NOW(),
                    ${partVersion.createdBy},
                    NOW()
                ) RETURNING *
                `;
                
                if (!result || result.length === 0) {
                    throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to create part version`);
                }
                
                // Create initial revision record to track this version creation
                await createPartRevision(
                    versionId,
                    '1.0',
                    partVersion.createdBy,
                    'INITIAL',
                    'Initial version creation',
                    '',
                    [],
                    {},
                    {},
                    'APPROVED',
                    partVersion.createdBy,
                    new Date(),
                    ''
                );
                
                // Process categories if provided
                if (partVersion.categories) {
                    const categories = Array.isArray(partVersion.categories) 
                        ? partVersion.categories 
                        : (typeof partVersion.categories === 'string'
                            ? partVersion.categories.split(',')
                            : []);
                            
                    for (const category of categories) {
                        const categoryId = typeof category === 'string' ? category.trim() : category.id || category.category_id;
                        if (categoryId) {
                            await addCategoryToPartVersion(versionId, categoryId);
                        }
                    }
                }
                
                console.log(`[createPartVersion] Successfully created version ${partVersion.version} of part ${partId}`);
                const versionData = normalizePartVersion(result[0]);
                
                // Properly type the returned PartVersion object
                const finalVersion: PartVersion = {
                    part_version_id: versionData.part_version_id,
                    part_id: versionData.part_id,
                    part_version: versionData.part_version,
                    part_name: versionData.part_name,
                    short_description: versionData.short_description || undefined,
                    functional_description: versionData.functional_description || undefined,
                    long_description: versionData.long_description as JsonValue || undefined,
                    technical_specifications: versionData.technical_specifications as JsonValue || undefined,
                    properties: versionData.properties as JsonValue || undefined,
                    electrical_properties: versionData.electrical_properties as JsonValue || undefined,
                    mechanical_properties: versionData.mechanical_properties as JsonValue || undefined,
                    thermal_properties: versionData.thermal_properties as JsonValue || undefined,
                    material_composition: versionData.material_composition as JsonValue || undefined,
                    environmental_data: versionData.environmental_data as JsonValue || undefined,
                    dimensions: versionData.dimensions as unknown as Dimensions || undefined,
                    part_weight: versionData.part_weight || undefined,
                    weight_unit: versionData.weight_unit || undefined,
                    dimensions_unit: versionData.dimensions_unit || undefined,
                    voltage_rating_min: versionData.voltage_rating_min || undefined,
                    voltage_rating_max: versionData.voltage_rating_max || undefined,
                    current_rating_min: versionData.current_rating_min || undefined,
                    current_rating_max: versionData.current_rating_max || undefined,
                    power_rating_max: versionData.power_rating_max || undefined,
                    tolerance: versionData.tolerance || undefined,
                    tolerance_unit: versionData.tolerance_unit || undefined,
                    package_type: versionData.package_type || undefined,
                    mounting_type: versionData.mounting_type || undefined,
                    pin_count: versionData.pin_count || undefined,
                    operating_temperature_min: versionData.operating_temperature_min || undefined,
                    operating_temperature_max: versionData.operating_temperature_max || undefined,
                    storage_temperature_min: versionData.storage_temperature_min || undefined,
                    storage_temperature_max: versionData.storage_temperature_max || undefined,
                    temperature_unit: versionData.temperature_unit || undefined,
                    revision_notes: versionData.revision_notes || undefined,
                    version_status: versionData.version_status,
                    created_by: versionData.created_by,
                    created_at: versionData.created_at,
                    updated_by: versionData.updated_by || undefined,
                    updated_at: versionData.updated_at,
                    released_at: versionData.released_at || undefined
                };
                
                return finalVersion;
            });
        } catch (dbError) {
            console.error('[createPartVersion] Database error:', dbError);
            // Check for common database errors
            if (dbError instanceof Error) {
                if ('code' in dbError && dbError.code === '23505') {
                    throw new Error(`${PART_ERRORS.VERSION_EXISTS}: Version ${partVersion.version} already exists for part ${partVersion.partId}`);
                }
            }
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${dbError instanceof Error ? dbError.message : 'Database operation failed'}`);
        }
    } catch (error) {
        console.error('[createPartVersion] Error creating part version:', error);
        throw error;
    }
}

/**
 * Remove a category from a part version
 * 
 * @param partVersionId The part version ID to remove the category from
 * @param categoryId The category ID to remove
 * @throws Error if the operation fails
 */
export async function removeCategoryFromPartVersion(partVersionId: string, categoryId: string): Promise<void> {
    try {
        // Validate inputs
        if (!partVersionId || partVersionId.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part version ID`);
        }
        
        if (!categoryId || categoryId.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid category ID`);
        }
        
        console.log(`[removeCategoryFromPartVersion] Removing category ${categoryId} from part version ${partVersionId}`);
        
        // Delete the category association
        const result = await sql`
            DELETE FROM "PartVersionCategory" 
            WHERE part_version_id = ${partVersionId} AND category_id = ${categoryId}
            RETURNING *
        `;
        
        if (result.length === 0) {
            console.warn(`[removeCategoryFromPartVersion] Category ${categoryId} was not associated with part version ${partVersionId}`);
        } else {
            console.log(`[removeCategoryFromPartVersion] Successfully removed category ${categoryId} from part version ${partVersionId}`);
        }
    } catch (error) {
        console.error(`[removeCategoryFromPartVersion] Error removing category ${categoryId} from part version ${partVersionId}:`, error);
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all categories for a part version
 * 
 * @param partVersionId The part version ID to get categories for
 * @returns Array of part version category relationships
 * @throws Error if the operation fails
 */
export async function getCategoriesForPartVersion(partVersionId: string): Promise<PartVersionCategory[]> {
    try {
        // Validate input
        if (!partVersionId || partVersionId.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part version ID`);
        }
        
        console.log(`[getCategoriesForPartVersion] Getting categories for part version ${partVersionId}`);
        
        // Query for categories
        const result = await sql`
            SELECT * FROM "PartVersionCategory" 
            WHERE part_version_id = ${partVersionId}
            ORDER BY created_at ASC
        `;
        
        console.log(`[getCategoriesForPartVersion] Found ${result.length} categories for part version ${partVersionId}`);
        
        // Convert results to PartVersionCategory objects
        return result.map(rowToPartVersionCategory);
    } catch (error) {
        console.error(`[getCategoriesForPartVersion] Error getting categories for part version ${partVersionId}:`, error);
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get category details for a part version
 * 
 * @param partVersionId The part version ID to get category details for
 * @returns Array of category objects with id and name
 */
export async function getCategoryDetailsForPartVersion(partVersionId: string): Promise<Array<{id: string; name: string}>> {
    try {
        // Validate input
        if (!partVersionId || partVersionId.trim() === '') {
            throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part version ID`);
        }
        
        console.log(`[getCategoryDetailsForPartVersion] Getting category details for part version ${partVersionId}`);
        
        // Query for categories with their names
        const result = await sql`
            SELECT 
                pvc.category_id,
                c.category_name
            FROM "PartVersionCategory" pvc
            JOIN "Category" c ON pvc.category_id = c.category_id
            WHERE pvc.part_version_id = ${partVersionId}
            ORDER BY c.category_name ASC
        `;
        
        console.log(`[getCategoryDetailsForPartVersion] Found ${result.length} categories for part version ${partVersionId}`);
        
        // Map results to category objects
        return result.map(row => ({
            id: row.category_id,
            name: row.category_name
        }));
    } catch (error) {
        console.error(`[getCategoryDetailsForPartVersion] Error getting category details for part version ${partVersionId}:`, error);
        // Return empty array instead of throwing to make the UI more resilient
        return [];
    }
}

/**
 * Updates a part record with the provided data.
 * Uses proper validation and type transformation.
 * 
 * @param partId The ID of the part to update
 * @param data The data to update the part with
 * @returns The updated part
 * @throws Error if validation fails or part not found
 */
export async function updatePart(partId: string, data: Partial<Part>): Promise<Part> {
  try {
    console.log(`[updatePart] Updating part ${partId}`);
    
    // Validate the part ID
    if (!partId || partId.trim() === '') {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
    }
    
    // Begin transaction for atomic updates
    return await sql.begin(async (transaction) => {
      console.log('[updatePart] Transaction started');
      
      // Lock the part row to prevent concurrent updates
      const lockResult = await transaction`
        SELECT * FROM "Part" WHERE part_id = ${partId} FOR UPDATE
      `;
      
      if (lockResult.length === 0) {
        throw new Error(`${PART_ERRORS.NOT_FOUND}: Part with ID ${partId} not found`);
      }
      
      console.log('[updatePart] Part row locked for update');
      
      // Track if we've applied any updates
      let updatesApplied = false;
      
      // Process and update each field individually for better type safety and error handling
      if (data.global_part_number !== undefined) {
        await transaction`
          UPDATE "Part" 
          SET global_part_number = ${data.global_part_number || null}
          WHERE part_id = ${partId}
        `;
        updatesApplied = true;
        console.log(`[updatePart] Updated global_part_number to: ${data.global_part_number || 'null'}`);
      }
      
      if (data.status_in_bom !== undefined) {
        await transaction`
          UPDATE "Part" 
          SET status_in_bom = ${data.status_in_bom}::part_status_enum
          WHERE part_id = ${partId}
        `;
        updatesApplied = true;
        console.log(`[updatePart] Updated status_in_bom to: ${data.status_in_bom}`);
      }
      
      if (data.lifecycle_status !== undefined) {
        await transaction`
          UPDATE "Part" 
          SET lifecycle_status = ${data.lifecycle_status}::lifecycle_status_enum
          WHERE part_id = ${partId}
        `;
        updatesApplied = true;
        console.log(`[updatePart] Updated lifecycle_status to: ${data.lifecycle_status}`);
      }
      
      if (data.is_public !== undefined) {
        await transaction`
          UPDATE "Part" 
          SET is_public = ${data.is_public}
          WHERE part_id = ${partId}
        `;
        updatesApplied = true;
        console.log(`[updatePart] Updated is_public to: ${data.is_public}`);
      }
      
      if (data.current_version_id !== undefined) {
        // Verify version ID exists if provided
        if (data.current_version_id) {
          const versionCheck = await transaction`
            SELECT part_version_id FROM "PartVersion" 
            WHERE part_version_id = ${data.current_version_id}
          `;
          
          if (versionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.NOT_FOUND}: Part version with ID ${data.current_version_id} not found`);
          }
        }
        
        await transaction`
          UPDATE "Part" 
          SET current_version_id = ${data.current_version_id || null}
          WHERE part_id = ${partId}
        `;
        updatesApplied = true;
        console.log(`[updatePart] Updated current_version_id to: ${data.current_version_id || 'null'}`);
      }
      
      if (data.updated_by !== undefined) {
        await transaction`
          UPDATE "Part" 
          SET updated_by = ${data.updated_by || null}
          WHERE part_id = ${partId}
        `;
        updatesApplied = true;
      }
      
      // Always update the timestamp
      await transaction`
        UPDATE "Part" 
        SET updated_at = NOW()
        WHERE part_id = ${partId}
      `;
      
      // Add a part revision record if significant changes were made
      if (updatesApplied && data.updated_by) {
        try {
          // Get the current version ID to associate the revision with
          const currentVersionResult = await transaction`
            SELECT current_version_id FROM "Part" WHERE part_id = ${partId}
          `;
          
          const currentVersionId = currentVersionResult[0]?.current_version_id;
          
          if (currentVersionId) {
            // Create a revision record for these changes
            await createPartRevision(
              currentVersionId,
              '', // Automatically assigned
              data.updated_by,
              'UPDATE',
              'Part metadata update',
              '',
              Object.keys(data).filter(key => data[key as keyof Part] !== undefined),
              {}, // Would need original values for complete tracking
              {}, // Current values after update
              'APPROVED',
              data.updated_by,
              new Date(),
              ''
            );
            console.log(`[updatePart] Created revision record for part update`);
          }
        } catch (revisionError) {
          // Don't fail the update if revision creation fails
          console.error('[updatePart] Error creating revision record:', revisionError);
        }
      }
      
      // Fetch and return the updated part
      const result = await transaction`
        SELECT * FROM "Part" WHERE part_id = ${partId}
      `;
      
      // Process the part using our normalize function for consistent return format
      console.log('[updatePart] Part update completed successfully');
      const updatedPart = normalizePart(result[0]);
      
      // Return a properly typed Part object
      return {
        part_id: updatedPart.part_id,
        creator_id: updatedPart.creator_id || '',
        global_part_number: updatedPart.global_part_number || undefined,
        status_in_bom: updatedPart.status_in_bom,
        lifecycle_status: updatedPart.lifecycle_status,
        is_public: updatedPart.is_public,
        created_at: updatedPart.created_at,
        updated_by: updatedPart.updated_by || undefined,
        updated_at: updatedPart.updated_at,
        current_version_id: updatedPart.current_version_id || undefined
      };
    });
    } catch (error) {
     console.error('[updatePart] Error updating part:', error);
     throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
   }
}

/**
 * Update a part record with a new current version ID and status
 * Uses proper transaction handling with row locking to prevent concurrent update issues
 * 
 * @param partId The ID of the part to update
 * @param newVersionId The ID of the version to set as current
 * @param newStatus The new status to set for the part
 * @param userId Optional user ID to track who made the update
 * @throws Error if validation fails or part/version not found
 */
export async function updatePartWithStatus(
  partId: string,
  newVersionId: string,
  newStatus: PartStatusEnum,
  userId?: string
): Promise<void> {
  try {
    console.log(`[updatePartWithStatus] Updating part ${partId} with new version ${newVersionId} and status ${newStatus}`);
    
    // Validate inputs
    if (!partId || partId.trim() === '') {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
    }
    
    if (!newVersionId || newVersionId.trim() === '') {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid version ID`);
    }
    
    if (!Object.values(PartStatusEnum).includes(newStatus)) {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part status: ${newStatus}`);
    }
    
    // Begin transaction for atomic updates
    await sql.begin(async (transaction) => {
      console.log('[updatePartWithStatus] Transaction started');
      
      // First, verify the version exists
      const versionCheck = await transaction`
        SELECT part_version_id, part_id FROM "PartVersion" 
        WHERE part_version_id = ${newVersionId}
      `;
      
      if (versionCheck.length === 0) {
        throw new Error(`${PART_ERRORS.NOT_FOUND}: Part version with ID ${newVersionId} not found`);
      }
      
      // Verify the version belongs to this part
      if (versionCheck[0].part_id !== partId) {
        throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Version ${newVersionId} does not belong to part ${partId}`);
      }
      
      // Lock the part row to prevent concurrent modifications
      const lockResult = await transaction`
        SELECT part_id FROM "Part" WHERE part_id = ${partId} FOR UPDATE
      `;
      
      if (lockResult.length === 0) {
        throw new Error(`${PART_ERRORS.NOT_FOUND}: Part with ID ${partId} not found or could not be locked`);
      }
      
      console.log('[updatePartWithStatus] Part row locked for update');
      
      // Update the part with the new version ID and status
      const updateResult = await transaction`
        UPDATE "Part"
        SET 
          current_version_id = ${newVersionId},
          status_in_bom = ${newStatus}::part_status_enum,
          updated_at = NOW(),
          updated_by = ${userId || null}
        WHERE part_id = ${partId}
        RETURNING part_id
      `;
      
      if (updateResult.length === 0) {
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update part ${partId}`);
      }
      
      console.log('[updatePartWithStatus] Part updated successfully');
      
      // If we have a userId, create a revision record for this update
      if (userId) {
        try {
          await createPartRevision(
            newVersionId,
            '', // revision number - automatically assigned
            userId,
            'STATUS_CHANGE',
            `Changed part status to ${newStatus} and set as current version`,
            '', // justification
            ['status_in_bom', 'current_version_id'],
            {}, // previous values - would require an additional query to get
            { status_in_bom: newStatus, current_version_id: newVersionId },
            'APPROVED',
            userId,
            new Date(),
            ''
          );
          console.log('[updatePartWithStatus] Created revision record for status change');
        } catch (revisionError) {
          // Don't fail the update if revision creation fails
          console.error('[updatePartWithStatus] Error creating revision record:', revisionError);
        }
      }
    });
    
    console.log('[updatePartWithStatus] Transaction committed successfully');
  } catch (error) {
    console.error('[updatePartWithStatus] Error:', error);
    throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

