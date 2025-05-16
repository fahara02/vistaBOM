// src/lib/schema/schema.ts

//Schema.sql Update note 
//PostGress Table
// 1. All Table names are quoted camel case no exception
// 2. All field names are non quoted snake_case no exception
// 3. to avoid naming conflict with postgress conflicting keywords never used
//4.Only lib/schema/schema.ts is one source of truth remove any thing else
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
} from '@/types/enums';
import { z } from 'zod';

// Helper schema for JSONB fields where the exact structure is not fixed
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];

/**
 * Generic JSON schema for handling PostgreSQL JSONB fields.
 * This is a fallback for complex JSON structures that don't have a fixed schema.
 * Whenever possible, define a specific schema for the expected structure instead of using this.
 */
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
    z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

/**
 * Schema for handling JSON data coming from forms.
 * Forms often submit empty objects which need special handling.
 */
export const formJsonSchema = z.union([
    jsonSchema,
    z.object({}).passthrough() // Allow empty objects for form data
]);

/**
 * Special schema for text fields that might be stored as JSON objects but should be strings in forms.
 * This handles conversion between JSON and string formats for form display and database storage.
 */
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

/**
 * Helper function to safely preprocess numeric values from form inputs.
 * Handles empty strings, nulls, and conversion from string to number.
 * @param val - The input value to process
 * @returns A number, null, or undefined depending on the input
 */
const safeNumberPreprocessor = (val: unknown): number | null | undefined => {
    if (val === "" || val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    const parsed = parseFloat(val as string);
    return isNaN(parsed) ? null : parsed;
};

/**
 * Helper function to safely convert string dates to Date objects.
 * Handles both Date objects and strings containing dates.
 * @param val - The input value to process
 * @returns A Date object or null
 */
const safeDatePreprocessor = (val: unknown): Date | null => {
    if (val instanceof Date) return val;
    if (val === "" || val === null || val === undefined) return null;
    const parsed = new Date(val as string);
    return isNaN(parsed.getTime()) ? null : parsed;
};
/**
 * Helper function to create enum schemas that handle empty strings correctly.
 * This is crucial for form handling where enum fields might be empty or null.
 * @param enumSchema - The Zod enum schema to wrap
 * @returns A union schema that handles both the enum values and empty/null values
 */
function createEnumSchema<T>(enumSchema: T) {
  return z.union([
    enumSchema as any, // Use type assertion to accommodate both ZodEnum and ZodNativeEnum
    z.literal('').transform(() => null), // Transform empty strings to null
    z.null() // Explicitly allow null
  ]).optional();
}

// User Schema
export const userSchema = z.object({
    user_id: z.string().uuid(), // UUID PRIMARY KEY
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
    is_deleted: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
});

// ### Session Schema
export const sessionSchema = z.object({
    session_id: z.string(), // TEXT PRIMARY KEY
    user_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    expires_at: z.date(), // TIMESTAMPTZ NOT NULL
    last_used: z.date() // TIMESTAMPTZ DEFAULT NOW()
});

// ### Role Schema
export const roleSchema = z.object({
    role_id: z.string().uuid(), // UUID PRIMARY KEY
    role_name: z.string().min(1), // TEXT UNIQUE NOT NULL CHECK (role_name <> '')
    role_description: z.string().optional().nullable(), // TEXT
    created_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### Permission Schema
export const permissionSchema = z.object({
    permission_id: z.string().uuid(), // UUID PRIMARY KEY
    permission_name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (permission_name <> '')
    permission_description: z.string().optional().nullable() // TEXT
});

// ### RolePermission Schema
export const rolePermissionSchema = z.object({
    role_id: z.string().uuid(), // UUID NOT NULL REFERENCES Role(id)
    permission_id: z.string().uuid(), // UUID NOT NULL REFERENCES Permission(id)
    assigned_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    assigned_by: z.string().uuid().optional().nullable() // UUID REFERENCES "User"(user_id)
    // PRIMARY KEY (role_id, permission_id)
});

// ### Category Schema
export const categorySchema = z.object({
    category_id: z.string().uuid(), // UUID PRIMARY KEY
    category_name: z.string().min(1), // TEXT NOT NULL CHECK (category_name <> '')
    parent_id: z.string().uuid().optional().nullable(), // UUID REFERENCES Category(category_id)
    category_description: z.string().optional().nullable(), // TEXT
    category_path: z.string(), // LTREE (represented as string)
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    is_public: z.boolean(), // BOOLEAN DEFAULT TRUE NOT NULL
    is_deleted: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    deleted_at: z.date().optional().nullable(), // TIMESTAMPTZ
    deleted_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
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
    part_id: z.string().uuid(), // UUID PRIMARY KEY
    creator_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    global_part_number: z.string().optional().nullable(), // TEXT
    status_in_bom: z.nativeEnum(PartStatusEnum).default(PartStatusEnum.CONCEPT), // Renamed to match SQL column
    lifecycle_status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT), // Added lifecycle_status as per schema.sql
    is_public: z.boolean().default(true), // BOOLEAN DEFAULT TRUE NOT NULL
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    current_version_id: z.string().uuid().optional().nullable(), // UUID REFERENCES PartVersion(part_version_id)
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
});

// ### PartVersion Schema Base (Updated with snake_case, removed partStatus)
export const partVersionSchemaBase = z.object({
    part_version_id: z.string().uuid(), // UUID PRIMARY KEY
    part_id: z.string().uuid(), // UUID NOT NULL REFERENCES Part(part_id)
    part_version: z.string().regex(/^\d+\.\d+\.\d+$/), // TEXT NOT NULL CHECK (part_version <> '')
    part_name: z.string().min(1).max(100), // TEXT NOT NULL CHECK (part_name <> '')
    short_description: z.string().max(200).optional().nullable(), // TEXT
    long_description: jsonSchema.optional().nullable(), // JSONB
    functional_description: z.string().optional().nullable(), // TEXT
    technical_specifications: jsonSchema.optional().nullable(), // JSONB
    properties: jsonSchema.optional().nullable(), // JSONB
    electrical_properties: jsonSchema.optional().nullable(), // JSONB
    mechanical_properties: jsonSchema.optional().nullable(), // JSONB
    thermal_properties: jsonSchema.optional().nullable(), // JSONB
    part_weight: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (part_weight >= 0)
    weight_unit: z.nativeEnum(WeightUnitEnum).optional().nullable(), // weight_unit_enum
    dimensions: dimensionSchema.optional().nullable(), // JSONB CHECK (dimensions ?& array['length', 'width', 'height'])
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
    version_status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT), // lifecycle_status_enum DEFAULT 'draft' NOT NULL
    mounting_type: z.nativeEnum(MountingTypeEnum).optional().nullable(), // Added mounting_type per schema.sql
    released_at: z.date().optional().nullable(), // TIMESTAMPTZ
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
}).superRefine((data, ctx) => {
    // Validate paired fields
    if ((data.part_weight !== undefined && data.part_weight !== null) !== (data.weight_unit !== undefined && data.weight_unit !== null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Part weight and unit must both be present or omitted', path: ['weight_unit'] });
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
        (data.part_weight === undefined || data.part_weight === null) === 
        (data.weight_unit === undefined || data.weight_unit === null), {
        message: 'Part weight and unit must both be present or omitted',
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
  part_name: z.string().min(3).max(100).optional(),
  part_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  version_status: z.nativeEnum(LifecycleStatusEnum).optional(),
  
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
  part_weight: z.number().optional().nullable(),
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
    if (data.part_name !== undefined && typeof data.part_name !== 'string') {
        ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: typeof data.part_name,
            path: ['part_name']
        });
    }
    
    if (data.part_version !== undefined && typeof data.part_version !== 'string') {
        ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: typeof data.part_version,
            path: ['part_version']
        });
    }
    
    // The editDimensionSchema already handles dimension validation properly
    // No additional manual validation needed - the schema enforces all or nothing
})
.refine(
  (data: Record<string, any>) => {
    if (data.part_name === undefined) {
      return true; // Skip if name not provided (handled by required())
    }
    return data.part_name.length >= 3 && data.part_name.length <= 100;
  },
  {
    message: 'Name must be between 3 and 100 characters',
    path: ['part_name']
  }
);

/**
 * Schema for creating a new Part and its initial PartVersion.
 * This validates all data needed to create a complete part record with all related entities.
 */
export const createPartSchema = z.object({
  // Core part information
  part_name: z.string({
    required_error: "Part name is required",
    invalid_type_error: "Part name must be a string"
  }).min(1, "Part name cannot be empty").max(100, "Part name is too long"), // TEXT NOT NULL CHECK (part_name <> '')
  
  part_version: z.string({
    invalid_type_error: "Part version must be a string"
  }).regex(/^\d+\.\d+\.\d+$/, "Version must be in format x.y.z")
    .default('0.1.0'), // TEXT NOT NULL CHECK (part_version <> '')
  
  version_status: createEnumSchema(z.nativeEnum(LifecycleStatusEnum))
    .default(LifecycleStatusEnum.DRAFT), // lifecycle_status_enum DEFAULT 'draft' NOT NULL
  
  status_in_bom: createEnumSchema(z.nativeEnum(PartStatusEnum))
    .default(PartStatusEnum.CONCEPT), // part_status_enum DEFAULT 'concept'
  
  is_public: z.boolean()
    .default(true), // BOOLEAN DEFAULT TRUE
  
  // Part descriptions
  short_description: z.string({
    invalid_type_error: "Short description must be a string"
  }).max(200, "Short description is too long").optional(), // TEXT
  
  long_description: z.lazy(() => {
    const descriptionSchema = z.object({
      sections: z.array(z.object({
        title: z.string().optional(),
        content: z.string()
      })).optional(),
      formatted_text: z.string().optional()
    }).partial().optional();
    
    return descriptionSchema.or(jsonStringSchema);
  }), // JSONB
  
  functional_description: z.string({
    invalid_type_error: "Functional description must be a string"
  }).optional(), // TEXT
  
  technical_specifications: z.lazy(() => {
    const techSpecsSchema = z.record(z.string(), z.union([
      z.string(), z.number(), z.boolean(), z.null()
    ])).optional();
    
    return techSpecsSchema.or(jsonStringSchema);
  }), // JSONB
  
  notes: z.string({
    invalid_type_error: "Notes must be a string"
  }).optional(), // TEXT for general notes
  
  revision_notes: z.string({
    invalid_type_error: "Revision notes must be a string"
  }).optional(), // TEXT for version specific notes
  
  // Identification numbers
  internal_part_number: z.string({
    invalid_type_error: "Internal part number must be a string"
  }).optional(), // TEXT
  
  mpn: z.string({
    invalid_type_error: "Manufacturer part number must be a string"
  }).optional(), // Manufacturer Part Number
  
  sku: z.string({
    invalid_type_error: "SKU must be a string"
  }).optional(), // Stock Keeping Unit
  
  gtin: z.string({
    invalid_type_error: "GTIN must be a string"
  }).optional(), // Global Trade Item Number
  
  // Relationships
  category_ids: z.string({
    invalid_type_error: "Category IDs must be a string"
  }).optional()  // Comma-separated category IDs
    .describe("Comma-separated list of category UUIDs"),
  
  manufacturer_id: z.string().uuid({
    message: "Manufacturer ID must be a valid UUID"
  }).optional(), // UUID REFERENCES Manufacturer(manufacturer_id)
  
  family_ids: z.string({
    invalid_type_error: "Family IDs must be a string"
  }).optional()  // Comma-separated family IDs
    .describe("Comma-separated list of family UUIDs"),
  
  group_ids: z.string({
    invalid_type_error: "Group IDs must be a string"
  }).optional()  // Comma-separated group IDs
    .describe("Comma-separated list of group UUIDs"),
  
  tag_ids: z.string({
    invalid_type_error: "Tag IDs must be a string"
  }).optional()  // Comma-separated tag IDs
    .describe("Comma-separated list of tag UUIDs"),
  
  // Physical properties
  part_weight: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Part weight must be a number"
    }).nonnegative("Weight cannot be negative").optional()
  ), // NUMERIC CHECK (part_weight >= 0)
  
  weight_unit: createEnumSchema(z.nativeEnum(WeightUnitEnum))
    .optional(), // weight_unit_enum
  
  dimensions: editDimensionSchema.optional(), // JSONB with length, width, height
  
  dimensions_unit: createEnumSchema(z.nativeEnum(DimensionUnitEnum))
    .optional(), // dimension_unit_enum
  
  material_composition: z.lazy(() => {
    const materialSchema = z.object({
      primary_material: z.string().optional(),
      secondary_materials: z.array(z.string()).optional(),
      composition_percentages: z.record(z.string(), z.number()).optional(),
      finish: z.string().optional(),
      color: z.string().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return materialSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Electrical properties
  voltage_rating_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum voltage rating must be a number"
    }).optional()
  ), // NUMERIC
  
  voltage_rating_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum voltage rating must be a number"
    }).optional()
  ), // NUMERIC
  
  current_rating_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum current rating must be a number"
    }).optional()
  ), // NUMERIC
  
  current_rating_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum current rating must be a number"
    }).optional()
  ), // NUMERIC
  
  power_rating_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum power rating must be a number"
    }).nonnegative("Power rating cannot be negative").optional()
  ), // NUMERIC CHECK (power_rating_max >= 0)
  
  tolerance: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Tolerance must be a number"
    }).nonnegative("Tolerance cannot be negative").optional()
  ), // NUMERIC CHECK (tolerance >= 0)
  
  tolerance_unit: z.string({
    invalid_type_error: "Tolerance unit must be a string"
  }).optional(), // TEXT
  
  electrical_properties: z.lazy(() => {
    const electricalSchema = z.object({
      resistance: z.number().optional(),
      capacitance: z.number().optional(),
      inductance: z.number().optional(),
      impedance: z.number().optional(),
      frequency: z.number().optional(),
      frequency_unit: z.string().optional(),
      dielectric_constant: z.number().optional(),
      dielectric_strength: z.number().optional(),
      polarized: z.boolean().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return electricalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Mechanical properties
  mounting_type: createEnumSchema(z.nativeEnum(MountingTypeEnum))
    .optional(), // mounting_type_enum
  
  package_type: createEnumSchema(z.nativeEnum(PackageTypeEnum))
    .optional(), // package_type_enum
  
  mounting_style: z.string({
    invalid_type_error: "Mounting style must be a string"
  }).optional(), // TEXT
  
  package_case: z.string({
    invalid_type_error: "Package case must be a string"
  }).optional(), // TEXT
  
  pin_count: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Pin count must be a number"
    }).int("Pin count must be a whole number")
     .nonnegative("Pin count cannot be negative")
     .optional()
  ), // INTEGER CHECK (pin_count >= 0)
  
  termination_style: z.string({
    invalid_type_error: "Termination style must be a string"
  }).optional(), // TEXT
  
  material: z.string({
    invalid_type_error: "Material must be a string"
  }).optional(), // TEXT
  
  mechanical_properties: z.lazy(() => {
    const mechanicalSchema = z.object({
      hardness: z.number().optional(),
      tensile_strength: z.number().optional(),
      compression_strength: z.number().optional(),
      material_density: z.number().optional(),
      finish: z.string().optional(),
      surface_treatment: z.string().optional(),
      vibration_resistance: z.string().optional(),
      shock_resistance: z.string().optional(),
      ip_rating: z.string().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return mechanicalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Thermal properties
  operating_temperature_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum operating temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  operating_temperature_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum operating temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  storage_temperature_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum storage temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  storage_temperature_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum storage temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  temperature_unit: createEnumSchema(z.nativeEnum(TemperatureUnitEnum))
    .optional(), // temperature_unit_enum
  
  thermal_properties: z.lazy(() => {
    const thermalSchema = z.object({
      thermal_resistance: z.number().optional(),
      thermal_conductivity: z.number().optional(),
      specific_heat: z.number().optional(),
      thermal_expansion: z.number().optional(),
      thermal_time_constant: z.number().optional(),
      heat_dissipation: z.number().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return thermalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Environmental data
  environmental_data: z.lazy(() => {
    const environmentalSchema = z.object({
      rohs_compliant: z.boolean().optional(),
      reach_compliant: z.boolean().optional(),
      halogen_free: z.boolean().optional(),
      moisture_sensitivity_level: z.number().optional(),
      flammability_rating: z.string().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return environmentalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Release information
  released_at: z.preprocess(
    safeDatePreprocessor,
    z.date({
      invalid_type_error: "Release date must be a valid date"
    }).optional()
  ), // TIMESTAMPTZ
  
  // Compliance information
  compliance_info: z.array(z.object({
    compliance_type: createEnumSchema(z.nativeEnum(ComplianceTypeEnum))
      .refine(val => val !== null, {
        message: "Compliance type is required"
      }), // compliance_type_enum NOT NULL
    
    certificate_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Certificate URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (certificate_url ~* '^https?://')
    
    certified_at: z.preprocess(
      safeDatePreprocessor,
      z.date({
        invalid_type_error: "Certification date must be a valid date"
      }).optional()
    ), // DATE
    
    expires_at: z.preprocess(
      safeDatePreprocessor,
      z.date({
        invalid_type_error: "Expiration date must be a valid date"
      }).optional()
    ), // DATE
    
    notes: z.string({
      invalid_type_error: "Notes must be a string"
    }).optional() // TEXT
  })).optional().default([]),
  
  // Part attachments for initial version
  attachments: z.array(z.object({
    file_url: z.string({
      required_error: "File URL is required",
      invalid_type_error: "File URL must be a string"
    }).url("Invalid URL format")
      .refine(val => /^https?:\/\/.+/.test(val), {
        message: "File URL must start with http:// or https://"
      }), // TEXT NOT NULL CHECK (file_url ~* '^https?://')
    
    file_name: z.string({
      required_error: "File name is required",
      invalid_type_error: "File name must be a string"
    }).min(1, "File name cannot be empty"), // TEXT NOT NULL CHECK (file_name <> '')
    
    file_type: z.string({
      invalid_type_error: "File type must be a string"
    }).optional(), // TEXT
    
    file_size_bytes: z.preprocess(
      safeNumberPreprocessor,
      z.number({
        invalid_type_error: "File size must be a number"
      }).int("File size must be a whole number")
        .nonnegative("File size cannot be negative")
        .optional()
    ), // BIGINT CHECK (file_size_bytes >= 0)
    
    attachment_checksum: z.string({
      invalid_type_error: "Checksum must be a string"
    }).optional(), // TEXT
    
    attachment_description: z.string({
      invalid_type_error: "Description must be a string"
    }).optional(), // TEXT
    
    attachment_type: z.string({
      invalid_type_error: "Attachment type must be a string"
    }).optional(), // TEXT
    
    is_primary: z.boolean().default(false), // BOOLEAN DEFAULT FALSE NOT NULL
    
    thumbnail_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Thumbnail URL must start with http:// or https://"
      })
      .optional() // TEXT CHECK (thumbnail_url ~* '^https?://')
  })).optional().default([]),
  
  // 3D models, footprints, schematic symbols
  representations: z.array(z.object({
    representation_type: z.enum(['3D Model', 'Footprint', 'Schematic Symbol', 'Simulation Model'], {
      required_error: "Representation type is required",
      invalid_type_error: "Invalid representation type"
    }), // TEXT NOT NULL
    
    format: z.string({
      invalid_type_error: "Format must be a string"
    }).optional(), // TEXT
    
    file_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "File URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (file_url ~* '^https?://')
    
    metadata: z.lazy(() => {
      const metadataSchema = z.object({
        software: z.string().optional(),
        version: z.string().optional(),
        creation_date: z.string().or(z.date()).optional(),
        dimensions: z.record(z.string(), z.number()).optional(),
        notes: z.string().optional()
      }).partial().optional();
      
      return metadataSchema.or(jsonStringSchema);
    }), // JSONB
    
    is_recommended: z.boolean().default(false) // BOOLEAN DEFAULT FALSE NOT NULL
  })).optional().default([]),
  
  // Part structure for assemblies
  structure: z.array(z.object({
    child_part_id: z.string().uuid({
      message: "Child part ID must be a valid UUID"
    }), // UUID NOT NULL REFERENCES Part(part_id)
    
    relation_type: createEnumSchema(z.nativeEnum(StructuralRelationTypeEnum))
      .default(StructuralRelationTypeEnum.COMPONENT), // structural_relation_type_enum DEFAULT 'component' NOT NULL
    
    quantity: z.preprocess(
      safeNumberPreprocessor,
      z.number({
        invalid_type_error: "Quantity must be a number",
        required_error: "Quantity is required"
      }).positive("Quantity must be greater than zero")
       .default(1)
    ), // NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0)
    
    notes: z.string({
      invalid_type_error: "Notes must be a string"
    }).optional() // TEXT
  })).optional().default([]),
  
  // Manufacturer parts for this part
  manufacturer_parts: z.array(z.object({
    manufacturer_id: z.string().uuid({
      message: "Manufacturer ID must be a valid UUID"
    }), // UUID NOT NULL REFERENCES Manufacturer(manufacturer_id)
    
    manufacturer_part_number: z.string({
      required_error: "Manufacturer part number is required",
      invalid_type_error: "Manufacturer part number must be a string"
    }).min(1, "Manufacturer part number cannot be empty"), // TEXT NOT NULL CHECK (manufacturer_part_number <> '')
    
    description: z.string({
      invalid_type_error: "Description must be a string"
    }).optional(), // TEXT
    
    datasheet_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Datasheet URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (datasheet_url ~* '^https?://')
    
    product_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Product URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (product_url ~* '^https?://')
    
    is_recommended: z.boolean().default(false) // BOOLEAN DEFAULT FALSE NOT NULL
  })).optional().default([]),
  
  // Supplier parts linked to manufacturer parts
  supplier_parts: z.array(z.object({
    manufacturer_part_index: z.number().int().nonnegative(), // Index of manufacturer part in the array above
    supplier_id: z.string().uuid(), // UUID NOT NULL REFERENCES Supplier(supplier_id)
    supplier_part_number: z.string().optional().nullable(), // TEXT
    unit_price: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (unit_price >= 0)
    currency: z.string().default('USD').optional(), // TEXT DEFAULT 'USD'
    price_breaks: z.lazy(() => {
        // Define a more specific price breaks schema
        const priceBreakSchema = z.array(z.object({
            quantity: z.number().int().positive(),
            price: z.number().nonnegative(),
            currency: z.string().optional()
        })).optional();
        
        return priceBreakSchema.or(jsonSchema.optional());
    }), // JSONB
    stock_quantity: z.preprocess(
        safeNumberPreprocessor,
        z.number({ invalid_type_error: "Stock quantity must be a number" }).int().nonnegative().optional()
    ), // INTEGER CHECK (stock_quantity >= 0)
    lead_time_days: z.preprocess(
        safeNumberPreprocessor,
        z.number({ invalid_type_error: "Lead time must be a number" }).int().nonnegative().optional()
    ), // INTEGER CHECK (lead_time_days >= 0)
    minimum_order_quantity: z.preprocess(
        safeNumberPreprocessor,
        z.number({ invalid_type_error: "Minimum order quantity must be a number" }).int().nonnegative().optional()
    ), // INTEGER CHECK (minimum_order_quantity >= 0)
    packaging_info: jsonSchema.optional().nullable(), // JSONB
    product_url: z.string().url().optional().nullable(), // TEXT CHECK (product_url ~* '^https?://')
    is_preferred: z.boolean().default(false) // BOOLEAN DEFAULT FALSE NOT NULL
  })).optional().default([]),
  
  // Custom fields for part
  custom_fields: z.record(z.string(), z.union([
    z.string(), z.number(), z.boolean(), z.null()
  ])).optional() // JSONB for user-defined fields
})
.superRefine((data, ctx) => {
  // Validate paired fields
  if ((data.part_weight !== undefined && data.part_weight !== null) !== 
      (data.weight_unit !== undefined && data.weight_unit !== null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Part weight and weight unit must both be present or omitted',
      path: ['weight_unit']
    });
  }
  
  // Validate paired dimensions fields
  if (data.dimensions && !data.dimensions_unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Dimensions unit must be specified when dimensions are provided',
      path: ['dimensions_unit']
    });
  }
  
  // Validate temperature fields
  if ((data.operating_temperature_min !== undefined || data.operating_temperature_max !== undefined) && 
      !data.temperature_unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Temperature unit must be specified when temperature values are provided',
      path: ['temperature_unit']
    });
  }
  
  // Validate min/max value relationships
  if (data.voltage_rating_min !== undefined && data.voltage_rating_max !== undefined &&
      data.voltage_rating_min > data.voltage_rating_max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum voltage rating cannot be greater than maximum voltage rating',
      path: ['voltage_rating_min']
    });
  }
  
  if (data.current_rating_min !== undefined && data.current_rating_max !== undefined &&
      data.current_rating_min > data.current_rating_max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum current rating cannot be greater than maximum current rating',
      path: ['current_rating_min']
    });
  }
  
  if (data.operating_temperature_min !== undefined && data.operating_temperature_max !== undefined &&
      data.operating_temperature_min > data.operating_temperature_max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum operating temperature cannot be greater than maximum operating temperature',
      path: ['operating_temperature_min']
    });
  }
  
  if (data.storage_temperature_min !== undefined && data.storage_temperature_max !== undefined &&
      data.storage_temperature_min > data.storage_temperature_max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum storage temperature cannot be greater than maximum storage temperature',
      path: ['storage_temperature_min']
    });
  }
  
  // Validate manufacturer_id consistency with manufacturer_parts
  if (data.manufacturer_id && data.manufacturer_parts?.length) {
    data.manufacturer_parts.forEach((mpart, idx) => {
      if (data.manufacturer_id !== mpart.manufacturer_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Manufacturer part references a different manufacturer than the part',
          path: [`manufacturer_parts.${idx}.manufacturer_id`]
        });
      }
    });
  }
});

/**
 * Schema for creating subsequent Part Versions of an existing Part.
 * This schema is focused on validating data needed to create a new version of an existing part.
 */
export const createPartVersionSchema = z.object({
  // Required parent part identification
  part_id: z.string({
    required_error: "Parent part ID is required",
    invalid_type_error: "Parent part ID must be a string"
  }).uuid({
    message: "Parent part ID must be a valid UUID"
  }), // UUID NOT NULL REFERENCES Part(part_id)
  
  // Core version information  
  part_name: z.string({
    required_error: "Part name is required",
    invalid_type_error: "Part name must be a string"
  }).min(1, "Part name cannot be empty").max(100, "Part name is too long"), // TEXT NOT NULL CHECK (part_name <> '')
  
  part_version: z.string({
    required_error: "Part version is required",
    invalid_type_error: "Part version must be a string"
  }).regex(/^\d+\.\d+\.\d+$/, "Version must be in format x.y.z"), // TEXT NOT NULL CHECK (part_version <> '')
  
  version_status: createEnumSchema(z.nativeEnum(LifecycleStatusEnum))
    .default(LifecycleStatusEnum.DRAFT), // lifecycle_status_enum DEFAULT 'draft' NOT NULL
  
  // Part descriptions (same as createPartSchema)
  short_description: z.string({
    invalid_type_error: "Short description must be a string"
  }).max(200, "Short description is too long").optional(), // TEXT
  
  long_description: z.lazy(() => {
    const descriptionSchema = z.object({
      sections: z.array(z.object({
        title: z.string().optional(),
        content: z.string()
      })).optional(),
      formatted_text: z.string().optional()
    }).partial().optional();
    
    return descriptionSchema.or(jsonStringSchema);
  }), // JSONB
  
  functional_description: z.string({
    invalid_type_error: "Functional description must be a string"
  }).optional(), // TEXT
  
  technical_specifications: z.lazy(() => {
    const techSpecsSchema = z.record(z.string(), z.union([
      z.string(), z.number(), z.boolean(), z.null()
    ])).optional();
    
    return techSpecsSchema.or(jsonStringSchema);
  }), // JSONB
  
  notes: z.string({
    invalid_type_error: "Notes must be a string"
  }).optional(), // TEXT for general notes
  
  revision_notes: z.string({
    invalid_type_error: "Revision notes must be a string"
  }).optional(), // TEXT for version specific notes
  
  // Identification numbers
  internal_part_number: z.string({
    invalid_type_error: "Internal part number must be a string"
  }).optional(), // TEXT
  
  mpn: z.string({
    invalid_type_error: "Manufacturer part number must be a string"
  }).optional(), // Manufacturer Part Number
  
  sku: z.string({
    invalid_type_error: "SKU must be a string"
  }).optional(), // Stock Keeping Unit
  
  gtin: z.string({
    invalid_type_error: "GTIN must be a string"
  }).optional(), // Global Trade Item Number

  // Relationships
  category_ids: z.string({
    invalid_type_error: "Category IDs must be a string"
  }).optional() // Comma-separated category IDs
    .describe("Comma-separated list of category UUIDs"),
  
  manufacturer_id: z.string({
    invalid_type_error: "Manufacturer ID must be a string"
  }).uuid({
    message: "Manufacturer ID must be a valid UUID"
  }).optional(), // UUID REFERENCES Manufacturer(manufacturer_id)
  
  family_ids: z.string({
    invalid_type_error: "Family IDs must be a string"
  }).optional() // Comma-separated family IDs
    .describe("Comma-separated list of family UUIDs"),
  
  group_ids: z.string({
    invalid_type_error: "Group IDs must be a string"
  }).optional() // Comma-separated group IDs
    .describe("Comma-separated list of group UUIDs"),
  
  tag_ids: z.string({
    invalid_type_error: "Tag IDs must be a string"
  }).optional() // Comma-separated tag IDs
    .describe("Comma-separated list of tag UUIDs"),
  
  // Physical properties
  part_weight: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Part weight must be a number"
    }).nonnegative("Weight cannot be negative").optional()
  ), // NUMERIC CHECK (part_weight >= 0)
  
  weight_unit: createEnumSchema(z.nativeEnum(WeightUnitEnum))
    .optional(), // weight_unit_enum
  
  dimensions: editDimensionSchema.optional(), // JSONB with length, width, height
  
  dimensions_unit: createEnumSchema(z.nativeEnum(DimensionUnitEnum))
    .optional(), // dimension_unit_enum
  
  material_composition: z.lazy(() => {
    const materialSchema = z.object({
      primary_material: z.string().optional(),
      secondary_materials: z.array(z.string()).optional(),
      composition_percentages: z.record(z.string(), z.number()).optional(),
      finish: z.string().optional(),
      color: z.string().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return materialSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Electrical properties
  voltage_rating_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum voltage rating must be a number"
    }).optional()
  ), // NUMERIC
  
  voltage_rating_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum voltage rating must be a number"
    }).optional()
  ), // NUMERIC
  
  current_rating_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum current rating must be a number"
    }).optional()
  ), // NUMERIC
  
  current_rating_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum current rating must be a number"
    }).optional()
  ), // NUMERIC
  
  power_rating_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum power rating must be a number"
    }).nonnegative("Power rating cannot be negative").optional()
  ), // NUMERIC CHECK (power_rating_max >= 0)
  
  tolerance: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Tolerance must be a number"
    }).nonnegative("Tolerance cannot be negative").optional()
  ), // NUMERIC CHECK (tolerance >= 0)
  
  tolerance_unit: z.string({
    invalid_type_error: "Tolerance unit must be a string"
  }).optional(), // TEXT
  
  electrical_properties: z.lazy(() => {
    const electricalSchema = z.object({
      resistance: z.number().optional(),
      capacitance: z.number().optional(),
      inductance: z.number().optional(),
      impedance: z.number().optional(),
      frequency: z.number().optional(),
      frequency_unit: z.string().optional(),
      dielectric_constant: z.number().optional(),
      dielectric_strength: z.number().optional(),
      polarized: z.boolean().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return electricalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Mechanical properties
  mounting_type: createEnumSchema(z.nativeEnum(MountingTypeEnum))
    .optional(), // mounting_type_enum
  
  package_type: createEnumSchema(z.nativeEnum(PackageTypeEnum))
    .optional(), // package_type_enum
  
  mounting_style: z.string({
    invalid_type_error: "Mounting style must be a string"
  }).optional(), // TEXT
  
  package_case: z.string({
    invalid_type_error: "Package case must be a string"
  }).optional(), // TEXT
  
  pin_count: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Pin count must be a number"
    }).int("Pin count must be a whole number")
     .nonnegative("Pin count cannot be negative")
     .optional()
  ), // INTEGER CHECK (pin_count >= 0)
  
  termination_style: z.string({
    invalid_type_error: "Termination style must be a string"
  }).optional(), // TEXT
  
  material: z.string({
    invalid_type_error: "Material must be a string"
  }).optional(), // TEXT
  
  mechanical_properties: z.lazy(() => {
    const mechanicalSchema = z.object({
      hardness: z.number().optional(),
      tensile_strength: z.number().optional(),
      compression_strength: z.number().optional(),
      material_density: z.number().optional(),
      finish: z.string().optional(),
      surface_treatment: z.string().optional(),
      vibration_resistance: z.string().optional(),
      shock_resistance: z.string().optional(),
      ip_rating: z.string().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return mechanicalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Thermal properties
  operating_temperature_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum operating temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  operating_temperature_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum operating temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  storage_temperature_min: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Minimum storage temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  storage_temperature_max: z.preprocess(
    safeNumberPreprocessor,
    z.number({
      invalid_type_error: "Maximum storage temperature must be a number"
    }).optional()
  ), // NUMERIC
  
  temperature_unit: createEnumSchema(z.nativeEnum(TemperatureUnitEnum))
    .optional(), // temperature_unit_enum
  
  thermal_properties: z.lazy(() => {
    const thermalSchema = z.object({
      thermal_resistance: z.number().optional(),
      thermal_conductivity: z.number().optional(),
      specific_heat: z.number().optional(),
      thermal_expansion: z.number().optional(),
      thermal_time_constant: z.number().optional(),
      heat_dissipation: z.number().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return thermalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Environmental data
  environmental_data: z.lazy(() => {
    const environmentalSchema = z.object({
      rohs_compliant: z.boolean().optional(),
      reach_compliant: z.boolean().optional(),
      halogen_free: z.boolean().optional(),
      moisture_sensitivity_level: z.number().optional(),
      flammability_rating: z.string().optional(),
      notes: z.string().optional()
    }).partial().optional();
    
    return environmentalSchema.or(jsonStringSchema);
  }), // JSONB
  
  // Compliance information
  compliance_info: z.array(z.object({
    compliance_type: createEnumSchema(z.nativeEnum(ComplianceTypeEnum))
      .refine(val => val !== null, {
        message: "Compliance type is required"
      }), // compliance_type_enum NOT NULL
    
    certificate_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Certificate URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (certificate_url ~* '^https?://')
    
    certified_at: z.preprocess(
      safeDatePreprocessor,
      z.date({
        invalid_type_error: "Certification date must be a valid date"
      }).optional()
    ), // DATE
    
    expires_at: z.preprocess(
      safeDatePreprocessor,
      z.date({
        invalid_type_error: "Expiration date must be a valid date"
      }).optional()
    ), // DATE
    
    notes: z.string({
      invalid_type_error: "Notes must be a string"
    }).optional() // TEXT
  })).optional().default([]),
  
  // Part attachments for this version
  attachments: z.array(z.object({
    file_url: z.string({
      required_error: "File URL is required",
      invalid_type_error: "File URL must be a string"
    }).url("Invalid URL format")
      .refine(val => /^https?:\/\/.+/.test(val), {
        message: "File URL must start with http:// or https://"
      }), // TEXT NOT NULL CHECK (file_url ~* '^https?://')
    
    file_name: z.string({
      required_error: "File name is required",
      invalid_type_error: "File name must be a string"
    }).min(1, "File name cannot be empty"), // TEXT NOT NULL CHECK (file_name <> '')
    
    file_type: z.string({
      invalid_type_error: "File type must be a string"
    }).optional(), // TEXT
    
    file_size_bytes: z.preprocess(
      safeNumberPreprocessor,
      z.number({
        invalid_type_error: "File size must be a number"
      }).int("File size must be a whole number")
        .nonnegative("File size cannot be negative")
        .optional()
    ), // BIGINT CHECK (file_size_bytes >= 0)
    
    attachment_checksum: z.string({
      invalid_type_error: "Checksum must be a string"
    }).optional(), // TEXT
    
    attachment_description: z.string({
      invalid_type_error: "Description must be a string"
    }).optional(), // TEXT
    
    attachment_type: z.string({
      invalid_type_error: "Attachment type must be a string"
    }).optional(), // TEXT
    
    is_primary: z.boolean().default(false), // BOOLEAN DEFAULT FALSE NOT NULL
    
    thumbnail_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Thumbnail URL must start with http:// or https://"
      })
      .optional() // TEXT CHECK (thumbnail_url ~* '^https?://')
  })).optional().default([]),
  
  // 3D models, footprints, schematic symbols
  representations: z.array(z.object({
    representation_type: z.enum(['3D Model', 'Footprint', 'Schematic Symbol', 'Simulation Model'], {
      required_error: "Representation type is required",
      invalid_type_error: "Invalid representation type"
    }), // TEXT NOT NULL
    
    format: z.string({
      invalid_type_error: "Format must be a string"
    }).optional(), // TEXT
    
    file_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "File URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (file_url ~* '^https?://')
    
    metadata: z.lazy(() => {
      const metadataSchema = z.object({
        software: z.string().optional(),
        version: z.string().optional(),
        creation_date: z.string().or(z.date()).optional(),
        dimensions: z.record(z.string(), z.number()).optional(),
        notes: z.string().optional()
      }).partial().optional();
      
      return metadataSchema.or(jsonStringSchema);
    }), // JSONB
    
    is_recommended: z.boolean().default(false) // BOOLEAN DEFAULT FALSE NOT NULL
  })).optional().default([]),
  
  // Manufacturer parts for this version
  manufacturer_parts: z.array(z.object({
    manufacturer_id: z.string().uuid({
      message: "Manufacturer ID must be a valid UUID"
    }), // UUID NOT NULL REFERENCES Manufacturer(manufacturer_id)
    
    manufacturer_part_number: z.string({
      required_error: "Manufacturer part number is required",
      invalid_type_error: "Manufacturer part number must be a string"
    }).min(1, "Manufacturer part number cannot be empty"), // TEXT NOT NULL CHECK (manufacturer_part_number <> '')
    
    description: z.string({
      invalid_type_error: "Description must be a string"
    }).optional(), // TEXT
    
    datasheet_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Datasheet URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (datasheet_url ~* '^https?://')
    
    product_url: z.string()
      .refine(val => !val || /^https?:\/\/.+/.test(val), {
        message: "Product URL must start with http:// or https://"
      })
      .optional(), // TEXT CHECK (product_url ~* '^https?://')
    
    is_recommended: z.boolean().default(false) // BOOLEAN DEFAULT FALSE NOT NULL
  })).optional().default([]),
  
  // Custom fields for this version
  custom_fields: z.record(z.string(), z.union([
    z.string(), z.number(), z.boolean(), z.null()
  ])).optional(), // JSONB for user-defined fields
  
  // Revision tracking (specific to version updates)
  previous_version_id: z.string({
    invalid_type_error: "Previous version ID must be a string"
  }).uuid({
    message: "Previous version ID must be a valid UUID"
  }).optional(), // UUID of the version being updated
  
  change_description: z.string({
    required_error: "Change description is required for version update",
    invalid_type_error: "Change description must be a string"
  }), // TEXT NOT NULL - description of changes from previous version
  
  changed_fields: z.record(z.string(), z.union([
    z.string(), z.number(), z.boolean(), z.array(z.any()), z.record(z.string(), z.any()), z.null()
  ])).refine(obj => !obj || Object.keys(obj).length > 0, {
    message: "At least one changed field must be specified when providing change information"
  }).optional(), // JSONB NOT NULL - fields that were changed
  
  // Release information
  released_at: z.preprocess(
    safeDatePreprocessor,
    z.date({
      invalid_type_error: "Release date must be a valid date"
    }).optional()
  ), // TIMESTAMPTZ
})
.superRefine((data, ctx) => {
  // Special validation for version increments
  if (data.previous_version_id) {
    // Require change description when creating a new version
    if (!data.change_description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Change description is required when creating a new version',
        path: ['change_description']
      });
    }
    
    // Ensure changed_fields is provided when creating a version update
    if (!data.changed_fields || Object.keys(data.changed_fields).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one changed field must be specified when creating a new version',
        path: ['changed_fields']
      });
    }
    
    // Validate version increment format
    if (data.part_version) {
      // Ensure the version follows proper semantic versioning format
      if (!/^\d+\.\d+\.\d+$/.test(data.part_version)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Version must follow semantic versioning format (x.y.z)',
          path: ['part_version']
        });
      } else {
        // Note that proper version increment validation happens on the server
        // where we can compare with the previous version
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Version must be incremented from previous version (server-enforced)',
          path: ['part_version']
        });
      }
    }
  }
});

// ### PartAttachment Schema
export const partAttachmentSchema = z.object({
    part_attachment_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    part_version_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    file_url: z.string({
        required_error: "File URL is required",
        invalid_type_error: "File URL must be a string"
    }).url("Invalid URL format").refine(val => /^https?:\/\/.+/.test(val), {
        message: "File URL must start with http:// or https://"
    }), // TEXT NOT NULL CHECK (file_url ~* '^https?://')
    file_name: z.string({
        required_error: "File name is required",
        invalid_type_error: "File name must be a string"
    }).min(1, "File name cannot be empty"), // TEXT NOT NULL CHECK (file_name <> '')
    file_type: z.string().optional(), // TEXT
    file_size_bytes: z.preprocess(
        safeNumberPreprocessor,
        z.number({ invalid_type_error: "File size must be a number" }).int().nonnegative().optional()
    ), // BIGINT CHECK (file_size_bytes >= 0)
    attachment_checksum: z.string().optional(), // TEXT
    attachment_description: z.string().optional(), // TEXT
    attachment_type: z.string().optional(), // TEXT
    is_primary: z.boolean().default(false), // BOOLEAN DEFAULT FALSE NOT NULL
    thumbnail_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Thumbnail URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (thumbnail_url ~ '^https?://')
    uploaded_by: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES "User"(user_id)
    uploaded_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    updated_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    metadata: z.lazy(() => {
        // Define a more specific metadata schema for attachments
        const metadataSchema = z.object({
            content_type: z.string().optional(),
            encoding: z.string().optional(),
            revision: z.string().optional(),
            tags: z.array(z.string()).optional(),
            notes: z.string().optional()
        }).partial().optional();
        
        return metadataSchema.or(jsonSchema.optional());
    }) // JSONB
});

// ### PartRepresentation Schema
export const partRepresentationSchema = z.object({
    part_representation_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    part_version_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    representation_type: z.enum(['3D Model', 'Footprint', 'Schematic Symbol', 'Simulation Model'], {
        required_error: "Representation type is required",
        invalid_type_error: "Invalid representation type"
    }), // TEXT NOT NULL
    format: z.string().optional(), // TEXT
    file_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "File URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (file_url ~ '^https?://')
    metadata: z.lazy(() => {
        // Define a more specific metadata schema for representations
        const metadataSchema = z.object({
            software: z.string().optional(),
            version: z.string().optional(),
            creation_date: z.string().or(z.date()).optional(),
            dimensions: z.record(z.string(), z.number()).optional(),
            notes: z.string().optional()
        }).partial().optional();
        
        return metadataSchema.or(jsonSchema.optional());
    }), // JSONB
    is_recommended: z.boolean().default(false), // BOOLEAN DEFAULT FALSE NOT NULL
    created_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    created_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    updated_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()) // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### PartRevision Schema
export const partRevisionSchema = z.object({
    part_revision_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    part_version_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    change_description: z.string({
        required_error: "Change description is required",
        invalid_type_error: "Change description must be a string"
    }), // TEXT NOT NULL
    changed_by: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES "User"(user_id)
    changed_fields: jsonSchema, // JSONB NOT NULL
    revision_date: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()) // TIMESTAMPTZ DEFAULT NOW()
});

// ### PartValidation Schema
export const partValidationSchema = z.object({
    part_version_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY REFERENCES PartVersion(part_version_id)
    validated_by: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES "User"(user_id)
    validation_date: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW()
    test_results: z.lazy(() => {
        // Define a more specific test results schema
        const testResultSchema = z.object({
            test_name: z.string(),
            result: z.string().or(z.number()).or(z.boolean()),
            pass_fail: z.boolean().optional(),
            timestamp: z.string().or(z.date()).optional(),
            notes: z.string().optional()
        }).partial().array().optional();
        
        return testResultSchema.or(jsonSchema.optional());
    }), // JSONB
    certification_info: z.lazy(() => {
        // Define a more specific certification info schema
        const certSchema = z.object({
            certificate_id: z.string().optional(),
            name: z.string().optional(),
            issuer: z.string().optional(),
            issue_date: z.string().or(z.date()).optional(),
            expiry_date: z.string().or(z.date()).optional(),
            status: z.string().optional()
        }).partial().optional();
        
        return certSchema.or(jsonSchema.optional());
    }), // JSONB
    is_compliant: z.boolean().default(false) // BOOLEAN DEFAULT FALSE
});

// ### Manufacturer Schema
export const manufacturerSchema = z.object({
    manufacturer_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    manufacturer_name: z.string({
        required_error: "Manufacturer name is required",
        invalid_type_error: "Manufacturer name must be a string"
    }).min(1, "Manufacturer name cannot be empty"), // TEXT NOT NULL UNIQUE CHECK (manufacturer_name <> '')
    manufacturer_description: z.string().optional(), // TEXT
    website_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Website URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (website_url ~ '^https?://')
    contact_info: z.lazy(() => {
        // Define a more specific contact info schema
        const contactSchema = z.object({
            email: z.string().email("Invalid email address").optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            notes: z.string().optional()
        }).partial().optional();
        
        return contactSchema.or(jsonSchema.optional());
    }), // JSONB
    logo_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Logo URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (logo_url ~ '^https?://')
    created_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    created_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    updated_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
});

// ### ManufacturerPart Schema
export const manufacturerPartSchema = z.object({
    manufacturer_part_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    part_version_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    manufacturer_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES Manufacturer(manufacturer_id)
    manufacturer_part_number: z.string({
        required_error: "Manufacturer part number is required",
        invalid_type_error: "Manufacturer part number must be a string"
    }).min(1, "Manufacturer part number cannot be empty"), // TEXT NOT NULL CHECK (manufacturer_part_number <> '')
    description: z.string().optional(), // TEXT
    datasheet_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Datasheet URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (datasheet_url ~ '^https?://')
    product_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Product URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (product_url ~ '^https?://')
    is_recommended: z.boolean().default(false), // BOOLEAN DEFAULT FALSE NOT NULL
    created_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    created_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    updated_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()) // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### Supplier Schema
export const supplierSchema = z.object({
    supplier_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    supplier_name: z.string({
        required_error: "Supplier name is required",
        invalid_type_error: "Supplier name must be a string"
    }).min(1, "Supplier name cannot be empty"), // TEXT NOT NULL UNIQUE CHECK (supplier_name <> '')
    supplier_description: z.string().optional(), // TEXT
    website_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Website URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (website_url ~ '^https?://')
    contact_info: z.lazy(() => {
        // Define a more specific contact info schema
        const contactSchema = z.object({
            email: z.string().email("Invalid email address").optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            notes: z.string().optional()
        }).partial().optional();
        
        return contactSchema.or(jsonSchema.optional());
    }), // JSONB
    logo_url: z.string()
        .refine(val => !val || /^https?:\/\/.+/.test(val), {
            message: "Logo URL must start with http:// or https://"
        })
        .optional(), // TEXT CHECK (logo_url ~ '^https?://')
    created_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    created_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid({ message: "Invalid UUID format" }).optional(), // UUID REFERENCES "User"(user_id)
    updated_at: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val as string),
        z.date({ invalid_type_error: "Must be a valid date" })
    ).default(() => new Date()), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
});

// ### SupplierPart Schema
export const supplierPartSchema = z.object({
    supplier_part_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID PRIMARY KEY
    manufacturer_part_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES ManufacturerPart(manufacturer_part_id)
    supplier_id: z.string().uuid({ message: "Invalid UUID format" }), // UUID NOT NULL REFERENCES Supplier(supplier_id)
    supplier_part_number: z.string().optional(), // TEXT
    unit_price: z.preprocess(
        (val) => val === "" ? null : val === null ? null : typeof val === "number" ? val : parseFloat(val as string),
        z.number({ invalid_type_error: "Unit price must be a number" }).nonnegative().optional()
    ), // NUMERIC CHECK (unit_price >= 0)
    currency: z.string().default('USD').optional().nullable(), // TEXT DEFAULT 'USD'
    price_breaks: jsonSchema.optional().nullable(), // JSONB
    stock_quantity: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (stock_quantity >= 0)
    lead_time_days: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (lead_time_days >= 0)
    minimum_order_quantity: z.number().int().positive().optional().nullable(), // INTEGER CHECK (minimum_order_quantity > 0)
    packaging_info: jsonSchema.optional().nullable(), // JSONB
    product_url: z.string().url().optional().nullable(), // TEXT CHECK (product_url ~ '^https?://')
    is_preferred: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### Tag Schema
export const tagSchema = z.object({
    tag_id: z.string().uuid(), // UUID PRIMARY KEY
    tag_name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (tag_name <> '')
    tag_description: z.string().optional().nullable(), // TEXT
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    is_deleted: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
    deleted_at: z.date().optional().nullable(), // TIMESTAMPTZ
    deleted_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields
});

// ### PartVersionTag Schema
export const partVersionTagSchema = z.object({
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    tag_id: z.string().uuid(), // UUID NOT NULL REFERENCES Tag(id)
    assigned_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
    assigned_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ### CustomField Schema
export const customFieldSchema = z.object({
    custom_field_id: z.string().uuid(), // UUID PRIMARY KEY
    field_name: z.string().min(1), // TEXT NOT NULL UNIQUE
    data_type: z.enum(['text', 'number', 'boolean', 'date']), // TEXT NOT NULL
    applies_to: z.enum(['part', 'manufacturer', 'supplier']) // TEXT NOT NULL
});

// ### ManufacturerCustomField Schema
export const manufacturerCustomFieldSchema = z.object({
    manufacturer_id: z.string().uuid(), // UUID NOT NULL REFERENCES Manufacturer(manufacturer_id)
    field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(custom_field_id)
    custom_field_value: jsonSchema // JSONB NOT NULL
});

// ### SupplierCustomField Schema
export const supplierCustomFieldSchema = z.object({
    supplier_id: z.string().uuid(), // UUID NOT NULL REFERENCES Supplier(supplier_id)
    field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(custom_field_id)
    custom_field_value: jsonSchema // JSONB NOT NULL
});

// ### PartCustomField Schema
export const partCustomFieldSchema = z.object({
    part_custom_field_id: z.string().uuid(), // Primary key
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    field_name: z.string().min(1), // TEXT NOT NULL - name of the custom field
    field_value: jsonSchema, // JSONB NOT NULL - value of the custom field
    field_type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'ARRAY']), // Type of field
    field_group: z.string().optional().nullable(), // For grouping related fields
    display_order: z.number().int().optional().nullable(), // For controlling display order in UI
    required: z.boolean().default(false), // Whether the field is required
    validation_regex: z.string().optional().nullable(), // Optional regex pattern for validation
    validation_message: z.string().optional().nullable(), // Optional message to show when validation fails
    options: z.array(z.string()).optional().nullable(), // Optional array of allowed values (for enum fields)
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date().optional().nullable() // TIMESTAMPTZ
});

// ### PartFamily Schema
export const partFamilySchema = z.object({
    part_family_id: z.string().uuid(), // UUID PRIMARY KEY DEFAULT uuid_generate_v4()
    family_name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (family_name <> '')
    family_description: z.string().optional().nullable(), // TEXT
    family_code: z.string().optional().nullable(), // TEXT
    family_image_url: z.string().url().optional().nullable(), // TEXT CHECK (family_image_url ~* '^https?://')
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    is_public: z.boolean().default(true), // BOOLEAN DEFAULT TRUE NOT NULL
    is_active: z.boolean().default(true), // BOOLEAN DEFAULT TRUE NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields for future extensibility
});

// ### PartGroup Schema
export const partGroupSchema = z.object({
    part_group_id: z.string().uuid(), // UUID PRIMARY KEY DEFAULT uuid_generate_v4()
    group_name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (group_name <> '')
    group_description: z.string().optional().nullable(), // TEXT
    group_code: z.string().optional().nullable(), // TEXT
    group_type: z.string().optional().nullable(), // TEXT -- e.g., 'project', 'functional', 'logical', etc.
    group_image_url: z.string().url().optional().nullable(), // TEXT CHECK (group_image_url ~* '^https?://')
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    is_public: z.boolean().default(true), // BOOLEAN DEFAULT TRUE NOT NULL
    is_active: z.boolean().default(true), // BOOLEAN DEFAULT TRUE NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields for future extensibility
});

// ### PartFamilyLink Schema
export const partFamilyLinkSchema = z.object({
    part_family_link_id: z.string().uuid(), // UUID PRIMARY KEY DEFAULT uuid_generate_v4()
    part_id: z.string().uuid(), // UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE CASCADE
    family_id: z.string().uuid(), // UUID NOT NULL REFERENCES "PartFamily"(part_family_id) ON DELETE CASCADE
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    notes: z.string().optional().nullable() // TEXT
});

// ### PartGroupLink Schema
export const partGroupLinkSchema = z.object({
    part_group_link_id: z.string().uuid(), // UUID PRIMARY KEY DEFAULT uuid_generate_v4()
    part_id: z.string().uuid(), // UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE CASCADE
    group_id: z.string().uuid(), // UUID NOT NULL REFERENCES "PartGroup"(part_group_id) ON DELETE CASCADE
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    position_index: z.number().int().optional().nullable(), // INTEGER
    notes: z.string().optional().nullable() // TEXT
});

// ### Project Schema
export const projectSchema = z.object({
    project_id: z.string().uuid(), // UUID PRIMARY KEY
    project_name: z.string().min(1), // TEXT NOT NULL CHECK (project_name <> '')
    project_description: z.string().optional().nullable(), // TEXT
    owner_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
    project_status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum NOT NULL DEFAULT 'draft'
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields for future extensibility
});

// ### BillOfMaterials Schema
export const billOfMaterialsSchema = z.object({
    bom_id: z.string().uuid(), // UUID PRIMARY KEY
    project_id: z.string().uuid(), // UUID NOT NULL REFERENCES Project(project_id)
    bom_version: z.string().min(1), // TEXT NOT NULL CHECK (bom_version <> '')
    bom_name: z.string().optional().nullable(), // TEXT
    bom_description: z.string().optional().nullable(), // TEXT
    bom_status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum NOT NULL DEFAULT 'draft'
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    released_at: z.date().optional().nullable(), // TIMESTAMPTZ
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields for future extensibility
});

// ### BOMItem Schema
export const bomItemSchema = z.object({
    bom_item_id: z.string().uuid(), // UUID PRIMARY KEY
    bom_id: z.string().uuid(), // UUID NOT NULL REFERENCES BillOfMaterials(bom_id)
    part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    quantity: z.number().positive(), // NUMERIC NOT NULL CHECK (quantity > 0)
    reference_designator: z.string().optional().nullable(), // TEXT
    mounting_type: z.nativeEnum(MountingTypeEnum).optional().nullable(), // mounting_type_enum
    instructions: z.string().optional().nullable(), // TEXT
    find_number: z.number().int().optional().nullable(), // INTEGER
    substitute_part_version_id: z.string().uuid().optional().nullable(), // UUID REFERENCES PartVersion(part_version_id)
    created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(user_id)
    created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
    updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    updated_at: z.date().optional().nullable(), // TIMESTAMPTZ
    custom_fields: jsonSchema.optional().nullable() // Add support for custom fields for future extensibility
});

// ### BOMItemSubstitute Schema
export const bomItemSubstituteSchema = z.object({
    bom_item_id: z.string().uuid(), // UUID NOT NULL REFERENCES BOMItem(bom_item_id)
    substitute_part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(part_version_id)
    priority: z.number().int().min(1).default(10), // INTEGER DEFAULT 10 NOT NULL CHECK (priority >= 1)
    notes: z.string().optional().nullable(), // TEXT
    created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(user_id)
    created_at: z.date().optional().nullable() // TIMESTAMPTZ
});


// Enhanced base schema for Part entity forms with all fields needed for PartForm.svelte
export const partFormBaseSchema = z.object({
    // Core fields
    // Remove duplicate id since part_id is already included
    part_id: z.string().uuid().optional(),
    part_name: z.string().min(1),
    part_version: z.string().regex(/^\d+\.\d+\.\d+$/), 
    version_status: z.nativeEnum(LifecycleStatusEnum),
    status_in_bom: z.nativeEnum(PartStatusEnum).default(PartStatusEnum.CONCEPT), // part_status_enum DEFAULT 'concept'
    
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
    category_ids: z.string().optional(), // Comma-separated category IDs
    family_ids: z.string().optional(), // Comma-separated family IDs
    group_ids: z.string().optional(), // Comma-separated group IDs
    manufacturer_parts: z.string().optional(),
    
    // Physical properties
    part_weight: z.number().optional().nullable(),
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
    mounting_type: createEnumSchema(z.nativeEnum(MountingTypeEnum)), // From schema.sql
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


// Category schema for client usage
export const categoryClientSchema = z.object({
    category_id: z.string(),
    category_name: z.string().min(1),
    parent_id: z.string().optional().nullable(),
    category_description: z.string().optional().nullable(),
    category_path: z.string().optional()
});


