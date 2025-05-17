/**
 * Type definitions for UI components
 * These are adapter types that bridge the core schema types with component requirements
 */
import type { Manufacturer, ManufacturerPart } from './schemaTypes';

/**
 * Input version of ManufacturerPart for use in forms before saving to database
 * This contains only the essential fields needed for user input
 */
export interface ManufacturerPartInput {
  manufacturer_id: string;
  manufacturer_part_number: string;
  is_recommended: boolean;
  description?: string;
  datasheet_url?: string;
  product_url?: string;
}

/**
 * Extended Manufacturer interface for UI display requirements
 * Adds UI-specific properties while maintaining schema compatibility
 */
export interface ManufacturerDisplay extends Manufacturer {
  // Virtual properties mapped from schema properties for UI components
  readonly id: string;  // Maps to manufacturer_id
  readonly name: string; // Maps to manufacturer_name
}

/**
 * Helper function to adapt a Manufacturer to ManufacturerDisplay
 * @param manufacturer The schema Manufacturer to adapt
 * @returns A ManufacturerDisplay object with UI-specific properties
 */
export function adaptManufacturer(manufacturer: Manufacturer): ManufacturerDisplay {
  return {
    ...manufacturer,
    // Map the schema properties to UI display properties
    id: manufacturer.manufacturer_id,
    name: manufacturer.manufacturer_name
  };
}

/**
 * Helper function to adapt ManufacturerPartInput to ManufacturerPart
 * This is used when preparing form data for API submission
 * The server must handle adding the missing required fields
 */
export function prepareManufacturerPartForSubmission(
  input: ManufacturerPartInput
): Partial<ManufacturerPart> {
  return {
    manufacturer_id: input.manufacturer_id,
    manufacturer_part_number: input.manufacturer_part_number,
    description: input.description || '',
    datasheet_url: input.datasheet_url || '',
    product_url: input.product_url || '',
    is_recommended: !!input.is_recommended // Ensure boolean
  };
}
