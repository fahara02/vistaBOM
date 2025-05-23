import type { Dimensions, JsonValue, LongDescription, MaterialComposition } from "./primitive";
import { z } from "zod";
import { categoryFormSchema } from "$lib/schema/schema";
import type { 
  ElectricalProperties, 
  EnvironmentalData, 
  MechanicalProperties, 
  ThermalProperties 
} from "./schemaTypes";
import type {
  LifecycleStatusEnum,
  PartStatusEnum,
  ComplianceTypeEnum,
  StructuralRelationTypeEnum,
  WeightUnitEnum,
  DimensionUnitEnum,
  TemperatureUnitEnum,
  PackageTypeEnum,
  MountingTypeEnum
} from "./enums";

/**
 * Form data types specifically designed for handling form submissions
 * These types match the format expected by SuperForm and Zod validation
 */

// Base form interface for standard fields
export interface BaseFormData {
  id?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  created_by?: string;
  updated_by?: string;
}

// Revision form data
export interface RevisionRecordFormData {
  part_revision_id?: string;
  change_description: string;
  changed_by?: string;
  changed_fields: Record<string, any> | string;
  revision_date?: string | Date;
}

// Family link form data
export interface PartFamilyFormData {
  family_id: string;
  family_name?: string;
  family_code?: string;
  notes?: string;
}

// Group link form data
export interface PartGroupFormData {
  group_id: string;
  group_name?: string;
  group_type?: string;
  position_index?: number;
  notes?: string;
}

// Compliance info form data
export interface ComplianceFormData {
  compliance_type?: ComplianceTypeEnum;
  certificate_url?: string;
  certified_at?: string | Date;
  expires_at?: string | Date;
  notes?: string;
}

// Attachment form data
export interface AttachmentFormData {
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size_bytes?: number;
  file_path?: string;
  description?: string;
  attachment_description?: string; // For backwards compatibility
  attachment_type?: string;
  attachment_checksum?: string;
  is_primary?: boolean;
  thumbnail_url?: string;
  uploaded_by?: string;
  additional_data?: Record<string, any>;
}

// Representation form data
export interface RepresentationFormData {
  representation_type?: string;
  format?: string;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  metadata?: Record<string, any>;
  is_primary?: boolean;
  additional_data?: Record<string, any>;
}

// Structure form data
export interface StructureFormData {
  parent_part_id?: string;
  child_part_id?: string;
  relation_type?: StructuralRelationTypeEnum;
  quantity?: number;
  notes?: string;
}

// Manufacturer part form data
export interface ManufacturerPartFormData {
  manufacturer_id: string;
  manufacturer_name?: string;
  part_number?: string;
  manufacturer_part_number?: string;
  description?: string;
  status?: string;
  datasheet_url?: string;
  product_url?: string;
  is_recommended?: boolean;
}



export interface DashboardManufacturer {
  manufacturer_id: string;
  manufacturer_name: string;
  manufacturer_description?: string | undefined;
  website_url?: string | undefined;
  logo_url?: string | undefined;
  logoUrl?: string | undefined;
  contact_info?: JsonValue | undefined;
  custom_fields?: JsonValue | undefined;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | undefined;
}

// Supplier part form data
export interface SupplierPartFormData {
  supplier_id: string;
  supplier_name?: string;
  part_number?: string;
  supplier_part_number?: string;
  manufacturer_part_id?: string;
  description?: string;
  status?: string;
  product_url?: string;
  supplier_url?: string; // For backwards compatibility
  unit_price?: number;
  currency?: string;
  price_breaks?: Record<string, any>;
  stock_quantity?: number;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  is_preferred?: boolean;
  packaging_info?: Record<string, any>;
  pricing_info?: string;
}

export interface DashboardSupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_description?: string | undefined;
  website_url?: string | undefined;
  logo_url?: string | undefined;
  contact_info?: JsonValue | undefined;
  custom_fields?: JsonValue | undefined;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | undefined;
}

// Validation record form data
export interface ValidationRecordFormData {
  validated_by?: string;
  validation_date?: string | Date;
  test_results?: Record<string, any> | string;
  certification_info?: Record<string, any> | string;
  is_compliant?: boolean;
}

// Manufacturer form data
export interface ManufacturerFormData extends BaseFormData {
  manufacturer_id?: string;
  manufacturer_name: string;
  manufacturer_description?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  contact_info?: string | null; // Stringified JSON
  custom_fields?: string | null; // Stringified JSON
  custom_fields_json?: string | null; // Additional field for form UI, not in DB schema
}

// Supplier form data
export interface SupplierFormData extends BaseFormData {
  supplier_id?: string;
  supplier_name: string;
  supplier_description?: string | null;
  website_url?: string | null;
  contact_info?: string | null; // Stringified JSON
  logo_url?: string | null;
  custom_fields_json?: string | null;
}

// Part form data for creating/editing parts
export interface PartFormData extends BaseFormData {
  // Core part information
  part_id?: string;
  part_name: string;
  part_version: string;
  status_in_bom: PartStatusEnum;
  lifecycle_status: LifecycleStatusEnum; // Required with DEFAULT 'draft' in DB
  is_public: boolean; // Required with DEFAULT TRUE in DB
  global_part_number?: string;
  current_version_id?: string;
  released_at?: string | Date;
  
  // Part descriptions
  short_description?: string;
  functional_description?: string;
  long_description?: string | LongDescription;
  technical_specifications?: string | Record<string, JsonValue>;
  notes?: string;
  revision_notes?: string;
  
  // Identification numbers
  internal_part_number?: string;
  mpn?: string;
  sku?: string;
  gtin?: string;
  
  // Relationships
  category_ids?: string; // Comma-separated
  manufacturer_id?: string;
  
  // Complex relationship objects
  part_families?: string | PartFamilyFormData[];
  part_groups?: string | PartGroupFormData[];
  compliance_info?: string | ComplianceFormData[];
  attachments?: string | AttachmentFormData[];
  representations?: string | RepresentationFormData[];
  structure?: string | StructureFormData[];
  manufacturer_parts?: string | ManufacturerPartFormData[];
  supplier_parts?: string | SupplierPartFormData[];
  revision_records?: string | RevisionRecordFormData[];
  validation_records?: string | ValidationRecordFormData[];
  
  // Legacy relationship fields (for backward compatibility)
  family_ids?: string; // Comma-separated
  group_ids?: string; // Comma-separated
  tag_ids?: string; // Comma-separated
  
  // Physical properties
  part_weight?: number | string;
  weight_unit?: WeightUnitEnum;
  dimensions?: Dimensions | string;
  dimensions_unit?: DimensionUnitEnum;
  material_composition?: string | MaterialComposition;
  
  // Electrical properties
  voltage_rating_min?: number | string;
  voltage_rating_max?: number | string;
  current_rating_min?: number | string;
  current_rating_max?: number | string;
  power_rating_max?: number | string;
  tolerance?: number | string;
  tolerance_unit?: string;
  electrical_properties?: string | ElectricalProperties;
  
  // Mechanical properties
  mounting_type?: MountingTypeEnum;
  package_type?: PackageTypeEnum;
  mounting_style?: string;
  package_case?: string;
  pin_count?: number | string;
  termination_style?: string;
  material?: string;
  mechanical_properties?: string | MechanicalProperties;
  
  // Thermal properties
  operating_temperature_min?: number | string;
  operating_temperature_max?: number | string;
  storage_temperature_min?: number | string;
  storage_temperature_max?: number | string;
  temperature_unit?: TemperatureUnitEnum;
  thermal_properties?: string | ThermalProperties;
  
  // Environmental data
  environmental_data?: string | EnvironmentalData;
  
  // Version-specific fields
  previous_version_id?: string;
  change_description?: string;
  changed_fields?: string | Record<string, JsonValue>;
  
  // Custom fields
  custom_fields?: string | Record<string, JsonValue>;
  
  // Field to match the SQL properties column
  properties?: string | Record<string, JsonValue>;
  
  // For form handling
  version_status?: LifecycleStatusEnum;
}

// Part version form data for creating new versions
export interface PartVersionFormData extends PartFormData {
  part_id: string; // Required for version updates
}

/**
 * Server Response Types
 * These interfaces define the data structure returned by server responses
 * which may differ from the database schema format
 */

// Category form data
export interface CategoryFormData {
  category_name: string;
  parent_id?: string;
  category_description?: string | null;
  is_public: boolean;
}

// Category response from server in camelCase format
export interface ServerCategoryData {
  categoryId: string;
  categoryName: string;
  categoryDescription: string | null;
  categoryPath: string | null;
  parentId: string | null;
  parentName: string | null;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  createdBy: string;
  updatedBy: string | null;
  isDeleted?: boolean; // Optional since the server might not send this field
}