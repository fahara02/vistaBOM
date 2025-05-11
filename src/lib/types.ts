// src/lib/types.ts
// Expose server-side types for client-side import (type-only)
export type { Manufacturer, Supplier, JsonValue, Part, PartVersion } from '$lib/server/db/types';

// Re-export BOTH types and values safely for client usage

// First - define the enum values here directly to avoid server imports
// These must match the values in server/db/types.ts exactly

// Part Status enum values
export enum PartStatusEnum {
    CONCEPT = 'concept',
    ACTIVE = 'active',
    OBSOLETE = 'obsolete',
    ARCHIVED = 'archived'
}

// Lifecycle Status enum values
export enum LifecycleStatusEnum {
    DRAFT = 'draft',
    IN_REVIEW = 'in_review',
    APPROVED = 'approved',
    PRE_RELEASE = 'pre-release',
    RELEASED = 'released',
    PRODUCTION = 'production',
    ON_HOLD = 'on_hold',
    OBSOLETE = 'obsolete',
    ARCHIVED = 'archived'
}

// Package Type enum values
export enum PackageTypeEnum {
    SMD = 'smd',
    THT = 'tht',
    BGA = 'bga',
    OTHER = 'other'
}

// Weight Unit enum values
export enum WeightUnitEnum {
    GRAM = 'g',
    KILOGRAM = 'kg',
    OUNCE = 'oz',
    POUND = 'lb'
}

// Dimension Unit enum values
export enum DimensionUnitEnum {
    MILLIMETER = 'mm',
    CENTIMETER = 'cm',
    METER = 'm',
    INCH = 'in',
    FOOT = 'ft'
}

// Temperature Unit enum values
export enum TemperatureUnitEnum {
    CELSIUS = 'celsius',
    FAHRENHEIT = 'fahrenheit',
    KELVIN = 'kelvin'
}
