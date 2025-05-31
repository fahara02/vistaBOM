import { z } from 'zod';
import {
  LifecycleStatusEnum,
  PartStatusEnum,
  WeightUnitEnum,
  DimensionUnitEnum,
  PackageTypeEnum,
  MountingTypeEnum,
  TemperatureUnitEnum,
  StructuralRelationTypeEnum,
  ComplianceTypeEnum
} from '@/types/enums';

/**
 * Zod schema for UnifiedPart - matches the UnifiedPart interface structure
 * and can be used for form validation
 */
export const unifiedPartSchema = z.object({
  // Core Part data
  part_id: z.string().uuid().optional(),
  creator_id: z.string().optional(),
  global_part_number: z.string().nullable().optional(),
  status_in_bom: z.nativeEnum(PartStatusEnum).default(PartStatusEnum.CONCEPT),
  lifecycle_status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT),
  is_public: z.boolean().default(false),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  updated_by: z.string().optional(),
  current_version_id: z.string().optional(),
  custom_fields: z.record(z.string(), z.any()).optional(),
  
  // PartVersion data
  part_version_id: z.string().uuid().optional(),
  part_version: z.string().default('0.1.0'),
  part_name: z.string().min(1, { message: 'Part name is required' }),
  version_status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT),
  short_description: z.string().optional(),
  long_description: z.union([
    z.string(),
    z.object({
      sections: z.array(z.object({
        title: z.string().optional(),
        content: z.string()
      })),
      formatted_text: z.string().optional()
    }),
    z.null()
  ]).optional(),
  full_description: z.union([z.string(), z.record(z.string(), z.any()), z.null()]).optional(),
  functional_description: z.string().optional(),
  
  // Identifiers and categorization
  internal_part_number: z.string().nullable().optional(),
  manufacturer_part_number: z.string().nullable().optional(),
  mpn: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  category_ids: z.string().nullable().optional(),
  family_ids: z.string().nullable().optional(),
  group_ids: z.string().nullable().optional(),
  tag_ids: z.string().nullable().optional(),
  
  // Physical properties
  part_weight: z.number().nullable().optional(),
  weight_value: z.number().nullable().optional(), // Alias for part_weight
  weight_unit: z.nativeEnum(WeightUnitEnum).nullable().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number()
  }).nullable().optional(),
  dimensions_unit: z.nativeEnum(DimensionUnitEnum).nullable().optional(),
  package_type: z.nativeEnum(PackageTypeEnum).nullable().optional(),
  mounting_type: z.nativeEnum(MountingTypeEnum).nullable().optional(),
  pin_count: z.number().nullable().optional(),
  
  // Electrical properties
  voltage_rating_min: z.number().nullable().optional(),
  voltage_rating_max: z.number().nullable().optional(),
  current_rating_min: z.number().nullable().optional(),
  current_rating_max: z.number().nullable().optional(),
  power_rating_max: z.number().nullable().optional(),
  tolerance: z.number().nullable().optional(),
  tolerance_unit: z.string().nullable().optional(),
  electrical_properties: z.record(z.string(), z.any()).nullable().optional(),
  
  // Mechanical properties
  mechanical_properties: z.record(z.string(), z.any()).nullable().optional(),
  material_composition: z.string().nullable().optional(),
  
  // Thermal properties
  operating_temperature_min: z.number().nullable().optional(),
  operating_temperature_max: z.number().nullable().optional(),
  storage_temperature_min: z.number().nullable().optional(),
  storage_temperature_max: z.number().nullable().optional(),
  temperature_unit: z.nativeEnum(TemperatureUnitEnum).nullable().optional(),
  thermal_properties: z.record(z.string(), z.any()).nullable().optional(),
  
  // Environmental data
  environmental_data: z.record(z.string(), z.any()).nullable().optional(),
  
  // Technical data
  technical_specifications: z.record(z.string(), z.any()).nullable().optional(),
  properties: z.any().nullable().optional(),
  
  // Related items
  manufacturer_id: z.string().nullable().optional(),
  manufacturer_name: z.string().nullable().optional(),
  manufacturer_parts: z.array(
    z.object({
      manufacturer_id: z.string(),
      manufacturer_part_number: z.string(),
      description: z.string().nullable().optional(),
      datasheet_url: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      lifecycle_status: z.nativeEnum(LifecycleStatusEnum).nullable().optional(),
      is_recommended: z.boolean().optional(),
    })
  ).default([]),
 
  
  supplier_id: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  supplier_parts: z.array(
    z.object({
      supplier_id: z.string(),
      supplier_part_number: z.string(),
      price: z.number().optional(),
      unit_price: z.number().optional(), // Form field alias for price
      currency: z.string().optional(),
      stock_quantity: z.number().optional(),
      lead_time_days: z.number().optional(),
      minimum_order_quantity: z.number().optional(),
      packaging_info: z.any().nullable().optional(),
      product_url: z.string().nullable().optional(),
      manufacturer_part_index: z.number().default(0), // Add this field
      is_preferred: z.boolean().default(false),
    })
  ).default([]),
  
  // Attachments and representations
  attachments: z.array(
    z.object({
      attachment_type: z.string(),
      attachment_index: z.number().default(0),
      file_name: z.string(),
      file_url: z.string(),
      file_size: z.number().optional(),
      file_size_bytes: z.number().optional(), // Form field alias for file_size
      file_type: z.string().optional(),
      description: z.string().nullable().optional(),
      attachment_description: z.string().nullable().optional(), // Form field alias for description
      thumbnail_url: z.string().nullable().optional(),
      upload_date: z.date().optional(),
      uploaded_by: z.string().optional(),
       // Add this field
      is_primary: z.boolean().default(false),
    })
  ).default([]),
  
  representations: z.array(
    z.object({
      representation_type: z.string(),
      format: z.string().optional(),
      file_url: z.string(),
      file_path: z.string().optional(),
      preview_url: z.string().optional(),
      thumbnail_url: z.string().optional(),
      metadata: z.any().nullable().optional(),
      is_recommended: z.boolean().optional(),
      is_primary: z.boolean().default(false), 
    })
  ).default([]),
  
  // Part structure for assemblies
  structure: z.array(
    z.object({
      child_part_id: z.string(),
      quantity: z.number().default(1),
      relation_type: z.nativeEnum(StructuralRelationTypeEnum).optional(),
      notes: z.string().optional()
    })
  ).default([]),
  
  // Compliance information
  compliance_info: z.array(
    z.object({
      compliance_type: z.nativeEnum(ComplianceTypeEnum).optional(),
      compliance_type_id: z.string().optional(),
      notes: z.string().optional(),
      certificate_url: z.string().optional(),
      certified_at: z.date().optional(),
      expires_at: z.date().optional(),
      is_compliant: z.boolean().default(false),
    })
  ).default([]),
  
  // Validation and revision info
  revision_notes: z.string().nullable().optional(),
  released_at: z.date().nullable().optional(),
  
  // Tags and version tags
  part_tags: z.array(
    z.object({
      tag_id: z.string().optional(),
      tag_name: z.string(),
      tag_value: z.string().nullable().optional(),
      tag_category: z.string().nullable().optional(),
      tag_color: z.string().nullable().optional()
    })
  ).optional().default([]),
  
  part_version_tags: z.array(
    z.object({
      part_version_tag_id: z.string().optional(),
      part_version_id: z.string().optional(),
      tag_name: z.string(),
      tag_value: z.string().nullable().optional(),
      tag_category: z.string().nullable().optional(),
      tag_color: z.string().nullable().optional(),
      created_by: z.string().optional(),
      created_at: z.date().optional()
    })
  ).optional().default([])
});

// Export a type derived from the schema for type safety
export type UnifiedPartSchema = z.infer<typeof unifiedPartSchema>;
