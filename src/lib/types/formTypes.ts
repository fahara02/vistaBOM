import type { Dimensions, JsonValue, LongDescription, MaterialComposition } from "./primitive";
import type { 
  ElectricalProperties, 
  EnvironmentalData, 
  MechanicalProperties, 
  ThermalProperties 
} from "./schemaTypes";

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

// Manufacturer form data
export interface ManufacturerFormData extends BaseFormData {
  manufacturer_id?: string;
  manufacturer_name: string;
  manufacturer_description?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  contact_info?: string | null; // Stringified JSON
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
  status_in_bom: string;
  lifecycle_status?: string;
  is_public?: boolean;
  
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
  family_ids?: string; // Comma-separated
  group_ids?: string; // Comma-separated
  tag_ids?: string; // Comma-separated
  
  // Physical properties
  part_weight?: number | string | null;
  weight_unit?: string | null;
  dimensions?: Dimensions | string | null;
  dimensions_unit?: string | null;
  material_composition?: string | MaterialComposition | null;
  
  // Electrical properties
  voltage_rating_min?: number | string | null;
  voltage_rating_max?: number | string | null;
  current_rating_min?: number | string | null;
  current_rating_max?: number | string | null;
  power_rating_max?: number | string | null;
  tolerance?: number | string | null;
  tolerance_unit?: string | null;
  electrical_properties?: string | ElectricalProperties | null;
  
  // Mechanical properties
  mounting_type?: string | null;
  package_type?: string | null;
  mounting_style?: string | null;
  package_case?: string | null;
  pin_count?: number | string | null;
  termination_style?: string | null;
  material?: string | null;
  mechanical_properties?: string | MechanicalProperties | null;
  
  // Thermal properties
  operating_temperature_min?: number | string | null;
  operating_temperature_max?: number | string | null;
  storage_temperature_min?: number | string | null;
  storage_temperature_max?: number | string | null;
  temperature_unit?: string | null;
  thermal_properties?: string | ThermalProperties | null;
  
  // Environmental data
  environmental_data?: string | EnvironmentalData | null;
  
  // Version-specific fields
  previous_version_id?: string;
  change_description?: string;
  changed_fields?: string | Record<string, JsonValue>;
  
  // Arrays as stringified JSON for form submission
  compliance_info?: string; // Stringified array
  attachments?: string; // Stringified array
  representations?: string; // Stringified array
  structure?: string; // Stringified array
  manufacturer_parts?: string; // Stringified array
  supplier_parts?: string; // Stringified array
  custom_fields?: string; // Stringified record
}

// Part version form data for creating new versions
export interface PartVersionFormData extends PartFormData {
  part_id: string; // Required for version updates
}