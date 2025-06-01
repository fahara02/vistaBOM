/**
 * Types inferred from Zod schemas
 * This ensures type definitions are synchronized with validation rules
 */
import { z } from 'zod';
import {
  billOfMaterialsSchema,
  // Additional schemas
  bomItemSchema,
  bomItemSubstituteSchema,
  categoryClientSchema,
  // Core schemas
  categorySchema,
  createPartSchema,
  createPartVersionSchema,
  // Custom field schemas
  customFieldSchema,
  dimensionSchema,
  editDimensionSchema,
  jsonSchema,
  manufacturerCustomFieldSchema,
  manufacturerPartSchema,
  manufacturerSchema,
  partAttachmentSchema,
  partCustomFieldSchema,
  partFamilyLinkSchema,
  partFamilySchema,
  partFormBaseSchema,
  partGroupLinkSchema,
  partGroupSchema,
  partRepresentationSchema,
  partRevisionSchema,
  partSchema,
  partValidationSchema,
  partVersionEditSchema,
  partVersionSchema,
  partVersionSchemaBase,
  partVersionTagSchema,
  permissionSchema,
  projectSchema,
  rolePermissionSchema,
  roleSchema,
  sessionSchema,
  supplierCustomFieldSchema,
  supplierPartSchema,
  supplierSchema,
  tagSchema,
  userSchema
} from '../schema/schema';

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
} from './enums';

// Core entity types
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type RolePermission = z.infer<typeof rolePermissionSchema>;


// Category types
export type Category = z.infer<typeof categorySchema>;

// Part types
export type Part = z.infer<typeof partSchema>;
export type PartVersion = z.infer<typeof partVersionSchema>;
export type PartVersionBase = z.infer<typeof partVersionSchemaBase>;
export type CreatePart = z.infer<typeof createPartSchema>;
export type CreatePartVersion = z.infer<typeof createPartVersionSchema>;

// Attachment and representation types
//export type PartAttachment = z.infer<typeof partAttachmentSchema>;
//export type PartRepresentation = z.infer<typeof partRepresentationSchema>;

// Custom field types
export type CustomField = z.infer<typeof customFieldSchema>;
export type ManufacturerCustomField = z.infer<typeof manufacturerCustomFieldSchema>;
export type SupplierCustomField = z.infer<typeof supplierCustomFieldSchema>;
//export type PartCustomField = z.infer<typeof partCustomFieldSchema>;

// Other supporting types
export type Manufacturer = z.infer<typeof manufacturerSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type Dimensions = z.infer<typeof dimensionSchema>;
export type EditableDimensions = z.infer<typeof editDimensionSchema>;
export type JsonValue = z.infer<typeof jsonSchema>;

// Export types
export type PartFormData = z.infer<typeof createPartSchema>;
export type PartVersionEditData = z.infer<typeof partVersionEditSchema>;
export type CategoryClientData = z.infer<typeof categoryClientSchema>;
export type ManufacturerData = z.infer<typeof manufacturerSchema>;
export type CategoryData = z.infer<typeof categorySchema>;

// We need a simpler type for snake case conversion without complex mapped types
export type SnakeCasePartSchema = PartFormData & {
    // Add any specific snake_case properties that might be needed
    lifecycle_status?: LifecycleStatusEnum;  // Instead of status in some contexts
};




// Types for combined data fetching operations
export interface PartWithCurrentVersion extends Part {
  currentVersion?: PartVersion | null;
  categories?: Category[];
  customFields?: Record<string, JsonValue>; // Add custom fields support
}

export interface PartVersionWithRelations extends PartVersion {
  part?: Part | null;
  categories?: Category[];
  attachments?: PartAttachment[];
  representations?: PartRepresentation[];
  customFields?: Record<string, JsonValue>; // Custom fields support
}

// Project and BillOfMaterials types
export type Project = z.infer<typeof projectSchema>;
export type BillOfMaterials = z.infer<typeof billOfMaterialsSchema>;

// BOM related types
export type BOMItem = z.infer<typeof bomItemSchema>;
export type BOMItemSubstitute = z.infer<typeof bomItemSubstituteSchema>;

// Part relationship types
//export type PartRevision = z.infer<typeof partRevisionSchema>;
//export type PartValidation = z.infer<typeof partValidationSchema>;
export type Tag = z.infer<typeof tagSchema>;
//export type PartVersionTag = z.infer<typeof partVersionTagSchema>;

// Part organization types
//export type PartFamily = z.infer<typeof partFamilySchema>;
export type PartGroup = z.infer<typeof partGroupSchema>;
//export type PartFamilyLink = z.infer<typeof partFamilyLinkSchema>;
export type PartGroupLink = z.infer<typeof partGroupLinkSchema>;

// Part manufacturer/supplier types
//export type ManufacturerPart = z.infer<typeof manufacturerPartSchema>;
//export type SupplierPart = z.infer<typeof supplierPartSchema>;

// Form related types
export type PartFormBase = z.infer<typeof partFormBaseSchema>;

// CRUD operation types
export type CreateManufacturer = Omit<Manufacturer, 'manufacturer_id' | 'created_at' | 'updated_at'>;
export type UpdateManufacturer = Partial<Omit<Manufacturer, 'manufacturer_id' | 'created_at' | 'created_by'>>;

export type CreateSupplier = Omit<Supplier, 'supplier_id' | 'created_at' | 'updated_at'>;
export type UpdateSupplier = Partial<Omit<Supplier, 'supplier_id' | 'created_at' | 'created_by'>>;

export type CreateCategory = Omit<Category, 'category_id' | 'created_at' | 'updated_at' | 'category_path'>;
export type UpdateCategory = Partial<Omit<Category, 'category_id' | 'created_at' | 'created_by' | 'category_path'>>;

export type CreateTag = Omit<Tag, 'tag_id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at' | 'deleted_by'>;
export type UpdateTag = Partial<Omit<Tag, 'tag_id' | 'created_at' | 'created_by' | 'is_deleted' | 'deleted_at' | 'deleted_by'>>;

export type CreateProject = Omit<Project, 'project_id' | 'created_at' | 'updated_at'>;
export type UpdateProject = Partial<Omit<Project, 'project_id' | 'created_at'>>;

export type CreateBOM = Omit<BillOfMaterials, 'bom_id' | 'created_at' | 'updated_at' | 'released_at'>;
export type UpdateBOM = Partial<Omit<BillOfMaterials, 'bom_id' | 'created_at' | 'created_by'>>;

export type CreateBOMItem = Omit<BOMItem, 'bom_item_id' | 'created_at' | 'updated_at'>;
export type UpdateBOMItem = Partial<Omit<BOMItem, 'bom_item_id' | 'created_at' | 'created_by'>>;

export type CreateManufacturerPart = Omit<ManufacturerPart, 'manufacturer_part_id' | 'created_at' | 'updated_at'>;
export type UpdateManufacturerPart = Partial<Omit<ManufacturerPart, 'manufacturer_part_id' | 'created_at' | 'created_by'>>;

export type CreateSupplierPart = Omit<SupplierPart, 'supplier_part_id' | 'created_at' | 'updated_at'>;
export type UpdateSupplierPart = Partial<Omit<SupplierPart, 'supplier_part_id' | 'created_at' | 'created_by'>>;

export type CreatePartCustomField = Omit<PartCustomField, 'part_custom_field_id' | 'created_at' | 'updated_at'>;
export type UpdatePartCustomField = Partial<Omit<PartCustomField, 'part_custom_field_id' | 'created_at' | 'created_by'>>;

export type CreatePartAttachment = Omit<PartAttachment, 'part_attachment_id' | 'uploaded_at' | 'updated_at'>;
export type UpdatePartAttachment = Partial<Omit<PartAttachment, 'part_attachment_id' | 'uploaded_at' | 'uploaded_by'>>;

export type CreatePartRepresentation = Omit<PartRepresentation, 'part_representation_id' | 'created_at' | 'updated_at'>;
export type UpdatePartRepresentation = Partial<Omit<PartRepresentation, 'part_representation_id' | 'created_at' | 'created_by'>>;

/**
 * Additional utility types specific to the application
 * These help with type safety when working with form data
 */

// Define strict types for JSONB fields with known structures
export interface ElectricalProperties {
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
  [key: string]: number | string | boolean | null | undefined;
}

export interface MechanicalProperties {
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
  [key: string]: number | string | boolean | null | undefined;
}

export interface ThermalProperties {
  thermal_resistance?: number;
  thermal_conductivity?: number;
  specific_heat?: number;
  thermal_expansion?: number;
  thermal_time_constant?: number;
  heat_dissipation?: number;
  notes?: string;
  [key: string]: number | string | boolean | null | undefined;
}

export interface EnvironmentalData {
  rohs_compliant?: boolean;
  reach_compliant?: boolean;
  halogen_free?: boolean;
  moisture_sensitivity_level?: number;
  flammability_rating?: string;
  notes?: string;
  [key: string]: number | string | boolean | null | undefined;
}

// Advanced custom field interface that extends the Zod schema
export interface ExtendedPartCustomField extends PartCustomField {
  field_group?: string | null;
  display_order?: number | null;
  required: boolean;
  validation_regex?: string | null;
  validation_message?: string | null;
  options?: string[] | null;
}

/**
 * StructuredDescription - Defines the format for rich-text descriptions with sections
 * Used for long_description and other formatted content fields
 */
export interface StructuredDescription {
  sections?: Array<{
    title?: string;
    content: string;
  }>;
  formatted_text?: string;
}

/**
 * ManufacturerPartDefinition - Strongly-typed definition for manufacturer parts
 */
export interface ManufacturerPartDefinition {
  manufacturer_id: string;
  manufacturer_part_number: string;
  manufacturer_part_description?: string | null;
  datasheet_url?: string | null;
  product_url?: string | null;
  is_recommended: boolean;
}

/**
 * SupplierPartDefinition - Strongly-typed definition for supplier parts
 */
export interface SupplierPartDefinition {
  supplier_id: string;
  manufacturer_part_index: number;
  is_preferred: boolean;
  supplier_name?: string;
  supplier_part_number?: string | null;
  spn?: string;
  price?: number;
  currency?: string;
  stock_quantity?: number;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  packaging_info?: JsonValue | null;
  product_url?: string | null;
}

/**
 * AttachmentDefinition - Strongly-typed definition for attachments
 */
export interface AttachmentDefinition {
  attachment_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  upload_date?: Date;
  uploaded_by?: string;
  is_primary: boolean;
}

/**
 * RepresentationDefinition - Strongly-typed definition for 3D models and other representations
 */
export interface RepresentationDefinition {
  representation_type: string;
  format?: string;
  file_url: string;
  preview_url?: string;
  thumbnail_url?: string;
  metadata?: JsonValue | null;
  is_recommended?: boolean;
}

/**
 * PartStructureDefinition - Strongly-typed definition for part structure/assembly relationships
 */
export interface PartStructureDefinition {
  child_part_id: string;
  relation_type: StructuralRelationTypeEnum;
  quantity: number;
  notes?: string;
}

/**
 * ComplianceDefinition - Strongly-typed definition for compliance information
 */
export interface ComplianceDefinition {
  compliance_type: ComplianceTypeEnum;
  certificate_url?: string;
  certified_at?: Date;
  expires_at?: Date;
  notes?: string;
}

/**
 * Interface for the ManufacturerPart table
 */
export interface ManufacturerPart {
  manufacturer_part_id: string;
  part_version_id: string;
  manufacturer_id: string;
  manufacturer_part_number: string;
  manufacturer_part_description ?: string | null; 
  datasheet_url?: string | null;
  product_url?:string|null;
  is_recommended:boolean|null;
  created_by: string;
  created_at: Date;
  updated_by?: string | null;
  updated_at?: Date | null;
}

/**
 * Interface for the SupplierPart table
 */
export interface SupplierPart {
  supplier_part_id: string;
  part_version_id: string;
  supplier_id: string;
  supplier_name?: string | null; // Denormalized for convenience
  supplier_part_number: string;
  manufacturer_part_id?: string | null; // Optional link to manufacturer part
  description?: string | null;
  status: string; // e.g., 'ACTIVE', 'OBSOLETE', 'EOL', 'NRND'
  packaging?: string | null; // e.g., 'Reel', 'Tube', 'Tray'
  min_order_quantity?: number | null;
  lead_time_days?: number | null;
  created_by: string;
  created_at: Date;
  updated_by?: string | null;
  updated_at?: Date | null;
}







/**
 * Interface for the PartAttachment table representing files attached to parts
 */
export interface PartAttachment {
  part_attachment_id: string;
  part_version_id: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  file_path: string;
  description?: string | null;
  upload_date: Date;
  uploaded_by: string;
  is_primary: boolean;
}
/**
 * Interface for the PartCompliance table representing compliance certifications
 */
export interface PartCompliance {
  part_compliance_id: string;
  part_version_id: string;
  compliance_type: ComplianceTypeEnum;
  certificate_url?: string | null;
  certified_at?: Date | null;
  expires_at?: Date | null;
  notes?: string | null;
  created_at: Date;
  updated_at?: Date | null;
}

/**
 * Interface for the PartCustomField table representing custom properties
 */
export interface PartCustomField {
  part_custom_field_id: string;
  part_version_id: string;
  field_name: string;
  field_value: JsonValue; // Can be any JSON value
  field_type: string; // e.g., 'STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'ARRAY'
  field_group?: string | null; // For grouping related fields
  display_order?: number | null; // For controlling display order in UI
  required: boolean;
  validation_regex?: string | null;
  validation_message?: string | null;
  options?: string[] | null; // For enum/drop-down fields
  created_by: string;
  created_at: Date;
  updated_by?: string | null;
  updated_at?: Date | null;
}


/**
 * Part Family interfaces
 */
export interface PartFamily {
  id: string;
  part_family_id: string;
  family_name: string;
  family_description?: string | null;
  family_code?: string | null;
  family_image_url?: string | null;
  createdBy?: string; 
  created_by?: string;
  createdAt: Date;
  created_at: Date;
  updatedBy?: string;
  updated_by?: string;
  updatedAt?: Date;
  updated_at?: Date;
  is_public: boolean;
  is_active: boolean;
}

export interface PartFamilyLink {
  part_family_link_id: string;
  part_id: string;
  family_id: string;
  created_by: string;
  created_at: Date;
}

export interface PartFamilyFormData {
  part_family_id?: string;
  family_name: string;
  family_description?: string | null;
  family_code?: string | null;
  family_image_url?: string | null;
  created_by?: string;
  created_at?: Date | string;
  updated_by?: string; 
  updated_at?: Date | string;
  is_public?: boolean;
  is_active?: boolean;
}

/**
 * Interface for the PartRepresentation table representing visual models for parts
 */
export interface PartRepresentation {
  part_representation_id: string;
  part_version_id: string;
  representation_type: string; // e.g., '3D_MODEL', '2D_DRAWING', 'ICON', 'THUMBNAIL'
  file_name: string;
  file_format: string; // e.g., 'STEP', 'STL', 'PNG', 'SVG'
  file_path: string;
  file_size_bytes: number;
  resolution?: string | null; // for images, format: '1024x768'
  thumbnail_path?: string | null;
  created_at: Date;
  created_by: string;
  is_primary: boolean;
}


/**
 * Interface for the PartRevision table tracking changes to parts
 */
export interface PartRevision {
  part_revision_id: string;
  part_version_id: string;
  revision_number: string;
  revision_date: Date;
  revised_by: string;
  change_type: string; // e.g., 'INITIAL', 'MINOR', 'MAJOR', 'OBSOLETE'
  change_description: string;
  change_justification?: string | null;
  affected_fields?: string[] | null; 
  previous_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  approval_status: string; // e.g., 'PENDING', 'APPROVED', 'REJECTED'
  approved_by?: string | null;
  approved_at?: Date | null;
  comments?: string | null;
}

/**
 * Interface for the PartStructure table representing parent-child relationships between parts
 */
export interface PartStructure {
  part_structure_id: string;
  parent_part_id: string;
  child_part_id: string;
  relation_type: StructuralRelationTypeEnum;
  quantity: number;
  notes?: string | null;
  created_by: string;
  created_at: Date;
  updated_by?: string | null;
  updated_at: Date;
  valid_from: Date;
  valid_until?: Date | null;
}

/**
 * Interface for the PartValidation table tracking validation events for parts
 */
export interface PartValidation {
  part_validation_id: string;
  part_version_id: string;
  validation_type: string; // e.g., 'DESIGN_REVIEW', 'QUALITY_CHECK', 'SPECIFICATION_VALIDATION'
  validation_status: string; // e.g., 'PENDING', 'PASSED', 'FAILED', 'WAIVED'
  validation_date: Date;
  validated_by: string;
  waived_by?: string | null;
  waiver_reason?: string | null;
  waiver_date?: Date | null;
  validation_method: string; // e.g., 'PHYSICAL_TEST', 'SIMULATION', 'INSPECTION'
  test_procedure?: string | null;
  test_results?: Record<string, any> | null;
  issues_found?: string[] | null;
  corrective_actions?: string[] | null;
  attachments?: string[] | null; // Array of attachment IDs
  notes?: string | null;
}

/**
 * Interface for the PartVersionTag table representing tags associated with part versions
 */
export interface PartTag {
  tag_id: string;  
  tag_name: string;
  tag_description?: string;
  created_by: string;
  created_at: Date;
  updated_by:string;
  updated_at:Date;
  deleted_by:string;
  deleted_at:Date;
  is_deleted:Boolean;
}





/**
 * Interface for the PartVersionTag table representing tags associated with part versions
 */
export interface PartVersionTag {
  part_version_tag_id: string;
  part_version_id: string;
  tag_name: string;
  tag_value?: string | null;
  tag_category?: string | null;
  tag_color?: string | null;
  created_by: string;
  created_at: Date;
}






/**
 * UnifiedPart - Comprehensive type that unifies all part-related data into a single source of truth
 * This helps eliminate bugs caused by multiple inconsistent types throughout the application
 * All part-related data should be derived from this type
 */
export interface UnifiedPart {
  // Core Part data - reuse the Part type
  part_id: Part['part_id'];
  creator_id: Part['creator_id'];
  global_part_number?: Part['global_part_number'];
  status_in_bom: PartStatusEnum;
  lifecycle_status: LifecycleStatusEnum;
  is_public: Part['is_public'];
  created_at: Part['created_at'];
  updated_by?: Part['updated_by'];
  updated_at: Part['updated_at'];
  current_version_id?: Part['current_version_id'];
  custom_fields?: Part['custom_fields'];
  
  // PartVersion data - reuse the PartVersion type
  part_version_id: PartVersion['part_version_id'];
  part_version: PartVersion['part_version'];
  part_name: PartVersion['part_name'];
  version_status: LifecycleStatusEnum;
  short_description?: PartVersion['short_description'];
  long_description?: string | StructuredDescription | null;
  functional_description?: PartVersion['functional_description'];
  
  // Identifiers and categorization from CreatePart/CreatePartVersion
  internal_part_number?: string | null;
  manufacturer_part_number?: string | null;
  mpn?: string | null;
  gtin?: string | null;
  category_ids?: string | null; // Comma-separated list of category IDs
  family_ids?: string | null; // Comma-separated list of family IDs
  group_ids?: string | null; // Comma-separated list of group IDs
  tag_ids?: string | null; // Comma-separated list of tag IDs
  
  // Physical properties from PartVersion
  part_weight?: PartVersion['part_weight'];
  weight_unit?: WeightUnitEnum | null;
  weight_value?: number | null; // Alias for part_weight used in forms
  dimensions?: Dimensions | null;
  dimensions_unit?: DimensionUnitEnum | null;
  package_type?: PackageTypeEnum | null;
  mounting_type?: MountingTypeEnum | null;
  pin_count?: PartVersion['pin_count'];
  
  // Electrical properties from PartVersion
  voltage_rating_min?: PartVersion['voltage_rating_min'];
  voltage_rating_max?: PartVersion['voltage_rating_max'];
  current_rating_min?: PartVersion['current_rating_min'];
  current_rating_max?: PartVersion['current_rating_max'];
  power_rating_max?: PartVersion['power_rating_max'];
  tolerance?: PartVersion['tolerance'];
  tolerance_unit?: PartVersion['tolerance_unit'];
  electrical_properties?: ElectricalProperties | null;
  
  // Mechanical properties 
  mechanical_properties?: MechanicalProperties | null;
  material_composition?: PartVersion['material_composition'];
  
  // Thermal properties from PartVersion
  operating_temperature_min?: PartVersion['operating_temperature_min'];
  operating_temperature_max?: PartVersion['operating_temperature_max'];
  storage_temperature_min?: PartVersion['storage_temperature_min'];
  storage_temperature_max?: PartVersion['storage_temperature_max'];
  temperature_unit?: TemperatureUnitEnum | null;
  thermal_properties?: ThermalProperties | null;
  
  // Environmental data from PartVersion
  environmental_data?: EnvironmentalData | null;
  
  // Technical data
  technical_specifications?: PartVersion['technical_specifications'];
  properties?: JsonValue | null;
  
  // Related items - use our strongly-typed definitions
  manufacturer_id?: string | null;
  manufacturer_name?: string | null; // Add manufacturer_name for display purposes
  manufacturer_parts: ManufacturerPartDefinition[];
  
  supplier_parts: SupplierPartDefinition[];
  supplier_name?: string | null; // Add supplier_name for display purposes
  supplier_id?: string | null;
  
  // Attachments and representations - use our strongly-typed definitions
  attachments: AttachmentDefinition[];
  
  representations: RepresentationDefinition[];
  
  // Part structure for assemblies
  structure: PartStructureDefinition[];
  
  // Compliance information
  compliance_info: ComplianceDefinition[];
  
  // Validation and revision
  revision_notes?: PartVersion['revision_notes'];
  released_at?: PartVersion['released_at'];
  
  // Categories, manufacturers, and suppliers as full objects (not just IDs)
  categories?: Array<Category>;
  manufacturer?: Manufacturer;
  suppliers?: Array<Supplier>;
  
  // Tags and version tags
  part_tags?: Array<Tag>;
  part_version_tags?: Array<PartVersionTag>;
  
  // Additional fields used in form handling but not stored directly
  full_description?: string | StructuredDescription | null; // Alias for long_description with proper typing
}
