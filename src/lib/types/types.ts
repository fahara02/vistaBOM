/**
 * Central type exports file
 * This file re-exports all types from their respective files
 * for convenient importing throughout the application
 */

// Primitive type definitions - these are the core fundamental types
export type {
  ContactInfo, Dimensions, JsonRecord, JsonValue, LongDescription,
  MaterialComposition,
  PriceBreak
} from './primitive';


// Database-specific type definitions
export type {
  AttachmentInput, ComplianceInput, DbElectricalProperties, DbEnvironmentalData, DbMechanicalProperties, DbRow, DbThermalProperties, DbUpdateValue, DynamicRecord, JsonFieldProcessor, JsonFields, ManufacturerPartInput, NumericFieldProcessor, PostgresTransaction, ProcessableFieldValue, RepresentationInput, SupplierPartInput, UpdateValues, ValidationInput
} from './db-types';

// Enum type definitions
export * from './enums';

// Form handling types
export type {
  BaseFormData,
  ManufacturerFormData, PartFormData,
  PartVersionFormData, SupplierFormData
} from './formTypes';

// Import types from schemaTypes.ts
import type {
  Category,
  CreatePart,
  CreatePartVersion,
  ElectricalProperties,
  EnvironmentalData,
  Manufacturer,
  MechanicalProperties,
  Part,
  PartAttachment,
  PartRepresentation,
  PartVersion,
  PartVersionBase,
  PartVersionWithRelations,
  PartWithCurrentVersion,
  Permission,
  Project,
  Role,
  RolePermission,
  Session,
  Supplier,
  ThermalProperties,
  User
} from './schemaTypes';

// Re-export schema-derived types
export type {
  Category, CreatePart, CreatePartVersion, ElectricalProperties, EnvironmentalData, Manufacturer, MechanicalProperties, Part, PartAttachment,
  PartRepresentation, PartVersion,
  PartVersionBase, PartVersionWithRelations, PartWithCurrentVersion, Permission, Project, Role, RolePermission, Session, Supplier, ThermalProperties, User
};

// Export dimensions type with an alias
  export type { Dimensions as EditableDimensions } from './schemaTypes';

// Database entity type aliases (Db prefix)
// These are type aliases for the schema-derived types
export type DbUser = User;
export type DbProject=Project;
export type DbSession = Session;
export type DbRole = Role;
export type DbPermission = Permission;
export type DbRolePermission = RolePermission;
export type DbPart = Part;
export type DbPartVersion = PartVersion;
export type DbPartVersionCategory = PartVersionBase;
export type DbPartAttachment = PartAttachment;
export type DbPartRepresentation = PartRepresentation;
export type DbCategory = Category;
export type DbManufacturer = Manufacturer;
export type DbSupplier = Supplier;

