/**
 * Core functionality for part management
 */
import sql from '$lib/server/db';
import crypto from 'crypto';

// Import error constants
import { PART_ERRORS } from './parts/partErrors';

// Import schema-defined types for type safety
import type { PartFormData as ExtendedPartFormData } from '$lib/types/formTypes';
import type {
    JsonValue,
    PartVersion as SchemaPartVersion,
    UnifiedPart,
    ManufacturerPartDefinition,
    SupplierPartDefinition,
    AttachmentDefinition,
    RepresentationDefinition,
    ComplianceDefinition,
    PartStructureDefinition,
    StructuredDescription
} from '$lib/types/schemaTypes';
import type { UnifiedPartSchema } from '$lib/schema/unifiedPartSchema';
// Import primitive types
import type { Dimensions, MaterialComposition } from '$lib/types/primitive';

// Import enums from enums.ts
import {
    ComplianceTypeEnum,
    DimensionUnitEnum,
    LifecycleStatusEnum,
    MountingTypeEnum,
    PackageTypeEnum,
    PartStatusEnum,
    StructuralRelationTypeEnum,
    TemperatureUnitEnum,
    WeightUnitEnum
} from '$lib/types/enums';

// Define a tolerance unit enum if it doesn't exist elsewhere
enum ToleranceUnitEnum {
    PERCENT = 'percent',
    PPM = 'ppm',
    ABSOLUTE = 'absolute'
}
import type {DbJson} from '$lib/types/db-types';
// Import types from schemaTypes.ts with type-only imports
import type {
    ElectricalProperties,
    EnvironmentalData,
    MechanicalProperties,
    Part,
    PartVersion,
    ThermalProperties
} from '$lib/types/schemaTypes';

// Import the UnifiedPart schema
import { unifiedPartSchema } from '$lib/schema/unifiedPartSchema';

// Import schemas for type inference
import type { PartFormData } from '$lib/types/formTypes';

// Import utility types
import type {
    AttachmentInput,
    ComplianceInput,
    DbRow,
    DbUpdateValue,
    ValidationInput as DbValidationInput,
    JsonFieldProcessor,
    ManufacturerPartInput,
    NumericFieldProcessor,
    PostgresTransaction,
    RepresentationInput,
    SupplierPartInput
} from '$lib/types/types';

// Import database entity types

// Import part module types and functions
import {
    createPartStructure
} from './parts/partStructure';

// Utility function to safely process JSON fields for database insertion
const processJsonField = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        try {
            // Check if it's already a valid JSON string
            JSON.parse(value);
            return value;
        } catch {
            // Not a valid JSON string, so stringify it
            return JSON.stringify(value);
        }
    }
    // Objects or arrays need to be stringified
    return JSON.stringify(value);
};

// Utility function to safely process numeric fields for database insertion
const processNumericField = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    
    // Convert string to number if needed
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }
    
    // Return number directly
    if (typeof value === 'number') {
        return isNaN(value) ? null : value;
    }
    
    return null;
};

import {
    createPartCompliance
} from './parts/partCompliance';

import {
    createPartAttachment
} from './parts/partAttachment';

import {
    createPartRepresentation
} from './parts/partRepresentation';

import {
    createPartValidation
} from './parts/partValidation';

import {
    createPartVersionTag
} from './parts/partVersionTag';

import {
    createPartCustomField
} from './parts/partCustomField';

import {
    createManufacturerPart
} from './parts/manufacturerPart';

import {
    createSupplierPart
} from './parts/supplierPart';

import {
    createPartRevision,
} from './parts/partRevision';

import {
    addPartToFamily
} from './parts/partFamily';


/**
 * Type guard for StructuredDescription validation
 */
export function isValidStructuredDescription(obj: unknown): obj is StructuredDescription {
  if (!obj || typeof obj !== 'object') return false;
  
  // Simplified validation - in a real implementation, this would be more comprehensive
  // based on the exact StructuredDescription schema
  return 'sections' in obj || 'content' in obj || 'format' in obj;
}

/**
 * Type guard for EnvironmentalData validation
 */
export function isValidEnvironmentalData(obj: unknown): obj is EnvironmentalData {
  if (!obj || typeof obj !== 'object') return false;
  
  // Simplified validation - in a real implementation, this would check all required fields
  // based on the exact EnvironmentalData schema
  const envData = obj as Record<string, unknown>;
  return 'compliance' in envData || 'rohs_status' in envData || 'weee_status' in envData;
}


/**
 * Safely deserializes ElectricalProperties from database JSON
 * @param json The JSON value from the database
 * @returns Typed ElectricalProperties object or null
 */
function deserializeElectricalProperties(json: unknown | null | undefined): ElectricalProperties | null {
    if (!json) return null;
    
    // Check if it's an empty object
    if (typeof json === 'object' && json !== null && Object.keys(json).length === 0) {
        return {} as ElectricalProperties;
    }
    
    // Basic validation of expected structure
    const props = json as unknown as ElectricalProperties;
    
    // Verify it has at least some of the expected properties
    const expectedProps = [
        'resistance', 'capacitance', 'inductance', 'impedance', 'frequency', 
        'dielectric_constant', 'dielectric_strength', 'polarized'
    ];
    
    // Only check for expected properties if props is an object
    const hasExpectedProps = typeof props === 'object' && props !== null && 
        expectedProps.some(prop => prop in props);
    
    return hasExpectedProps ? props : {} as ElectricalProperties;
}

/**
 * Safely deserializes MechanicalProperties from database JSON
 * @param json The JSON value from the database
 * @returns Typed MechanicalProperties object or null
 */
function deserializeMechanicalProperties(json: unknown | null | undefined): MechanicalProperties | null {
    if (!json) return null;
    
    // Check if it's an empty object
    if (typeof json === 'object' && json !== null && Object.keys(json).length === 0) {
        return {} as MechanicalProperties;
    }
    
    // Basic validation of expected structure
    const props = json as unknown as MechanicalProperties;
    
    // Verify it has at least some of the expected properties
    const expectedProps = [
        'hardness', 'tensile_strength', 'compression_strength', 'material_density',
        'finish', 'surface_treatment', 'vibration_resistance', 'shock_resistance', 'ip_rating'
    ];
    
    // Only check for expected properties if props is an object
    const hasExpectedProps = typeof props === 'object' && props !== null && 
        expectedProps.some(prop => prop in props);
    
    return hasExpectedProps ? props : {} as MechanicalProperties;
}

/**
 * Safely deserializes ThermalProperties from database JSON
 * @param json The JSON value from the database
 * @returns Typed ThermalProperties object or null
 */
function deserializeThermalProperties(json: unknown | null | undefined): ThermalProperties | null {
    if (!json) return null;
    
    // Check if it's an empty object
    if (typeof json === 'object' && json !== null && Object.keys(json).length === 0) {
        return {} as ThermalProperties;
    }
    
    // Basic validation of expected structure
    const props = json as unknown as ThermalProperties;
    
    // Verify it has at least some of the expected properties
    const expectedProps = [
        'thermal_resistance', 'thermal_conductivity', 'specific_heat',
        'thermal_expansion', 'thermal_time_constant', 'heat_dissipation'
    ];
    
    // Only check for expected properties if props is an object
    const hasExpectedProps = typeof props === 'object' && props !== null && 
        expectedProps.some(prop => prop in props);
    
    return hasExpectedProps ? props : {} as ThermalProperties;
}

/**
 * Safely deserializes EnvironmentalData from database JSON
 * @param json The JSON value from the database
 * @returns Typed EnvironmentalData object or null
 */
function deserializeEnvironmentalData(json: unknown | null | undefined): EnvironmentalData | null {
    if (!json) return null;
    
    // Check if it's an empty object
    if (typeof json === 'object' && json !== null && Object.keys(json).length === 0) {
        return {} as EnvironmentalData;
    }
    
    // Basic validation of expected structure
    const props = json as unknown as EnvironmentalData;
    
    // Verify it has at least some of the expected properties
    const expectedProps = [
        'rohs_compliant', 'reach_compliant', 'halogen_free',
        'moisture_sensitivity_level', 'flammability_rating'
    ];
    
    // Only check for expected properties if props is an object
    const hasExpectedProps = typeof props === 'object' && props !== null && 
        expectedProps.some(prop => prop in props);
    
    return hasExpectedProps ? props : {} as EnvironmentalData;
}

/**
 * Safely deserializes Dimensions from database JSON
 * @param json The JSON value from the database
 * @returns Typed Dimensions object or null
 */
function deserializeDimensions(json: JsonValue | string | null | undefined): Dimensions | null {
    if (!json) return null;
    
    try {
        // For type safety, create an interface that matches potential dimension input
        interface DimensionLike {
            length?: number | string | null;
            width?: number | string | null;
            height?: number | string | null;
            [key: string]: JsonValue | undefined;
        }
        
        // Convert string JSON to object if needed
        let dimensions: DimensionLike;
        if (typeof json === 'string') {
            try {
                dimensions = JSON.parse(json) as DimensionLike;
            } catch (e) {
                console.warn('[deserializeDimensions] Failed to parse JSON string:', e);
                return null;
            }
        } else if (typeof json === 'object' && json !== null) {
            // Already an object, cast it to our expected shape
            dimensions = json as DimensionLike;
        } else {
            // Not a valid dimensions input
            return null;
        }
        
        // Return properly typed dimensions with number conversion
        return {
            length: dimensions.length == null ? null : Number(dimensions.length), 
            width: dimensions.width == null ? null : Number(dimensions.width),
            height: dimensions.height == null ? null : Number(dimensions.height)
        };
    } catch (error) {
        console.error('[deserializeDimensions] Error deserializing dimensions:', error);
        return null;
    }
}

/**





/**
 * Helper function to safely convert any value to PostgreSQL-compatible JSON
 * Ensures type safety when using with sql.json
 * @param value The value to convert to PostgreSQL JSON
 * @returns A value safe to use with sql.json or null
 */

// Import transaction types



/**
 * Normalizes database row data into a Part object
 * Ensures that all required properties are present and properly typed
 * @param row Database row data
 * @returns A normalized Part object
 */
function normalizePart(row: DbRow): Part {
    const partId = row.part_id?.toString() || row.id?.toString();
    
    // Create normalized Part object using the schema-based type
    const part: Part = {
        part_id: partId,
        creator_id: row.creator_id?.toString() || '',
        global_part_number: row.global_part_number?.toString() || null,
        status_in_bom: (row.status_in_bom || row.status) as PartStatusEnum,
        lifecycle_status: row.lifecycle_status as LifecycleStatusEnum,
        is_public: row.is_public === true || row.is_public === 'true',
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now()),
        updated_by: row.updated_by?.toString() || null,
        updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now()),
        current_version_id: row.current_version_id?.toString() || null,
        custom_fields: row.custom_fields ? (typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields) as JsonValue : undefined
    };
    
    return part;
}

/**
 * Normalizes database row data into a PartVersion object
 * Ensures that all required properties are present and properly typed
 * Uses type-safe deserialization for complex JSON fields
 * 
 * @param row Database row data from PostgreSQL query
 * @param partId Part ID (if known) - can be extracted from row.part_id otherwise
 * @param versionId Part version ID (if known) - can be extracted from row.part_version_id otherwise
 * @returns A normalized PartVersion object using schema-defined types
 */
export function normalizePartVersion(
    row: DbRow,
    partIdParam?: string,
    versionIdParam?: string
): PartVersion {
    // Default IDs to values from row if not provided, ensuring they are strings
    const versionId: string = versionIdParam || row.part_version_id?.toString() || '';
    const partId: string = partIdParam || row.part_id?.toString() || row.version_part_id?.toString() || '';
    
    // Extract and properly process all JSONB fields with strong typing
    const technicalSpecs = row.technical_specifications;
    const props = row.properties;
   
    // Extract string content from long_description - could be a string or JSON
    const longDescription = typeof row.long_description === 'string' 
        ? row.long_description 
        : row.long_description 
            ? JSON.stringify(row.long_description) 
            : null;
    const materialComposition = row.material_composition;
    
    // Use dedicated deserializers for complex structured JSON fields
    const electricalProps = deserializeElectricalProperties(row.electrical_properties);
    const mechanicalProps = deserializeMechanicalProperties(row.mechanical_properties);
    const thermalProps = deserializeThermalProperties(row.thermal_properties);
    const dimensions = deserializeDimensions(row.dimensions);
    const environmentalData = deserializeEnvironmentalData(row.environmental_data);
    
    // Create normalized object using schema-defined PartVersion type
    const version: PartVersion = {
        // Schema-defined properties (snake_case)
        part_version_id: versionId,
        part_id: partId,
        part_version: row.part_version?.toString() || row.version?.toString() || '1.0.0',
        part_name: row.part_name?.toString() || row.name?.toString() || '',
        short_description: row.short_description?.toString() || null,
        long_description: typeof longDescription === 'string' ? longDescription : null,
        functional_description: row.functional_description?.toString() || null,
        technical_specifications: technicalSpecs as DbJson,
        properties: props as DbJson,
        electrical_properties: electricalProps as DbJson,
        mechanical_properties: mechanicalProps as DbJson,
        thermal_properties: thermalProps as DbJson,
        part_weight: (typeof row.part_weight === 'number' || 
          (typeof row.part_weight === 'string' && !isNaN(parseFloat(row.part_weight)))) ? 
          Number(row.part_weight) : null,
        weight_unit: row.weight_unit as WeightUnitEnum || null,
        dimensions: dimensions as unknown as { length: number; width: number; height: number; } | null, // Type assertion to match schema expectations
        dimensions_unit: row.dimensions_unit as DimensionUnitEnum || null,
        material_composition: materialComposition as DbJson,
        environmental_data: environmentalData as DbJson,
        voltage_rating_min: typeof row.voltage_rating_min === 'number' ? row.voltage_rating_min : null,
        voltage_rating_max: typeof row.voltage_rating_max === 'number' ? row.voltage_rating_max : null,
        current_rating_min: typeof row.current_rating_min === 'number' ? row.current_rating_min : null,
        current_rating_max: typeof row.current_rating_max === 'number' ? row.current_rating_max : null,
        power_rating_max: typeof row.power_rating_max === 'number' ? row.power_rating_max : null,
        tolerance: typeof row.tolerance === 'number' ? row.tolerance : null,
        tolerance_unit: row.tolerance_unit as ToleranceUnitEnum || null,
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
        updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now()),
        custom_fields: row.custom_fields || {}
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
function rowToPartVersionCategory(row: DbRow): PartVersionCategory {
    return {
        part_version_id: row.part_version_id?.toString(),
        category_id: row.category_id?.toString(),
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at || Date.now())
    };
}

// SQL client is imported directly at the top of the file

/**
 * Get a part by its ID, including the current version details
 * 
 * Tables queried: 
 * - "Part" - For the main part record
 * - "PartVersion" - For the current version details
 * 
 * @param partId - The unique identifier of the part to retrieve
 * @returns Object containing part and its current version, or null if not found
 * @throws Error if database query fails
 */
export async function getPartById(partId: string): Promise<{ part: Part; currentVersion: PartVersion } | null> {
	try {
		if (!partId) {
			throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
		}
		
		console.log(`[getPartById] Retrieving part with ID: ${partId}`);
		
		// Get part with its current version
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
			pv.part_id AS version_part_id,
			pv.part_version,
			pv.part_name,
			pv.short_description,
			pv.long_description,
			pv.functional_description,
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
		
		if (!result || result.length === 0) {
			console.log(`[getPartById] No part found with ID: ${partId}`);
			return null;
		}
		
		// Normalize the raw database result into our consistent object structure
		const partData = normalizePart(result[0]);
		const versionData = normalizePartVersion(result[0]);
		
		// Ensure the returned data matches the expected interfaces
		const part: Part = {
			part_id: partData.part_id,
			creator_id: partData.creator_id || '',  // Ensure it's never null
			global_part_number: partData.global_part_number,
			status_in_bom: partData.status_in_bom,
			lifecycle_status: partData.lifecycle_status,
			is_public: partData.is_public,
			created_at: partData.created_at,
			updated_by: partData.updated_by,
			updated_at: partData.updated_at,
			current_version_id: partData.current_version_id
		};
		
		// Ensure JSON fields are properly typed as DbJson or undefined
		const currentVersion: PartVersion = {
			part_version_id: versionData.part_version_id,
			part_id: versionData.part_id,
			part_version: versionData.part_version,
			part_name: versionData.part_name,
			short_description: versionData.short_description || undefined,
			long_description: versionData.long_description as DbJson | undefined,
			functional_description: versionData.functional_description,
			technical_specifications: versionData.technical_specifications as DbJson | undefined,
			properties: versionData.properties as DbJson | undefined,
			electrical_properties: versionData.electrical_properties as DbJson | undefined,
			mechanical_properties: versionData.mechanical_properties as DbJson | undefined,
			thermal_properties: versionData.thermal_properties as DbJson | undefined,
			material_composition: versionData.material_composition as DbJson | undefined,
			environmental_data: versionData.environmental_data as DbJson | undefined,
			dimensions: deserializeDimensions(versionData.dimensions) as any, // Type assertion needed for schema compatibility
			part_weight: versionData.part_weight,
			weight_unit: versionData.weight_unit,
			dimensions_unit: versionData.dimensions_unit,
			tolerance: versionData.tolerance,
			tolerance_unit: versionData.tolerance_unit,
			package_type: versionData.package_type,
			mounting_type: versionData.mounting_type,
			pin_count: versionData.pin_count,
			operating_temperature_min: versionData.operating_temperature_min,
			operating_temperature_max: versionData.operating_temperature_max,
			storage_temperature_min: versionData.storage_temperature_min,
			storage_temperature_max: versionData.storage_temperature_max,
			temperature_unit: versionData.temperature_unit,
			revision_notes: versionData.revision_notes,
			version_status: versionData.version_status,
			released_at: versionData.released_at,
			created_by: versionData.created_by, 
			created_at: versionData.created_at,
			updated_by: versionData.updated_by || undefined,
			updated_at: versionData.updated_at
		};
		
		return { part, currentVersion };
	} catch (error) {
		console.error(`[getPartById] Error fetching part ${partId}:`, error);
		throw error;
	}
}

/**
 * List all parts with their current version. Retrieves a list of parts along with their current
 * version details from the database.
 * 
 * Tables queried:
 * - "Part" - Main part records
 * - "PartVersion" - Version data for each part
 * 
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
			pv.part_id AS version_part_id,
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
		const parts = result.map((row: DbRow) => {
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
			global_part_number: normalizedPart.global_part_number,
			status_in_bom: normalizedPart.status_in_bom,
			lifecycle_status: normalizedPart.lifecycle_status,
			is_public: normalizedPart.is_public,
			created_at: normalizedPart.created_at,
			updated_by: normalizedPart.updated_by,
			updated_at: normalizedPart.updated_at,
			current_version_id: normalizedPart.current_version_id
		};
		
		// Map normalized version to API response format
		const currentVersion: PartVersion = {
			part_version_id: normalizedVersion.part_version_id,
			part_id: normalizedVersion.part_id,
			part_version: normalizedVersion.part_version,
			part_name: normalizedVersion.part_name,
			version_status: normalizedVersion.version_status as LifecycleStatusEnum,
			
			// Text descriptions
			short_description: normalizedVersion.short_description || undefined,
			functional_description: normalizedVersion.functional_description || undefined,
			long_description: normalizedVersion.long_description || undefined,
			revision_notes: normalizedVersion.revision_notes || undefined,
			
			// JSON fields
			technical_specifications: normalizedVersion.technical_specifications || undefined,
			properties: normalizedVersion.properties || undefined,
			electrical_properties: {
				voltage_rating: {
					min: normalizedVersion.voltage_rating_min ?? 0,
					max: normalizedVersion.voltage_rating_max ?? 0,
					unit: 'V'
				},
				current_rating: {
					min: normalizedVersion.current_rating_min ?? 0,
					max: normalizedVersion.current_rating_max ?? 0,
					unit: 'A'
				},
				power_rating: {
					max: normalizedVersion.power_rating_max ?? 0,
					unit: 'W'
				},
				tolerance: {
					value: normalizedVersion.tolerance ?? 0,
					unit: normalizedVersion.tolerance_unit ?? '%'
				}
			},
			mechanical_properties: {
				mounting_type: normalizedVersion.mounting_type ?? null,
				package_type: normalizedVersion.package_type ?? null,
				pin_count: normalizedVersion.pin_count ?? 0
			},
			thermal_properties: {
				operating_temperature: {
					min: normalizedVersion.operating_temperature_min ?? 0,
					max: normalizedVersion.operating_temperature_max ?? 0,
					unit: normalizedVersion.temperature_unit ?? TemperatureUnitEnum.C
				},
				storage_temperature: {
					min: normalizedVersion.storage_temperature_min ?? 0,
					max: normalizedVersion.storage_temperature_max ?? 0,
					unit: normalizedVersion.temperature_unit ?? TemperatureUnitEnum.C
				}
			},
			material_composition: normalizedVersion.material_composition || undefined,
			environmental_data: {
				rohs_compliant: false,
				reach_compliant: false,
				conflict_mineral_free: false,
				hazardous_substances: [],
				environmental_certifications: []
			},
			dimensions: normalizedVersion.dimensions || undefined,
			part_weight: normalizedVersion.part_weight,
			weight_unit: normalizedVersion.weight_unit,
			dimensions_unit: normalizedVersion.dimensions_unit,
			tolerance: normalizedVersion.tolerance,
			tolerance_unit: normalizedVersion.tolerance_unit,
			package_type: normalizedVersion.package_type,
			mounting_type: normalizedVersion.mounting_type,
			pin_count: normalizedVersion.pin_count,
			operating_temperature_min: normalizedVersion.operating_temperature_min,
			operating_temperature_max: normalizedVersion.operating_temperature_max,
			storage_temperature_min: normalizedVersion.storage_temperature_min,
			storage_temperature_max: normalizedVersion.storage_temperature_max,
			temperature_unit: normalizedVersion.temperature_unit,
			// revision_notes is already defined above at line 836
			released_at: normalizedVersion.released_at,
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

/**
 * Create a new part with its initial version
 * @param input Form data containing part and version details
 * @param userId User ID of the creator
 * @returns The created part with its initial version
 * @throws Error if input validation fails or database operation fails
 */
// export async function createPart(input: PartFormData, userId: string) {
//     try {
//         // Validate input
//         if (!input || !userId) {
//             throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Missing required input or userId for part creation`);
//         }

//         console.log('[createPart] Creating new part with input data');
        
//         // Generate UUIDs for part and version
//         const partId = crypto.randomUUID();
//         const versionId = crypto.randomUUID();
        
//         // Begin a transaction for atomic operations
//         const result = await sql.begin(async (tx) => {
//             console.log('[createPart] Starting transaction');
            
//             // Cast the transaction to PostgresTransaction to satisfy TypeScript
//             const transaction = tx as unknown as PostgresTransaction;
            
//             // 1. Insert the part record
//             await insertPartRecord(transaction, partId, userId, input);
            
//             // 2. Insert the part version record
//             await insertPartVersionRecord(transaction, versionId, partId, userId, input);
            
//             // 3. Update the part's current version
//             await transaction`
//             UPDATE "Part" 
//             SET current_version_id = ${versionId} 
//             WHERE part_id = ${partId}
//             `;
//             console.log('[createPart] Current version updated successfully');

//             // 4. Add related data
//             await addPartRelationships(transaction, partId, versionId, userId, input);
            
//             // 5. Return the created part with its version
//             const createdPart = await transaction`
//                 SELECT p.*, pv.*
//                 FROM "Part" p
//                 LEFT JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
//                 WHERE p.part_id = ${partId}
//             `;

//             return normalizePart(createdPart[0]);
//         });

//         console.log('[createPart] Successfully created part with all related data');
//         return result;
//     } catch (error) {
//         console.error('[createPart] Error creating part:', error);
//         throw error;
//     }
// }

/**
 * Helper function to insert the part record
 */
async function insertPartRecord(transaction: PostgresTransaction, partId: string, userId: string, input: ExtendedPartFormData) {
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
 * Database Constraints for PartVersion Table
 * 
 * CRITICAL VALUE-UNIT PAIR CONSTRAINTS:
 * PartVersion_check4: CHECK (((part_weight IS NULL) AND (weight_unit IS NULL)) OR ((part_weight IS NOT NULL) AND (weight_unit IS NOT NULL)))
 * PartVersion_check5: CHECK (((dimensions IS NULL) AND (dimensions_unit IS NULL)) OR ((dimensions IS NOT NULL) AND (dimensions_unit IS NOT NULL)))
 * PartVersion_check6: CHECK (((tolerance IS NULL) AND (tolerance_unit IS NULL)) OR ((tolerance IS NOT NULL) AND (tolerance_unit IS NOT NULL)))
 * 
 * These constraints require that for each value-unit pair:
 * - Both must be NULL, OR
 * - Both must have values (non-NULL)
 * - NEVER set only one of the pair (e.g., value=0, unit=null) as this will violate the constraint
 * 
 * RANGE CONSTRAINTS:
 * PartVersion_check:  CHECK (voltage_rating_max >= voltage_rating_min)
 * PartVersion_check1: CHECK (current_rating_max >= current_rating_min)
 * PartVersion_check2: CHECK (operating_temperature_max >= operating_temperature_min)
 * PartVersion_check3: CHECK (storage_temperature_max >= storage_temperature_min)
 * 
 * VALUE VALIDATION CONSTRAINTS:
 * PartVersion_part_weight_check:      CHECK (part_weight >= 0)
 * PartVersion_pin_count_check:        CHECK (pin_count >= 0)
 * PartVersion_power_rating_max_check: CHECK (power_rating_max >= 0)
 * PartVersion_tolerance_check:        CHECK (tolerance >= 0)
 * PartVersion_dimensions_check:       CHECK (dimensions ?& ARRAY['length','width','height'])
 * 
 * UNIQUE CONSTRAINTS:
 * PartVersion_part_id_part_version_key: UNIQUE (part_id, part_version)
 * 
 * TEXT FIELD CONSTRAINTS:
 * PartVersion_part_name_check:    CHECK (part_name <> '')
 * PartVersion_part_version_check: CHECK (part_version <> '')
 */

/**
 * Helper function to insert the part version record
 */
/**
 * Helper function to ensure consistent handling of value-unit pairs to meet database constraints.
 * Satisfies the CHECK constraints such as PartVersion_check4, PartVersion_check5, PartVersion_check6
 * 
 * @param value - The value part of the pair (e.g., part_weight)
 * @param unit - The unit part of the pair (e.g., weight_unit)
 * @returns A tuple where both elements are either both null or both have values
 */
function ensureValueUnitConsistency<T, U>(value: T | null | undefined, unit: U | null | undefined): [T | null, U | null] {
    // If either value or unit is empty/null/undefined, both should be null
    if (value === undefined || value === null || value === '') {
        return [null, null];
    }
    if (unit === undefined || unit === null || unit === '') {
        return [null, null];
    }
    // Otherwise return both with their original values
    return [value, unit];
}



/**
 * Helper function to add part relationships
 */
async function addPartRelationships(transaction: PostgresTransaction, partId: string, versionId: string, userId: string, input: ExtendedPartFormData) {
    // 1. Add categories if provided
    if (input.category_ids) {
        const categoryIds = input.category_ids.split(',').filter((id: string) => id.trim() !== '');
        for (const categoryId of categoryIds) {
            await addCategoryToPartVersion(versionId, categoryId.trim());
        }
        console.log(`[createPart] Added ${categoryIds.length} categories`);
    }

    // 2. Add manufacturer parts if provided
    const manufacturerParts = parseComplexField(input.manufacturer_parts) as ManufacturerPartInput[];
    if (Array.isArray(manufacturerParts) && manufacturerParts.length > 0) {
        try {
            for (const mfgPart of manufacturerParts) {
                await createManufacturerPart(
                    versionId, // First parameter should be partVersionId
                    mfgPart.manufacturer_id,
                    mfgPart.part_number || mfgPart.manufacturer_part_number || '',
                    userId,
                    // Map the old description field to the new manufacturer_part_description field
                    typeof mfgPart.description === 'string' ? mfgPart.description : null,
                    // Ensure datasheet_url is properly handled
                    typeof mfgPart.datasheet_url === 'string' ? mfgPart.datasheet_url : null,
                    // Product URL may be null
                    typeof mfgPart.product_url === 'string' ? mfgPart.product_url : null,
                    // Convert any type to boolean is_recommended
                    Boolean(mfgPart.is_recommended)
                );
            }
            console.log(`[createPart] Added ${manufacturerParts.length} manufacturer parts`);
        } catch (e) {
            console.error('[createPart] Error processing manufacturer parts:', e);
        }
    }

    // 3. Add supplier parts if provided 
    const supplierParts = parseComplexField(input.supplier_parts) as SupplierPartInput[];
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
    const attachments = parseComplexField(input.attachments) as AttachmentInput[];
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
    const representations = parseComplexField(input.representations) as RepresentationInput[];
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
    await addPartRevisions(transaction, versionId, userId, input);
}

/**
 * Helper function to parse complex fields that can be either string or object
 */
function parseComplexField(field: unknown): unknown[] {
    if (!field) return [];
    
    if (Array.isArray(field)) return field;
    
    if (typeof field === 'string') {
        try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            return [field];
        }
    }
    
    return [field];
}

/**
 * Helper function to add compliance information
 */
async function addComplianceInfo(versionId: string, input: ExtendedPartFormData) {
    const complianceInfo = parseComplexField(input.compliance_info) as ComplianceInput[];
    if (complianceInfo.length > 0) {
        try {
            for (const comp of complianceInfo) {
                await createPartCompliance(
                    versionId,
                    (comp.compliance_type as ComplianceTypeEnum) || ComplianceTypeEnum.ROHS,
                    comp.certificate_url || '',
                    comp.certified_at ? new Date(comp.certified_at) : new Date(),
                    comp.expires_at ? new Date(comp.expires_at) : null,
                    comp.notes || ''
                );
            }
            console.log(`[createPart] Added ${complianceInfo.length} compliance records`);
        } catch (err: unknown) {
            console.error('[createPart] Error processing compliance info:', err);
        }
    }
}

/**
 * Helper function to add validation records
 */
async function addValidationRecords(versionId: string, userId: string, input: ExtendedPartFormData) {
    const validationRecords = parseComplexField(input.validation_records) as DbValidationInput[];
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
                    validation.test_results ? (typeof validation.test_results === 'string' ? { value: validation.test_results } : validation.test_results) : {},
                    [], // issuesFound (empty array instead of empty string)
                    [], // correctiveActions (empty array instead of empty string)
                    validation.certification_info ? (typeof validation.certification_info === 'string' ? [validation.certification_info] : validation.certification_info) : [],
                    validation.notes || '',
                    validation.is_compliant !== undefined ? (validation.is_compliant ? 'true' : 'false') : 'false'
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
                ? JSON.parse(input.custom_fields) as Record<string, JsonValue>
                : input.custom_fields as Record<string, JsonValue>;
                
            let fieldCount = 0;
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Process each value with proper typing
                if (fieldValue === null || 
                    typeof fieldValue === 'string' || 
                    typeof fieldValue === 'number' || 
                    typeof fieldValue === 'boolean' || 
                    fieldValue instanceof Date) {
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
                } else {
                    // Skip invalid values
                    console.warn(`[createPart] Skipping invalid value type: ${typeof fieldValue}`);
                }
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
async function addPartFamiliesAndGroups(transaction: PostgresTransaction, partId: string, userId: string, input: ExtendedPartFormData) {
    // Add part family links if provided
    const partFamilies = parseComplexField(input.part_families) as { family_id: string }[];
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
    const partGroups = parseComplexField(input.part_groups) as { group_id: string; position_index?: number; notes?: string }[];
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
    const structure = parseComplexField(input.structure) as { 
        child_part_id: string; 
        relation_type?: string; 
        quantity?: number; 
        notes?: string 
    }[];
    if (structure.length > 0) {
        try {
            for (const item of structure) {
                const childPartId = item.child_part_id || '';
                if (childPartId) {
                    await createPartStructure(
                        partId,
                        childPartId,
                        (item.relation_type as StructuralRelationTypeEnum) || StructuralRelationTypeEnum.COMPONENT,
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
 * @param transaction PostgreSQL transaction to use for database operations
 * @param versionId Part version ID to create revisions for
 * @param userId User ID creating the revision
 * @param input Form data with revision details
 */
async function addPartRevisions(transaction: PostgresTransaction, versionId: string, userId: string, input: ExtendedPartFormData) {
    // Function to create a revision record within the transaction
    // This avoids the "Part version not found" error since we're in the same transaction
    async function createRevisionInTransaction(
        revNumber: string, 
        changeType: string, 
        description: string
    ) {
        // Generate a unique ID for the revision
        const revisionId = crypto.randomUUID();
        
        // Insert the revision record directly in the transaction based on the actual database schema
        // The PartRevision table has these columns: part_revision_id, part_version_id, change_description, changed_by, changed_fields, revision_date
        await transaction`
            INSERT INTO "PartRevision" (
                part_revision_id,
                part_version_id,
                change_description,
                changed_by,
                changed_fields,
                revision_date
            ) VALUES (
                ${revisionId},
                ${versionId},
                ${description},
                ${userId},
                ${sql.json({"type": changeType})},
                CURRENT_TIMESTAMP
            )
        `;
        
        console.log(`[addPartRevisions] Added revision record ${revisionId} for part version ${versionId}`);
    }
    
    try {
        // Check if the revision_notes field is populated
        if (input.revision_notes) {
            await createRevisionInTransaction(
                '1.0', // Default revision number
                'INITIAL',
                input.revision_notes // Use revision_notes as the change description
            );
            console.log(`[createPart] Added revision record from notes`);
        } else {
            // Add a default initial revision
            await createRevisionInTransaction(
                '1.0', // Default revision number for initial creation
                'INITIAL',
                'Initial part creation'
            );
            console.log(`[createPart] Added default initial revision record`);
        }
    } catch (e) {
        console.error('[addPartRevisions] Error creating revision record:', e);
        // Don't rethrow the error - allow the transaction to continue
        // This ensures the part creation succeeds even if revision creation fails
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
		// Validate essential data
		if (!data.part_version_id) {
			throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Missing part version ID`);
		}
		
		// Use transaction to ensure atomic operations
		await sql.begin(async (transaction) => {
			console.log('[updatePartVersion] Starting transaction');
			
			// 1. Verify and lock the part version record for update
			const lockResult = await transaction`
				SELECT * FROM "PartVersion" 
				WHERE part_version_id = ${data.part_version_id}
				FOR UPDATE
			`;
			
			if (lockResult.length === 0) {
				throw new Error(`Part version not found with ID: ${data.part_version_id}`);
			}
			
			// 2. Process JSON fields similar to createPart
			const processJsonField: JsonFieldProcessor = (fieldValue, fieldName) => {
				if (fieldValue === undefined || fieldValue === null) {
					return null;
				}
				
				try {
					return typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue);
				} catch (error) {
					console.error(`Error processing JSON field ${fieldName}:`, error);
					return null;
				}
			};
			
			// 3. Prepare dynamic field updates
			const updateFields: string[] = [];
			const updateValues: Record<string, DbUpdateValue> = {};
			
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
					updateValues[paramName] = processJsonField(value, key) as DbUpdateValue;
				}
			}
			
			// Metadata
			if (data.updated_by !== undefined) {
			    updateFields.push('updated_by = ${updatedBy}');
			    updateValues.updatedBy = data.updated_by;
			}
			updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
			
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
						const versionStatusValue = value as string;
						await transaction`
							UPDATE "PartVersion" 
							SET version_status = ${versionStatusValue}::text::lifecycle_status_enum
							WHERE part_version_id = ${data.part_version_id}
						`;
					} else {
						// Standard field update
						// Use template literals directly instead of unsafe
						if (typeof value === 'object' && value !== null && 'toPostgres' in value) {
							// For JSON and other special types use sql.json() to ensure proper PostgreSQL compatibility
							await transaction`
								UPDATE "PartVersion" 
								SET "${fieldName}" = ${transaction.json(value)}
								WHERE part_version_id = ${data.part_version_id}
							`;
						} else {
							// For normal scalar values
							const scalarValue = value as string | number | boolean | null;
							await transaction`
								UPDATE "PartVersion" 
								SET "${fieldName}" = ${scalarValue}
								WHERE part_version_id = ${data.part_version_id}
							`;
						}
					}
				}
				
				// Always update the timestamp
				await transaction`
					UPDATE "PartVersion" 
					SET updated_at = ${sql.unsafe('NOW()')}
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
 * Remove a category from a part version1
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
 * Extended interface for part version input with categories
 * Directly inherits from the schema-defined CreatePartVersion type and adds additional
 * input-specific properties needed for the form submission.
 */
interface PartVersionInput {
    // Required core fields matching the schema
    id: string;
    partId: string;
    version: string;
    name: string;
    status: string;
    createdBy: string;
    part_id: string; // Schema field required for compatibility
    part_name: string; // Schema field required for compatibility
    part_version: string; // Schema field required for compatibility
    created_by: string; // Schema field required for compatibility

    // Date fields with flexible input formats
    releasedAt?: Date | string;
    released_at?: Date; // Schema field
    
    // Allow both numeric and string inputs for number fields to accommodate form inputs
    weight?: number | string;
    weight_unit?: string;
    weightUnit?: string; // Client-side convenience field
    
    // Complex objects with flexible input formats
    dimensions?: Dimensions | null;
    dimensions_unit?: string;
    dimensionsUnit?: string; // Client-side convenience field
    tolerance?: number; // Fixed to match schema type - must be a number when sent to database
    tolerance_unit?: string;
    toleranceUnit?: string; // Client-side convenience field
    
    // Component properties
    package_type?: string;
    packageType?: string; // Client-side convenience field
    mounting_type?: string;
    mountingType?: string; // Client-side convenience field
    pin_count?: number;
    pinCount?: number | string; // Client-side convenience field
    
    // Temperature properties with flexible input formats
    operating_temp_min?: number;
    operatingTempMin?: number | string; // Client-side convenience field
    operating_temp_max?: number;
    operatingTempMax?: number | string; // Client-side convenience field
    storage_temp_min?: number;
    storageTempMin?: number | string; // Client-side convenience field
    storage_temp_max?: number;
    storageTempMax?: number | string; // Client-side convenience field
    temperature_unit?: string;
    temperatureUnit?: string; // Client-side convenience field
    
    // Electrical properties with flexible input formats
    voltage_rating_min?: number;
    voltageRatingMin?: number | string; // Client-side convenience field
    voltage_rating_max?: number;
    voltageRatingMax?: number | string; // Client-side convenience field
    current_rating_min?: number;
    currentRatingMin?: number | string; // Client-side convenience field
    current_rating_max?: number;
    currentRatingMax?: number | string; // Client-side convenience field
    power_rating_max?: number;
    powerRatingMax?: number | string; // Client-side convenience field
    
    // JSON fields with proper type definitions
    technical_specifications?: JsonValue;
    technicalSpecifications?: JsonValue | Record<string, unknown> | string | null; // Client-side convenience field
    properties?: JsonValue;
    electrical_properties?: JsonValue;
    electricalProperties?: ElectricalProperties | DbJson | string | null; // Client-side convenience field
    mechanical_properties?: JsonValue;
    mechanicalProperties?: MechanicalProperties | DbJson | string | null; // Client-side convenience field
    thermal_properties?: JsonValue;
    thermalProperties?: ThermalProperties | DbJson | string | null; // Client-side convenience field
    material_composition?: JsonValue;
    materialComposition?: MaterialComposition | DbJson | string | null; // Client-side convenience field
    environmental_data?: JsonValue;
    environmentalData?: EnvironmentalData | DbJson | string | null; // Client-side convenience field
    
    // Other required schema fields
    short_description?: string;
    long_description?: string;
    functional_description?: string;
    revision_notes?: string;
    
    // Categories in various formats
    categories?: Array<{id?: string; category_id?: string}> | string;
}

/**
 * Create a new version of a part2
 * 
 * @param partVersion The part version data with required fields
 * @returns Newly created part version with normalized structure
 */
export async function createPartVersion(partVersion: PartVersionInput): Promise<SchemaPartVersion> {
    try {
        // Input validation ensuring all required fields are present
        if (!partVersion.id || !partVersion.partId || !partVersion.part_id) {
            console.error('[createPartVersion] Missing required fields');
            throw new Error('Missing required fields in part version data');
        }

        // Generate IDs
        const versionId = partVersion.id || crypto.randomUUID();
        const partId = partVersion.part_id || partVersion.partId; // Prefer snake_case but fall back to camelCase
        
        // Helper function to safely convert values for PostgreSQL JSON
        const toPostgresJson = <T>(value: T | string | null | undefined): JsonValue | null => {
            if (value === undefined || value === null) return null;
            
            // If the value is already a string representation of JSON, parse it first
            if (typeof value === 'string') {
                try {
                    // Valid JSON string - parse it
                    return JSON.parse(value) as JsonValue;
                } catch (e) {
                    // Not valid JSON, return the string directly since strings are valid JsonValue
                    return value;
                }
            }
            
            // For non-string values, use JSON.stringify and parse back to ensure it's a valid JsonValue
            return JSON.parse(JSON.stringify(value));
        };
        
        // Helper function to safely convert number values
        const toNumber = (value: string | number | undefined | null): number | null => {
            if (value === undefined || value === null || value === '') return null;
            if (typeof value === 'number') return value;
            const num = Number(value);
            return isNaN(num) ? null : num;
        };
        
        // Create the new part version record with properly typed fields
        const result = await sql`
            INSERT INTO "PartVersion" (
                part_version_id, part_id, part_version, part_name,
                short_description, long_description, functional_description,
                technical_specifications, properties, electrical_properties,
                mechanical_properties, thermal_properties, part_weight, weight_unit,
                dimensions, dimensions_unit, material_composition, environmental_data,
                voltage_rating_min, voltage_rating_max, current_rating_min,
                current_rating_max, power_rating_max, tolerance, tolerance_unit,
                package_type, mounting_type, pin_count, operating_temperature_min,
                operating_temperature_max, storage_temperature_min, storage_temperature_max,
                temperature_unit, revision_notes, version_status,
                released_at,
                created_by, created_at, updated_by, updated_at
            ) VALUES (
                ${versionId}, ${partId}, ${partVersion.part_version || '0.1.0'}, ${partVersion.part_name},
                ${partVersion.short_description || null},
                ${processJsonField(partVersion.long_description)},
                ${partVersion.functional_description || null},
                ${processJsonField(partVersion.technical_specifications)},
                ${processJsonField(partVersion.properties)},
                ${processJsonField(partVersion.electrical_properties)},
                ${processJsonField(partVersion.mechanical_properties)},
                ${processJsonField(partVersion.thermal_properties)},
                ${toNumber(partVersion.weight)},
                ${partVersion.weight_unit ? partVersion.weight_unit : null}::weight_unit_enum,
               
                ${partVersion.dimensions ? processJsonField(partVersion.dimensions) : null},
                ${partVersion.dimensions_unit ? partVersion.dimensions_unit : null}::dimension_unit_enum,
                ${processJsonField(partVersion.material_composition)},
                ${processJsonField(partVersion.environmental_data)},
                ${toNumber(partVersion.voltage_rating_min) || 0},
                ${toNumber(partVersion.voltage_rating_max) || 0},
                ${toNumber(partVersion.current_rating_min) || 0},
                ${toNumber(partVersion.current_rating_max) || 0},
                ${toNumber(partVersion.power_rating_max) || 0},
                ${toNumber(partVersion.tolerance) || 0},
                ${partVersion.tolerance_unit || null},
                ${partVersion.package_type ? partVersion.package_type.toUpperCase() : null}::package_type_enum,
                ${partVersion.mounting_type ? partVersion.mounting_type.toUpperCase() : null}::mounting_type_enum,
                ${toNumber(partVersion.pin_count) || 0},
                ${toNumber(partVersion.operating_temp_min) || 0},
                ${toNumber(partVersion.operating_temp_max) || 0},
                ${toNumber(partVersion.storage_temp_min) || 0},
                ${toNumber(partVersion.storage_temp_max) || 0},
                ${partVersion.temperature_unit ? partVersion.temperature_unit.toUpperCase() : null}::temperature_unit_enum,
                ${partVersion.revision_notes || null},
                ${partVersion.status || null},
                NOW(), /* Use PostgreSQL's NOW() function directly in the query template */
                ${partVersion.created_by || partVersion.createdBy},
                ${sql.unsafe('NOW()')},
                ${partVersion.created_by || partVersion.createdBy},
                ${sql.unsafe('NOW()')}
            ) RETURNING *
        `;
        
        if (!result || result.length === 0) {
            throw new Error('Failed to create part version');
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
        
        // Set any custom fields provided in the input object
        // This provides flexibility for different part types while maintaining schema validation
        if (partVersion.technicalSpecifications || partVersion.properties || 
            partVersion.electricalProperties || partVersion.mechanicalProperties || 
            partVersion.thermalProperties || partVersion.materialComposition || 
            partVersion.environmentalData) {
            
            await sql`
                UPDATE "PartVersion"
                SET 
                    technical_specifications = ${partVersion.technicalSpecifications ? sql.json(toPostgresJson(partVersion.technicalSpecifications)) : null},
                    properties = ${partVersion.properties ? sql.json(toPostgresJson(partVersion.properties)) : null},
                    electrical_properties = ${partVersion.electricalProperties ? sql.json(toPostgresJson(partVersion.electricalProperties)) : null},
                    mechanical_properties = ${partVersion.mechanicalProperties ? sql.json(toPostgresJson(partVersion.mechanicalProperties)) : null},
                    thermal_properties = ${partVersion.thermalProperties ? sql.json(toPostgresJson(partVersion.thermalProperties)) : null},
                    material_composition = ${partVersion.materialComposition ? sql.json(toPostgresJson(partVersion.materialComposition)) : null},
                    environmental_data = ${partVersion.environmentalData ? sql.json(toPostgresJson(partVersion.environmentalData)) : null}
                WHERE part_version_id = ${versionId};
            `;
        }
        
        // Add electrical properties if provided
        if (partVersion.voltageRatingMin || partVersion.voltageRatingMax || 
            partVersion.currentRatingMin || partVersion.currentRatingMax || 
            partVersion.powerRatingMax || partVersion.tolerance || partVersion.toleranceUnit) {
            
            await sql`
                UPDATE "PartVersion"
                SET 
                    voltage_rating_min = ${partVersion.voltageRatingMin || null},
                    voltage_rating_max = ${partVersion.voltageRatingMax || null},
                    current_rating_min = ${partVersion.currentRatingMin || null},
                    current_rating_max = ${partVersion.currentRatingMax || null},
                    power_rating_max = ${partVersion.powerRatingMax || null},
                    tolerance = ${partVersion.tolerance || null},
                    tolerance_unit = ${partVersion.toleranceUnit || null}
                WHERE part_version_id = ${versionId};
            `;
        }
        
        console.log(`[createPartVersion] Successfully created version ${partVersion.version} of part ${partId}`);
        const versionData = normalizePartVersion(result[0]);
        // Ensure proper handling of JSON fields when returning the normalized part version
        // using snake_case property names to match database schema and PartVersion type
        return {
            ...versionData,
            technical_specifications: versionData.technical_specifications 
                ? (typeof versionData.technical_specifications === 'string' 
                    ? JSON.parse(versionData.technical_specifications) 
                    : versionData.technical_specifications) 
                : undefined,
            properties: versionData.properties 
                ? (typeof versionData.properties === 'string' 
                    ? JSON.parse(versionData.properties) 
                    : versionData.properties) 
                : undefined,
            electrical_properties: versionData.electrical_properties 
                ? (typeof versionData.electrical_properties === 'string' 
                    ? JSON.parse(versionData.electrical_properties as string) as DbJson
                    : versionData.electrical_properties as DbJson)
                : null,
            mechanical_properties: versionData.mechanical_properties 
                ? (typeof versionData.mechanical_properties === 'string' 
                    ? JSON.parse(versionData.mechanical_properties as string) as DbJson
                    : versionData.mechanical_properties as DbJson)
                : null,
            thermal_properties: versionData.thermal_properties 
                ? (typeof versionData.thermal_properties === 'string' 
                    ? JSON.parse(versionData.thermal_properties as string) as DbJson
                    : versionData.thermal_properties as DbJson)
                : null,
            material_composition: versionData.material_composition 
                ? (typeof versionData.material_composition === 'string'
                    ? JSON.parse(versionData.material_composition as string) as DbJson
                    : versionData.material_composition as DbJson)
                : null,
            environmental_data: versionData.environmental_data 
                ? (typeof versionData.environmental_data === 'string' 
                    ? JSON.parse(versionData.environmental_data as string) as DbJson
                    : versionData.environmental_data as DbJson)
                : null,
            dimensions: deserializeDimensions(versionData.dimensions) as { length: number; width: number; height: number; } | null | undefined, // Ensure explicit type compatibility with schema
        };
    } catch (error) {
        console.error('[createPartVersion] Error creating part version:', error);
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
    }
}



/**
 * Complete part creation with all related data in a single function
 * Creates a base part, its first version, and all related data in a single transaction
 * 
 * @param partData Complete part data including base part, version details, and related entities
 * @returns Object containing the created part and its first version
 * @throws Error if any part of the creation process fails
 */
export async function addCompletePart(partData: {
    // Base part data
    id?: string;
    number: string;
    name: string;
    description?: string;
    status?: string;
    isPublic?: boolean;
    createdBy: string;
    
    // Part version data
    versionId?: string;
    version?: string;
    shortDescription?: string;
    longDescription?: string;
    functionalDescription?: string;
    revisionNotes?: string;
    versionStatus?: string;
    releasedAt?: Date | string;
    
    // Technical specifications
    technicalSpecifications?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    
    // Physical properties
    weight?: number | string;
    weightUnit?: string;
    dimensions?: Dimensions | { length?: number | string; width?: number | string; height?: number | string; };
    dimensionsUnit?: string;
    materialComposition?: MaterialComposition | Record<string, unknown>;
    
    // Electrical properties
    electricalProperties?: ElectricalProperties | Record<string, unknown>;
    voltageRatingMin?: number | string;
    voltageRatingMax?: number | string;
    currentRatingMin?: number | string;
    currentRatingMax?: number | string;
    powerRatingMax?: number | string;
    
    // Mechanical properties
    mechanicalProperties?: MechanicalProperties | Record<string, unknown>;
    tolerance?: number | string;
    toleranceUnit?: string;
    
    // Thermal properties
    thermalProperties?: ThermalProperties | Record<string, unknown>;
    operatingTempMin?: number | string;
    operatingTempMax?: number | string;
    storageTempMin?: number | string;
    storageTempMax?: number | string;
    temperatureUnit?: string;
    
    // Component properties
    packageType?: string;
    mountingType?: string;
    pinCount?: number | string;
    
    // Environmental data
    environmentalData?: EnvironmentalData | Record<string, unknown>;
    
    // Associated entities
    categories?: Array<string>;
    manufacturerParts?: Array<{
        manufacturerId: string;
        partNumber: string;
        description?: string;
        url?: string;
        status?: string;
        notes?: string;
        customProperties?: Record<string, unknown>;
    }>;
    supplierParts?: Array<{
        supplierId: string;
        partNumber: string;
        description?: string;
        url?: string;
        currencyCode?: string;
        unitPrice?: number | string;
        minimumOrderQuantity?: number | string;
        leadTimeWeeks?: number | string;
        status?: string;
        notes?: string;
        customProperties?: Record<string, unknown>;
    }>;
    attachments?: Array<{
        filename: string;
        fileUrl: string;
        fileType?: string;
        description?: string;
        version?: string;
        uploadedBy?: string;
    }>;
    familyIds?: Array<string>;
    customFields?: Record<string, unknown>;
    
}): Promise<{ part: Part; partVersion: SchemaPartVersion }> {
    try {
        // Use a standard SQL transaction without passing it to createPart
        return await sql.begin(async (transaction) => {
            // 1. Create the base part
            const partId = partData.id || crypto.randomUUID();
            // Create base part parameters with all required fields
            const partParams: PartFormData = {
                id: partId,
                part_name: partData.name,
                part_version: partData.version || '1.0.0',
                is_public: partData.isPublic ?? false,
                status_in_bom: partData.status as PartStatusEnum || PartStatusEnum.ACTIVE,
                lifecycle_status: LifecycleStatusEnum.DRAFT
            };
            
            // Add additional fields that might be needed but use type casting to avoid TypeScript errors
            if (partData.number) {
                (partParams as any).part_number = partData.number;
            }
            if (partData.description) {
                (partParams as any).description = partData.description;
            }
            if (partData.createdBy) {
                (partParams as any).created_by = partData.createdBy;
            }
            
            // Create the part - using a direct call to the base createPart function
            // Since we're already inside a transaction, we simply pass the partParams
            // Use proper postgres.js syntax for transactions
            const result = await transaction`
                INSERT INTO "Part" (
                    part_id, 
                    part_name, 
                    part_number, 
                    description, 
                    status_in_bom,
                    lifecycle_status,
                    is_public,
                    created_by,
                    created_at
                ) VALUES (
                    ${partId},
                    ${partParams.part_name},
                    ${(partParams as any).part_number || ''},
                    ${(partParams as any).description || ''},
                    ${partParams.status_in_bom},
                    ${partParams.lifecycle_status},
                    ${partParams.is_public},
                    ${(partParams as any).created_by || 'system'},
                    ${new Date()}
                ) RETURNING *
            `;
            
            const createdPart = result[0];
            
            // 2. Create the initial version
            const versionId = partData.versionId || crypto.randomUUID();
            
            // Process dimensions to ensure they're in the correct format
            let dimensionsObj: Dimensions | null = null;
            if (partData.dimensions) {
                if ('length' in partData.dimensions) {
                    // Convert any string values to numbers
                    dimensionsObj = {
                        length: typeof partData.dimensions.length === 'string' ? 
                            parseFloat(partData.dimensions.length) : 
                            typeof partData.dimensions.length === 'number' ? 
                                partData.dimensions.length : null,
                        width: typeof partData.dimensions.width === 'string' ? 
                            parseFloat(partData.dimensions.width) : 
                            typeof partData.dimensions.width === 'number' ? 
                                partData.dimensions.width : null,
                        height: typeof partData.dimensions.height === 'string' ? 
                            parseFloat(partData.dimensions.height) : 
                            typeof partData.dimensions.height === 'number' ? 
                                partData.dimensions.height : null
                    };
                } else {
                    dimensionsObj = partData.dimensions as Dimensions;
                }
            }
            
            // Convert categories to the expected format
            const categories = partData.categories ? 
                partData.categories.map(catId => ({ id: catId })) : undefined;
            
            // Create the part version with the properly formatted data
            const partVersion: PartVersionInput = {
                id: versionId,
                partId: partId,
                part_id: partId,
                version: partData.version || '1.0.0',
                name: partData.name,
                part_name: partData.name,
                part_version: partData.version || '1.0.0',
                status: partData.versionStatus as LifecycleStatusEnum || LifecycleStatusEnum.DRAFT,
                createdBy: partData.createdBy,
                created_by: partData.createdBy,
                
                // Text descriptions
                short_description: partData.shortDescription,
                long_description: partData.longDescription,
                functional_description: partData.functionalDescription,
                revision_notes: partData.revisionNotes,
                
                // JSON fields - ensure they're properly typed for the database
                technical_specifications: partData.technicalSpecifications as JsonValue,
                technicalSpecifications: partData.technicalSpecifications as JsonValue,
                properties: partData.properties as JsonValue,
                electrical_properties: partData.electricalProperties as JsonValue,
                electricalProperties: partData.electricalProperties as JsonValue,
                mechanical_properties: partData.mechanicalProperties as JsonValue,
                mechanicalProperties: partData.mechanicalProperties as JsonValue,
                thermal_properties: partData.thermalProperties as JsonValue,
                thermalProperties: partData.thermalProperties as JsonValue,
                material_composition: partData.materialComposition as JsonValue,
                materialComposition: partData.materialComposition as JsonValue,
                environmental_data: partData.environmentalData as JsonValue,
                environmentalData: partData.environmentalData as JsonValue,
                
                // Physical properties
                weight: partData.weight !== undefined ? Number(partData.weight) : undefined,
                weight_unit: partData.weightUnit,
                weightUnit: partData.weightUnit,
                dimensions: dimensionsObj,
                dimensions_unit: partData.dimensionsUnit,
                dimensionsUnit: partData.dimensionsUnit,
                
                // Electrical properties
                voltage_rating_min: partData.voltageRatingMin !== undefined ? Number(partData.voltageRatingMin) : undefined,
                voltageRatingMin: partData.voltageRatingMin,
                voltage_rating_max: partData.voltageRatingMax !== undefined ? Number(partData.voltageRatingMax) : undefined,
                voltageRatingMax: partData.voltageRatingMax,
                current_rating_min: partData.currentRatingMin !== undefined ? Number(partData.currentRatingMin) : undefined,
                currentRatingMin: partData.currentRatingMin,
                current_rating_max: partData.currentRatingMax !== undefined ? Number(partData.currentRatingMax) : undefined,
                currentRatingMax: partData.currentRatingMax,
                power_rating_max: partData.powerRatingMax !== undefined ? Number(partData.powerRatingMax) : undefined,
                powerRatingMax: partData.powerRatingMax,
                
                // Mechanical properties
                tolerance: partData.tolerance !== undefined ? Number(partData.tolerance) : undefined,
                tolerance_unit: partData.toleranceUnit,
                toleranceUnit: partData.toleranceUnit,
                
                // Thermal properties
                operating_temp_min: partData.operatingTempMin !== undefined ? Number(partData.operatingTempMin) : undefined,
                operatingTempMin: partData.operatingTempMin,
                operating_temp_max: partData.operatingTempMax !== undefined ? Number(partData.operatingTempMax) : undefined,
                operatingTempMax: partData.operatingTempMax,
                storage_temp_min: partData.storageTempMin !== undefined ? Number(partData.storageTempMin) : undefined,
                storageTempMin: partData.storageTempMin,
                storage_temp_max: partData.storageTempMax !== undefined ? Number(partData.storageTempMax) : undefined,
                storageTempMax: partData.storageTempMax,
                temperature_unit: partData.temperatureUnit,
                temperatureUnit: partData.temperatureUnit,
                
                // Component properties
                package_type: partData.packageType,
                packageType: partData.packageType,
                mounting_type: partData.mountingType,
                mountingType: partData.mountingType,
                pin_count: partData.pinCount !== undefined ? Number(partData.pinCount) : undefined,
                pinCount: partData.pinCount,
                
                // Categories
                categories: categories
            };
            
            const createdPartVersion = await createPartVersion(partVersion);
            
            // 3. Process manufacturer parts if provided
            if (partData.manufacturerParts && partData.manufacturerParts.length > 0) {
                for (const mfrPart of partData.manufacturerParts) {
                    // Create manufacturer part with correct parameters
                    await createManufacturerPart(
                        versionId,
                        mfrPart.manufacturerId,
                        mfrPart.partNumber,
                        partData.createdBy, // User ID who created the part
                        mfrPart.description || null, // manufacturer_part_description
                        null, // datasheet_url
                        mfrPart.url || null, // product_url
                        false // is_recommended (default)
                    );
                }
            }
            
            // 4. Process supplier parts if provided
            if (partData.supplierParts && partData.supplierParts.length > 0) {
                for (const supPart of partData.supplierParts) {
                    // Create supplier part with correct parameters based on function signature
                    // Only pass the necessary parameters in the correct order
                    await createSupplierPart(
                        versionId,
                        supPart.supplierId,
                        supPart.partNumber,
                        supPart.description || ''
                    );
                }
            }
            
            // 5. Process attachments if provided
            if (partData.attachments && partData.attachments.length > 0) {
                for (const attachment of partData.attachments) {
                    // For createPartAttachment, ensure we pass parameters in the correct order and type
                    // Directly use SQL to create the attachment to avoid type issues
                    await transaction`
                        INSERT INTO "PartAttachment" (
                            part_attachment_id,
                            part_version_id,
                            filename,
                            file_url,
                            file_type,
                            description,
                            version,
                            size_bytes,
                            uploaded_by,
                            created_by,
                            created_at
                        ) VALUES (
                            ${crypto.randomUUID()},
                            ${versionId},
                            ${attachment.filename},
                            ${attachment.fileUrl},
                            ${attachment.fileType || ''},
                            ${attachment.description || ''},
                            ${attachment.version || '1.0'},
                            ${0}, /* size_bytes */
                            ${attachment.uploadedBy || partData.createdBy},
                            ${partData.createdBy},
                            ${new Date()}
                        )
                    `;
                }
            }
            
            // 6. Process custom fields if provided
            if (partData.customFields && Object.keys(partData.customFields).length > 0) {
                for (const [fieldName, fieldValue] of Object.entries(partData.customFields)) {
                    // Determine data type based on the value
                    let dataType = 'text';
                    if (typeof fieldValue === 'number') dataType = 'number';
                    else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                    else if (fieldValue instanceof Date) dataType = 'date';
                    
                    // For createPartCustomField, use direct SQL to avoid type issues
                    // Convert the field value to a string using JSON.stringify
                    // to handle any data type properly
                    const jsonValue = JSON.stringify(fieldValue);
                    
                    await transaction`
                        INSERT INTO "PartCustomField" (
                            part_custom_field_id,
                            part_version_id,
                            field_name,
                            field_value,
                            data_type,
                            is_required,
                            display_order,
                            created_by,
                            created_at
                        ) VALUES (
                            ${crypto.randomUUID()},
                            ${versionId},
                            ${fieldName},
                            ${jsonValue}::jsonb,
                            ${dataType},
                            ${false},
                            ${0},
                            ${partData.createdBy},
                            ${new Date()}
                        )
                    `;
                }
            }
            
            // 7. Process family associations if provided
            if (partData.familyIds && partData.familyIds.length > 0) {
                for (const familyId of partData.familyIds) {
                    await addPartToFamily(partId, familyId, partData.createdBy);
                }
            }
            
            // Cast the results to the expected return types to satisfy TypeScript
            // This is safe because we know the structure matches what's needed
            return {
                part: createdPart as Part,
                partVersion: createdPartVersion
            };
        });
    } catch (error) {
        console.error('[addCompletePart] Error creating complete part:', error);
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Error creating complete part: ${error instanceof Error ? error.message : String(error)}`);
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
            SET updated_at = ${sql.unsafe('NOW()')}
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
    } catch (error: unknown) {
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
/**
 * Create a part using the UnifiedPart schema
 * This function creates a complete part with all its related data using the UnifiedPart schema
 * It processes all fields defined in the UnifiedPart interface and saves them to the database
 * 
 * @param unifiedPartData - Data conforming to the UnifiedPart interface
 * @param userId - ID of the user creating the part
 * @returns Object containing the created part and its version
 * @throws Error if validation fails or database operation fails
 */
export async function createUnifiedPart(
  unifiedPartData: UnifiedPart,
  userId: string
): Promise<{ part: Part; version: PartVersion }> {
  try {
    // Validate input
    if (!unifiedPartData || !userId) {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Missing required unifiedPartData or userId for part creation`);
    }

    console.log('[createUnifiedPart] Creating new part with UnifiedPart data');
    
    // Generate UUIDs for part and version if not provided
    const partId = unifiedPartData.part_id || crypto.randomUUID();
    const versionId = unifiedPartData.part_version_id || crypto.randomUUID();
    
    // Begin a transaction for atomic operations
    return await sql.begin(async (tx) => {
      console.log('[createUnifiedPart] Starting transaction');
      
      // Cast the transaction to PostgresTransaction to satisfy TypeScript
      const transaction = tx as unknown as PostgresTransaction;
      
      // 1. Insert the part record
      await transaction`
        INSERT INTO "Part" (
          part_id,
          creator_id,
          global_part_number,
          status_in_bom,
          lifecycle_status,
          is_public,
          created_at,
          updated_at,
          updated_by
        ) VALUES (
          ${partId},
          ${userId},
          ${unifiedPartData.global_part_number || null},
          ${unifiedPartData.status_in_bom || PartStatusEnum.CONCEPT}::part_status_enum,
          ${unifiedPartData.lifecycle_status || LifecycleStatusEnum.DRAFT}::lifecycle_status_enum,
          ${unifiedPartData.is_public === true},
          NOW(),
          NOW(),
          ${userId}
        )
      `;
      console.log('[createUnifiedPart] Part record inserted successfully');
      
      // 2. Insert the part version record
      // Process dimensions to ensure they're in the correct format
      const dimensionsJson = unifiedPartData.dimensions ? 
         sql.json(unifiedPartData.dimensions) : null;

      // Process complex properties as JSON
      const electricalPropertiesJson = unifiedPartData.electrical_properties ? 
        processJsonField(unifiedPartData.electrical_properties) : null;
      
      const mechanicalPropertiesJson = unifiedPartData.mechanical_properties ? 
        processJsonField(unifiedPartData.mechanical_properties) : null;
      
      const thermalPropertiesJson = unifiedPartData.thermal_properties ? 
        processJsonField(unifiedPartData.thermal_properties) : null;
      
      const environmentalDataJson = unifiedPartData.environmental_data ? 
        processJsonField(unifiedPartData.environmental_data) : null;
      
      const technicalSpecificationsJson = unifiedPartData.technical_specifications ? 
        processJsonField(unifiedPartData.technical_specifications) : null;
      
      const propertiesJson = unifiedPartData.properties ? 
        processJsonField(unifiedPartData.properties) : null;

      // Format long_description properly
      const longDescriptionJson = unifiedPartData.long_description ? 
        (typeof unifiedPartData.long_description === 'string' ? 
          unifiedPartData.long_description : 
          processJsonField(unifiedPartData.long_description)) : null;

      await transaction`
        INSERT INTO "PartVersion" (
          part_version_id,
          part_id,
          part_version,
          part_name,
          version_status,
          short_description,
          long_description,
          functional_description,
          part_weight,
          weight_unit,
          dimensions,
          dimensions_unit,
          package_type,
          mounting_type,
          pin_count,
          voltage_rating_min,
          voltage_rating_max,
          current_rating_min,
          current_rating_max,
          power_rating_max,
          tolerance,
          tolerance_unit,
          electrical_properties,
          mechanical_properties,
          material_composition,
          operating_temperature_min,
          operating_temperature_max,
          storage_temperature_min,
          storage_temperature_max,
          temperature_unit,
          thermal_properties,
          environmental_data,
          technical_specifications,
          properties,
          created_by,
          created_at,
          updated_by,
          updated_at,
          revision_notes,
          released_at
        ) VALUES (
          ${versionId},
          ${partId},
          ${unifiedPartData.part_version || '0.1.0'},
          ${unifiedPartData.part_name},
          ${unifiedPartData.version_status}::lifecycle_status_enum,
          ${unifiedPartData.short_description || null},
          ${longDescriptionJson},
          ${unifiedPartData.functional_description || null},
          ${processNumericField(unifiedPartData.part_weight)},
          ${unifiedPartData.weight_unit || null},
          ${dimensionsJson},
          ${unifiedPartData.dimensions_unit || null},
          ${unifiedPartData.package_type || null},
          ${unifiedPartData.mounting_type || null},
          ${processNumericField(unifiedPartData.pin_count)},
          ${processNumericField(unifiedPartData.voltage_rating_min)},
          ${processNumericField(unifiedPartData.voltage_rating_max)},
          ${processNumericField(unifiedPartData.current_rating_min)},
          ${processNumericField(unifiedPartData.current_rating_max)},
          ${processNumericField(unifiedPartData.power_rating_max)},
          ${processNumericField(unifiedPartData.tolerance)},
          ${unifiedPartData.tolerance_unit || null},
          ${electricalPropertiesJson},
          ${mechanicalPropertiesJson},
          ${unifiedPartData.material_composition || null},
          ${processNumericField(unifiedPartData.operating_temperature_min)},
          ${processNumericField(unifiedPartData.operating_temperature_max)},
          ${processNumericField(unifiedPartData.storage_temperature_min)},
          ${processNumericField(unifiedPartData.storage_temperature_max)},
          ${unifiedPartData.temperature_unit || null},
          ${thermalPropertiesJson},
          ${environmentalDataJson},
          ${technicalSpecificationsJson},
          ${propertiesJson},
          ${userId},
          NOW(),
          ${userId},
          NOW(),
          ${unifiedPartData.revision_notes || null},
          ${unifiedPartData.released_at || null}
        )
      `;
      console.log('[createUnifiedPart] Part version record inserted successfully');
      
      // 3. Update the part's current version
      await transaction`
        UPDATE "Part" 
        SET current_version_id = ${versionId} 
        WHERE part_id = ${partId}
      `;
      console.log('[createUnifiedPart] Current version updated successfully');
      
      // 4. Process manufacturer parts if provided
      if (Array.isArray(unifiedPartData.manufacturer_parts) && unifiedPartData.manufacturer_parts.length > 0) {
        for (const mp of unifiedPartData.manufacturer_parts) {
          if (mp.manufacturer_id && mp.manufacturer_part_number) {
            await createManufacturerPart(
              versionId,
              mp.manufacturer_id,
              mp.manufacturer_part_number,
              userId,
              mp.manufacturer_part_description || undefined, // Use correct field name from schema
              mp.datasheet_url || undefined,
              mp.product_url || undefined,
              typeof mp.is_recommended === 'boolean' ? mp.is_recommended : false,
              transaction // Pass the transaction to ensure consistency
            );
          }
        }
        console.log('[createUnifiedPart] Manufacturer parts created successfully');
      }
      
      // 5. Process supplier parts if provided
      if (Array.isArray(unifiedPartData.supplier_parts) && unifiedPartData.supplier_parts.length > 0) {
        for (const sp of unifiedPartData.supplier_parts) {
          if (sp.supplier_id && sp.supplier_part_number) {
            await createSupplierPart(
              versionId,
              sp.supplier_id,
              sp.supplier_part_number,
              userId,
              undefined, // supplier_name - optional
              undefined, // manufacturer_part_id - optional
              undefined, // description - optional
              'ACTIVE', // status - default
              undefined, // packaging - optional
              typeof sp.minimum_order_quantity === 'number' ? sp.minimum_order_quantity : undefined, // minOrderQuantity - optional
              typeof sp.lead_time_days === 'number' ? sp.lead_time_days : undefined // leadTimeDays - optional
            );
          }
        }
        console.log('[createUnifiedPart] Supplier parts created successfully');
      }
      
      // 6. Process attachments if provided
      if (Array.isArray(unifiedPartData.attachments) && unifiedPartData.attachments.length > 0) {
        for (const a of unifiedPartData.attachments) {
          if (a.file_name && a.file_url) {
            // Parameters: partVersionId, fileName, fileSizeBytes, fileType, filePath, uploadedBy, description?, isPrimary?
            await createPartAttachment(
              versionId,
              a.file_name,
              a.file_size !== undefined ? a.file_size : 1024, // Default file size if not provided
              a.file_type || 'application/octet-stream', // Default file type if not provided
              a.file_url, // Use file_url as the file path
              userId,
              a.description || null,
              false // Default to not being the primary attachment
            );
          }
        }
        console.log('[createUnifiedPart] Attachments created successfully');
      }
      
      // 7. Process representations if provided
      if (Array.isArray(unifiedPartData.representations) && unifiedPartData.representations.length > 0) {
        for (const r of unifiedPartData.representations) {
          if (r.representation_type && r.file_url) {
            // Get the filename from the URL path if available
            const fileName = r.file_url.split('/').pop() || 'representation.obj';
            
            // Adapt parameters to match the createPartRepresentation function signature
            await createPartRepresentation(
              versionId,
              r.representation_type,
              fileName, // Extract filename from URL or use default
              r.format || 'STL', // Default format if not provided
              r.file_url, // Using file_url as the file path
              1024, // Default file size in bytes
              userId,
              undefined, // resolution (optional)
              r.thumbnail_url || null, // thumbnail path
              r.is_recommended || false // isPrimary
            );
          }
        }
        console.log('[createUnifiedPart] Representations created successfully');
      }
      
      // 8. Process part structure (BOM) if provided
      if (Array.isArray(unifiedPartData.structure) && unifiedPartData.structure.length > 0) {
        for (const s of unifiedPartData.structure) {
          if (s.child_part_id) {
            await createPartStructure(
              partId, // parent_part_id
              s.child_part_id,
              s.relation_type || StructuralRelationTypeEnum.COMPONENT,
              s.quantity || 1,
              userId,
              s.notes || undefined
            );
          }
        }
        console.log('[createUnifiedPart] Part structure created successfully');
      }
      
      // 9. Process compliance info if provided
      if (Array.isArray(unifiedPartData.compliance_info) && unifiedPartData.compliance_info.length > 0) {
        for (const c of unifiedPartData.compliance_info) {
          if (c.compliance_type) {
            // Match exact signature of createPartCompliance
            // Parameters: partVersionId, complianceType, certificateUrl?, certifiedAt?, expiresAt?, notes?
            await createPartCompliance(
              versionId,
              c.compliance_type as ComplianceTypeEnum, // Type cast needed
              c.certificate_url || null,
              c.certified_at || null,
              c.expires_at || null,
              c.notes || null
            );
          }
        }
        console.log('[createUnifiedPart] Compliance info created successfully');
      }
      
      // 10. Process part version tags if provided
      if (Array.isArray(unifiedPartData.part_version_tags) && unifiedPartData.part_version_tags.length > 0) {
        for (const t of unifiedPartData.part_version_tags) {
          if (t.tag_name) {
            await createPartVersionTag(
              versionId,
              t.tag_name,
              userId,
              t.tag_value || undefined,
              t.tag_category || undefined,
              t.tag_color || undefined
            );
          }
        }
        console.log('[createUnifiedPart] Part version tags created successfully');
      }
      
      // 11. Process categories if provided
      if (Array.isArray(unifiedPartData.categories) && unifiedPartData.categories.length > 0) {
        for (const categoryId of unifiedPartData.categories) {
          if (categoryId) {
            await transaction`
              INSERT INTO "PartVersionCategory" (
                part_version_id,
                category_id
              ) VALUES (
                ${versionId},
                ${categoryId}
              )
            `;
          }
        }
        console.log('[createUnifiedPart] Categories linked successfully');
      }
      
      // 12. Process part families if provided
      if (Array.isArray(unifiedPartData.family_ids) && unifiedPartData.family_ids.length > 0) {
        for (const familyId of unifiedPartData.family_ids) {
          if (familyId) {
            await transaction`
              INSERT INTO "PartFamilyLink" (
                part_family_link_id,
                part_id,
                family_id,
                created_by,
                created_at
              ) VALUES (
                ${crypto.randomUUID()},
                ${partId},
                ${familyId},
                ${userId},
                NOW()
              )
            `;
          }
        }
        console.log('[createUnifiedPart] Part families linked successfully');
      }
      
      // 13. Process part groups if provided
      if (Array.isArray(unifiedPartData.group_ids) && unifiedPartData.group_ids.length > 0) {
        for (const groupId of unifiedPartData.group_ids) {
          if (groupId) {
            await transaction`
              INSERT INTO "PartGroupLink" (
                part_group_link_id,
                part_id,
                group_id,
                created_by,
                created_at
              ) VALUES (
                ${crypto.randomUUID()},
                ${partId},
                ${groupId},
                ${userId},
                NOW()
              )
            `;
          }
        }
        console.log('[createUnifiedPart] Part groups linked successfully');
      }
      
      // 14. Process custom fields if provided
      if (unifiedPartData.custom_fields && Object.keys(unifiedPartData.custom_fields).length > 0) {
        for (const [fieldId, fieldValue] of Object.entries(unifiedPartData.custom_fields)) {
          if (fieldId && fieldValue !== undefined) {
            await transaction`
              INSERT INTO "PartCustomField" (
                part_version_id,
                field_id,
                custom_field_value
              ) VALUES (
                ${versionId},
                ${fieldId},
                ${processJsonField(fieldValue)}::jsonb
              )
            `;
          }
        }
        console.log('[createUnifiedPart] Custom fields saved successfully');
      }
      
      // 15. Fetch the created part and version data
      const createdPartData = await transaction`
        SELECT p.*, pv.*
        FROM "Part" p
        LEFT JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
        WHERE p.part_id = ${partId}
      `;
      
      if (!createdPartData || createdPartData.length === 0) {
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to retrieve created part data`);
      }
      
      // 12. Return normalized part and version data
      const normalizedPart = normalizePart(createdPartData[0]);
      const normalizedVersion = normalizePartVersion(
        createdPartData[0],
        createdPartData[0].part_id,
        createdPartData[0].part_version_id
      );
      
      console.log('[createUnifiedPart] Successfully created part with all related data');
      return { part: normalizedPart, version: normalizedVersion };
    });
  } catch (error) {
    console.error('[createUnifiedPart] Error creating part:', error);
    throw error;
  }
}

/**
 * Update an existing part using the UnifiedPart schema
 * This function creates a new version of an existing part with updated data
 * @param partId ID of the part to update
 * @param unifiedPartData Complete UnifiedPart data with updated values
 * @param userId ID of the user making the update
 * @returns Object containing the updated part and its new version
 */
export async function updateUnifiedPart(
  partId: string,
  unifiedPartData: UnifiedPart,
  userId: string
): Promise<{ part: Part; version: PartVersion }> {
  try {
    console.log('[updateUnifiedPart] Starting update for part:', partId);
    
    // 1. Validate the part ID
    if (!partId || partId.trim() === '') {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
    }
    
    // 2. Validate the unified part data using the schema
    const validationResult = unifiedPartSchema.safeParse(unifiedPartData);
    if (!validationResult.success) {
      console.error('[updateUnifiedPart] Validation errors:', validationResult.error);
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: ${validationResult.error.message}`);
    }
    
    // 3. Begin transaction
    return await sql.begin(async (transaction) => {
      console.log('[updateUnifiedPart] Transaction started');
      
      // 4. Verify the part exists and lock the row
      const existingPartResult = await transaction`
        SELECT * FROM "Part" WHERE part_id = ${partId} FOR UPDATE
      `;
      
      if (existingPartResult.length === 0) {
        throw new Error(`${PART_ERRORS.NOT_FOUND}: Part with ID ${partId} not found`);
      }
      
      const existingPart = existingPartResult[0];
      console.log('[updateUnifiedPart] Found existing part:', existingPart.part_name);
      
      // 5. Create a new version ID for this update
      const newVersionId = crypto.randomUUID();
      
      // 6. Insert the new part version record with validated data
      const newVersionResult = await transaction`
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
          voltage_rating_min,
          voltage_rating_max,
          current_rating_min,
          current_rating_max,
          power_rating_max,
          tolerance,
          tolerance_unit,
          mounting_type,
          package_type,
          pin_count,
          operating_temperature_min,
          operating_temperature_max,
          storage_temperature_min,
          storage_temperature_max,
          temperature_unit,
          dimensions,
          dimensions_unit,
          part_weight,
          weight_unit,
          electrical_properties,
          mechanical_properties,
          thermal_properties,
          material_composition,
          environmental_data,
          version_status,
          revision_notes,
          created_by,
          released_at
        ) VALUES (
          ${newVersionId},
          ${partId},
          ${unifiedPartData.part_version},
          ${unifiedPartData.part_name},
          ${unifiedPartData.short_description || null},
          ${processJsonField(unifiedPartData.long_description)}::jsonb,
          ${unifiedPartData.functional_description || null},
          ${processJsonField(unifiedPartData.technical_specifications)}::jsonb,
          ${processJsonField(unifiedPartData.properties)}::jsonb,
          ${processNumericField(unifiedPartData.voltage_rating_min)},
          ${processNumericField(unifiedPartData.voltage_rating_max)},
          ${processNumericField(unifiedPartData.current_rating_min)},
          ${processNumericField(unifiedPartData.current_rating_max)},
          ${processNumericField(unifiedPartData.power_rating_max)},
          ${processNumericField(unifiedPartData.tolerance)},
          ${unifiedPartData.tolerance_unit || null},
          ${unifiedPartData.mounting_type || null},
          ${unifiedPartData.package_type || null},
          ${processNumericField(unifiedPartData.pin_count)},
          ${processNumericField(unifiedPartData.operating_temperature_min)},
          ${processNumericField(unifiedPartData.operating_temperature_max)},
          ${processNumericField(unifiedPartData.storage_temperature_min)},
          ${processNumericField(unifiedPartData.storage_temperature_max)},
          ${unifiedPartData.temperature_unit || null},
          ${processJsonField(unifiedPartData.dimensions)}::jsonb,
          ${unifiedPartData.dimensions_unit || null},
          ${processNumericField(unifiedPartData.part_weight)},
          ${unifiedPartData.weight_unit || null},
          ${processJsonField(unifiedPartData.electrical_properties)}::jsonb,
          ${processJsonField(unifiedPartData.mechanical_properties)}::jsonb,
          ${processJsonField(unifiedPartData.thermal_properties)}::jsonb,
          ${processJsonField(unifiedPartData.material_composition)}::jsonb,
          ${processJsonField(unifiedPartData.environmental_data)}::jsonb,
          ${unifiedPartData.version_status || LifecycleStatusEnum.DRAFT}::lifecycle_status_enum,
          ${unifiedPartData.revision_notes || null},
          ${userId},
          ${unifiedPartData.released_at || new Date()}
        ) RETURNING *
      `;
      
      if (newVersionResult.length === 0) {
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to create new version for part ${partId}`);
      }
      
      console.log('[updateUnifiedPart] Created new part version:', newVersionId);
      
      // 7. Update the main part record to point to this new version and update all relevant fields
      const updatedPartResult = await transaction`
        UPDATE "Part" SET 
          current_version_id = ${newVersionId},
          status_in_bom = ${unifiedPartData.status_in_bom}::part_status_enum,
          lifecycle_status = ${unifiedPartData.lifecycle_status}::lifecycle_status_enum,
          is_public = ${unifiedPartData.is_public !== undefined ? unifiedPartData.is_public : existingPart.is_public},
          global_part_number = ${unifiedPartData.global_part_number || existingPart.global_part_number},
          updated_at = ${sql.unsafe('NOW()')},
          updated_by = ${userId}
        WHERE part_id = ${partId}
        RETURNING *
      `;
      
      if (updatedPartResult.length === 0) {
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update part ${partId}`);
      }
      
      console.log('[updateUnifiedPart] Updated main part record');
      
      // 8. Handle related entities (manufacturer parts, supplier parts, etc.)
      
      // 8.1 Handle manufacturer parts
      if (Array.isArray(unifiedPartData.manufacturer_parts) && unifiedPartData.manufacturer_parts.length > 0) {
        console.log('[updateUnifiedPart] Processing manufacturer parts');
        
        for (const mfrPart of unifiedPartData.manufacturer_parts) {
          try {
            // Create a manufacturer part record with only the fields defined in the interface
            // Note that ManufacturerPartInput doesn't include all the fields we need for the function
            const mfrPartData = {
              manufacturer_id: mfrPart.manufacturer_id,
              manufacturer_part_number: mfrPart.manufacturer_part_number,
              manufacturer_part_description: mfrPart.manufacturer_part_description ,
              product_url: mfrPart.product_url,
              datasheet_url: mfrPart.datasheet_url,
              is_recommended: Boolean(mfrPart.is_recommended)
            };
            
            // Direct SQL insertion to avoid type issues with the helper function
            await transaction`
              INSERT INTO "ManufacturerPart" (
                manufacturer_part_id,
                part_version_id,
                manufacturer_id,
                manufacturer_part_number,
                manufacturer_part_description,               
                datasheet_url,
                product_url,
                is_recommended,
                created_by,
                created_at
              ) VALUES (
                ${crypto.randomUUID()},
                ${newVersionId},
                ${mfrPartData.manufacturer_id},
                ${mfrPartData.manufacturer_part_number},
                ${mfrPartData.manufacturer_part_description || null},             
                ${mfrPart.datasheet_url || null},
                ${mfrPartData.product_url || null},
                ${mfrPartData.is_recommended},
                ${userId},
                NOW()
              )
            `;
          } catch (mfrError: unknown) {
            console.error('[updateUnifiedPart] Error creating manufacturer part:', mfrError);
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${mfrError instanceof Error ? mfrError.message : String(mfrError)}`);
          }
        }
      }
      
      // 8.2 Handle supplier parts
      if (Array.isArray(unifiedPartData.supplier_parts) && unifiedPartData.supplier_parts.length > 0) {
        console.log('[updateUnifiedPart] Processing supplier parts');
        
        for (const supPart of unifiedPartData.supplier_parts) {
          try {
            // Create a supplier part record with only the fields we need
            const supPartData = {
              supplier_id: supPart.supplier_id,
              supplier_part_number: supPart.supplier_part_number,
              supplier_name: supPart.supplier_name,
              price: supPart.price,
              currency: supPart.currency,
              minimum_order_quantity: supPart.minimum_order_quantity,
              lead_time_days: supPart.lead_time_days,
              stock_quantity: supPart.stock_quantity
            };
            
            // Direct SQL insertion to avoid type issues with the helper function
            // Create a supplier part record directly with the transaction template
            // This follows the same pattern as the manufacturer part insertion above
            const supplierPartId = crypto.randomUUID();
            await transaction`
              INSERT INTO "SupplierPart" (
                supplier_part_id,
                part_version_id,
                supplier_id,
                supplier_part_number,
                supplier_name,
                description,
                status,
                min_order_quantity,
                lead_time_days,
                price,
                currency,
                stock_quantity,
                created_by,
                created_at
              ) VALUES (
                ${supplierPartId},
                ${newVersionId},
                ${supPartData.supplier_id},
                ${supPartData.supplier_part_number || ''},
                ${supPartData.supplier_name || null},
                ${null}, /* description */
                ${'ACTIVE'},
                ${supPartData.minimum_order_quantity || 0},
                ${supPartData.lead_time_days || 0},
                ${supPartData.price || 0},
                ${supPartData.currency || ''},
                ${supPartData.stock_quantity || 0},
                ${userId},
                NOW()
              )
            `;
          } catch (supError: unknown) {
            console.error('[updateUnifiedPart] Error creating supplier part:', supError);
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${supError instanceof Error ? supError.message : String(supError)}`);
          }
        }
      }
      
      // 8.3 Handle attachments
      if (Array.isArray(unifiedPartData.attachments) && unifiedPartData.attachments.length > 0) {
        console.log('[updateUnifiedPart] Processing attachments');
        
        for (const attachment of unifiedPartData.attachments) {
          try {
            // Generate a new ID for the attachment
            const attachmentId = crypto.randomUUID();
            
            // Direct database insertion instead of using helper function
            // since the function signature doesn't match the interface definition
            await transaction`
              INSERT INTO "PartAttachment" (
                attachment_id,
                part_version_id,
                attachment_type,
                file_name,
                file_url,
                file_size,
                file_type,
                description,
                created_by,
                created_at
              ) VALUES (
                ${attachmentId},
                ${newVersionId},
                ${attachment.attachment_type},
                ${attachment.file_name},
                ${attachment.file_url},
                ${attachment.file_size || 0},
                ${attachment.file_type || 'unknown'},
                ${attachment.description || null},
                ${userId},
                NOW()
              )
            `;
          } catch (attachError: unknown) {
            console.error('[updateUnifiedPart] Error creating attachment:', attachError);
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${attachError instanceof Error ? attachError.message : String(attachError)}`);
          }
        }
      }
      
      // 8.4 Handle representations
      if (Array.isArray(unifiedPartData.representations) && unifiedPartData.representations.length > 0) {
        console.log('[updateUnifiedPart] Processing representations');
        
        for (const representation of unifiedPartData.representations) {
          try {
            // Generate a new ID for the representation
            const representationId = crypto.randomUUID();
            
            // Direct database insertion instead of using helper function
            // since the function signature doesn't match the interface definition
            await transaction`
              INSERT INTO "PartRepresentation" (
                representation_id,
                part_version_id,
                representation_type,
                format,
                file_url,
                preview_url,
                metadata,
                is_recommended,
                created_by,
                created_at
              ) VALUES (
                ${representationId},
                ${newVersionId},
                ${representation.representation_type},
                ${representation.format || 'unknown'},
                ${representation.file_url},
                ${representation.preview_url || null},
                ${null}::jsonb, /* metadata */
                ${representation.is_recommended || false},
                ${userId},
                NOW()
              )
            `;
          } catch (repError: unknown) {
            console.error('[updateUnifiedPart] Error creating representation:', repError);
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${repError instanceof Error ? repError.message : String(repError)}`);
          }
        }
      }
      
      // 8.5 Handle compliance info
      if (Array.isArray(unifiedPartData.compliance_info) && unifiedPartData.compliance_info.length > 0) {
        console.log('[updateUnifiedPart] Processing compliance information');
        
        for (const compliance of unifiedPartData.compliance_info) {
          try {
            // Generate a new ID for the compliance record
            const complianceId = crypto.randomUUID();
            
            // Direct database insertion instead of using helper function
            // since the function signature doesn't match the interface definition
            await transaction`
              INSERT INTO "PartCompliance" (
                compliance_id,
                part_version_id,
                compliance_type,
                certificate_url,
                certified_at,
                expires_at,
                notes,
                created_by,
                created_at
              ) VALUES (
                ${complianceId},
                ${newVersionId},
                ${compliance.compliance_type}::compliance_type_enum,
                ${compliance.certificate_url || null},
                ${compliance.certified_at || new Date()},
                ${compliance.expires_at || null},
                ${compliance.notes || null},
                ${userId},
                NOW()
              )
            `;
          } catch (compError: unknown) {
            console.error('[updateUnifiedPart] Error creating compliance info:', compError);
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${compError instanceof Error ? compError.message : String(compError)}`);
          }
        }
      }
      
      // 8.6 Handle structural relationships
      if (Array.isArray(unifiedPartData.structure) && unifiedPartData.structure.length > 0) {
        console.log('[updateUnifiedPart] Processing structural relationships');
        
        for (const structure of unifiedPartData.structure) {
          try {
            // Direct SQL insertion to avoid parameter count issues
            await transaction`
              INSERT INTO "PartStructure" (
                structure_id,
                parent_part_id,
                child_part_id,
                relation_type,
                quantity,
                notes,
                created_by,
                created_at
              ) VALUES (
                ${crypto.randomUUID()},
                ${newVersionId},
                ${structure.child_part_id},
                ${structure.relation_type}::structural_relation_type_enum,
                ${structure.quantity},
                ${structure.notes || null},
                ${userId},
                NOW()
              )
            `;
          } catch (structError: unknown) {
            console.error('[updateUnifiedPart] Error creating structural relationship:', structError);
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${structError instanceof Error ? structError.message : String(structError)}`);
          }
        }
      }
      
      // 8.7 Handle part tags if available
      if (Array.isArray(unifiedPartData.part_tags) && unifiedPartData.part_tags.length > 0) {
        console.log('[updateUnifiedPart] Processing part tags');
        
        // First, clear existing tags for this version to avoid duplicates
        await transaction`
          DELETE FROM "PartTag" WHERE part_id = ${partId}
        `;
        
        // Then insert the new tags
        for (const tag of unifiedPartData.part_tags) {
          try {
            // Insert part tag based on the schema
            // Convert null values to proper SQL parameters with explicit string types
            const tagId = tag.tag_id || crypto.randomUUID();
            const tagName = tag.tag_name || '';
            const tagValue = 'tag_value' in tag && tag.tag_value !== null ? String(tag.tag_value) : null;
            
            await transaction`
              INSERT INTO "PartTag" (tag_id, part_id, tag_name, tag_value, created_by)
              VALUES (${tagId}, ${partId}, ${tagName}, ${tagValue}, ${userId})
            `;
          } catch (tagError: unknown) {
            console.error('[updateUnifiedPart] Error creating part tag:', tagError);
            // Don't fail the entire transaction for tag errors
          }
        }
      }
      
      // 8.8 Handle part version tags if available
      if (Array.isArray(unifiedPartData.part_version_tags) && unifiedPartData.part_version_tags.length > 0) {
        console.log('[updateUnifiedPart] Processing part version tags');
        
        for (const versionTag of unifiedPartData.part_version_tags) {
          try {
            // Direct SQL insertion to avoid property access and parameter count issues
            // Convert null values to proper SQL parameters with explicit string types
            const versionTagId = crypto.randomUUID();
            const versionTagName = versionTag.tag_name || '';
            const versionTagValue = 'tag_value' in versionTag && versionTag.tag_value !== null ? 
              String(versionTag.tag_value) : null;
            const versionTagCategory = 'tag_category' in versionTag && versionTag.tag_category !== null ? 
              String(versionTag.tag_category) : null;
            const versionTagColor = 'tag_color' in versionTag && versionTag.tag_color !== null ? 
              String(versionTag.tag_color) : null;
            
            await transaction`
              INSERT INTO "PartVersionTag" (
                part_version_tag_id,
                part_version_id,
                tag_name,
                tag_value,
                tag_category,
                tag_color,
                created_by,
                created_at
              ) VALUES (
                ${versionTagId},
                ${newVersionId},
                ${versionTagName},
                ${versionTagValue},
                ${versionTagCategory},
                ${versionTagColor},
                ${userId},
                NOW()
              )
            `;
          } catch (vTagError: unknown) {
            console.error('[updateUnifiedPart] Error creating part version tag:', vTagError);
            // Don't fail the entire transaction for tag errors
          }
        }
      }
      
      // 8.9 Handle categories if provided
      if (Array.isArray(unifiedPartData.categories) && unifiedPartData.categories.length > 0) {
        console.log('[updateUnifiedPart] Processing categories');
        
        for (const categoryId of unifiedPartData.categories) {
          if (categoryId && typeof categoryId === 'string') {
            try {
              // Use explicit string parameters instead of template literals to avoid type issues
              await transaction.unsafe(
                `INSERT INTO "PartVersionCategory" (part_version_id, category_id) VALUES ($1, $2)`,
                [newVersionId, categoryId]
              );
            } catch (categoryError: unknown) {
              console.error('[updateUnifiedPart] Error linking category:', categoryError);
              // Don't fail the entire transaction for category errors
            }
          }
        }
      }
      
      // 8.10 Handle part families if provided
      if (Array.isArray(unifiedPartData.family_ids) && unifiedPartData.family_ids.length > 0) {
        console.log('[updateUnifiedPart] Processing part families');
        
        // First remove existing family links for this part to prevent duplicates
        try {
          await transaction.unsafe(
            `DELETE FROM "PartFamilyLink" WHERE part_id = $1`,
            [partId]
          );
          
          for (const familyId of unifiedPartData.family_ids) {
            if (familyId && typeof familyId === 'string') {
              const linkId = crypto.randomUUID();
              await transaction.unsafe(
                `INSERT INTO "PartFamilyLink" (
                  part_family_link_id, part_id, family_id, created_by, created_at
                ) VALUES ($1, $2, $3, $4, NOW())`,
                [linkId, partId, familyId, userId]
              );
            }
          }
        } catch (familyError: unknown) {
          console.error('[updateUnifiedPart] Error handling part families:', familyError);
          // Don't fail the entire transaction for family errors
        }
      }
      
      // 8.11 Handle part groups if provided
      if (Array.isArray(unifiedPartData.group_ids) && unifiedPartData.group_ids.length > 0) {
        console.log('[updateUnifiedPart] Processing part groups');
        
        // First remove existing group links for this part to prevent duplicates
        try {
          await transaction.unsafe(
            `DELETE FROM "PartGroupLink" WHERE part_id = $1`,
            [partId]
          );
          
          for (const groupId of unifiedPartData.group_ids) {
            if (groupId && typeof groupId === 'string') {
              const linkId = crypto.randomUUID();
              await transaction.unsafe(
                `INSERT INTO "PartGroupLink" (
                  part_group_link_id, part_id, group_id, created_by, created_at
                ) VALUES ($1, $2, $3, $4, NOW())`,
                [linkId, partId, groupId, userId]
              );
            }
          }
        } catch (groupError: unknown) {
          console.error('[updateUnifiedPart] Error handling part groups:', groupError);
          // Don't fail the entire transaction for group errors
        }
      }
      
      // 8.12 Handle custom fields if provided
      if (unifiedPartData.custom_fields && Object.keys(unifiedPartData.custom_fields).length > 0) {
        console.log('[updateUnifiedPart] Processing custom fields');
        
        for (const [fieldId, fieldValue] of Object.entries(unifiedPartData.custom_fields)) {
          if (fieldId && fieldValue !== undefined) {
            try {
              // Process JSON field safely and use parameterized query
              const processedValue = processJsonField(fieldValue);
              await transaction.unsafe(
                `INSERT INTO "PartCustomField" (
                  part_version_id, field_id, custom_field_value
                ) VALUES ($1, $2, $3::jsonb)`,
                [newVersionId, fieldId, processedValue]
              );
            } catch (customFieldError: unknown) {
              console.error('[updateUnifiedPart] Error saving custom field:', customFieldError);
              // Don't fail the entire transaction for custom field errors
            }
          }
        }
      }
      
      // 9. Create a part revision record for this update
      try {
        // Create a properly formatted revision description
        const revisionDescription = `Updated part ${unifiedPartData.part_name || 'unnamed'} to version ${unifiedPartData.part_version || '0.0.0'}`;
        
        // Use properly typed parameters for the createPartRevision function
        await createPartRevision(
          newVersionId,
          '', // revision number - automatically assigned
          userId,
          'VERSION_UPDATE', // revision type
          revisionDescription,
          '', // No remarks in UnifiedPart interface
          ['part_name', 'status_in_bom', 'current_version_id'], // changed fields
          { // old values
            part_name: existingPart.part_name || '',
            status_in_bom: existingPart.status_in_bom || 'CONCEPT',
            current_version_id: existingPart.current_version_id || ''
          },
          { // new values
            part_name: unifiedPartData.part_name || '',
            status_in_bom: unifiedPartData.status_in_bom || 'CONCEPT',
            current_version_id: newVersionId
          },
          'APPROVED',
          userId,
          new Date(),
          `Part update: ${unifiedPartData.part_name || 'unnamed'} version ${unifiedPartData.part_version || '0.0.0'}`
        );
        console.log('[updateUnifiedPart] Created revision record for part update');
      } catch (revisionError: unknown) {
        console.error('[updateUnifiedPart] Error creating revision record:', revisionError);
        // Don't fail the update if revision creation fails
      }
      
      // 10. Get the final data to return (with proper type safety)
      const partIdParam = partId; // Ensure partId is a string
      const updatedPartData = await transaction`
        SELECT p.*, pv.*
        FROM "Part" p
        JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
        WHERE p.part_id = ${partIdParam}
      `;
      
      if (updatedPartData.length === 0) {
        throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to retrieve updated part data`);
      }
      
      // 11. Return normalized part and version data
      const normalizedPart = normalizePart(updatedPartData[0]);
      const normalizedVersion = normalizePartVersion(
        updatedPartData[0],
        updatedPartData[0].part_id,
        updatedPartData[0].part_version_id
      );
      
      console.log('[updateUnifiedPart] Successfully updated part with all related data');
      return { part: normalizedPart, version: normalizedVersion };
    });
  } catch (error) {
    console.error('[updateUnifiedPart] Error updating part:', error);
    throw error;
  }
}

// export async function updatePartWithStatus(
//   partId: string,
//   newVersionId: string,
//   newStatus: PartStatusEnum,
//   userId?: string
// ): Promise<void> {
//   try {
//     console.log(`[updatePartWithStatus] Updating part ${partId} with new version ${newVersionId} and status ${newStatus}`);
    
//     // Validate inputs
//     if (!partId || partId.trim() === '') {
//       throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
//     }
    
//     if (!newVersionId || newVersionId.trim() === '') {
//       throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid version ID`);
//     }
    
//     if (!Object.values(PartStatusEnum).includes(newStatus)) {
//       throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part status: ${newStatus}`);
//     }
    
//     // Begin transaction for atomic updates
//     await sql.begin(async (transaction) => {
//       console.log('[updatePartWithStatus] Transaction started');
      
//       // First, verify the version exists
//       const versionCheck = await transaction`
//         SELECT part_version_id, part_id FROM "PartVersion" 
//         WHERE part_version_id = ${newVersionId}
//       `;
      
//       if (versionCheck.length === 0) {
//         throw new Error(`${PART_ERRORS.NOT_FOUND}: Part version with ID ${newVersionId} not found`);
//       }
      
//       // Verify the version belongs to this part
//       if (versionCheck[0].part_id !== partId) {
//         throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Version ${newVersionId} does not belong to part ${partId}`);
//       }
      
//       // Lock the part row to prevent concurrent modifications
//       const lockResult = await transaction`
//         SELECT part_id FROM "Part" WHERE part_id = ${partId} FOR UPDATE
//       `;
      
//       if (lockResult.length === 0) {
//         throw new Error(`${PART_ERRORS.NOT_FOUND}: Part with ID ${partId} not found or could not be locked`);
//       }
      
//       console.log('[updatePartWithStatus] Part row locked for update');
      
//       // Update the part with the new version ID and status
//       const updateResult = await transaction`
//         UPDATE "Part"
//         SET 
//           current_version_id = ${newVersionId},
//           status_in_bom = ${newStatus}::part_status_enum,
//           updated_at = ${sql.unsafe('NOW()')},
//           updated_by = ${userId || null}
//         WHERE part_id = ${partId}
//         RETURNING part_id
//       `;
      
//       if (updateResult.length === 0) {
//         throw new Error(`${PART_ERRORS.GENERAL_ERROR}: Failed to update part ${partId}`);
//       }
      
//       console.log('[updatePartWithStatus] Part updated successfully');
      
//       // If we have a userId, create a revision record for this update
//       if (userId) {
//         try {
//           await createPartRevision(
//             newVersionId,
//             '', // revision number - automatically assigned
//             userId,
//             'STATUS_CHANGE',
//             `Changed part status to ${newStatus} and set as current version`,
//             '', // justification
//             ['status_in_bom', 'current_version_id'],
//             {}, // previous values - would require an additional query to get
//             { status_in_bom: newStatus, current_version_id: newVersionId },
//             'APPROVED',
//             userId,
//             new Date(),
//             ''
//           );
//           console.log('[updatePartWithStatus] Created revision record for status change');
//         } catch (revisionError: unknown) {
//           // Don't fail the update if revision creation fails
//           console.error('[updatePartWithStatus] Error creating revision record:', revisionError);
//         }
//       }
//     });
    
//     console.log('[updatePartWithStatus] Transaction committed successfully');
//   } catch (error: unknown) {
//     console.error('[updatePartWithStatus] Error:', error);
//     throw new Error(`${PART_ERRORS.GENERAL_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
//   }
// }

/**
 * Get a complete part as a UnifiedPart object
 * This function retrieves a part and all its related data, returning it as a unified structure
 * that conforms to the UnifiedPart schema. This ensures consistent data access across the application.
 * 
 * @param partId - ID of the part to retrieve
 * @returns Promise resolving to a complete UnifiedPart object or null if not found
 * @throws Error if database operation fails
 */
export async function getUnifiedPart(partId: string): Promise<UnifiedPart | null> {
  try {
    console.log(`[getUnifiedPart] Retrieving complete unified part data for part ${partId}`);
    
    // Validate input
    if (!partId || partId.trim() === '') {
      throw new Error(`${PART_ERRORS.VALIDATION_ERROR}: Invalid part ID`);
    }
    
    // 1. Get base part and current version data
    const partData = await getPartWithCurrentVersion(partId).catch(() => null);
    
    if (!partData) {
      console.log(`[getUnifiedPart] Part with ID ${partId} not found`);
      return null;
    }
    
    const { part, currentVersion } = partData;
    
    // Helper function to safely parse JSON strings to their proper types
    function parseJsonOrNull<T>(value: string | object | null | undefined): T | null {
      if (value === null || value === undefined) {
        return null;
      }
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return parsed as T;
      } catch (err) {
        console.error('Error parsing JSON:', err);
        return null;
      }
    }
    
    // 2. Begin building the UnifiedPart object with base properties
    const unifiedPart: UnifiedPart = {
      // Part core fields
      part_id: part.part_id,
      // Removed part_number as it's not in the UnifiedPart type
      part_name: currentVersion.part_name || '',
      short_description: currentVersion.short_description || '',
      status_in_bom: part.status_in_bom as PartStatusEnum,
      is_public: part.is_public,
      creator_id: part.creator_id,
      created_at: part.created_at,
      updated_at: part.updated_at,
      updated_by: part.updated_by,
      
      // Version fields
      part_version_id: currentVersion.part_version_id,
      part_version: currentVersion.part_version,
      version_status: currentVersion.version_status as LifecycleStatusEnum,
      lifecycle_status: currentVersion.version_status as LifecycleStatusEnum, // Required field in UnifiedPart
      released_at: currentVersion.released_at,
      // short_description is already set above
      long_description: currentVersion.long_description ? typeof currentVersion.long_description === 'string' ? currentVersion.long_description : parseJsonOrNull<StructuredDescription>(typeof currentVersion.long_description === 'string' ? currentVersion.long_description : JSON.stringify(currentVersion.long_description)) : null,
      functional_description: currentVersion.functional_description || null,
      revision_notes: currentVersion.revision_notes || null,
      
      // Physical properties
      part_weight: currentVersion.part_weight !== undefined ? Number(currentVersion.part_weight) : null,
      weight_unit: currentVersion.weight_unit ? (currentVersion.weight_unit as WeightUnitEnum) : null,
      dimensions: currentVersion.dimensions ? (() => {
        const parsed = parseJsonOrNull<Dimensions>(typeof currentVersion.dimensions === 'string' ? currentVersion.dimensions : JSON.stringify(currentVersion.dimensions));
        // Ensure null values are replaced with 0 to match the expected type
        if (parsed) {
          return {
            length: parsed.length ?? 0,
            width: parsed.width ?? 0,
            height: parsed.height ?? 0
          };
        }
        return null;
      })() : null,
      dimensions_unit: currentVersion.dimensions_unit ? (currentVersion.dimensions_unit as DimensionUnitEnum) : null,
      material_composition: currentVersion.material_composition ? parseJsonOrNull<JsonValue>(typeof currentVersion.material_composition === 'string' ? currentVersion.material_composition : JSON.stringify(currentVersion.material_composition)) : null,
      
      // Technical specifications
      technical_specifications: currentVersion.technical_specifications ? parseJsonOrNull<JsonValue>(typeof currentVersion.technical_specifications === 'string' ? currentVersion.technical_specifications : JSON.stringify(currentVersion.technical_specifications)) : null,
      properties: currentVersion.properties ? parseJsonOrNull<JsonValue>(typeof currentVersion.properties === 'string' ? currentVersion.properties : JSON.stringify(currentVersion.properties)) : null,
      
      // Component properties
      package_type: currentVersion.package_type ? (currentVersion.package_type as PackageTypeEnum) : null,
      mounting_type: currentVersion.mounting_type ? (currentVersion.mounting_type as MountingTypeEnum) : null,
      pin_count: currentVersion.pin_count !== undefined ? Number(currentVersion.pin_count) : null,
      tolerance: currentVersion.tolerance !== undefined ? Number(currentVersion.tolerance) : null,
      tolerance_unit: currentVersion.tolerance_unit || null,
      
      // Electrical properties
      electrical_properties: currentVersion.electrical_properties ? parseJsonOrNull<ElectricalProperties>(typeof currentVersion.electrical_properties === 'string' ? currentVersion.electrical_properties : JSON.stringify(currentVersion.electrical_properties)) : null,
      voltage_rating_min: currentVersion.voltage_rating_min !== undefined ? Number(currentVersion.voltage_rating_min) : null,
      voltage_rating_max: currentVersion.voltage_rating_max !== undefined ? Number(currentVersion.voltage_rating_max) : null,
      current_rating_min: currentVersion.current_rating_min !== undefined ? Number(currentVersion.current_rating_min) : null,
      current_rating_max: currentVersion.current_rating_max !== undefined ? Number(currentVersion.current_rating_max) : null,
      power_rating_max: currentVersion.power_rating_max !== undefined ? Number(currentVersion.power_rating_max) : null,
      
      // Mechanical properties
      mechanical_properties: currentVersion.mechanical_properties ? parseJsonOrNull<MechanicalProperties>(typeof currentVersion.mechanical_properties === 'string' ? currentVersion.mechanical_properties : JSON.stringify(currentVersion.mechanical_properties)) : null,
      
      // Thermal properties
      thermal_properties: currentVersion.thermal_properties ? parseJsonOrNull<ThermalProperties>(typeof currentVersion.thermal_properties === 'string' ? currentVersion.thermal_properties : JSON.stringify(currentVersion.thermal_properties)) : null,
      operating_temperature_min: currentVersion.operating_temperature_min !== undefined ? Number(currentVersion.operating_temperature_min) : null,
      operating_temperature_max: currentVersion.operating_temperature_max !== undefined ? Number(currentVersion.operating_temperature_max) : null,
      storage_temperature_min: currentVersion.storage_temperature_min !== undefined ? Number(currentVersion.storage_temperature_min) : null,
      storage_temperature_max: currentVersion.storage_temperature_max !== undefined ? Number(currentVersion.storage_temperature_max) : null,
      temperature_unit: currentVersion.temperature_unit ? (currentVersion.temperature_unit as TemperatureUnitEnum) : null,
      
      // Environmental data
      environmental_data: currentVersion.environmental_data ? parseJsonOrNull<EnvironmentalData>(typeof currentVersion.environmental_data === 'string' ? currentVersion.environmental_data : JSON.stringify(currentVersion.environmental_data)) : null,
      
      // Initialize arrays to be populated
      manufacturer_parts: [],
      supplier_parts: [],
      attachments: [],
      representations: [],
      part_tags: [],
      part_version_tags: [],
      structure: [],
      compliance_info: [],
      custom_fields: {}
    };
    
    // 3. Get manufacturer parts
    const manufacturerParts = await getManufacturerPartsForVersion(currentVersion.part_version_id);
    if (manufacturerParts && manufacturerParts.length > 0) {
      unifiedPart.manufacturer_parts = manufacturerParts.map(mp => ({
        manufacturer_id: mp.manufacturer_id,
        manufacturer_name: mp.manufacturer_name || '',
        manufacturer_part_number: mp.manufacturer_part_number,
        description: mp.description || null,
        datasheet_url: mp.datasheet_url || null,
        product_url: null, // This field may need to be populated from elsewhere
        is_recommended: mp.status === 'ACTIVE' // Mapping status to is_recommended
      }));
    }
    
    // 4. Get supplier parts
    try {
      const supplierParts = await getSupplierPartsForVersion(currentVersion.part_version_id);
      if (supplierParts && supplierParts.length > 0) {
        unifiedPart.supplier_parts = supplierParts.map(sp => ({
          supplier_id: sp.supplier_id,
          supplier_name: sp.supplier_name || '',
          supplier_part_number: sp.supplier_part_number || '',
          description: sp.manufacturer_part_description || null,
          url: sp.product_url || null, // Using the correct field name from schema
          currency_code: sp.currency || 'USD', // Using the correct field name from schema
          unit_price: sp.unit_price || 0,
          minimum_order_quantity: sp.minimum_order_quantity || 1,
          lead_time_weeks: sp.lead_time_days ? Math.ceil(sp.lead_time_days / 7) : null, // Convert days to weeks
          notes: sp.notes || null,
          manufacturer_part_index: 0, // Default value for required field
          is_preferred: sp.is_preferred === true // Default to false if not specified
        }));
      }
    } catch (error) {
      console.error('Error in getUnifiedPart:', error);
      // Continue with empty supplier parts
      unifiedPart.supplier_parts = [];
    }
    
    // 5. Get attachments
    try {
      const attachments = await getAttachmentsForVersion(currentVersion.part_version_id);
      if (attachments && attachments.length > 0) {
        unifiedPart.attachments = attachments.map(att => ({
          attachment_id: att.part_attachment_id, // Correct field name from schema
          file_name: att.file_name || '',
          file_url: att.file_url,
          file_type: att.file_type || null,
          description: att.attachment_description || null, // Correct field name from schema
          version: null, // No version field in schema
          uploaded_by: att.uploaded_by || null,
          uploaded_at: att.uploaded_at,
          attachment_type: att.attachment_type || 'DOCUMENT', // Default attachment type
          filename: att.file_name || '', // For backward compatibility
          is_primary: att.is_primary === true // Default to false if not specified
        }));
      }
    } catch (error) {
      console.error('Error mapping attachments:', error);
      unifiedPart.attachments = [];
    }
    
    // 6. Get representations (3D models, etc.)
    try {
      const representations = await getRepresentationsForVersion(currentVersion.part_version_id);
      if (representations && representations.length > 0) {
        unifiedPart.representations = representations.map(rep => ({
          representation_id: rep.part_representation_id, // Correct field name from schema
          representation_type: rep.representation_type,
          file_url: rep.file_url || '',
          file_format: rep.format, // Correct field name from schema
          description: rep.description || null,
          version: null, // No version field in schema
          created_by: rep.created_by || null,
          created_at: rep.created_at || new Date()
        }));
      }
    } catch (error) {
      console.error('Error mapping representations:', error);
      unifiedPart.representations = [];
    }
    
    // 7. Get tags - Since tag tables don't exist in the schema, initialize with empty arrays
    try {
      const tags = await getTagsForPart(part.part_id);
      // The getTagsForPart function now handles the missing tables and returns an empty array
      // We'll initialize the part_tags with an empty array to match the UnifiedPart schema
      unifiedPart.part_tags = [];
    } catch (error) {
      console.error('Error handling part tags:', error);
      unifiedPart.part_tags = [];
    }
    
    // 8. Get version tags - Since tag tables don't exist in the schema, initialize with empty arrays
    try {
      const versionTags = await getTagsForPartVersion(currentVersion.part_version_id);
      // The getTagsForPartVersion function now handles the missing tables and returns an empty array
      // We'll initialize the part_version_tags with an empty array to match the UnifiedPart schema
      unifiedPart.part_version_tags = [];
    } catch (error) {
      console.error('Error handling part version tags:', error);
      unifiedPart.part_version_tags = [];
    }
    
    // 9. Get part structure (BOM relationships)
    // Using the existing BOM structure function
    const structure = await getPartBomItems(part.part_id, currentVersion.part_version_id);
    if (structure && Array.isArray(structure) && structure.length > 0) {
      unifiedPart.structure = structure.map(rel => ({
        structure_id: rel.structure_id,
        child_part_id: rel.child_part_id,
        child_part_name: rel.child_part_name || '',
        child_part_number: rel.child_part_number || '',
        quantity: rel.quantity,
        relation_type: rel.relation_type as StructuralRelationTypeEnum,
        reference_designator: rel.reference_designator || null,
        notes: rel.notes || null
      }));
    }
    
    // 10. Get compliance information
    const compliance = await getComplianceForVersion(currentVersion.part_version_id);
    if (compliance && compliance.length > 0) {
      unifiedPart.compliance_info = compliance.map(comp => ({
        compliance_id: comp.compliance_id,
        compliance_type: comp.compliance_type as ComplianceTypeEnum,
        status: comp.status,
        reference_number: comp.reference_number || null,
        issue_date: comp.issue_date,
        expiry_date: comp.expiry_date || null,
        notes: comp.notes || null,
        documents: comp.documents || []
      }));
    }
    
    // 11. Get custom fields
    const customFields = await getCustomFieldsForVersion(currentVersion.part_version_id);
    if (customFields) {
      // Convert custom fields to the expected type
      unifiedPart.custom_fields = customFields;
    }
    
    return unifiedPart;
  } catch (error) {
    console.error('Error in getUnifiedPart:', error);
    return null;
  }
}

/**
 * Helper function to get manufacturer parts for a part version
 */
async function getManufacturerPartsForVersion(partVersionId: string): Promise<any[]> {
  console.log(`Getting manufacturer parts for version ${partVersionId}`);
  const result = await sql`
    SELECT mp.*, m.manufacturer_name
    FROM "ManufacturerPart" mp
    LEFT JOIN "Manufacturer" m ON mp.manufacturer_id = m.manufacturer_id
    WHERE mp.part_version_id = ${partVersionId}
  `;
  console.log(`Found ${result.length} manufacturer parts for version ${partVersionId}`);
  return result;
}

/**
 * Helper function to get supplier parts for a part version
 */
async function getSupplierPartsForVersion(partVersionId: string): Promise<any[]> {
  console.log(`Getting supplier parts for version ${partVersionId}`);
  const result = await sql`
    SELECT sp.*, s.supplier_name
    FROM "SupplierPart" sp
    LEFT JOIN "Supplier" s ON sp.supplier_id = s.supplier_id
    LEFT JOIN "ManufacturerPart" mp ON sp.manufacturer_part_id = mp.manufacturer_part_id
    WHERE mp.part_version_id = ${partVersionId}
  `;
  console.log(`Found ${result.length} supplier parts for version ${partVersionId}`);
  return result;
}

/**
 * Helper function to get attachments for a part version
 */
async function getAttachmentsForVersion(partVersionId: string): Promise<any[]> {
  console.log(`Getting attachments for version ${partVersionId}`);
  try {
    const result = await sql`
      SELECT * FROM "PartAttachment"
      WHERE part_version_id = ${partVersionId}
    `;
    console.log(`Found ${result.length} attachments for version ${partVersionId}`);
    return result;
  } catch (error) {
    console.error('Error getting attachments:', error);
    return [];
  }
}

/**
 * Helper function to get representations for a part version
 */
async function getRepresentationsForVersion(partVersionId: string): Promise<any[]> {
  console.log(`Getting representations for version ${partVersionId}`);
  try {
    const result = await sql`
      SELECT * FROM "PartRepresentation"
      WHERE part_version_id = ${partVersionId}
    `;
    console.log(`Found ${result.length} representations for version ${partVersionId}`);
    return result;
  } catch (error) {
    console.error('Error getting representations:', error);
    return [];
  }
}

/**
 * Helper function to get tags for a part
 */
async function getTagsForPart(partId: string): Promise<any[]> {
  try {
    // Since Tag/PartTag tables don't exist in the schema, return an empty array to avoid errors
    console.log(`Getting tags for part ${partId} - tables not present in schema`);
    return [];
  } catch (error) {
    console.error('Error getting tags for part:', error);
    return [];
  }
}

/**
 * Helper function to get tags for a part version
 */
async function getTagsForPartVersion(partVersionId: string): Promise<any[]> {
  try {
    // Since Tag/PartVersionTag tables don't exist in the schema, return an empty array to avoid errors
    console.log(`Getting tags for part version ${partVersionId} - tables not present in schema`);
    return [];
  } catch (error) {
    console.error('Error getting tags for part version:', error);
    return [];
  }
}

/**
 * Helper function to get compliance information for a part version
 */
async function getComplianceForVersion(partVersionId: string): Promise<any[]> {
  try {
    console.log(`Getting compliance for part version ${partVersionId}`);
    const result = await sql`
      SELECT * FROM "PartCompliance"
      WHERE part_version_id = ${partVersionId}
    `;
    console.log(`Found ${result.length} compliance records for version ${partVersionId}`);
    return result;
  } catch (error) {
    console.error('Error getting compliance for part version:', error);
    return [];
  }
}

/**
 * Helper function to get custom fields for a part version
 */
async function getCustomFieldsForVersion(partVersionId: string): Promise<JsonValue> {
  try {
    console.log(`Getting custom fields for part version ${partVersionId}`);
    const result = await sql`
      SELECT cf.field_name, pcf.custom_field_value as field_value
      FROM "PartCustomField" pcf
      JOIN "CustomField" cf ON pcf.field_id = cf.custom_field_id
      WHERE pcf.part_version_id = ${partVersionId}
    `;
    
    console.log(`Found ${result.length} custom fields for version ${partVersionId}`);
    
    // Convert array of rows to an object
    const customFields: Record<string, any> = {};
    for (const row of result) {
      try {
        if (typeof row.field_value === 'string') {
          customFields[row.field_name] = JSON.parse(row.field_value);
        } else {
          // If it's already a JSON object (JSONB from PostgreSQL)
          customFields[row.field_name] = row.field_value;
        }
      } catch (e) {
        // If it's not valid JSON, use the raw value
        customFields[row.field_name] = row.field_value;
      }
    }
    
    return customFields;
  } catch (error) {
    console.error('Error getting custom fields for part version:', error);
    return {};
  }
}

/**
 * Helper function to get part BOM items
 * Retrieves the structure relationships for a part's BOM
 */
async function getPartBomItems(partId: string, partVersionId: string): Promise<any[]> {
  try {
    console.log(`Getting BOM items for part ${partId} and version ${partVersionId}`);
    
    // Using PartStructure instead of Structure (per schema.sql)
    // Note: PartStructure doesn't have parent_part_version_id or is_deleted columns in the schema
    const result = await sql`
      SELECT ps.*, p.global_part_number as child_part_number, pv.part_name as child_part_name
      FROM "PartStructure" ps
      JOIN "Part" p ON ps.child_part_id = p.part_id
      JOIN "PartVersion" pv ON p.current_version_id = pv.part_version_id
      WHERE ps.parent_part_id = ${partId}
    `;
    
    console.log(`Found ${result.length} BOM items for part ${partId}`);
    return result;
  } catch (error) {
    console.error('Error getting part BOM items:', error);
    return [];
  }
}
