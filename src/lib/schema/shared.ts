// src/lib/schema/shared.ts
// Contains schemas that can be safely used in both client and server code

import {
    ComplianceTypeEnum,
    DimensionUnitEnum,
    LifecycleStatusEnum,
    MountingTypeEnum,
    PackageTypeEnum,
    PartStatusEnum,
    TemperatureUnitEnum,
    WeightUnitEnum
} from '@/types/types';
import { z } from 'zod';

// Helper schema for JSONB fields where the exact structure is not fixed
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];

// Create a more flexible JSON schema that can handle empty objects, strings, and nulls
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
    z.union([
        literalSchema, 
        z.array(jsonSchema), 
        z.record(jsonSchema)
    ])
);

// Separate schema specifically for handling empty objects in form data
export const formJsonSchema = z.union([
    jsonSchema,
    z.object({}).passthrough() // Allow empty objects for form data
]);

// Special schema for text fields that might be stored as JSON objects but should be strings in forms
export const jsonStringSchema = z.union([
    z.string().optional(),
    z.null(),
    z.object({}).transform(() => ""), // Transform empty objects to empty strings
    jsonSchema.transform(val => 
        // If it's a complex object, stringify it for form display
        typeof val === 'object' && val !== null ? JSON.stringify(val) : 
        // If null, return empty string
        val === null ? "" : 
        // Otherwise return as is (should be string)
        String(val)
    )
]);

// Helper function to create enum schemas that handle empty strings correctly
export function createEnumSchema<T>(enumSchema: T) {
  return z.union([
    enumSchema as any, // Use type assertion to accommodate both ZodEnum and ZodNativeEnum
    z.literal('').transform(() => null) // Transform empty strings to null
  ]).optional().nullable();
}

// Common dimension schema
export const dimensionSchema = z.object({
    length: z.number().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable()
});

// Edit dimension schema for forms
export const editDimensionSchema = z.union([
    dimensionSchema,
    z.null(),
    z.object({
        length: z.null(),
        width: z.null(),
        height: z.null()
    })
]);

// Enhanced base schema for Part entity forms with all fields needed for PartForm.svelte
export const partFormBaseSchema = z.object({
    // Core fields
    id: z.string().uuid().optional(),
    part_id: z.string().uuid().optional(),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/), 
    status: z.nativeEnum(LifecycleStatusEnum),
    partStatus: z.nativeEnum(PartStatusEnum).optional(), // Used for edit mode
    part_status: z.nativeEnum(PartStatusEnum), // Different from partStatus - used internally
    
    // Basic info
    short_description: z.string().optional().nullable(),
    full_description: jsonStringSchema.optional().nullable(),
    functional_description: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    global_part_number: z.string().optional().nullable(),
    internal_part_number: z.string().optional().nullable(),
    mpn: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    gtin: z.string().optional().nullable(),
    manufacturer_id: z.string().uuid().optional().nullable(),
    category_ids: z.string().optional(),
    manufacturer_parts: z.string().optional(),
    
    // Physical properties
    weight: z.number().optional().nullable(),
    weight_unit: createEnumSchema(z.nativeEnum(WeightUnitEnum)),
    dimensions: editDimensionSchema.optional(),
    dimensions_unit: createEnumSchema(z.nativeEnum(DimensionUnitEnum)),
    
    // Electrical properties
    voltage_rating_min: z.number().optional().nullable(),
    voltage_rating_max: z.number().optional().nullable(),
    current_rating_min: z.number().optional().nullable(),
    current_rating_max: z.number().optional().nullable(),
    power_rating_max: z.number().optional().nullable(),
    tolerance: z.number().optional().nullable(),
    tolerance_unit: createEnumSchema(z.string()),
    
    // Mechanical properties
    mounting_style: createEnumSchema(z.string()),
    package_case: createEnumSchema(z.string()),
    package_type: createEnumSchema(z.nativeEnum(PackageTypeEnum)),
    pin_count: z.number().optional().nullable(),
    termination_style: createEnumSchema(z.string()),
    material: createEnumSchema(z.string()),
    
    // Thermal properties
    operating_temperature_min: z.number().optional().nullable(),
    operating_temperature_max: z.number().optional().nullable(),
    storage_temperature_min: z.number().optional().nullable(),
    storage_temperature_max: z.number().optional().nullable(),
    temperature_unit: createEnumSchema(z.nativeEnum(TemperatureUnitEnum)),
    
    // Additional fields
    revision_notes: z.string().optional().nullable(),
    released_at: z.date().optional().nullable(),
    
    // JSON fields for complex properties
    technical_specifications: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    properties: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    electrical_properties: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    mechanical_properties: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    thermal_properties: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    material_composition: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    environmental_data: formJsonSchema.optional().nullable()
        .transform(val => val === null ? {} : val),
    
    // System fields
    is_public: z.boolean().default(false),
    custom_fields: jsonSchema.optional().nullable()
});

// Create Part schema - used for client-side validation
export const createPartSchema = partFormBaseSchema.extend({
    // Add any client-specific validations here
});

// Part version edit schema - used for editing existing parts
export const partVersionEditSchema = partFormBaseSchema.extend({
    // Make all fields optional for editing
    name: z.string().min(3).max(100).optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
    status: z.nativeEnum(LifecycleStatusEnum).optional()
});

// Category schema for client usage
export const categoryClientSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    parent_id: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    path: z.string().optional()
});

// Shared manufacturer schema for forms
export const manufacturerSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
    website_url: z.string().url('Invalid URL format').optional().nullable(),
    contact_info: jsonSchema.optional().nullable(),
    logo_url: z.string().url('Invalid URL format').optional().nullable(),
    created_by: z.string().uuid().optional(), 
    created_at: z.date().optional(), 
    updated_by: z.string().uuid().optional().nullable(),
    updated_at: z.date().optional()
});

// Shared category schema for forms
export const categorySchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Name is required'),
    parent_id: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    path: z.string().optional(),
    is_public: z.boolean().default(true),
    created_by: z.string().uuid().optional(),
    created_at: z.date().optional(),
    updated_by: z.string().uuid().optional().nullable(),
    updated_at: z.date().optional(),
    is_deleted: z.boolean().default(false),
    deleted_at: z.date().optional().nullable(),
    deleted_by: z.string().uuid().optional().nullable()
});

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
