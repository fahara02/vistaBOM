/**
 * Central type exports file
 * This file re-exports all types from their respective files
 * for convenient importing throughout the application
 */

// Primitive type definitions - these are the core fundamental types
export type {
  Dimensions,
  JsonValue,
  JsonRecord,
  LongDescription,
  MaterialComposition,
  PriceBreak,
  ContactInfo
} from './primitive';

// Enum type definitions
export * from './enums';

// Form handling types
export type {
  BaseFormData,
  ManufacturerFormData,
  SupplierFormData,
  PartFormData,
  PartVersionFormData
} from './formTypes';

// Contact information types with explicit naming
export type { ContactInfo as ContactDetails } from './contact';

// Import types from schemaTypes.ts
import type {
  User,
  Session,
  Role,
  Permission,
  RolePermission,
  Category,
  Part,
  PartVersion,
  PartVersionBase,
  CreatePart,
  CreatePartVersion,
  PartAttachment,
  PartRepresentation,
  Manufacturer,
  Supplier,
  PartWithCurrentVersion,
  PartVersionWithRelations,
  ElectricalProperties,
  MechanicalProperties,
  ThermalProperties,
  EnvironmentalData
} from './schemaTypes';

// Re-export schema-derived types
export type {
  User,
  Session,
  Role,
  Permission,
  RolePermission,
  Category,
  Part,
  PartVersion,
  PartVersionBase,
  CreatePart,
  CreatePartVersion,
  PartAttachment,
  PartRepresentation,
  Manufacturer,
  Supplier,
  PartWithCurrentVersion,
  PartVersionWithRelations,
  ElectricalProperties,
  MechanicalProperties,
  ThermalProperties,
  EnvironmentalData
};

// Export dimensions type with an alias
export type { Dimensions as EditableDimensions } from './schemaTypes';

// Database entity type aliases (Db prefix)
// These are type aliases for the schema-derived types
export type DbUser = User;
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

// Legacy types to maintain compatibility with existing code
// TODO: These should be defined explicitly or imported from the right places
export type DbPartStructure = any;
export type DbPartCompliance = any;
export type DbPartRevision = any;
export type DbPartValidation = any;
export type DbCategoryClosure = any;
export type DbTag = any;
export type DbPartVersionTag = any;
export type DbManufacturerPart = any;
export type DbSupplierPart = any;
export type DbProject = any;
export type DbBillOfMaterials = any;
export type DbBOMItem = any;
export type DbBOMItemSubstitute = any;
export type DbCustomField = any;
export type DbManufacturerCustomField = any;
export type DbSupplierCustomField = any;
export type DbPartCustomField = any;
