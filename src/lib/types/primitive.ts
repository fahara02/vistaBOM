/**
 * Primitive type definitions used throughout the application
 * These are the foundational data types that aren't directly mapped to database schemas
 */

// Common JSON value type used for JSONB fields
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

// JSON record type for storing arbitrary key-value pairs
export type JsonRecord = Record<string, JsonValue>;

// Contact information structure
export interface ContactInfo {
  address?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  name?: string;
  position?: string;
  department?: string;
  company?: string;
  notes?: string;
  [key: string]: string | undefined;
}

// 3D dimensions structure
export interface Dimensions {
  length: number | null;
  width: number | null;
  height: number | null;
  [key: string]: number | null | undefined;
}

// Price break structure for supplier pricing
export interface PriceBreak {
  quantity: number;
  price: number;
  currency?: string;
}

// Material composition information
export interface MaterialComposition {
  primary_material?: string;
  secondary_materials?: string[];
  composition_percentages?: Record<string, number>;
  finish?: string;
  color?: string;
  notes?: string;
}

// Long description format with sections
export interface LongDescription {
  sections?: Array<{
    title?: string;
    content: string;
  }>;
  formatted_text?: string;
}
