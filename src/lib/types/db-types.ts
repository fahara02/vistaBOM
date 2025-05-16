/**
 * Database-specific type definitions
 * This file contains types for database interactions, particularly for the postgres.js library
 */
import type postgres from 'postgres';
import type { Row } from 'postgres';
import type { JsonValue, JsonRecord } from './primitive';

/**
 * Type for PostgreSQL transaction from postgres.js library
 */
export type PostgresTransaction = postgres.TransactionSql;

/**
 * Type for database rows returned from queries
 */
export type DbRow = Row;

/**
 * Dynamic record type for flexible object structures
 */
export type DynamicRecord = Record<string, unknown>;

/**
 * Type for JSON field processing functions
 * Used for serializing/deserializing fields to/from JSON
 */
export interface JsonFieldProcessor {
  (fieldValue: unknown, fieldName: string): string | null;
}

/**
 * Type for numeric field processors
 * Used to safely convert values to numbers
 */
export interface NumericFieldProcessor {
  (value: unknown): number | null;
}

/**
 * Type for database update operations
 * Used in functions like updatePart, updatePartVersion
 */
export type UpdateValues = Partial<Record<string, string | number | boolean | null | JsonValue>>;

/**
 * Type for JSON fields in database records
 * Used for structured data stored in JSON columns
 */
export type JsonFields = Record<string, JsonValue | null>;

/**
 * Input type for manufacturer part data
 */
export interface ManufacturerPartInput {
  id?: string;
  manufacturer_id: string;
  manufacturer_name?: string;
  part_number: string;
  manufacturer_part_number?: string;
  description?: string;
  url?: string;
  datasheet_url?: string;
  status?: string;
}

/**
 * Input type for supplier part data
 */
export interface SupplierPartInput {
  id?: string;
  supplier_id: string;
  supplier_name?: string;
  part_number: string;
  supplier_part_number?: string;
  description?: string;
  url?: string;
  datasheet_url?: string;
  cost?: number;
  cost_currency?: string;
  status?: string;
  manufacturer_part_id?: string;
}

/**
 * Input type for part attachment data
 */
export interface AttachmentInput {
  id?: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  file_url: string;
  description?: string;
  attachment_description?: string;
  is_primary?: boolean;
}

/**
 * Input type for part representation data
 */
export interface RepresentationInput {
  id?: string;
  representation_type: string;
  file_name: string;
  format: string;
  file_url: string;
  file_size_bytes: number;
  metadata?: string | object;
  additional_data?: string | object;
  is_primary?: boolean;
}

/**
 * Input type for compliance information
 */
export interface ComplianceInput {
  compliance_type: string;
  certificate_url: string;
  certified_at?: string | Date;
  expires_at?: string | Date | null;
  notes?: string;
}

/**
 * Input type for validation records
 */
export interface ValidationInput {
  type?: string;
  status?: string;
  test_results?: string;
  certification_info?: string;
  notes?: string;
  is_compliant?: boolean;
}

/**
 * Export utility types from postgres.js
 */
export type { Row } from 'postgres'; 