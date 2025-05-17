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

import type { LifecycleStatusEnum } from './enums';

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
export type PartAttachment = z.infer<typeof partAttachmentSchema>;
export type PartRepresentation = z.infer<typeof partRepresentationSchema>;

// Custom field types
export type CustomField = z.infer<typeof customFieldSchema>;
export type ManufacturerCustomField = z.infer<typeof manufacturerCustomFieldSchema>;
export type SupplierCustomField = z.infer<typeof supplierCustomFieldSchema>;
export type PartCustomField = z.infer<typeof partCustomFieldSchema>;

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
export type PartRevision = z.infer<typeof partRevisionSchema>;
export type PartValidation = z.infer<typeof partValidationSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type PartVersionTag = z.infer<typeof partVersionTagSchema>;

// Part organization types
export type PartFamily = z.infer<typeof partFamilySchema>;
export type PartGroup = z.infer<typeof partGroupSchema>;
export type PartFamilyLink = z.infer<typeof partFamilyLinkSchema>;
export type PartGroupLink = z.infer<typeof partGroupLinkSchema>;

// Part manufacturer/supplier types
export type ManufacturerPart = z.infer<typeof manufacturerPartSchema>;
export type SupplierPart = z.infer<typeof supplierPartSchema>;

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
