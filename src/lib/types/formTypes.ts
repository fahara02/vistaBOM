import type { Dimensions } from "./types";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface ManufacturerFormData extends Record<string, unknown> {
    id: string;
    name: string;
    description?: string | null;
    website_url?: string | null;
    logo_url?: string | null;
    contact_info?: string | null; // Support contact_info field if present
    custom_fields_json?: string | null; // Match the schema definition exactly (string | null)
    created_by?: string | null;
    created_at?: Date | string | null; // Make optional to match actual form data
    updated_by?: string | null;
    updated_at?: Date | string | null; // Make optional to match actual form data
    }

      // Define the type for the form schema with custom fields added for UI
    export  interface SupplierFormData extends Record<string, unknown> {
    id: string;
    name: string;
    description?: string | null;
    website_url?: string | null;
    contact_info?: Json | null;
    logo_url?: string | null;
    custom_fields_json?: string; // Additional field for form UI, not in DB schema
    created_by?: string | null;
    created_at: Date;
    updated_by?: string | null;
    updated_at: Date;
  }

    // Define a type for the form data
  export   interface PartsFormData{
        id?: string;
        part_id?: string;
        name: string;
        version: string;
        status: string;
        part_status?: string;
        short_description?: string;
        functional_description?: string;
        long_description?: string | Record<string, any>;
        technical_specifications?: Record<string, any>;
        properties?: Record<string, any>;
        electrical_properties?: Record<string, any>;
        mechanical_properties?: Record<string, any>;
        thermal_properties?: Record<string, any>;
        material_composition?: Record<string, any>;
        environmental_data?: Record<string, any>;
        dimensions?: Dimensions;
        dimensions_unit?: string;
        weight?: number;
        weight_unit?: string;
        package_type?: string;
        pin_count?: number;
        operating_temperature_min?: number;
        operating_temperature_max?: number;
        storage_temperature_min?: number;
        storage_temperature_max?: number;
        temperature_unit?: string;
        voltage_rating_min?: number;
        voltage_rating_max?: number;
        current_rating_min?: number;
        current_rating_max?: number;
        power_rating_max?: number;
        tolerance?: number;
        tolerance_unit?: string;
        revision_notes?: string;
        category_ids?: string;
        manufacturer_parts?: string;
        [key: string]: any; // Allow for additional fields
      }
    