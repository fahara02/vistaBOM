// src/lib/types.ts
// Expose server-side types for client-side import
export type { Manufacturer, Supplier, JsonValue, Part, PartVersion } from '$lib/server/db/types';

// Re-export types for client usage
export type {
   LifecycleStatusEnum,PackageTypeEnum,WeightUnitEnum,DimensionUnitEnum, TemperatureUnitEnum
} from '$lib/server/db/types';
