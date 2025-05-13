// src/lib/types.ts
// Expose server-side types for client-side import (type-only)
export type { Manufacturer, Category, Supplier, JsonValue, Part, PartVersion , Dimensions} from '@/types/types';

// CLIENT-SIDE ENUM DEFINITIONS - EXACT COPY OF SERVER VALUES
// These definitions are direct copies of types in server/db/types.ts
// DO NOT CHANGE without updating the corresponding server enums

// Part Status enum values - EXACT copy of server values
export enum PartStatusEnum {
    CONCEPT = 'concept',
    ACTIVE = 'active',
    OBSOLETE = 'obsolete',
    ARCHIVED = 'archived'
}

// Lifecycle Status enum values - EXACT copy of server values
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

// Weight Unit enum values - EXACT copy of server values
export enum WeightUnitEnum {
    MG = 'mg',
    G = 'g',
    KG = 'kg',
    LB = 'lb',
    OZ = 'oz'
}

// Dimension Unit enum values - EXACT copy of server values
export enum DimensionUnitEnum {
    MM = 'mm',
    CM = 'cm',
    M = 'm',
    IN = 'in',
    FT = 'ft'
}

// Temperature Unit enum values - EXACT copy of server values
export enum TemperatureUnitEnum {
    C = 'C',
    F = 'F',
    K = 'K'
}

// Package Type enum values - EXACT copy of server values
export enum PackageTypeEnum {
    SMD = 'SMD',
    THT = 'THT',
    QFP = 'QFP',
    BGA = 'BGA',
    DIP = 'DIP',
    SOT23 = 'SOT-23',
    TO220 = 'TO-220',
    SOP = 'SOP',
    TSSOP = 'TSSOP',
    LQFP = 'LQFP',
    DFN = 'DFN',
    QFN = 'QFN',
    DO35 = 'DO-35',
    DO41 = 'DO-41',
    SOD = 'SOD',
    SC70 = 'SC-70',
    FCBGA = 'FCBGA'
}
