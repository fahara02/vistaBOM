/**
 * Types inferred from Zod schemas
 * This ensures type definitions are synchronized with validation rules
 */
import { z } from 'zod';
import {
  // Core schemas
  categorySchema,
  createPartSchema,
  createPartVersionSchema,
  dimensionSchema,
  editDimensionSchema,
  jsonSchema,
  manufacturerSchema,
  partAttachmentSchema,
  partRepresentationSchema,
  partSchema,
  partVersionEditSchema,
  partVersionSchema,
  partVersionSchemaBase,
  permissionSchema,
  rolePermissionSchema,
  roleSchema,
  sessionSchema,
  supplierSchema,
  userSchema,
  categoryClientSchema

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
}

export interface PartVersionWithRelations extends PartVersion {
  part?: Part | null;
  categories?: Category[];
  attachments?: PartAttachment[];
  representations?: PartRepresentation[];
}

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
