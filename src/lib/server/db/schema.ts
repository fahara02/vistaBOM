// src/lib/server/db/schema.ts
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
} from '@/types/types';
import { z } from 'zod';

// Helper schema for JSONB fields where the exact structure is not fixed
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
    z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

// Helper function to create enum schemas that handle empty strings correctly
function createEnumSchema<T>(enumSchema: T) {
  return z.union([
    enumSchema as any, // Use type assertion to accommodate both ZodEnum and ZodNativeEnum
    z.literal('').transform(() => null) // Transform empty strings to null
  ]).optional().nullable();
}

// User Schema
export const userSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    username: z.string().optional().nullable(), // UNIQUE in DB, but nullable
    email: z.string().email(), // UNIQUE NOT NULL
    full_name: z.string().optional().nullable(),
    password_hash: z.string().optional().nullable(),
    google_id: z.string().optional().nullable(), // UNIQUE
    avatar_url: z.string().url().optional().nullable(), // CHECK (avatar_url ~ '^https?://')
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    last_login_at: z.date().optional().nullable(), // TIMESTAMPTZ
    is_active: z.boolean(), // BOOLEAN DEFAULT TRUE NOT NULL
    is_admin: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    is_deleted: z.boolean() // BOOLEAN DEFAULT FALSE NOT NULL
});

// ### Session Schema
export const sessionSchema = z.object({
    id: z.string(), // TEXT PRIMARY KEY
    user_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    expires_at: z.date(), // TIMESTAMPTZ NOT NULL
    last_used: z.date() // TIMESTAMPTZ DEFAULT NOW()
});

// ### Role Schema
export const roleSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT UNIQUE NOT NULL CHECK (name <> '')
    description: z.string().optional().nullable(), // TEXT
    created_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### Permission Schema
export const permissionSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (name <> '')
    description: z.string().optional().nullable() // TEXT
});

// ### RolePermission Schema
export const rolePermissionSchema = z.object({
    role_id: z.string().uuid(), // UUID NOT NULL REFERENCES Role(id)
    permission_id: z.string().uuid(), // UUID NOT NULL REFERENCES Permission(id)
    assigned_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    assigned_by: z.string().uuid().optional().nullable() // UUID REFERENCES "User"(id)
    // PRIMARY KEY (role_id, permission_id)
});

// ### Category Schema
export const categorySchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT NOT NULL CHECK (name <> '')
    parent_id: z.string().uuid().optional().nullable(), // UUID REFERENCES Category(id)
    description: z.string().optional().nullable(), // TEXT
    path: z.string(), // LTREE (represented as string)
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    is_public: z.boolean(), // BOOLEAN DEFAULT TRUE NOT NULL
    is_deleted: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    deleted_at: z.date().optional().nullable(), // TIMESTAMPTZ
    deleted_by: z.string().uuid().optional().nullable() // UUID REFERENCES "User"(id)
});

// ### Dimension Schemas
export const dimensionSchema = z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive()
});

export const editDimensionSchema = z.union([
    dimensionSchema,
    z.null(),
    z.object({
        length: z.null(),
        width: z.null(),
        height: z.null()
    })
]);

// ### Part Schema (Updated with snake_case)
export const partSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    creator_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    global_part_number: z.string().optional().nullable(), // TEXT
    part_status: z.nativeEnum(PartStatusEnum).default(PartStatusEnum.CONCEPT), // Renamed 'status' to 'part_status'
    is_public: z.boolean().default(true), // BOOLEAN DEFAULT TRUE NOT NULL
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    current_version_id: z.string().uuid().optional().nullable() // UUID REFERENCES PartVersion(id)
});

// ### PartVersion Schema Base (Updated with snake_case, removed partStatus)
export const partVersionSchemaBase = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    part_id: z.string().uuid(), // UUID NOT NULL REFERENCES Part(id)
    version: z.string().regex(/^\d+\.\d+\.\d+$/), // TEXT NOT NULL CHECK (version <> '')
    name: z.string().min(3).max(100), // TEXT NOT NULL CHECK (name <> '')
    short_description: z.string().max(200).optional().nullable(), // TEXT
    long_description: jsonSchema.optional().nullable(), // JSONB
    functional_description: z.string().optional().nullable(), // TEXT
    technical_specifications: jsonSchema.optional().nullable(), // JSONB
    properties: jsonSchema.optional().nullable(), // JSONB
    electrical_properties: jsonSchema.optional().nullable(), // JSONB
    mechanical_properties: jsonSchema.optional().nullable(), // JSONB
    thermal_properties: jsonSchema.optional().nullable(), // JSONB
    weight: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (weight >= 0)
    weight_unit: z.nativeEnum(WeightUnitEnum).optional().nullable(), // weight_unit_enum
    dimensions: dimensionSchema.optional().nullable(), // JSONB
    dimensions_unit: z.nativeEnum(DimensionUnitEnum).optional().nullable(), // dimension_unit_enum
    material_composition: jsonSchema.optional().nullable(), // JSONB
    environmental_data: jsonSchema.optional().nullable(), // JSONB
    voltage_rating_max: z.number().optional().nullable(), // NUMERIC
    voltage_rating_min: z.number().optional().nullable(), // NUMERIC
    current_rating_max: z.number().optional().nullable(), // NUMERIC
    current_rating_min: z.number().optional().nullable(), // NUMERIC
    power_rating_max: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (power_rating_max >= 0)
    tolerance: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (tolerance >= 0)
    tolerance_unit: z.string().optional().nullable(), // TEXT
    package_type: z.nativeEnum(PackageTypeEnum).optional().nullable(), // package_type_enum
    pin_count: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (pin_count >= 0)
    operating_temperature_min: z.number().optional().nullable(), // NUMERIC
    operating_temperature_max: z.number().optional().nullable(), // NUMERIC
    storage_temperature_min: z.number().optional().nullable(), // NUMERIC
    storage_temperature_max: z.number().optional().nullable(), // NUMERIC
    temperature_unit: z.nativeEnum(TemperatureUnitEnum).optional().nullable(), // temperature_unit_enum
    revision_notes: z.string().optional().nullable(), // TEXT
    lifecycle_status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT), // Renamed 'status' to 'lifecycle_status'
    released_at: z.date().optional().nullable(), // TIMESTAMPTZ
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
}).superRefine((data, ctx) => {
    // Validate paired fields
    if ((data.weight !== undefined && data.weight !== null) !== (data.weight_unit !== undefined && data.weight_unit !== null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Weight and unit must both be present or omitted', path: ['weight_unit'] });
    }
    if ((data.dimensions !== undefined && data.dimensions !== null) !== (data.dimensions_unit !== undefined && data.dimensions_unit !== null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Dimensions and unit must both be present or omitted', path: ['dimensions_unit'] });
    }
    if ((data.tolerance !== undefined && data.tolerance !== null) !== (data.tolerance_unit !== undefined && data.tolerance_unit !== null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tolerance and unit must both be present or omitted', path: ['tolerance_unit'] });
    }
    // Validate ranges
    if (data.voltage_rating_max !== undefined && data.voltage_rating_max !== null && 
        data.voltage_rating_min !== undefined && data.voltage_rating_min !== null && 
        data.voltage_rating_max < data.voltage_rating_min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Max voltage must be >= min', path: ['voltage_rating_max'] });
    }
    if (data.current_rating_max !== undefined && data.current_rating_max !== null && 
        data.current_rating_min !== undefined && data.current_rating_min !== null && 
        data.current_rating_max < data.current_rating_min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Max current must be >= min', path: ['current_rating_max'] });
    }
    if (data.operating_temperature_max !== undefined && data.operating_temperature_max !== null && 
        data.operating_temperature_min !== undefined && data.operating_temperature_min !== null && 
        data.operating_temperature_max < data.operating_temperature_min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Operating temp max must be >= min', path: ['operating_temperature_max'] });
    }
    if (data.storage_temperature_max !== undefined && data.storage_temperature_max !== null && 
        data.storage_temperature_min !== undefined && data.storage_temperature_min !== null && 
        data.storage_temperature_max < data.storage_temperature_min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Storage temp max must be >= min', path: ['storage_temperature_max'] });
    }
});
// Create the schema with required and optional fields
export const partVersionSchema = partVersionSchemaBase
	.refine((data) => 
		(data.weight === undefined || data.weight === null) === 
		(data.weight_unit === undefined || data.weight_unit === null), {
		message: 'Weight and unit must both be present or omitted',
		path: ['weight_unit']
	})
	.refine((data) => 
		(data.dimensions === undefined || data.dimensions === null) === 
		(data.dimensions_unit === undefined || data.dimensions_unit === null), {
		message: 'Dimensions and unit must both be present or omitted',
		path: ['dimensions_unit']
	})
	.refine((data) => 
		(data.tolerance === undefined || data.tolerance === null) === 
		(data.tolerance_unit === undefined || data.tolerance_unit === null), {
		message: 'Tolerance and unit must both be present or omitted',
		path: ['tolerance_unit']
	})
	.refine(
		(data) => {
			// Skip validation if either value is null/undefined
			if (data.voltage_rating_max === undefined || data.voltage_rating_max === null || 
				data.voltage_rating_min === undefined || data.voltage_rating_min === null) {
				return true;
			}
			// Only validate when both values are present
			return data.voltage_rating_max >= data.voltage_rating_min;
		},
		{ message: 'Max voltage must be >= min', path: ['voltage_rating_max'] }
	)
	.refine(
		(data) => {
			// Skip validation if either value is null/undefined
			if (data.current_rating_max === undefined || data.current_rating_max === null || 
				data.current_rating_min === undefined || data.current_rating_min === null) {
				return true;
			}
			// Only validate when both values are present
			return data.current_rating_max >= data.current_rating_min;
		},
		{ message: 'Max current must be >= min', path: ['current_rating_max'] }
	)
	.refine(
		(data) => {
			// Skip validation if either value is null/undefined
			if (data.operating_temperature_max === undefined || data.operating_temperature_max === null || 
				data.operating_temperature_min === undefined || data.operating_temperature_min === null) {
				return true;
			}
			// Only validate when both values are present
			return data.operating_temperature_max >= data.operating_temperature_min;
		},
		{ message: 'Operating temp max must be >= min', path: ['operating_temperature_max'] }
	)
	.refine(
		(data) => {
			// Skip validation if either value is null/undefined
			if (data.storage_temperature_max === undefined || data.storage_temperature_max === null || 
				data.storage_temperature_min === undefined || data.storage_temperature_min === null) {
				return true;
			}
			// Only validate when both values are present
			return data.storage_temperature_max >= data.storage_temperature_min;
		},
		{ message: 'Storage temp max must be >= min', path: ['storage_temperature_max'] }
	);

// Create a more reliable edit schema based on the core schema but relaxing requirements
// Schema for part version edits (separate from the main schema for flexibility)
export const partVersionEditSchema = z.object({
  // Base fields from partVersionSchemaBase - need to explicitly list the ones we need
  id: z.string().uuid().optional(),
  part_id: z.string().uuid().optional(),
  // Overridden fields with more relaxed validation
  name: z.string().min(3).max(100).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  status: z.nativeEnum(LifecycleStatusEnum).optional(),
  
  // Use proper dimension schema that enforces database constraints
  dimensions: editDimensionSchema.optional(),
  
  // Add the special part status field for part status updates
  partStatus: z.nativeEnum(PartStatusEnum).optional(),
  
  // Add other fields that may be edited
  short_description: z.string().max(200).optional().nullable(),
  full_description: z.string().optional().nullable(),
  functional_description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internal_part_number: z.string().optional().nullable(),
  mpn: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  gtin: z.string().optional().nullable(),
  manufacturer_id: z.string().uuid().optional().nullable(),
  
  // Dimensions and weight
  weight: z.number().optional().nullable(),
  weight_unit: z.nativeEnum(WeightUnitEnum).optional().nullable(),
  
  // Electrical properties
  voltage_rating_min: z.number().optional().nullable(),
  voltage_rating_max: z.number().optional().nullable(),
  current_rating_min: z.number().optional().nullable(),
  current_rating_max: z.number().optional().nullable(),
  power_rating_max: z.number().optional().nullable(),
  tolerance: z.number().optional().nullable(),
  tolerance_unit: z.string().optional().nullable(),
  
  // Mechanical properties
  mounting_style: z.string().optional().nullable(),
  package_case: z.string().optional().nullable(),
  pin_count: z.number().optional().nullable(),
  termination_style: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  
  // Thermal properties
  operating_temperature_min: z.number().optional().nullable(),
  operating_temperature_max: z.number().optional().nullable(),
  storage_temperature_min: z.number().optional().nullable(),
  storage_temperature_max: z.number().optional().nullable(),
  temperature_unit: z.nativeEnum(TemperatureUnitEnum).optional().nullable(),
  
  // Additional fields
  revision_notes: z.string().optional().nullable()
})
.omit({
  // Omit these fields since they'll be supplied by the system
})
.superRefine((data: Record<string, any>, ctx) => {
    // Special validation: ensure required field values are properly typed
    // but don't fail validation if they're missing (we'll supply defaults)
    if (data.name !== undefined && typeof data.name !== 'string') {
        ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: typeof data.name,
            path: ['name']
        });
    }
    
    if (data.version !== undefined && typeof data.version !== 'string') {
        ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: typeof data.version,
            path: ['version']
        });
    }
    
    // The editDimensionSchema already handles dimension validation properly
    // No additional manual validation needed - the schema enforces all or nothing
})
.refine(
  (data: Record<string, any>) => {
    if (data.name === undefined) {
      return true; // Skip if name not provided (handled by required())
    }
    return data.name.length >= 3 && data.name.length <= 100;
  },
  {
    message: 'Name must be between 3 and 100 characters',
    path: ['name']
  }
);

// Define a new schema that omits system fields - recreated to avoid type errors
// This replaces the previous createPartSchema definition that was using .omit() which caused errors
export const createPartSchema = z.object({
  // Include all the fields we want from partVersionSchemaBase
  name: z.string().min(3).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('0.1.0'),
  status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT),
  short_description: z.string().max(200).optional().nullable(),
  full_description: z.string().optional().nullable(),
  functional_description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internal_part_number: z.string().optional().nullable(),
  mpn: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  gtin: z.string().optional().nullable(),
  manufacturer_id: z.string().uuid().optional().nullable(),
  weight: z.number().optional().nullable(),
  weight_unit: z.nativeEnum(WeightUnitEnum).optional().nullable(),
  dimensions: editDimensionSchema.optional(),
  // Electrical properties
  voltage_rating_min: z.number().optional().nullable(),
  voltage_rating_max: z.number().optional().nullable(),
  current_rating_min: z.number().optional().nullable(),
  current_rating_max: z.number().optional().nullable(),
  power_rating_max: z.number().optional().nullable(),
  tolerance: z.number().optional().nullable(),
  tolerance_unit: z.string().optional().nullable(),
  // Mechanical properties
  mounting_style: z.string().optional().nullable(),
  package_case: z.string().optional().nullable(),
  pin_count: z.number().optional().nullable(),
  termination_style: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  // Thermal properties
  operating_temperature_min: z.number().optional().nullable(),
  operating_temperature_max: z.number().optional().nullable(),
  storage_temperature_min: z.number().optional().nullable(),
  storage_temperature_max: z.number().optional().nullable(),
  temperature_unit: z.nativeEnum(TemperatureUnitEnum).optional().nullable(),
  // Additional fields
  revision_notes: z.string().optional().nullable(),
  released_at: z.date().optional().nullable(),
  // JSON properties
  electrical_properties: z.record(z.string(), z.any()).optional().nullable(),
  mechanical_properties: z.record(z.string(), z.any()).optional().nullable(),
  thermal_properties: z.record(z.string(), z.any()).optional().nullable(),
  material_composition: z.record(z.string(), z.any()).optional().nullable(),
  environmental_data: z.record(z.string(), z.any()).optional().nullable(),
  // Custom fields for part
  custom_fields: z.record(z.string(), z.any()).optional().nullable(),
});

// Schema for creating subsequent Part Versions - Refined
export const createPartVersionSchema = z.object({
  // Include fields needed for part version creation but omit system fields
  name: z.string().min(3).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT),
  short_description: z.string().max(200).optional().nullable(),
  full_description: z.string().optional().nullable(),
  functional_description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internal_part_number: z.string().optional().nullable(),
  mpn: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  gtin: z.string().optional().nullable(),
  manufacturer_id: z.string().uuid().optional().nullable(),
  // Rest of the fields similar to createPartSchema but for a version
  weight: z.number().optional().nullable(),
  weight_unit: z.nativeEnum(WeightUnitEnum).optional().nullable(),
  dimensions: editDimensionSchema.optional(),
  // Other fields omitted for brevity but should match createPartSchema
});

// ### PartCompliance Schema
export const partComplianceSchema = z.object({
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    compliance_type: z.nativeEnum(ComplianceTypeEnum), // compliance_type_enum NOT NULL
    certificate_url: z.string().url().optional().nullable(), // TEXT
    certified_at: z.date().optional().nullable(), // TIMESTAMPTZ
    expires_at: z.date().optional().nullable(), // TIMESTAMPTZ
    notes: z.string().optional().nullable() // TEXT
});

// ### PartStructure Schema (Updated required fields)
export const partStructureSchema = z.object({
    id: z.string().uuid().optional(), // UUID PRIMARY KEY (optional in schema as auto-generated)
    parent_part_id: z.string().uuid(), // UUID NOT NULL REFERENCES Part(id)
    child_part_id: z.string().uuid(), // UUID NOT NULL REFERENCES Part(id)
    relation_type: z.nativeEnum(StructuralRelationTypeEnum).default(StructuralRelationTypeEnum.COMPONENT), // structural_relation_type_enum DEFAULT 'component'
    quantity: z.number().positive().default(1), // NUMERIC DEFAULT 1 CHECK (quantity > 0)
    notes: z.string().optional().nullable(), // TEXT
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date().optional().nullable(), // TIMESTAMPTZ
    valid_from: z.date().optional().nullable(), // TIMESTAMPTZ
    valid_until: z.date().optional().nullable() // TIMESTAMPTZ
});

// ### PartVersionCategory Schema
export const partVersionCategorySchema = z.object({
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    category_id: z.string().uuid() // UUID NOT NULL REFERENCES Category(id)
    // PRIMARY KEY (part_version_id, category_id)
});

// ### PartAttachment Schema (Added metadata)
export const partAttachmentSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    file_url: z.string().url(), // TEXT NOT NULL CHECK (file_url ~ '^https?://')
    file_name: z.string().min(1), // TEXT NOT NULL CHECK (file_name <> '')
    file_type: z.string().optional().nullable(), // TEXT
    file_size_bytes: z.number().int().nonnegative().optional().nullable(), // BIGINT CHECK (file_size_bytes >= 0)
    checksum: z.string().optional().nullable(), // TEXT
    description: z.string().optional().nullable(), // TEXT
    attachment_type: z.string().optional().nullable(), // TEXT
    is_primary: z.boolean().default(false), // BOOLEAN DEFAULT FALSE NOT NULL
    thumbnail_url: z.string().url().optional().nullable(), // TEXT CHECK (thumbnail_url ~ '^https?://')
    uploaded_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    uploaded_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    metadata: jsonSchema.optional().nullable() // JSONB
});

// ### PartRepresentation Schema
export const partRepresentationSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    type: z.enum(['3D Model', 'Footprint', 'Schematic Symbol', 'Simulation Model']), // TEXT NOT NULL
    format: z.string().optional().nullable(), // TEXT
    file_url: z.string().url().optional().nullable(), // TEXT CHECK (file_url ~ '^https?://')
    metadata: jsonSchema.optional().nullable(), // JSONB
    is_recommended: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### PartRevision Schema
export const partRevisionSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    change_description: z.string(), // TEXT NOT NULL
    changed_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    changed_fields: jsonSchema, // JSONB NOT NULL
    revision_date: z.date() // TIMESTAMPTZ DEFAULT NOW()
});

// ### PartValidation Schema
export const partValidationSchema = z.object({
    part_version_id: z.string().uuid(), // UUID PRIMARY KEY REFERENCES PartVersion(id)
    validated_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    validation_date: z.date(), // TIMESTAMPTZ DEFAULT NOW()
    test_results: jsonSchema.optional().nullable(), // JSONB
    certification_info: jsonSchema.optional().nullable(), // JSONB
    is_compliant: z.boolean() // BOOLEAN DEFAULT FALSE
});

// ### Manufacturer Schema
export const manufacturerSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (name <> '')
    description: z.string().optional().nullable(), // TEXT
    website_url: z.string().url().optional().nullable(), // TEXT CHECK (website_url ~ '^https?://')
    contact_info: jsonSchema.optional().nullable(), // JSONB
    logo_url: z.string().url().optional().nullable(), // TEXT CHECK (logo_url ~ '^https?://')
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### ManufacturerPart Schema
export const manufacturerPartSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    manufacturer_id: z.string().uuid(), // UUID NOT NULL REFERENCES Manufacturer(id)
    manufacturer_part_number: z.string().min(1), // TEXT NOT NULL CHECK (manufacturer_part_number <> '')
    description: z.string().optional().nullable(), // TEXT
    datasheet_url: z.string().url().optional().nullable(), // TEXT CHECK (datasheet_url ~ '^https?://')
    product_url: z.string().url().optional().nullable(), // TEXT CHECK (product_url ~ '^https?://')
    is_recommended: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### Supplier Schema
export const supplierSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (name <> '')
    description: z.string().optional().nullable(), // TEXT
    website_url: z.string().url().optional().nullable(), // TEXT CHECK (website_url ~ '^https?://')
    contact_info: jsonSchema.optional().nullable(), // JSONB
    logo_url: z.string().url().optional().nullable(), // TEXT CHECK (logo_url ~ '^https?://')
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### SupplierPart Schema
export const supplierPartSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    manufacturer_part_id: z.string().uuid(), // UUID NOT NULL REFERENCES ManufacturerPart(id)
    supplier_id: z.string().uuid(), // UUID NOT NULL REFERENCES Supplier(id)
    supplier_part_number: z.string().optional().nullable(), // TEXT
    unit_price: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (unit_price >= 0)
    currency: z.string().default('USD').optional().nullable(), // TEXT DEFAULT 'USD'
    price_breaks: jsonSchema.optional().nullable(), // JSONB
    stock_quantity: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (stock_quantity >= 0)
    lead_time_days: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (lead_time_days >= 0)
    minimum_order_quantity: z.number().int().positive().optional().nullable(), // INTEGER CHECK (minimum_order_quantity > 0)
    packaging_info: jsonSchema.optional().nullable(), // JSONB
    product_url: z.string().url().optional().nullable(), // TEXT CHECK (product_url ~ '^https?://')
    is_preferred: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### Tag Schema
export const tagSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (name <> '')
    description: z.string().optional().nullable(), // TEXT
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    is_deleted: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    deleted_at: z.date().optional().nullable(), // TIMESTAMPTZ
    deleted_by: z.string().uuid().optional().nullable() // UUID REFERENCES "User"(id)
});

// ### PartVersionTag Schema
export const partVersionTagSchema = z.object({
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    tag_id: z.string().uuid(), // UUID NOT NULL REFERENCES Tag(id)
    assigned_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    assigned_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### CustomField Schema
export const customFieldSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    field_name: z.string().min(1), // TEXT NOT NULL UNIQUE
    data_type: z.enum(['text', 'number', 'boolean', 'date']), // TEXT NOT NULL
    applies_to: z.enum(['part', 'manufacturer', 'supplier']) // TEXT NOT NULL
});

// ### ManufacturerCustomField Schema
export const manufacturerCustomFieldSchema = z.object({
    manufacturer_id: z.string().uuid(), // UUID NOT NULL REFERENCES Manufacturer(id)
    field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(id)
    value: jsonSchema // JSONB NOT NULL
});

// ### SupplierCustomField Schema
export const supplierCustomFieldSchema = z.object({
    supplier_id: z.string().uuid(), // UUID NOT NULL REFERENCES Supplier(id)
    field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(id)
    value: jsonSchema // JSONB NOT NULL
});

// ### PartCustomField Schema
export const partCustomFieldSchema = z.object({
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(id)
    value: jsonSchema // JSONB NOT NULL
});

// ### Project Schema
export const projectSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    name: z.string().min(1), // TEXT NOT NULL CHECK (name <> '')
    description: z.string().optional().nullable(), // TEXT
    owner_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum NOT NULL DEFAULT 'draft'
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### BillOfMaterials Schema
export const billOfMaterialsSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    project_id: z.string().uuid(), // UUID NOT NULL REFERENCES Project(id)
    version: z.string().min(1), // TEXT NOT NULL CHECK (version <> '')
    name: z.string().optional().nullable(), // TEXT
    description: z.string().optional().nullable(), // TEXT
    status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum NOT NULL DEFAULT 'draft'
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    released_at: z.date().optional().nullable() // TIMESTAMPTZ
});

// ### BOMItem Schema
export const bomItemSchema = z.object({
    id: z.string().uuid(), // UUID PRIMARY KEY
    bom_id: z.string().uuid(), // UUID NOT NULL REFERENCES BillOfMaterials(id)
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    quantity: z.number().positive(), // NUMERIC NOT NULL CHECK (quantity > 0)
    reference_designator: z.string().optional().nullable(), // TEXT
    mounting_type: z.nativeEnum(MountingTypeEnum).optional().nullable(), // mounting_type_enum
    instructions: z.string().optional().nullable(), // TEXT
    find_number: z.number().int().optional().nullable(), // INTEGER
    substitute_part_version_id: z.string().uuid().optional().nullable(), // UUID REFERENCES PartVersion(id)
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date().optional().nullable(), // TIMESTAMPTZ
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    updated_at: z.date().optional().nullable() // TIMESTAMPTZ
});

// ### BOMItemSubstitute Schema
export const bomItemSubstituteSchema = z.object({
    bom_item_id: z.string().uuid(), // UUID NOT NULL REFERENCES BOMItem(id)
    substitute_part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
    priority: z.number().int().min(1).default(10), // INTEGER DEFAULT 10 NOT NULL CHECK (priority >= 1)
    notes: z.string().optional().nullable(), // TEXT
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    created_at: z.date().optional().nullable() // TIMESTAMPTZ
});