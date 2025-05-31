/**
 * Database-specific type definitions
 * This file contains types for database interactions and fixes type conflicts
 */
import type postgres from 'postgres';
import type { Row } from 'postgres';
import type { 
    JsonValue, 
    Dimensions 
} from './primitive';
import type {
    ElectricalProperties,
    MechanicalProperties,
    ThermalProperties,
    EnvironmentalData
} from './schemaTypes';

/**
 * PostgreSQL-compatible JSON value type that can be used with sql.json
 * This matches what Postgres.js expects for JSON serialization
 */
export type PostgresJsonValue = string | number | boolean | null | PostgresJsonObject | PostgresJsonArray;
export interface PostgresJsonObject { [key: string]: PostgresJsonValue }
export type PostgresJsonArray = Array<PostgresJsonValue>;


/**
 * Type alias for database-compatible JSON to ensure consistency
 */
export type DbJson = JsonValue;



/**
 * Type for PostgreSQL transaction from postgres.js library
 */
export type PostgresTransaction = postgres.TransactionSql<Record<string, unknown>>;

/**
 * Type for database rows returned from queries
 */
export type DbRow = Row;

/**
 * Flexible JSON field processor function type
 */
export interface JsonFieldProcessor {
    (fieldValue: unknown, fieldName: string): unknown;
}

/**
 * Numeric field processor function type
 */
export interface NumericFieldProcessor {
    (value: unknown): number | null;
}

/**
 * Type for update values in database operations
 */
export interface UpdateValues {
    [key: string]: unknown;
}

/**
 * Type for JSON fields in database operations
 */
export interface JsonFields {
    [key: string]: JsonValue;
}

/**
 * Input type for manufacturer part data
 */
export interface ManufacturerPartInput {
    manufacturer_id: string;
    part_number?: string;
    manufacturer_part_number?: string;
    manufacturer_name?: string;
    description?: string;
    [key: string]: unknown;
}

/**
 * Input type for supplier part data
 */
export interface SupplierPartInput {
    supplier_id: string;
    part_number?: string;
    supplier_part_number?: string;
    supplier_name?: string;
    manufacturer_part_id?: string;
    description?: string;
    [key: string]: unknown;
}

/**
 * Input type for attachment data
 */
export interface AttachmentInput {
    file_name?: string;
    file_size_bytes?: number;
    file_type?: string;
    file_url?: string;
    description?: string;
    attachment_description?: string;
    is_primary?: boolean;
    [key: string]: unknown;
}

/**
 * Input type for representation data
 */
export interface RepresentationInput {
    representation_type?: string;
    file_name?: string;
    format?: string;
    file_url?: string;
    file_size_bytes?: number;
    metadata?: unknown;
    additional_data?: unknown;
    is_primary?: boolean;
    [key: string]: unknown;
}

/**
 * Input type for compliance data
 */
export interface ComplianceInput {
    compliance_type?: string;
    certificate_url?: string;
    certified_at?: string | Date;
    expires_at?: string | Date | null;
    notes?: string;
    [key: string]: unknown;
}

/**
 * Input type for validation data
 */
export interface ValidationInput {
    test_results?: string | Record<string, unknown>;
    certification_info?: string | string[];
    notes?: string;
    is_compliant?: boolean;
    [key: string]: unknown;
}

/**
 * Database-safe versions of schema types that avoid type conflicts
 * Used for database operations where JSON compatibility is required
 */
export interface DbElectricalProperties extends Record<string, unknown> {
    resistance?: number;
    capacitance?: number;
    inductance?: number;
    impedance?: number;
    frequency?: number;
    frequency_unit?: string;
    dielectric_constant?: number;
    dielectric_strength?: number;
    polarized?: boolean;
    notes?: string;
}

export interface DbMechanicalProperties extends Record<string, unknown> {
    hardness?: number;
    tensile_strength?: number;
    compression_strength?: number;
    material_density?: number;
    finish?: string;
    surface_treatment?: string;
    vibration_resistance?: string;
    shock_resistance?: string;
    ip_rating?: string;
    notes?: string;
}

export interface DbThermalProperties extends Record<string, unknown> {
    thermal_resistance?: number;
    thermal_conductivity?: number;
    specific_heat?: number;
    thermal_expansion?: number;
    thermal_time_constant?: number;
    heat_dissipation?: number;
    notes?: string;
}

export interface DbEnvironmentalData extends Record<string, unknown> {
    rohs_compliant?: boolean;
    reach_compliant?: boolean;
    halogen_free?: boolean;
    moisture_sensitivity_level?: number;
    flammability_rating?: string;
    notes?: string;
}

/**
 * Dynamic record type for flexible object structures
 */
export type DynamicRecord = Record<string, unknown>;

/**
 * Type for field values that can be processed for database storage
 * Used to replace 'any' types in various field processors
 */
export type ProcessableFieldValue = string | number | boolean | null | undefined | JsonValue | Record<string, unknown>;

/**
 * Type for database update values in key-value form
 * Used to replace 'any' in Record<string, any> contexts
 */
export type DbUpdateValue = string | number | boolean | null | JsonValue | postgres.Serializable; 