// Grid component type definitions
// This follows the project pattern of having types in a dedicated .ts file
import type { Manufacturer, Supplier, Category, Part } from './types';

// Common grid column type
export interface GridColumn {
  id: string;
  header?: string;
  width?: number;
  css?: string;
  template?: (value: unknown, row: unknown) => string;
}

// Original grid props (preserved for compatibility)
export interface GridProps {
  data: unknown[];
  columns: GridColumn[];
  rowHeight?: number;
  dynamic?: {
    rowCount: number;
  };
}

// Original grid API (preserved for compatibility)
export interface GridApi {
  on(event: string, callback: (event: CustomEvent) => void): void;
  intercept(event: string, callback: (event: unknown) => boolean | void): void;
  exec(action: string, params?: unknown): void;
}

// Generic entity type for the grid
export type EntityType = 'manufacturer' | 'supplier' | 'category' | 'part';

// Generic entity union type
export type GridEntity = Manufacturer | Supplier | Category | Part;

// Generic grid item position
export interface GridItemPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Generic grid layout
export interface GridLayout {
  positions: GridItemPosition[];
  columns: number;
  rowHeight: number;
}

// Properties for the generic grid view component
export interface GridViewProps {
  items: GridEntity[];
  entityType: EntityType;
  currentUserId: string;
  colorVariable?: string;
  storageKey?: string;
  columns?: number;
  itemWidth?: number;
  itemHeight?: number;
  gap?: number;
}

// Events dispatched by the grid
export interface GridViewEvents {
  edit: { item: GridEntity };
  delete: { itemId: string };
  refresh: void;
  layoutChange: { layout: GridLayout };
  view: { item: GridEntity };
}

// State for drag operations
export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  itemId: string | null;
}

// Entity field mappings for different entity types
export interface EntityFieldMappings {
  id: string;
  name: string;
  description: string;
  deleteAction: string;
  createdBy: string;
}

// Field mappings by entity type
export const entityFieldMappings: Record<EntityType, EntityFieldMappings> = {
  manufacturer: {
    id: 'manufacturer_id',
    name: 'manufacturer_name',
    description: 'manufacturer_description',
    deleteAction: '?/deleteManufacturer',
    createdBy: 'created_by'
  },
  supplier: {
    id: 'supplier_id',
    name: 'supplier_name',
    description: 'supplier_description',
    deleteAction: '?/deleteSupplier',
    createdBy: 'created_by'
  },
  category: {
    id: 'category_id',
    name: 'category_name',
    description: 'category_description',
    deleteAction: '?/deleteCategory',
    createdBy: 'created_by'
  },
  part: {
    id: 'part_id',
    name: 'part_name',
    description: 'description',
    deleteAction: '?/deletePart',
    createdBy: 'created_by'
  }
};

// Color variables for entity types
export const entityColorVariables: Record<EntityType, string> = {
  manufacturer: '--accent',
  supplier: '--info',
  category: '--primary',
  part: '--parts-color'
};

// Backwards compatibility types for ManufacturerGrid
export type ManufacturerGridProps = {
  manufacturers: Manufacturer[];
  currentUserId: string;
};

export type ManufacturerGridItemPosition = GridItemPosition;
export type ManufacturerGridLayout = GridLayout;
export type ManufacturerGridEvents = {
  edit: { manufacturer: Manufacturer };
  delete: { manufacturerId: string };
  refresh: void;
  layoutChange: { layout: ManufacturerGridLayout };
};