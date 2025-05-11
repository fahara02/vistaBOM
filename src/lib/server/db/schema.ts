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
} from '$lib/server/db/types';
import { z } from 'zod';

// Helper schema for JSONB fields where the exact structure is not fixed
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
	z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

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
// Session Schema
export const sessionSchema = z.object({
	id: z.string(), // TEXT PRIMARY KEY
	user_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	expires_at: z.date(), // TIMESTAMPTZ NOT NULL
	last_used: z.date() // TIMESTAMPTZ DEFAULT NOW()
});
// Role Schema
export const roleSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	name: z.string().min(1), // TEXT UNIQUE NOT NULL CHECK (name <> '')
	description: z.string().optional().nullable(), // TEXT
	created_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});
// Permission Schema
export const permissionSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (name <> '')
	description: z.string().optional().nullable() // TEXT
});

// RolePermission Schema
export const rolePermissionSchema = z.object({
	role_id: z.string().uuid(), // UUID NOT NULL REFERENCES Role(id)
	permission_id: z.string().uuid(), // UUID NOT NULL REFERENCES Permission(id)
	assigned_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	assigned_by: z.string().uuid().optional().nullable() // UUID REFERENCES "User"(id)
	// PRIMARY KEY (role_id, permission_id) - Zod represents this as a combined schema
});
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
const dimensionSchema = z.object({
	length: z.number().positive(),
	width: z.number().positive(),
	height: z.number().positive()
});
export const partSchema = z.object({
	id: z.string().uuid(),
	creatorId: z.string().uuid(),
	globalPartNumber: z.string(),
	status: z.nativeEnum(PartStatusEnum),
	lifecycleStatus: z.nativeEnum(LifecycleStatusEnum),
	isPublic: z.boolean(),
	createdAt: z.date(),
	updatedBy: z.string().uuid().optional(),
	updatedAt: z.date(),
	currentVersionId: z.string().uuid().optional()
});
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
	dimensions: dimensionSchema.optional().nullable(), // JSONB CHECK (...) -> validated by dimensionSchema
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
	status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum DEFAULT 'draft' NOT NULL
	released_at: z.date().optional().nullable(), // TIMESTAMPTZ
	created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});
export const partVersionSchema = partVersionSchemaBase
	.refine((data) => (data.weight === undefined) === (data.weight_unit === undefined), {
		message: 'Weight and unit must both be present or omitted',
		path: ['weight_unit']
	})
	.refine((data) => (data.dimensions === undefined) === (data.dimensions_unit === undefined), {
		message: 'Dimensions and unit must both be present or omitted',
		path: ['dimensions_unit']
	})
	.refine((data) => (data.tolerance === undefined) === (data.tolerance_unit === undefined), {
		message: 'Tolerance and unit must both be present or omitted',
		path: ['tolerance_unit']
	})
	.refine(
		(data) =>
			!data.voltage_rating_max ||
			!data.voltage_rating_min ||
			data.voltage_rating_max >= data.voltage_rating_min,
		{ message: 'Max voltage must be >= min', path: ['voltage_rating_max'] }
	)
	.refine(
		(data) =>
			!data.current_rating_max ||
			!data.current_rating_min ||
			data.current_rating_max >= data.current_rating_min,
		{ message: 'Max current must be >= min', path: ['current_rating_max'] }
	)
	.refine(
		(data) =>
			!data.operating_temperature_max ||
			!data.operating_temperature_min ||
			data.operating_temperature_max >= data.operating_temperature_min,
		{ message: 'Operating temp max must be >= min', path: ['operating_temperature_max'] }
	)
	.refine(
		(data) =>
			!data.storage_temperature_max ||
			!data.storage_temperature_min ||
			data.storage_temperature_max >= data.storage_temperature_min,
		{ message: 'Storage temp max must be >= min', path: ['storage_temperature_max'] }
	);

export const createPartSchema = z
	.object({
		name: z.string().min(3).max(100), // from partVersionSchema
		version: z
			.string()
			.regex(/^\d+\.\d+\.\d+$/)
			.default('0.1.0'), // from partVersionSchema
		status: z.nativeEnum(LifecycleStatusEnum).default(LifecycleStatusEnum.DRAFT), // from partVersionSchema (using lifecycle status)
		// Add part status field (separate from lifecycle status)
		partStatus: z.enum(['concept', 'active', 'obsolete', 'archived']).default('concept'),
		// Add other fields required for the initial version creation if needed
		short_description: z.string().max(200).optional().nullable(),
		long_description: jsonSchema.optional().nullable(),
		functional_description: z.string().optional().nullable(),
		technical_specifications: jsonSchema.optional().nullable(),
		properties: jsonSchema.optional().nullable(),
		electrical_properties: jsonSchema.optional().nullable(),
		mechanical_properties: jsonSchema.optional().nullable(),
		thermal_properties: jsonSchema.optional().nullable(),
		weight: z.number().nonnegative().optional().nullable(),
		weight_unit: z.nativeEnum(WeightUnitEnum).optional().nullable(),
		dimensions: dimensionSchema.optional().nullable(),
		dimensions_unit: z.nativeEnum(DimensionUnitEnum).optional().nullable(),
		material_composition: jsonSchema.optional().nullable(),
		environmental_data: jsonSchema.optional().nullable(),
		voltage_rating_max: z.number().optional().nullable(),
		voltage_rating_min: z.number().optional().nullable(),
		current_rating_max: z.number().optional().nullable(),
		current_rating_min: z.number().optional().nullable(),
		power_rating_max: z.number().nonnegative().optional().nullable(),
		tolerance: z.number().nonnegative().optional().nullable(),
		tolerance_unit: z.string().optional().nullable(),
		package_type: z.nativeEnum(PackageTypeEnum).optional().nullable(),
		pin_count: z.number().int().nonnegative().optional().nullable(),
		operating_temperature_min: z.number().optional().nullable(),
		operating_temperature_max: z.number().optional().nullable(),
		storage_temperature_min: z.number().optional().nullable(),
		storage_temperature_max: z.number().optional().nullable(),
		temperature_unit: z.nativeEnum(TemperatureUnitEnum).optional().nullable(),
		revision_notes: z.string().optional().nullable(),
		released_at: z.date().optional().nullable()
	})
	.refine(
		(data) =>
			(data.weight === undefined || data.weight === null) ===
			(data.weight_unit === undefined || data.weight_unit === null),
		{ message: 'Weight and unit must both be present or omitted', path: ['weight_unit'] }
	)
	.refine(
		(data) =>
			(data.dimensions === undefined || data.dimensions === null) ===
			(data.dimensions_unit === undefined || data.dimensions_unit === null),
		{ message: 'Dimensions and unit must both be present or omitted', path: ['dimensions_unit'] }
	)
	.refine(
		(data) =>
			(data.tolerance === undefined || data.tolerance === null) ===
			(data.tolerance_unit === undefined || data.tolerance_unit === null),
		{ message: 'Tolerance and unit must both be present or omitted', path: ['tolerance_unit'] }
	)
	.refine(
		(data) =>
			data.voltage_rating_max === undefined ||
			data.voltage_rating_max === null ||
			data.voltage_rating_min === undefined ||
			data.voltage_rating_min === null ||
			data.voltage_rating_max >= data.voltage_rating_min,
		{ message: 'Max voltage must be >= min', path: ['voltage_rating_max'] }
	)
	.refine(
		(data) =>
			data.current_rating_max === undefined ||
			data.current_rating_max === null ||
			data.current_rating_min === undefined ||
			data.current_rating_min === null ||
			data.current_rating_min <= data.current_rating_max,
		{ message: 'Max current must be >= min', path: ['current_rating_max'] }
	)
	.refine(
		(data) =>
			data.operating_temperature_max === undefined ||
			data.operating_temperature_max === null ||
			data.operating_temperature_min === undefined ||
			data.operating_temperature_min === null ||
			data.operating_temperature_max >= data.operating_temperature_min,
		{ message: 'Operating temp max must be >= min', path: ['operating_temperature_max'] }
	)
	.refine(
		(data) =>
			data.storage_temperature_max === undefined ||
			data.storage_temperature_max === null ||
			data.storage_temperature_min === undefined ||
			data.storage_temperature_min === null ||
			data.storage_temperature_max >= data.storage_temperature_min,
		{ message: 'Storage temp max must be >= min', path: ['storage_temperature_max'] }
	);
// Schema for creating subsequent Part Versions - Refined
export const createPartVersionSchema = partVersionSchemaBase.omit({
	id: true,
	part_id: true, // This will be provided in the route/service
	created_at: true,
	created_by: true, // This will be set by the backend user
	updated_at: true,
	updated_by: true
	// Keep 'version' as it's provided by the user for a new version
});

// Additional schemas for other entities
export const partComplianceSchema = z.object({
	partVersionId: z.string().uuid(),
	complianceType: z.nativeEnum(ComplianceTypeEnum),
	certificateUrl: z.string().url().optional(),
	certifiedAt: z.date().optional(),
	expiresAt: z.date().optional(),
	notes: z.string().optional()
});

// PartStructure Schema (Existing - Refined)
export const partStructureSchema = z.object({
	id: z.string().uuid().optional(), // Added ID based on SQL
	parent_part_id: z.string().uuid(), // UUID NOT NULL REFERENCES Part(id)
	child_part_id: z.string().uuid(), // UUID NOT NULL REFERENCES Part(id)
	relation_type: z
		.nativeEnum(StructuralRelationTypeEnum)
		.default(() => StructuralRelationTypeEnum.COMPONENT), // structural_relation_type_enum DEFAULT 'component' NOT NULL
	quantity: z.number().positive().default(1), // NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0)
	notes: z.string().optional().nullable(), // TEXT
	created_by: z.string().uuid().optional(), // Added based on SQL
	created_at: z.date().optional(), // Added based on SQL
	updated_by: z.string().uuid().optional().nullable(), // Added based on SQL
	updated_at: z.date().optional(), // Added based on SQL
	valid_from: z.date().optional(), // Added based on SQL
	valid_until: z.date().optional().nullable() // Added based on SQL
});
// PartVersionCategory Schema
export const partVersionCategorySchema = z.object({
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	category_id: z.string().uuid() // UUID NOT NULL REFERENCES Category(id)
	// PRIMARY KEY (part_version_id, category_id) - Zod represents this as a combined schema
});

// PartAttachment Schema
export const partAttachmentSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	file_url: z.string().url(), // TEXT NOT NULL CHECK (...)
	file_name: z.string().min(1), // TEXT NOT NULL CHECK (...)
	file_type: z.string().optional().nullable(), // TEXT
	file_size_bytes: z.number().int().nonnegative().optional().nullable(), // BIGINT CHECK (...)
	checksum: z.string().optional().nullable(), // TEXT
	description: z.string().optional().nullable(), // TEXT
	attachment_type: z.string().optional().nullable(), // TEXT
	is_primary: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
	thumbnail_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	uploaded_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	uploaded_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// PartRepresentation Schema
export const partRepresentationSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	type: z.enum(['3D Model', 'Footprint', 'Schematic Symbol', 'Simulation Model']), // TEXT NOT NULL CHECK (...)
	format: z.string().optional().nullable(), // TEXT
	file_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	metadata: jsonSchema.optional().nullable(), // JSONB
	is_recommended: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
	created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});
// PartRevision Schema
export const partRevisionSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	change_description: z.string(), // TEXT NOT NULL
	changed_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	changed_fields: jsonSchema, // JSONB NOT NULL
	revision_date: z.date() // TIMESTAMPTZ DEFAULT NOW()
});

// PartValidation Schema
export const partValidationSchema = z.object({
	part_version_id: z.string().uuid(), // UUID PRIMARY KEY REFERENCES PartVersion(id)
	validated_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	validation_date: z.date(), // TIMESTAMPTZ DEFAULT NOW()
	test_results: jsonSchema.optional().nullable(), // JSONB
	certification_info: jsonSchema.optional().nullable(), // JSONB
	is_compliant: z.boolean() // BOOLEAN DEFAULT FALSE
});

// Manufacturer Schema
export const manufacturerSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (...)
	description: z.string().optional().nullable(), // TEXT
	website_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	logo_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// ManufacturerPart Schema
export const manufacturerPartSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	manufacturer_id: z.string().uuid(), // UUID NOT NULL REFERENCES Manufacturer(id)
	manufacturer_part_number: z.string().min(1), // TEXT NOT NULL CHECK (...)
	description: z.string().optional().nullable(), // TEXT
	datasheet_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	product_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	is_recommended: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
	created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});
// Supplier Schema
export const supplierSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (...)
	description: z.string().optional().nullable(), // TEXT
	website_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	contact_info: jsonSchema.optional().nullable(), // JSONB
	logo_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// SupplierPart Schema
export const supplierPartSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	manufacturer_part_id: z.string().uuid(), // UUID NOT NULL REFERENCES ManufacturerPart(id)
	supplier_id: z.string().uuid(), // UUID NOT NULL REFERENCES Supplier(id)
	supplier_part_number: z.string().optional().nullable(), // TEXT CHECK (...) - Note: SQL has CHECK (<> '') but is nullable in schema? Let's assume nullable based on schema.
	unit_price: z.number().nonnegative().optional().nullable(), // NUMERIC CHECK (...)
	currency: z.string().default('USD').optional().nullable(), // TEXT DEFAULT 'USD'
	price_breaks: jsonSchema.optional().nullable(), // JSONB
	stock_quantity: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (...)
	lead_time_days: z.number().int().nonnegative().optional().nullable(), // INTEGER CHECK (...)
	minimum_order_quantity: z.number().int().positive().optional().nullable(), // INTEGER CHECK (...)
	packaging_info: jsonSchema.optional().nullable(), // JSONB
	product_url: z.string().url().optional().nullable(), // TEXT CHECK (...)
	is_preferred: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
	created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});

// Tag Schema
export const tagSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	name: z.string().min(1), // TEXT NOT NULL UNIQUE CHECK (...)
	description: z.string().optional().nullable(), // TEXT
	created_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	is_deleted: z.boolean(), // BOOLEAN DEFAULT FALSE NOT NULL
	deleted_at: z.date().optional().nullable(), // TIMESTAMPTZ
	deleted_by: z.string().uuid().optional().nullable() // UUID REFERENCES "User"(id)
});
// PartVersionTag Schema
export const partVersionTagSchema = z.object({
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	tag_id: z.string().uuid(), // UUID NOT NULL REFERENCES Tag(id)
	assigned_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	assigned_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});
// CustomField Schema
export const customFieldSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	field_name: z.string().min(1), // TEXT NOT NULL UNIQUE
	data_type: z.enum(['text', 'number', 'boolean', 'date']), // TEXT NOT NULL CHECK (...)
	applies_to: z.enum(['part', 'manufacturer', 'supplier']) // TEXT NOT NULL CHECK (...)
});
// ManufacturerCustomField Schema
export const manufacturerCustomFieldSchema = z.object({
	manufacturer_id: z.string().uuid(), // UUID NOT NULL REFERENCES Manufacturer(id)
	field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(id)
	value: jsonSchema // JSONB NOT NULL
});
export const supplierCustomFieldSchema = z.object({
	supplier_id: z.string().uuid(), // UUID NOT NULL REFERENCES Supplier(id)
	field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(id)
	value: jsonSchema // JSONB NOT NULL
});
// PartCustomField Schema
export const partCustomFieldSchema = z.object({
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	field_id: z.string().uuid(), // UUID NOT NULL REFERENCES CustomField(id)
	value: jsonSchema // JSONB NOT NULL
});
// Project Schema
export const projectSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	name: z.string().min(1), // TEXT NOT NULL CHECK (...)
	description: z.string().optional().nullable(), // TEXT
	owner_id: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum NOT NULL DEFAULT 'draft'
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date() // TIMESTAMPTZ DEFAULT NOW() NOT NULL
});
// BillOfMaterials Schema
export const billOfMaterialsSchema = z.object({
	id: z.string().uuid(), // UUID PRIMARY KEY
	project_id: z.string().uuid(), // UUID NOT NULL REFERENCES Project(id)
	version: z.string().min(1), // TEXT NOT NULL CHECK (...)
	name: z.string().optional().nullable(), // TEXT
	description: z.string().optional().nullable(), // TEXT
	status: z.nativeEnum(LifecycleStatusEnum), // lifecycle_status_enum NOT NULL DEFAULT 'draft'
	created_by: z.string().uuid(), // UUID NOT NULL REFERENCES "User"(id)
	created_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	updated_by: z.string().uuid().optional().nullable(), // UUID REFERENCES "User"(id)
	updated_at: z.date(), // TIMESTAMPTZ DEFAULT NOW() NOT NULL
	released_at: z.date().optional().nullable() // TIMESTAMPTZ
});
// BOMItem Schema
export const bomItemSchema = z.object({
	id: z.string().uuid(), // Added ID based on SQL
	bom_id: z.string().uuid(), // UUID NOT NULL REFERENCES BillOfMaterials(id)
	part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	quantity: z.number().positive(), // NUMERIC NOT NULL CHECK (quantity > 0)
	reference_designator: z.string().optional().nullable(), // TEXT
	mounting_type: z.nativeEnum(MountingTypeEnum).optional().nullable(), // mounting_type_enum
	instructions: z.string().optional().nullable(), // TEXT
	find_number: z.number().int().optional().nullable(), // Added based on SQL
	substitute_part_version_id: z.string().uuid().optional().nullable(), // UUID REFERENCES PartVersion(id)
	created_by: z.string().uuid().optional(), // Added based on SQL
	created_at: z.date().optional(), // Added based on SQL
	updated_by: z.string().uuid().optional().nullable(), // Added based on SQL
	updated_at: z.date().optional() // Added based on SQL
});
// BOMItemSubstitute Schema
export const bomItemSubstituteSchema = z.object({
	bom_item_id: z.string().uuid(), // UUID NOT NULL REFERENCES BOMItem(id)
	substitute_part_version_id: z.string().uuid(), // UUID NOT NULL REFERENCES PartVersion(id)
	priority: z.number().int().min(1).default(10), // INTEGER DEFAULT 10 NOT NULL CHECK (...)
	notes: z.string().optional().nullable(), // TEXT
	created_by: z.string().uuid().optional(), // Added based on SQL
	created_at: z.date().optional() // Added based on SQL
});
