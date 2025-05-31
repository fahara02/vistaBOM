<!-- src/lib/components/forms/PartForm.svelte -->

<script lang="ts">
// Import unifiedPartSchema instead of createPartSchema
import { unifiedPartSchema } from '$lib/schema/unifiedPartSchema';
// Import UnifiedPart and all necessary types from schemaTypes
import type { 
  UnifiedPart, 
  Dimensions, 
  JsonValue, 
  Category, 
  Manufacturer,
  ManufacturerPartDefinition,
  SupplierPartDefinition,
  AttachmentDefinition,
  RepresentationDefinition,
  PartStructureDefinition,
  ComplianceDefinition,
  Part,
  PartVersion,
  Tag,
  PartVersionTag
} from '$lib/types/schemaTypes';
// Import enums
import { 
  DimensionUnitEnum, 
  LifecycleStatusEnum, 
  PackageTypeEnum, 
  PartStatusEnum, 
  TemperatureUnitEnum, 
  WeightUnitEnum, 
  MountingTypeEnum,
  ComplianceTypeEnum,
  StructuralRelationTypeEnum
} from '$lib/types/enums';
// Import component-specific utilities and types
import type { ManufacturerDisplay } from '$lib/types/componentTypes';
import { adaptManufacturer } from '$lib/types/componentTypes';
import { createEventDispatcher, onMount } from 'svelte';
import type { Writable } from 'svelte/store';

// Import SuperForm related dependencies
import { superForm } from 'sveltekit-superforms/client';
import { zod } from 'sveltekit-superforms/adapters';
import type { SuperValidated, ValidateOptions } from 'sveltekit-superforms';
import type { FormPath } from 'sveltekit-superforms/client';
import type { z } from 'zod';

// Import utility functions and components
import { prepareFormDataForValidation } from './utils';
import ManufacturerSelector from './ManufacturerSelector.svelte';
import MultiCategorySelector from './MultiCategorySelector.svelte';

// Event dispatcher to send events to parent component
const dispatch = createEventDispatcher<{
  formUpdate: Record<string, any>;
  cancel: void;
  submit: Record<string, any>;
  success: void;
}>();

// Define FormData type using UnifiedPart as the base
type FormDataType = {
  partForm?: Partial<UnifiedPart>;
  [key: string]: any;
};

// Import form validation types
import type { ValidationErrors } from 'sveltekit-superforms';

// Define error type for form validation errors
type ErrorsType = Record<string, any>;

// REACTIVE DATAS
// These are input props provided to the component
// Allow form data to be passed directly or via a data object
export let data: FormDataType = {};
// Form handling props with proper explicit type definitions per project standards
export let errors: ErrorsType = {};




// Define strongly-typed parameters using the correct types from SuperForm
export let form: SuperValidated<z.infer<typeof unifiedPartSchema>> | undefined = undefined;
export let enhance: ((el: HTMLFormElement) => void) | undefined = undefined;
export let serverFormData: Record<string, unknown> | undefined = undefined;

// Define the schema type using unifiedPartSchema
type FormDataSchemaType = z.input<typeof unifiedPartSchema>;

// Initialize reactive form data with complete UnifiedPart defaults
let formData: Partial<UnifiedPart> = {
  // Core Part data - properly initialize all required fields
  part_id: '', // Will be assigned during creation
  creator_id: '', // Will be set server-side
  global_part_number: undefined,
  status_in_bom: PartStatusEnum.CONCEPT,
  lifecycle_status: LifecycleStatusEnum.DRAFT,
  is_public: false,
  created_at: new Date(),
  updated_at: new Date(),
  updated_by: undefined,
  current_version_id: undefined,
  custom_fields: null, // Initialize as null, not empty object
  
  // PartVersion data
  part_version_id: '', 
  part_version: '0.1.0',
  part_name: '', // Required field
  version_status: LifecycleStatusEnum.DRAFT,
  short_description: undefined,
  long_description: undefined,
  functional_description: undefined,
  full_description: undefined, // Alias for long_description with proper typing
  
  // Electrical properties - all optional numeric fields must use undefined not null
  voltage_rating_min: undefined,
  voltage_rating_max: undefined,
  current_rating_min: undefined,
  current_rating_max: undefined,
  power_rating_max: undefined,
  tolerance: undefined,
  tolerance_unit: undefined,
  electrical_properties: undefined,
  
  // Thermal properties - all optional numeric fields must use undefined not null
  operating_temperature_min: undefined,
  operating_temperature_max: undefined,
  storage_temperature_min: undefined,
  storage_temperature_max: undefined,
  temperature_unit: undefined,
  thermal_properties: undefined,
  
  // Revision and lifecycle info - use undefined not null for optional fields
  revision_notes: undefined,
  released_at: undefined,
  
  // Identifiers and categorization - use undefined for string optionals
  internal_part_number: undefined,
  manufacturer_part_number: undefined,
  mpn: undefined,
  gtin: undefined,
  category_ids: undefined,
  family_ids: undefined,
  group_ids: undefined,
  tag_ids: undefined,
  
  // Physical properties - all optional numeric fields must use undefined not null
  part_weight: undefined,
  weight_unit: undefined,
  weight_value: undefined, // Alias for part_weight used in forms
  // Proper dimensions object with correct type
  dimensions: undefined,
  dimensions_unit: undefined,
  package_type: undefined,
  mounting_type: undefined,
  pin_count: undefined,
  
  // Material and mechanical properties - use undefined not null
  mechanical_properties: undefined,
  material_composition: undefined,
  
  // Environmental and technical data - use undefined not null
  environmental_data: undefined,
  technical_specifications: undefined,
  properties: undefined,
  
  // Relational fields - use undefined for optionals
  manufacturer_id: undefined,
  manufacturer_name: undefined,
  manufacturer: undefined, // Must be undefined not null for type compliance
  supplier_id: undefined,
  supplier_name: undefined,
  suppliers: [], // Array of Supplier objects
  
  // Required array fields - ensure all are initialized as empty arrays
  manufacturer_parts: [],
  supplier_parts: [],
  attachments: [],
  representations: [],
  structure: [],
  compliance_info: [],
  categories: [],
  part_tags: [],
  part_version_tags: []
};

// Initialize SuperForm with proper type handling
const { form: formStore, enhance: enhanceAction, errors: formErrors, validate } = superForm(
  (form !== undefined ? form : data?.form || {}) as Partial<UnifiedPart>,
  {
    // No validator in edit mode, use schema in create mode
    validators: form ? undefined : undefined,
    // Set props for proper form behavior
    resetForm: false,
    dataType: 'json',
    taintedMessage: null,
    onSubmit: ({ formData, cancel, submitter }) => {
      if (submitter && (submitter as HTMLElement).getAttribute('name') === 'cancel') {
        cancel();
        dispatch('cancel');
      } else {
        // Ensure formData follows UnifiedPart structure
        const validatedFormData = getData();
        const normalizedData = prepareFormDataForValidation(formData as Partial<UnifiedPart>);
        // Dispatch the normalized data
        dispatch('submit', normalizedData);
      }
    },
    onResult: ({ result }) => {
      console.log('Form submission result:', result);
      if (result.type === 'success') {
        dispatch('success');
      }
    }
  }
);

// Form variables - initialize to empty string by default, will be set during initialization
// Default all sections to be active in edit mode

// Family, Tag and Version Tag interfaces

// Form initialization state tracking
let initialized = false;

// Family, Tag and Version Tag Data and State
interface PartFamilyItem {
  id: string;
  name: string;
}

interface TagItem {
  id: string;
  name: string;
}

// Remove local PartVersionTag interface and use the one from schemaTypes.ts

// These would be loaded from the database in a real implementation
let partFamilies: PartFamilyItem[] = [];
let selectedFamilies: PartFamilyItem[] = [];
let newTagName = '';
let newVersionTagName = '';
let selectedTags: TagItem[] = [];
let selectedVersionTags: TagItem[] = [];



// Add these helper methods to safely handle array operations
function addManufacturerPart(): void {
  // Create a new manufacturer part with required fields
  const newManufacturerPart: ManufacturerPartDefinition = {
    manufacturer_id: '',
    manufacturer_part_number: '',
    is_recommended: false,
    manufacturer_name: undefined,
    mpn: undefined,
    description: undefined,
    datasheet_url: undefined,
    product_url: undefined,
    notes: undefined,
    lifecycle_status: undefined
  };
  
  // Add to the form store
  $formStore.manufacturer_parts = [...($formStore.manufacturer_parts || []), newManufacturerPart];
}

function addSupplierPart(manufacturerPartIndex: number): void {
  const newSupplierPart: SupplierPartDefinition = {
    supplier_id: '',
    manufacturer_part_index: manufacturerPartIndex,
    is_preferred: false,
    supplier_name: undefined,
    supplier_part_number: undefined,
    spn: undefined,
    price: undefined,
    currency: undefined,
    stock_quantity: undefined,
    lead_time_days: undefined,
    minimum_order_quantity: undefined,
    packaging_info: undefined,
    product_url: undefined
  };
  $formStore.supplier_parts = [...($formStore.supplier_parts || []), newSupplierPart];
}

function addAttachment(): void {
  const newAttachment: AttachmentDefinition = {
    attachment_type: 'document',
    file_name: '',
    file_url: '',
    is_primary: false,
    file_size: undefined,
    file_type: undefined,
    description: undefined,
    thumbnail_url: undefined,
    upload_date: undefined,
    uploaded_by: undefined
  };
  $formStore.attachments = [...($formStore.attachments || []), newAttachment];
}

// Add helper function to remove attachments
function removeAttachment(index: number): void {
  if (!$formStore.attachments) return;
  
  const updatedAttachments = [...$formStore.attachments];
  updatedAttachments.splice(index, 1);
  
  // If we removed the primary attachment and there are others, make the first one primary
  if (updatedAttachments.length > 0 && !updatedAttachments.some((a: AttachmentDefinition) => a.is_primary)) {
    updatedAttachments[0].is_primary = true;
  }
  
  $formStore.attachments = updatedAttachments;
}

// Add helper function to toggle primary attachment
function togglePrimaryAttachment(index: number): void {
  if (!$formStore.attachments) return;
  
  const updatedAttachments = [...$formStore.attachments];
  
  // Set all attachments to not primary
  for (let i = 0; i < updatedAttachments.length; i++) {
    updatedAttachments[i].is_primary = i === index;
  }
  
  // If no primary was set and we have attachments, set the first one as primary
  if (updatedAttachments.length > 0 && !updatedAttachments.some((a: AttachmentDefinition) => a.is_primary)) {
    updatedAttachments[0].is_primary = true;
  }
  
  $formStore.attachments = updatedAttachments;
}

function addRepresentation(): void {
  const newRepresentation: RepresentationDefinition = {
    representation_type: '3D Model',
    file_url: '', // Required field based on schema
    is_recommended: false, // Changed from is_primary to is_recommended to match schema
    format: '', // Added required field
    thumbnail_url: undefined,
    preview_url: undefined
  };
  $formStore.representations = [...($formStore.representations || []), newRepresentation];
}

function addComplianceInfo(): void {
  const newCompliance: ComplianceDefinition = {
    compliance_type: ComplianceTypeEnum.ROHS,
    certificate_url: undefined,
    certified_at: undefined,
    expires_at: undefined,
    notes: undefined
  };
  $formStore.compliance_info = [...($formStore.compliance_info || []), newCompliance];
}

function addPartStructure(): void {
  const newStructure: PartStructureDefinition = {
    child_part_id: '',
    relation_type: StructuralRelationTypeEnum.COMPONENT,
    quantity: 1
  };
  $formStore.structure = [...($formStore.structure || []), newStructure];
}


// Helper functions for part tags management
function addPartTag(tagName: string, tagId?: string): void {
  if (!tagName.trim()) return;
  
  const newTag: Tag = {
    tag_id: tagId || `tmp-${Math.random().toString(36).substring(2, 15)}`,
    tag_name: tagName.trim(),
    created_by: $formStore.creator_id || '',
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
    custom_fields: null
  };
  
  $formStore.part_tags = [...($formStore.part_tags || []), newTag];
}

function removePartTag(index: number): void {
  if (!$formStore.part_tags) return;
  
  const updatedTags = [...$formStore.part_tags];
  updatedTags.splice(index, 1);
  $formStore.part_tags = updatedTags;
}

function addPartVersionTag(tagName: string, tagId?: string): void {
  if (!tagName.trim()) return;
  
  const newVersionTag: PartVersionTag = {
    part_version_tag_id: `tmp-${Math.random().toString(36).substring(2, 15)}`,
    part_version_id: $formStore.part_version_id || '',
    tag_name: tagName.trim(),
    created_by: $formStore.creator_id || '',
    created_at: new Date()
  };
  
  $formStore.part_version_tags = [...($formStore.part_version_tags || []), newVersionTag];
}

function removePartVersionTag(index: number): void {
  if (!$formStore.part_version_tags) return;
  
  const updatedTags = [...$formStore.part_version_tags];
  updatedTags.splice(index, 1);
  $formStore.part_version_tags = updatedTags;
}

// Handler functions for family, tag and version tag management
function handleAddFamily() {
  const select = document.getElementById('part-families-select') as HTMLSelectElement;
  if (select && select.value) {
    const familyId = select.value;
    const familyName = select.options[select.selectedIndex].text;
    
    // Check if already selected
    if (!selectedFamilies.some(f => f.id === familyId)) {
      selectedFamilies = [...selectedFamilies, { id: familyId, name: familyName }];
      updateFamilyIds();
    }
    
    // Reset the select
    select.value = '';
  }
}

function handleRemoveFamily(id: string) {
  selectedFamilies = selectedFamilies.filter(f => f.id !== id);
  updateFamilyIds();
}

function updateFamilyIds() {
  // Update the comma-separated list of family IDs in the form data
  const familyIdsList = selectedFamilies.map(f => f.id).join(',');
  $formStore.family_ids = familyIdsList.length > 0 ? familyIdsList : null;
}

function handleAddTag() {
  if (newTagName.trim()) {
    // In a real implementation, we would first check if the tag exists
    // If not, we would create it in the database and get back an ID
    // For now, we'll simulate by creating a temporary ID
    const tempId = `tag-${Date.now()}`;
    selectedTags = [...selectedTags, { id: tempId, name: newTagName.trim() }];
    updateTagIds();
    newTagName = '';
  }
}

function handleRemoveTag(id: string) {
  selectedTags = selectedTags.filter(t => t.id !== id);
  updateTagIds();
}

function updateTagIds() {
  // Update the comma-separated list of tag IDs in the form data
  const tagIdsList = selectedTags.map(t => t.id).join(',');
  $formStore.tag_ids = tagIdsList.length > 0 ? tagIdsList : null;
}

function handleAddVersionTag() {
  if (newVersionTagName.trim()) {
    // Similar to regular tags, we would handle version tags in the backend
    const tempId = `vtag-${Date.now()}`;
    selectedVersionTags = [...selectedVersionTags, { id: tempId, name: newVersionTagName.trim() }];
    updateVersionTagIds();
    newVersionTagName = '';
  }
}

function handleRemoveVersionTag(id: string) {
  selectedVersionTags = selectedVersionTags.filter(t => t.id !== id);
  updateVersionTagIds();
}

function updateVersionTagIds() {
  // For part_version_tags, we would handle this in the backend
  // This is just a placeholder for now
  // The actual implementation would depend on how part_version_tags are stored
  const versionTagIdsList = selectedVersionTags.map(t => t.id).join(',');
  // We would store this in the appropriate place in the form data
} 

// Options for enum fields
export const options = {
  statuses: Object.values(LifecycleStatusEnum),
  partStatuses: Object.values(PartStatusEnum),
  weightUnits: Object.values(WeightUnitEnum),
  dimensionUnits: Object.values(DimensionUnitEnum),
  packageTypes: Object.values(PackageTypeEnum),
  mountingTypes: Object.values(MountingTypeEnum),
  toleranceUnits: ['%', 'ppm'],
  temperatureUnits: Object.values(TemperatureUnitEnum)
}; 
export let isEditMode: boolean = false;
export let hideButtons: boolean = false;
// Flag to indicate if this form is being used in dashboard context - affects initialization behavior
export let isDashboardContext: boolean = false;
// Track if form has been initialized
let isFormInitialized = false;
// Start with basic section open in edit mode, otherwise all sections collapsed
let activeSection = isEditMode ? 'basic' : '';

// Reactive dimensions - ensure they're properly initialized with safe defaults
let dimensions: Dimensions | null = null;
let dimensionsUnit: DimensionUnitEnum | null = null;
// Component props - use UnifiedPart for all part data
export let partData: Partial<UnifiedPart> | undefined = undefined;
export let categories: Category[] = [];
// Using ManufacturerDisplay from componentTypes.ts
export let manufacturers: ManufacturerDisplay[] = [];

// Remove versionData references as we now use UnifiedPart which includes all version data

// Debug manufacturers to verify they're being passed correctly
$: console.log('PartForm received manufacturers:', manufacturers);
// Initialize with at least empty objects to prevent 'undefined' errors
$: if (manufacturers && manufacturers.length === 0) {
  // Make sure we always have a valid array even if prop is not passed
  manufacturers = [];
}
// Initialize with explicit type to avoid 'never[]' type inference issues
export let selectedCategoryIds: Array<string> = [];
// Using ManufacturerPartDefinition from UnifiedPart interface
// This is used for form data entry and display
let selectedManufacturerParts: ManufacturerPartDefinition[] = [];

// User ID for part creation - used in form submission
// Using export const since this is used for external reference only
export const currentUserId: string = '';

// Callback function when the form completes successfully
// Using export const since this is used for external reference only
export const onComplete: () => void = () => {};

// For dashboard integration, you can pass store references
// Using export const since this is used for external reference only
export const storeRefs: {
  showPartForm?: Writable<boolean>;
} = {};

// Safe parsing helper for dimensions and other numeric fields
function parseFloatOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}

// Helper function to safely parse manufacturer_parts from any source
function getManufacturerPartsByManufacturerId(manufacturerId: string): ManufacturerPartDefinition[] {
  if (!manufacturers) return [];
  
  // Find the manufacturer by ID
  const manufacturer = manufacturers.find(m => m.id === manufacturerId);
  
  if (!manufacturer) return [];
  
  // Use our helper function to safely parse manufacturer parts
  // ManufacturerDisplay doesn't have parts property directly, but we can get manufacturer parts by ID
  return parseManufacturerParts([]);
}

// Helper function to safely parse manufacturer_parts from any source
function parseManufacturerParts(value: unknown): ManufacturerPartDefinition[] {
  if (!value) return [];
  
  // Already an array of the right type
  if (Array.isArray(value)) {
    return value.map(part => {
      // Ensure part is treated as a record
      const partRecord = part as Record<string, unknown>;
      return {
        manufacturer_id: partRecord.manufacturer_id as string || '',
        manufacturer_part_number: partRecord.manufacturer_part_number as string || '',
        description: partRecord.description as string | undefined,
        datasheet_url: partRecord.datasheet_url as string | undefined,
        product_url: partRecord.product_url as string | undefined,
        part_number: partRecord.part_number as string | undefined,
        lead_time_days: partRecord.lead_time_days as number | null,
        lifecycle_status: typeof partRecord.lifecycle_status === 'string' ? 
          partRecord.lifecycle_status as LifecycleStatusEnum : null,
        rohs_status: partRecord.rohs_status as string | undefined,
        custom_fields: partRecord.custom_fields as Record<string, unknown> || {},
        // Required field with default value
        is_recommended: typeof partRecord.is_recommended === 'boolean' ? partRecord.is_recommended : true
      };
    });
  }
  
  // It's a string, try to parse it
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(part => {
          const partRecord = part as Record<string, unknown>;
          return {
            manufacturer_id: partRecord.manufacturer_id as string || '',
            manufacturer_part_number: partRecord.manufacturer_part_number as string || '',
            description: partRecord.description as string | undefined,
            datasheet_url: partRecord.datasheet_url as string | undefined,
            product_url: partRecord.product_url as string | undefined,
            part_number: partRecord.part_number as string | undefined,
            lead_time_days: partRecord.lead_time_days as number | null,
            lifecycle_status: typeof partRecord.lifecycle_status === 'string' ? 
              partRecord.lifecycle_status as LifecycleStatusEnum : null,
            rohs_status: partRecord.rohs_status as string | undefined,
            custom_fields: partRecord.custom_fields as Record<string, unknown> || {},
            // Required field with default value
            is_recommended: typeof partRecord.is_recommended === 'boolean' ? partRecord.is_recommended : true
          };
        });
      }
    } catch (e) {
      console.error('Error parsing manufacturer_parts:', e);
    }
  }
  
  return [];
}

// Initialize JSON editors with empty objects - aligned with UnifiedPart properties
let jsonEditors = {
  technical_specifications: '{}',
  properties: '{}',
  electrical_properties: '{}',
  mechanical_properties: '{}',
  thermal_properties: '{}',
  material_composition: '{}',
  environmental_data: '{}',
  long_description: '{}'
};

// Define a type for the JSON editors to ensure property name consistency
type JsonEditorKeys = keyof typeof jsonEditors;

// Define the shape of the manufacturer part form data
type ManufacturerPartFormData = {
  manufacturer_id: string;
  manufacturer_part_number: string;
  description?: string;
  datasheet_url?: string;
  product_url?: string;
  part_number?: string;
  lead_time_days?: number | null;
  lifecycle_status?: LifecycleStatusEnum | null;
  rohs_status?: string;
  custom_fields?: Record<string, unknown>;
};

// Handle JSON editor changes with proper typing
function onJsonEditorChange(editorName: JsonEditorKeys, value: string): void {
  jsonEditors[editorName] = value;
}

// Prepare manufacturer part for submission by ensuring consistent data structure
function prepareManufacturerPartForSubmission(part: ManufacturerPartDefinition): ManufacturerPartDefinition {
  return {
    manufacturer_id: part.manufacturer_id || '',
    manufacturer_part_number: part.manufacturer_part_number || '',
    datasheet_url: part.datasheet_url || '',
    // Include required is_recommended field
    is_recommended: part.is_recommended !== undefined ? part.is_recommended : true,
    // Optional fields will be included if they exist in the part object
    ...(part.product_url !== undefined && { product_url: part.product_url })
  };
}

// Convert JSON to editable string safely with better error handling and typing
function jsonToString(json: unknown): string {
  if (json === null || json === undefined) return '{}';
  
  try {
    if (typeof json === 'string') {
      // Try to parse the string as JSON
      try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Not valid JSON, return empty object
        console.error('Failed to parse JSON string:', e);
        return '{}';
      }
    } else {
      // Object, try to stringify it directly
      return JSON.stringify(json, null, 2);
    }
  } catch (error) {
    console.error('Error converting to JSON string:', error);
    return '{}';
  }
}

// Check if dimensions are complete AND valid (has at least one non-zero value)
function isCompleteDimensions(dims: Dimensions | null | undefined): dims is Dimensions {
  return dims != null && 
         typeof dims.length === 'number' && typeof dims.width === 'number' && typeof dims.height === 'number' && 
         !isNaN(dims.length) && !isNaN(dims.width) && !isNaN(dims.height) && 
         (dims.length > 0 || dims.width > 0 || dims.height > 0);
}

// Ensure dimensions is always a properly formatted object
function ensureDimensions(dims: unknown): Dimensions {
  // Default empty dimensions object with 0 values (properly typed to avoid null issues)
  const defaultDims: Dimensions = { 
    length: 0, 
    width: 0, 
    height: 0 
  };
  
  // Return default for null/undefined
  if (dims === null || dims === undefined) return defaultDims;
  
  // Handle string format (from form submission)
  if (typeof dims === 'string') {
    try {
      // Try to parse JSON
      const parsed = JSON.parse(dims);
      if (parsed && typeof parsed === 'object') {
        return {
          length: parseFloatOrNull(parsed.length) || 0,
          width: parseFloatOrNull(parsed.width) || 0,
          height: parseFloatOrNull(parsed.height) || 0
        };
      }
      return defaultDims;
    } catch (e) {
      console.error('Error parsing dimensions string:', e);
      return defaultDims;
    }
  }
  
  // Handle object case with type guard
  if (dims && typeof dims === 'object') {
    const dimsObj = dims as Record<string, unknown>;
    return {
      length: parseFloatOrNull(String(dimsObj.length)) || 0,
      width: parseFloatOrNull(String(dimsObj.width)) || 0,
      height: parseFloatOrNull(String(dimsObj.height)) || 0
    };
  }
  
  return defaultDims;
}

// Function to get the current form data with proper typing
function getData(): Partial<UnifiedPart> {
  try {
    // Prepare form data with proper handling of complex properties
    const sanitizedFormData: Partial<UnifiedPart> = { ...formData };
    
    // Ensure part_id is set for edit mode
    if (isEditMode && partData?.part_id) {
      sanitizedFormData.part_id = partData.part_id;
    }
    
    // Parse JSON editor contents if they've been modified
    if (jsonEditors.technical_specifications) {
      try { sanitizedFormData.technical_specifications = JSON.parse(jsonEditors.technical_specifications); } catch (e) {}
    }
    
    if (jsonEditors.properties) {
      try { sanitizedFormData.properties = JSON.parse(jsonEditors.properties); } catch (e) {}
    }
    
    if (jsonEditors.electrical_properties) {
      try { sanitizedFormData.electrical_properties = JSON.parse(jsonEditors.electrical_properties); } catch (e) {}
    }
    
    if (jsonEditors.mechanical_properties) {
      try { sanitizedFormData.mechanical_properties = JSON.parse(jsonEditors.mechanical_properties); } catch (e) {}
    }
    
    if (jsonEditors.thermal_properties) {
      try { sanitizedFormData.thermal_properties = JSON.parse(jsonEditors.thermal_properties); } catch (e) {}
    }
    
    if (jsonEditors.material_composition) {
      try { sanitizedFormData.material_composition = JSON.parse(jsonEditors.material_composition); } catch (e) {}
    }
    
    if (jsonEditors.environmental_data) {
      try { sanitizedFormData.environmental_data = JSON.parse(jsonEditors.environmental_data); } catch (e) {}
    }
    
    // Ensure dimensions are properly formatted
    sanitizedFormData.dimensions = ensureDimensions(sanitizedFormData.dimensions);
    
    return sanitizedFormData;
  } catch (e) {
    console.error('Error getting form data:', e);
    return {};
  }
}

// Define the toggleSection function
function toggleSection(section: string): void {
  console.log(`Toggle section ${section} called. Current active section: ${activeSection}`);
  
  // In dashboard context, don't allow closing the section completely
  if (isDashboardContext && activeSection === section) {
    // Don't close it - keep at least one section open
    console.log('Dashboard context - keeping section open:', section);
    return;
  }
  
  // Simple toggle - if section is active, close it, otherwise open it
  if (activeSection === section) {
    // We're closing this section
    activeSection = '';
  } else {
    // We're opening this section
    activeSection = section;
  }
  console.log(`Section ${section} toggle - active section is now: ${activeSection}`);
}

// Update form data non-reactively
function updateFormData(fieldName: string, value: unknown): void {
  // Update the form store value with type-safety
  try {
    // Handle enum fields properly - convert empty strings to null
    if (value === '') {
      // Check if this is an enum field that should be nullable
      const enumFields = ['version_status', 'status_in_bom', 'package_type', 'weight_unit', 'dimensions_unit', 'temperature_unit'];
      if (enumFields.includes(fieldName)) {
        value = null;
      }
    }
    
    // Update the SuperForm store if available
    if (formStore) {
      formStore.update(current => {
        const updatedForm = { ...current };
        (updatedForm as Record<string, unknown>)[fieldName] = value;
        return updatedForm;
      });
    }
    
    // Also update the local formData for consistency
    (formData as Record<string, unknown>)[fieldName] = value;
  } catch (e) {
    console.error(`Error updating form field ${fieldName}:`, e);
  }
}

// Initialize form on mount
// Update dimensions when formData changes
$: if (formData && formData.dimensions) {
  dimensions = ensureDimensions(formData.dimensions);
  dimensionsUnit = formData.dimensions_unit as DimensionUnitEnum | null;
}

// Create a safe enhance function to avoid TypeScript errors and ensure proper JSON handling
function enhanceSafe(node: HTMLFormElement): { destroy: () => void } {
  // Set up pre-submission handler to process form data
  const handleSubmit = (event: SubmitEvent) => {
    // CRITICAL: Process released_at for RELEASED status
    // For schema validation, released_at MUST be a valid date when version_status is RELEASED
    if ($formStore.version_status === LifecycleStatusEnum.RELEASED) {
      // Handle both form submission initialization and from user input
      const releasedDate = new Date();
      // For the form validation, we need to set both properties
      updateFormData('released_at', releasedDate);
      // And direct store update for immediate effect
      ($formStore as Record<string, unknown>).released_at = releasedDate;
      
      console.log('Set released_at date for RELEASED status:', releasedDate);
    } else {
      // For non-RELEASED status, don't set released_at (to match DB constraints)
      updateFormData('released_at', undefined);
      delete ($formStore as Record<string, unknown>).released_at;
      console.log('Removing released_at field for non-RELEASED status');
    }
    
    // Process dimensions - critical to ensure proper serialization
    if (dimensions) {
      // Create a JSON-safe object that satisfies the DB constraint (must have keys, values can be 0)
      const dimensionsObject = {
        length: Number(dimensions.length) || 0,
        width: Number(dimensions.width) || 0,
        height: Number(dimensions.height) || 0
      };
      
      // Update dimensions - just need the three keys present
      ($formStore as Record<string, unknown>).dimensions = dimensionsObject;
      
      // Make sure we have a dimension unit
      if (!$formStore.dimensions_unit) {
        ($formStore as Record<string, unknown>).dimensions_unit = DimensionUnitEnum.MM;
      }
      
      console.log('Prepared dimensions for submission:', dimensionsObject);
    }
  };
  
  // Add event listener for form submission
  node.addEventListener('submit', handleSubmit);
  
  // Get the appropriate enhance function
  const enhanceFunc = enhance || enhanceAction;
  
  // Apply the enhance function and capture the result properly
  let destroyHandler: { destroy: () => void } | undefined = undefined;
  
  if (enhanceFunc) {
    const result = enhanceFunc(node);
    
    // Handle various result types safely
    if (result && typeof result === 'object' && 'destroy' in result && typeof result.destroy === 'function') {
      destroyHandler = result;
    } else if (result && typeof result === 'function') {
      // Convert function to object with destroy method
      destroyHandler = { destroy: result };
    }
  }
  
  // Return a combined destroy function that cleans up everything
  return {
    destroy: () => {
      // Always remove our event listener
      node.removeEventListener('submit', handleSubmit);
      
      // Call the original destroy method if it exists
      if (destroyHandler) {
        destroyHandler.destroy();
      }
    }
  };
}

// Setup form handler when component mounts
onMount(() => {
  console.log('PartForm mounted - initializing with mode:', isEditMode ? 'EDIT' : 'ADD');
  console.log('isDashboardContext:', isDashboardContext);
  console.log('Part data:', partData);
  console.log('Form prop:', form);
  console.log('Server form data prop:', serverFormData);
  
  // Debug the current state of formData and formStore
  console.log(' Initial formData:', JSON.stringify(formData, null, 2));
  console.log(' Initial formStore:', JSON.stringify($formStore, null, 2));
  
  // CRITICAL FIX: When in edit mode and we have server data directly available, use it
  if (isEditMode && serverFormData) {
    console.log(' Using direct server form data for initialization');
    console.log('Server form data structure:', serverFormData);
    
    // SuperForm wraps the actual form data in a 'data' property
    if (serverFormData.data && typeof serverFormData.data === 'object') {
      // Use Record<string, any> type to avoid TypeScript errors with property access
      const serverData = serverFormData.data as Record<string, any>;
      console.log('Extracted server data:', serverData);
      console.log('Field count in server data:', Object.keys(serverData).length);
      
      if (Object.keys(serverData).length > 0) {
        try {
          // Create a properly structured object that conforms to our form data structure
          const processedData: Partial<UnifiedPart> = {
            // Start with existing defaults
            ...formData,
            
            // Essential fields - using proper null checking and defaults
            part_id: serverData.part_id ?? '',
            // Map the status correctly - server uses lifecycle_status but client uses status
            // We're using type assertion to handle this field name mismatch
            version_status: (serverData.version_status ?? serverData.status ?? (serverData as any).lifecycle_status ?? 'draft') as LifecycleStatusEnum,
            status_in_bom: (serverData.status_in_bom ?? serverData.part_status ?? 'concept') as PartStatusEnum,
            short_description: serverData.short_description ?? '',
            is_public: !!serverData.is_public,
            
            // Map long_description (server) to full_description (client)
            // Using type assertion to access server field
            long_description: (serverData as any).long_description ?? ((serverData as any).full_description ?? ''),
            
            // Physical properties
            dimensions: serverData.dimensions ?? { length: null, width: null, height: null },
            dimensions_unit: serverData.dimensions_unit ?? '',
            
            // Technical specifications and properties
            technical_specifications: serverData.technical_specifications ?? {},
            properties: serverData.properties ?? {}, 
            electrical_properties: serverData.electrical_properties ?? {},
            mechanical_properties: serverData.mechanical_properties ?? {},
            thermal_properties: serverData.thermal_properties ?? {},
            material_composition: serverData.material_composition ?? {},
            environmental_data: serverData.environmental_data ?? {},
            
            // Related entities
            manufacturer_parts: serverData.manufacturer_parts ?? [], // Use empty array instead of string
            supplier_parts: serverData.supplier_parts ?? [],
            attachments: serverData.attachments ?? [],
            representations: serverData.representations ?? [],
            structure: serverData.structure ?? [],
            compliance_info: serverData.compliance_info ?? [],
            
            // Custom fields
            custom_fields: serverData.custom_fields ?? {}
          };
          
          // Update the form store and local data with properly typed data
          $formStore = processedData;
          formData = processedData;
          console.log('Form initialized with properly typed data:', $formStore);
          
          // Log all form inputs to debug which fields are binding correctly
          console.log('FORM FIELDS AFTER DATA MAPPING:');
          console.log('- part_id:', formData.part_id);
          console.log('- part_name:', formData.part_name);
          console.log('- part_version:', formData.part_version);
          console.log('- version_status:', formData.version_status);
          console.log('- short_description:', formData.short_description);
        } catch (error) {
          console.error('Error processing form data:', error);
        }
      }
    }
  }
  
  // Debug dimensions if they exist
  if (formData.dimensions) {
    console.log('DIMENSIONS STATE:', {
      type: typeof formData.dimensions,
      value: formData.dimensions
    });
  }
  
  // In edit mode, start with basic section open
  if (isEditMode) {
    activeSection = 'basic';
  }
  
  // SIMPLE DIRECT FIX: In edit mode, if we have server data, use it
  if (isEditMode) {
    // Priority order for initialization data:
    // 1. serverFormData.data direct prop from edit page (most reliable)
    // 2. data.form from component props
    if (serverFormData?.data && Object.keys(serverFormData.data).length > 0) {
      console.log('DIRECT INITIALIZATION: Using serverFormData.data prop');
      // Use Record<string, any> to safely access properties that might not exist in PartsFormData
      const serverData = serverFormData.data as Record<string, any>;
      
      // Create a complete object with all required fields
      const updatedData: Partial<UnifiedPart> = {
        // Start with existing defaults
        ...formData,
        
        // Essential fields with fallbacks to current values
        part_id: serverData.part_id ?? formData.part_id,
        // Map the status correctly - server uses lifecycle_status but client uses status
        // We're using type assertion to handle this field name mismatch
        version_status: (serverData.version_status ?? serverData.status ?? (serverData as any).lifecycle_status ?? formData.version_status) as LifecycleStatusEnum,
        status_in_bom: (serverData.status_in_bom ?? serverData.part_status ?? formData.status_in_bom) as PartStatusEnum,
        short_description: serverData.short_description ?? formData.short_description,
        is_public: serverData.is_public ?? formData.is_public,
        long_description: (serverData as any).long_description ?? ((serverData as any).full_description ?? formData.long_description),
        
        // Object fields - ensure they're objects even if null
        technical_specifications: serverData.technical_specifications ?? formData.technical_specifications,
        properties: serverData.properties ?? formData.properties, 
        electrical_properties: serverData.electrical_properties ?? formData.electrical_properties,
        mechanical_properties: serverData.mechanical_properties ?? formData.mechanical_properties,
        thermal_properties: serverData.thermal_properties ?? formData.thermal_properties,
        material_composition: serverData.material_composition ?? formData.material_composition,
        environmental_data: serverData.environmental_data ?? formData.environmental_data,
        
        // Physical properties
        dimensions: serverData.dimensions ?? formData.dimensions,
        dimensions_unit: serverData.dimensions_unit ?? formData.dimensions_unit,
        weight_value: serverData.weight_value ?? (serverData.weight ?? formData.weight_value),
        weight_unit: serverData.weight_unit ?? formData.weight_unit,
        package_type: serverData.package_type ?? formData.package_type,
        pin_count: serverData.pin_count ?? formData.pin_count,
        
        // Electrical properties
        voltage_rating_min: serverData.voltage_rating_min ?? formData.voltage_rating_min,
        voltage_rating_max: serverData.voltage_rating_max ?? formData.voltage_rating_max,
        
        // Other defaults
        manufacturer_parts: serverData.manufacturer_parts ?? formData.manufacturer_parts, 
        category_ids: serverData.category_ids ?? formData.category_ids
      };
      
      // Update the form data and store
      formData = updatedData;
      
      // Log field values to verify data is properly loaded
      console.log('UPDATED FORM FIELDS:');
      console.log('- part_name:', updatedData.part_name);
      console.log('- short_description:', updatedData.short_description);
      console.log('- part_version:', updatedData.part_version);
      console.log('- version_status:', updatedData.version_status);
      console.log('- status_in_bom:', updatedData.status_in_bom);
      $formStore = updatedData;
    } else if (data?.form && Object.keys(data.form).length > 0) {
      console.log('DIRECT INITIALIZATION: Using data.form');
      formData = { ...formData, ...data.form };
      // Update the form store with this data
      $formStore = data.form;
    }
  }
  
  // Initialize form data and set section visibility based on mode and context
  if (!isFormInitialized) {
    // Only open the basic section in edit mode initially
    if (isEditMode) {
      activeSection = 'basic';
    } else {
      // Start with all sections collapsed in add mode
      activeSection = '';
    }
    console.log(' SETTING ACTIVE SECTION:', activeSection);
    
    // Use different initialization behavior based on context
    if (isDashboardContext && !isEditMode) {
      // When in dashboard and adding a new part, use simple defaults
      console.log('Dashboard context detected - initializing form with simple defaults');
      // Ensure all required fields have proper defaults
      formData = {
        ...formData,
        // Initialize arrays if they don't exist
        manufacturer_parts: Array.isArray(formData.manufacturer_parts) ? formData.manufacturer_parts : [],
        supplier_parts: Array.isArray(formData.supplier_parts) ? formData.supplier_parts : [],
        attachments: Array.isArray(formData.attachments) ? formData.attachments : [],
        representations: Array.isArray(formData.representations) ? formData.representations : [],
        structure: Array.isArray(formData.structure) ? formData.structure : [],
        compliance_info: Array.isArray(formData.compliance_info) ? formData.compliance_info : [],
        // Initialize dimensions if they don't exist
        dimensions: formData.dimensions || { length: 0, width: 0, height: 0 }
      };
      formData = {
        ...formData,
        part_id: '',
        part_name: '',
        part_version: '0.1.0',
        version_status: LifecycleStatusEnum.DRAFT,
        status_in_bom: PartStatusEnum.CONCEPT,
        short_description: '',
        is_public: false,
        properties: {},
        technical_specifications: {},
        electrical_properties: {},
        mechanical_properties: {},
        thermal_properties: {},
        material_composition: {},
        environmental_data: {}
      };
    }
    
    // In edit mode, make sure form data is initialized properly from the data prop
    if (isEditMode) {
      console.log('Edit mode initialization - checking data source');
      
      // IMPORTANT: We need to check multiple possible sources for our form data
      // Priority: 1. Direct form prop, 2. data.form, 3. Part/version data
      
      // SIMPLE APPROACH: Just use the data we get from the server
      // Use the most reliable data source for form initialization
      if (serverFormData?.data && Object.keys(serverFormData.data).length > 0) {
        console.log('Using serverFormData.data for edit mode - contains:', Object.keys(serverFormData.data).length, 'fields');
        // Use Record<string, any> for flexibility with server data
        const serverData = serverFormData.data as Record<string, any>;
        
        // Create a complete object with all required fields
        const mappedData: Partial<UnifiedPart> = {
          // Include defaults for missing fields
          ...formData,
          
          // Essential fields
          part_id: serverData.part_id ?? '',
          // Map the status correctly - server uses lifecycle_status but client uses status
          // We're using type assertion to handle this field name mismatch
          version_status: (serverData.version_status ?? serverData.status ?? serverData.lifecycle_status ?? 'draft') as LifecycleStatusEnum,
          status_in_bom: (serverData.status_in_bom ?? serverData.part_status ?? 'concept') as PartStatusEnum,
          short_description: serverData.short_description ?? '',
          is_public: !!serverData.is_public,
          
          // Use the correct field name
          long_description: serverData.long_description ?? ((serverData as any).full_description ?? ''),
          
          // Physical properties
          dimensions: serverData.dimensions ?? { length: null, width: null, height: null },
          dimensions_unit: serverData.dimensions_unit ?? '',
          weight_value: serverData.weight_value ?? (serverData.weight ?? null),
          weight_unit: serverData.weight_unit ?? '',
          package_type: serverData.package_type ?? '',
          pin_count: serverData.pin_count ?? null,
          
          // Electrical properties
          voltage_rating_min: serverData.voltage_rating_min ?? null,
          voltage_rating_max: serverData.voltage_rating_max ?? null,
          current_rating_min: serverData.current_rating_min ?? null,
          current_rating_max: serverData.current_rating_max ?? null,
          
          // For actual form data, use proper object types, not strings
          technical_specifications: serverData.technical_specifications ?? {},
          properties: serverData.properties ?? {}, 
          electrical_properties: serverData.electrical_properties ?? {},
          mechanical_properties: serverData.mechanical_properties ?? {},
          thermal_properties: serverData.thermal_properties ?? {},
          material_composition: serverData.material_composition ?? {},
          environmental_data: serverData.environmental_data ?? {},
          
          // Initialize form data without additional properties
          
          // Other required fields
          manufacturer_parts: serverData.manufacturer_parts ?? [], // Use empty array instead of string
          category_ids: serverData.category_ids ?? '',
        };
        
        // Update both the local form data and the store
        formData = mappedData;
        $formStore = mappedData;
        console.log('Form updated with mapped data from server');
        
        // Detailed field logging for debugging
        console.log('MAPPED FIELD VALUES:');
        console.log('- part_name:', mappedData.part_name);
        console.log('- short_description:', mappedData.short_description);
        console.log('- part_version:', mappedData.part_version);
        console.log('- dimensions:', mappedData.dimensions);
        console.log('- weight_value:', mappedData.weight_value);
        console.log('- package_type:', mappedData.package_type);
      } else if (data?.form && Object.keys(data.form).length > 0) {
        console.log('Using data.form for edit mode - contains:', Object.keys(data.form).length, 'fields');
        formData = { 
          ...formData,
          ...data.form
        };
        
        // Parse dimensions if needed
        if (data.form.dimensions) {
          try {
            if (typeof data.form.dimensions === 'string') {
              formData.dimensions = JSON.parse(data.form.dimensions);
            } else {
              formData.dimensions = data.form.dimensions;
            }
          } catch (e) {
            console.error('Error parsing dimensions:', e);
          }
        }
        
        // CRITICAL FIX: Update the SuperForm store directly with new property merging
        // This ensures all properties are properly propagated to the form inputs
        $formStore = { ...$formStore, ...formData };
        console.log('Updated formStore with data.form:', $formStore);
        
        // Set as initialized so we don't override it later
        isFormInitialized = true;
        console.log('Form initialization completed', {
          formData, 
          formStore: $formStore,
          isFormInitialized,
          formSize: Object.keys($formStore).length
        });
        
        // FINAL VERIFICATION: After all initialization, verify data actually made it to the form
        // Double check by logging key fields from the store to make debugging easier
        console.log('FORM DATA VERIFICATION:', {
          'part_name': $formStore.part_name,
          'part_version': $formStore.part_version,
          'short_description': $formStore.short_description,
          'version_status': $formStore.version_status,
          'status_in_bom': $formStore.status_in_bom,
          'dimensions': $formStore.dimensions
        });
        
        // SAFETY NET: If formStore is still empty after all initialization attempts,
        // force the data one last time as a failsafe - but log this as critical
        if (Object.keys($formStore).length <= 1) {
          if (form !== undefined && Object.keys(form).length > 0) {
            console.error(' CRITICAL DATA FAILURE: FormStore still empty after all init attempts. Emergency recovery from form prop');
            $formStore = { ...$formStore, ...form };
            console.log('Emergency form data recovery complete:', $formStore);
          } else if (data?.form && Object.keys(data.form).length > 0) {
            console.error(' CRITICAL DATA FAILURE: FormStore still empty after all init attempts. Emergency recovery from data.form');
            $formStore = { ...$formStore, ...data.form };
            console.log('Emergency data.form recovery complete:', $formStore);
          }
        }
      }
      // Second priority: data.form from the component props
      else if (data?.form && Object.keys(data.form).length > 0) {
        console.log('SECOND PRIORITY: Using data.form object:', data.form);
        formData = {
          ...formData,
          ...data.form
        };
        
        // Parse dimensions if needed
        if (data.form.dimensions) {
          try {
            if (typeof data.form.dimensions === 'string') {
              formData.dimensions = JSON.parse(data.form.dimensions);
            } else {
              formData.dimensions = data.form.dimensions;
            }
          } catch (e) {
            console.error('Error parsing dimensions:', e);
          }
        }
        
        // CRITICAL FIX: Update the SuperForm store directly with new property merging
        // This ensures all properties are properly propagated to the form inputs
        $formStore = { ...$formStore, ...formData };
        console.log('Updated formStore with data.form:', $formStore);
        
        // Set as initialized so we don't override it later
        isFormInitialized = true;
        console.log('Form initialization completed', {
          formData, 
          formStore: $formStore,
          isFormInitialized,
          formSize: Object.keys($formStore).length
        });
        
        // FINAL VERIFICATION: After all initialization, verify data actually made it to the form
        // Double check by logging key fields from the store to make debugging easier
        console.log('FORM DATA VERIFICATION:', {
          'part_name': $formStore.part_name,
          'part_version': $formStore.part_version,
          'short_description': $formStore.short_description,
          'version_status': $formStore.version_status,
          'status_in_bom': $formStore.status_in_bom,
          'dimensions': $formStore.dimensions
        });
        
        // SAFETY NET: If formStore is still empty after all initialization attempts,
        // force the data one last time as a failsafe - but log this as critical
        if (Object.keys($formStore).length <= 1) {
          if (form !== undefined && Object.keys(form).length > 0) {
            console.error(' CRITICAL DATA FAILURE: FormStore still empty after all init attempts. Emergency recovery from form prop');
            $formStore = { ...$formStore, ...form };
            console.log('Emergency form data recovery complete:', $formStore);
          } else if (data?.form && Object.keys(data.form).length > 0) {
            console.error(' CRITICAL DATA FAILURE: FormStore still empty after all init attempts. Emergency recovery from data.form');
            $formStore = { ...$formStore, ...data.form };
            console.log('Emergency data.form recovery complete:', $formStore);
          }
        }
      }
      // Last priority: Manual mapping from partData and versionData
      else if (partData && Object.keys(partData).length > 0) {
        // Map part data to form fields
        console.log('LOWEST PRIORITY: Using partData manual mapping');
        console.log('Part data:', partData);
        
        // Helper function to properly process field values with null safety
        const processField = (value: any, fieldName: string) => {
          // Safely handle null/undefined values based on field type
          if (value === null || value === undefined) {
            // Return appropriate default based on field name
            if (fieldName === 'dimensions') return { length: 0, width: 0, height: 0 };
            if (fieldName.includes('_parts') || fieldName.includes('attachments') || 
                fieldName.includes('representations') || fieldName.includes('structure')) {
              return [];
            }
            // For JSON objects
            if (fieldName.includes('properties') || fieldName.includes('specifications') || 
                fieldName.includes('composition') || fieldName.includes('data')) {
              return {};
            }
            // Default to null for other fields
            return null;
          }
          return value;
        };
        
        // Make more form sections visible in edit mode
        activeSection = 'basic'; // Always show basic section in edit mode
      } else if (partData && Object.keys(partData).length > 0) {
        // Fallback to part data if available
        console.log('EDIT MODE: Using part data:', partData);
        
        // Make a deep copy to avoid reference issues
        formData = { 
          ...formData, 
          ...JSON.parse(JSON.stringify(partData || {}))
        };
        
        // Ensure core fields are properly set
        if (partData.version_status) formData.version_status = partData.version_status as LifecycleStatusEnum;
        // Use type assertion for status_in_bom
        if ((partData as any).status_in_bom) formData.status_in_bom = (partData as any).status_in_bom as PartStatusEnum;
        
        // Handle dimensions specially
        if (partData.dimensions) {
          dimensions = ensureDimensions(partData.dimensions);
          dimensionsUnit = partData.dimensions_unit as DimensionUnitEnum || null;
          console.log('Setting dimensions from part data:', dimensions, dimensionsUnit);
        }
        
        // Make more form sections visible in edit mode
        activeSection = 'basic'; // Always show basic section in edit mode
      } else if (data.partForm && Object.keys(data.partForm).length > 0) {
        // Handle form submission with proper JSON field validation
        function handleSubmit() {
          console.log('Form submitted, preparing data...');
          
          // Skip if formStore is undefined or null
          if (!$formStore) {
            console.error('Form store is not available for submission');
            return;
          }
  
          // Log current relationship data for debugging
          console.log('Form submission - current relationships:', {
            categories: {
              count: selectedCategoryIds.length,
              ids: selectedCategoryIds
            },
            manufacturerParts: {
              count: selectedManufacturerParts.length
            }
          });
        }
      }
    }
  }
}
)
  // Define initializeForm function - called onMount to set up the form data
  function initializeForm() {
    if (!isFormInitialized) {
      console.log('Running form initialization');
      try {
        isFormInitialized = true;
        
        // Initialize category IDs
        if (isEditMode && categories?.length) {
          const formCategories = $formStore.category_ids || '';
          console.log('Form categories:', formCategories);
          
          // Handle different formats of category_ids
          // Parse selected categories from string
          function parseSelectedCategoryIds(categoryIds?: string | null): string[] {
            if (!categoryIds) return [];
            try {
              // Split by comma and filter empty values
              return typeof categoryIds === 'string' ? 
                categoryIds.trim().split(',').filter(id => id && id.length > 0) : 
                [];
            } catch (e) {
              console.error('Error parsing category_ids:', e);
              return [];
            }
          }
          // Safely parse categories with proper null/type checking
          selectedCategoryIds = typeof formCategories === 'string' ? 
            parseSelectedCategoryIds(formCategories.trim()) : [];
          
          console.log('Selected categories after init:', selectedCategoryIds);
        } else {
          console.log('No category IDs data in form');
        }
        
        // Extract active manufacturers from the form data
        if ($formStore?.manufacturer_parts) {
          // Get the manufacturer parts data
          const manParts = $formStore.manufacturer_parts;
          
          try {
            // If it's a string, try to parse it
            if (typeof manParts === 'string') {
              // Only try to parse if it's not an empty string
              const manPartsStr = manParts as string;
              if (manPartsStr && manPartsStr.trim && manPartsStr.trim()) {
                try {
                  const parsed = JSON.parse(manParts);
                  selectedManufacturerParts = parsed as ManufacturerPartDefinition[];
                } catch (parseError) {
                  console.error('Error parsing manufacturer parts:', parseError);
                  selectedManufacturerParts = [];
                }
              } else {
                selectedManufacturerParts = [];
              }
            } else {
              // Use our helper function to safely parse manufacturer parts
              selectedManufacturerParts = manParts as ManufacturerPartDefinition[];
              console.log('Selected manufacturer parts after init:', selectedManufacturerParts);
            }
          } catch (e) {
            console.error('Error processing manufacturer parts:', e);
            selectedManufacturerParts = [];
            console.log('No manufacturer parts data in form');
          }
        }
      } catch (err) {
        console.error('Error in form initialization:', err);
      }
    } else {
      console.log('Form already initialized, skipping initialization');
    }
  }

  // Define handleSubmit function - called when the form is submitted
  function handleSubmit() {
    try {
      console.log('Form submitted with values:', $formStore);
      
      // For RELEASED status, ensure valid released_at date
      if ($formStore.version_status === LifecycleStatusEnum.RELEASED) {
        // Create date object for validation
        const releasedDate = new Date();
        
        // Update the form data with the Date object - critical for Zod validation
        ($formStore as Record<string, unknown>).released_at = releasedDate;
        
        console.log('Set released_at date for form submission:', releasedDate);
      } else {
        // For non-RELEASED status, don't set released_at (to match DB constraints)
        delete ($formStore as Record<string, unknown>).released_at; // Remove the property entirely
        console.log('Removing released_at field for non-RELEASED status');
      }
      
      // Ensure dimensions are valid numbers > 0
      if (dimensions) {
        // Create dimensions object that preserves user input
        const dimensionsObject = {
          length: parseFloat(dimensions.length?.toString() || '') || (dimensions.length === 0 ? 0 : null),
          width: parseFloat(dimensions.width?.toString() || '') || (dimensions.width === 0 ? 0 : null),
          height: parseFloat(dimensions.height?.toString() || '') || (dimensions.height === 0 ? 0 : null)
        };
        
        // Only set dimensions if at least one value is non-null (preserves user intent)
        const hasValidDimensions = dimensionsObject.length !== null || 
                                   dimensionsObject.width !== null || 
                                   dimensionsObject.height !== null;
                                   
        // Set both dimensions and unit together, preserving valid data
        ($formStore as Record<string, unknown>).dimensions = hasValidDimensions ? dimensionsObject : null;
        ($formStore as Record<string, unknown>).dimensions_unit = hasValidDimensions ? 
          ($formStore.dimensions_unit || DimensionUnitEnum.MM) : null;
        
        console.log('Set dimensions for submission:', dimensionsObject, 'hasValid:', hasValidDimensions);
      }
      
      // CRITICAL FIX: Properly prepare all data for submission to avoid constraint violations
      // Get current form data with all JSON fields properly parsed
      const validatedFormData = getData();
      
      // Clean SuperForm integration for manufacturer parts - no hidden hacks
      // First check if we have existing manufacturer parts from the form
      const existingParts = $formStore.manufacturer_parts;
      const existingArray = Array.isArray(existingParts) ? existingParts : 
                          (typeof existingParts === 'string' ? 
                           (() => {
                             try { return JSON.parse(existingParts); } catch { return []; }
                           })() : []);
      
      // Then merge with selected parts, preserving all user data
      const mergedParts = selectedManufacturerParts.length > 0 ? 
        selectedManufacturerParts.map(part => prepareManufacturerPartForSubmission(part)) : 
        (existingArray.length > 0 ? existingArray : []);
        
      // Cast to avoid TypeScript errors while maintaining type safety
      ($formStore as Record<string, unknown>).manufacturer_parts = JSON.stringify(mergedParts);
      console.log('Setting manufacturer parts:', mergedParts.length, 'items');
      
      // Clean SuperForm integration for category IDs - no hidden hacks
      ($formStore as Record<string, unknown>).category_ids = selectedCategoryIds.join(',');
      
      // Apply all validated data to the form store
      Object.entries(validatedFormData).forEach(([key, value]) => {
        // Use type-safe approach for indexing
        ($formStore as Record<string, unknown>)[key] = value;
        // Use safer type checking for form data display in console
  console.log('Form fully prepared for submission:', {
    category_ids: $formStore.category_ids,
    // Use safe type assertions to avoid 'never' type issues with manufacturer_parts
    manufacturer_parts: (() => {
      const parts = $formStore?.manufacturer_parts;
      if (!parts) return 'no value';
      if (Array.isArray(parts)) return `Array with ${(parts as any[]).length} items`;
      if (typeof parts === 'string') return `String with length ${(parts as string).length}`;
      return `Unknown type: ${typeof parts}`;
    })(),
    dimensions: $formStore.dimensions,
    dimensions_unit: $formStore.dimensions_unit,
    weight_value: $formStore.weight_value,
    weight_unit: $formStore.weight_unit,
    tolerance: $formStore.tolerance,
    tolerance_unit: $formStore.tolerance_unit
  });
      });

    } catch (error) {
      console.error('Error in form submission:', error);
    }
  }

  // Initialize form on mount
onMount(async () => {
  // Load part families from the database
  try {
    // In a real implementation, we would fetch this data from the database
    // For now, we'll use sample data
    partFamilies = [
      { id: 'family1', name: 'Electronic Components' },
      { id: 'family2', name: 'Mechanical Parts' },
      { id: 'family3', name: 'Fasteners' },
      { id: 'family4', name: 'Adhesives' },
      { id: 'family5', name: 'Cables' }
    ];
  } catch (error) {
    console.error('Failed to load part families:', error);
  }
  
  await initializeForm();
  initialized = true;
  
  // Initialize selected families, tags, and version tags if in edit mode
  if (isEditMode && $formStore) {
    // Initialize selected families from family_ids
    if ($formStore.family_ids) {
      const familyIds = $formStore.family_ids.split(',');
      selectedFamilies = familyIds.map(id => {
        const family = partFamilies.find(f => f.id === id);
        return family ? family : { id, name: `Family ${id}` }; // Fallback if not found
      });
    }
    
    // Initialize selected tags from tag_ids
    if ($formStore.tag_ids) {
      const tagIds = $formStore.tag_ids.split(',');
      // In a real implementation, we would fetch the tag names from the database
      // For now, we'll use generic names
      selectedTags = tagIds.map((id: string) => ({
        id,
        name: `Tag ${id.substring(0, 4)}`
      }));
    }
    
    // Initialize selected version tags if available
    // This would depend on how part_version_tags are stored in your data model
    // For now, this is a placeholder
  }
});
</script>


<form class="part-form" method="POST" action="?/part" use:enhanceSafe on:submit={handleSubmit} data-section-all={activeSection === 'all' ? 'true' : 'false'}>

  <!-- Basic Information -->
  <div class="form-section {activeSection === 'basic' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('basic')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('basic')}>
      <h2>Basic Information</h2>
      <span class="toggle-icon">{activeSection === 'basic' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'basic' || activeSection === 'all'}>
      <div class="form-grid">
        <!-- GTIN should be handled through a proper lookup or scanner interface, not direct input -->
        <!-- This identifier is standardized and users typically wouldn't manually enter it -->
        <!-- It would be better obtained through part lookup, barcode scanning, or API integration -->
        
        
        <!-- These fields will be handled through proper selector components in a separate tab -->
        <!-- We'll use MultiCategorySelector component that already exists for categories -->
        <!-- And similar components will be implemented for families, groups, and tags -->
        <!-- This approach avoids asking users to enter raw IDs, which is error-prone -->
        
        <!-- Global part number is completely auto-generated in the background -->
        <!-- No UI element needed as it's handled by the system -->

        <!-- Part ID is a system-generated value that shouldn't be directly edited -->
        {#if isEditMode}
        <div class="form-group">
          <label for="part_id">Part ID</label>
          <div class="input-with-hint">
            <input name="part_id" id="part_id" bind:value={$formStore.part_id} class="form-input" readonly>
            <span class="field-hint">System-generated identifier</span>
          </div>
          {#if $formErrors?.part_id}<span class="error">{$formErrors.part_id}</span>{/if}
        </div>
        {/if}

        <!-- Creator ID is automatically set from the current user -->
        {#if isEditMode}
        <div class="form-group">
          <label for="creator_id">Creator</label>
          <div class="input-with-hint">
            <input name="creator_id" id="creator_id" bind:value={$formStore.creator_id} class="form-input" readonly>
            <span class="field-hint">Automatically set from current user</span>
          </div>
          {#if $formErrors?.creator_id}<span class="error">{$formErrors.creator_id}</span>{/if}
        </div>
        {/if}
        
        <!-- Part name is a required field -->
        <div class="form-group">
          <label for="part_name">Part Name</label>
          <input name="part_name" id="part_name" bind:value={$formStore.part_name} class="form-input" required />
          {#if $formErrors?.part_name}<span class="error">{$formErrors.part_name}</span>{/if}
        </div>
        <div class="form-group">
          <label for="part_version">Version</label>
          <input name="part_version" id="part_version" bind:value={$formStore.part_version} class="form-input" required pattern="\d+\.\d+\.\d+" />
          {#if $formErrors?.part_version}<span class="error">{$formErrors.part_version}</span>{/if}
        </div>
        <div class="form-group">
          <label for="version_status">Lifecycle Status</label>
          <select name="version_status" id="version_status" bind:value={$formStore.version_status} class="form-select" required>
            {#each options.statuses as statusOption}
              <option value={statusOption}>{statusOption}</option>
            {/each}
          </select>
          {#if $formErrors?.version_status}<span class="error">{$formErrors.version_status}</span>{/if}
        </div>
        <div class="form-group">
          <label for="status_in_bom">Part Status</label>
          <select name="status_in_bom" id="status_in_bom" bind:value={$formStore.status_in_bom} class="form-select">
            {#each options.partStatuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          {#if $formErrors?.status_in_bom}<span class="error">{$formErrors.status_in_bom}</span>{/if}
        </div>
      </div>
      
      <!-- Category and manufacturer selection sections moved to their own dedicated tabs for better organization -->
      <div class="form-group">
        <label for="short_description">Short Description</label>
        <input name="short_description" id="short_description" bind:value={$formStore.short_description} class="form-input">
        {#if $formErrors?.short_description}<span class="error">{$formErrors.short_description}</span>{/if}
      </div>

      <div class="form-group">
        <label for="long_description">Long Description</label>
        <textarea name="long_description" id="long_description" bind:value={$formStore.long_description} rows="3" class="form-textarea"></textarea>
        {#if $formErrors?.long_description}<span class="error">{$formErrors.long_description}</span>{/if}
      </div>
      
      <div class="form-group">
        <label for="functional_description">Functional Description</label>
        <textarea name="functional_description" id="functional_description" bind:value={$formStore.functional_description} rows="3" class="form-textarea"></textarea>
        {#if $formErrors?.functional_description}<span class="error">{$formErrors.functional_description}</span>{/if}
      </div>
    </div>
  </div>
  
  <!-- Electrical Properties Section -->
  <div class="form-section {activeSection === 'electrical' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('electrical')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('electrical')}>
      <h2>Electrical Properties</h2>
      <span class="toggle-icon">{activeSection === 'electrical' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'electrical' || activeSection === 'all'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="voltage_rating_min">Min Voltage (V)</label>
          <input type="number" name="voltage_rating_min" id="voltage_rating_min" 
                 bind:value={formData.voltage_rating_min} min="0" step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="voltage_rating_max">Max Voltage (V)</label>
          <input type="number" name="voltage_rating_max" id="voltage_rating_max" 
                 bind:value={formData.voltage_rating_max} min="0" step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="current_rating_min">Min Current (A)</label>
          <input type="number" name="current_rating_min" id="current_rating_min" 
                 bind:value={formData.current_rating_min} min="0" step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="current_rating_max">Max Current (A)</label>
          <input type="number" name="current_rating_max" id="current_rating_max" 
                 bind:value={formData.current_rating_max} min="0" step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="power_rating_max">Max Power Rating (W)</label>
          <input type="number" name="power_rating_max" id="power_rating_max" 
                 bind:value={formData.power_rating_max} min="0" step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="tolerance">Tolerance</label>
          <input type="number" name="tolerance" id="tolerance" 
                 bind:value={formData.tolerance} min="0" step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="tolerance_unit">Tolerance Unit</label>
          <input name="tolerance_unit" id="tolerance_unit" bind:value={formData.tolerance_unit} class="form-input">
        </div>
      </div>

      <div class="form-group">
        <label for="electrical_properties">Additional Electrical Properties (JSON)</label>
        <textarea name="electrical_properties" id="electrical_properties" 
                  value={jsonEditors.electrical_properties} 
                  on:input={() => onJsonEditorChange('electrical_properties', jsonEditors.electrical_properties)} rows="5" class="form-textarea"></textarea>
        <p class="hint">Enter properties in JSON format, e.g. {`{"resistance": "10 ohm"}`}</p>
      </div>
    </div>
  </div>

  
  <!-- Mechanical Properties Section -->
  <div class="form-section {activeSection === 'mechanical' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('mechanical')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('mechanical')}>
      <h2>Mechanical Properties</h2>
      <span class="toggle-icon">{activeSection === 'mechanical' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'mechanical' || activeSection === 'all'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="dimensions">Dimensions</label>
          <div class="dimensions-container">
            <div class="dimension-field">
              <label for="dimensions_length">Length</label>
              <input type="number" name="dimensions_length" id="dimensions_length" 
                     on:focus={ensureDimensions}
                     on:input={(e) => {
                       const val = parseFloat(e.currentTarget.value);
                       if (!dimensions) dimensions = { length: 0, width: 0, height: 0 };
                       dimensions.length = isNaN(val) ? 0 : val;
                       updateFormData('dimensions', dimensions);
                     }}
                     value={dimensions?.length ?? 0} 
                     min="0" step="any" class="form-input">
            </div>
            <div class="dimension-field">
              <label for="dimensions_width">Width</label>
              <input type="number" name="dimensions_width" id="dimensions_width" 
                     on:focus={ensureDimensions}
                     on:input={(e) => {
                       const val = parseFloat(e.currentTarget.value);
                       if (!dimensions) dimensions = { length: 0, width: 0, height: 0 };
                       dimensions.width = isNaN(val) ? 0 : val;
                       updateFormData('dimensions', dimensions);
                     }}
                     value={dimensions?.width ?? 0} 
                     min="0" step="any" class="form-input">
            </div>
            <div class="dimension-field">
              <label for="dimensions_height">Height</label>
              <input type="number" name="dimensions_height" id="dimensions_height" 
                     on:focus={ensureDimensions}
                     on:input={(e) => {
                       const val = parseFloat(e.currentTarget.value);
                       if (!dimensions) dimensions = { length: 0, width: 0, height: 0 };
                       dimensions.height = isNaN(val) ? 0 : val;
                       updateFormData('dimensions', dimensions);
                     }}
                     value={dimensions?.height ?? 0} 
                     min="0" step="any" class="form-input">
            </div>
            <div class="dimension-field">
              <label for="dimensions_unit">Unit</label>
              <select name="dimensions_unit" id="dimensions_unit" bind:value={dimensionsUnit} class="form-select">
                <option value="">Select unit (optional)</option>
                {#each options.dimensionUnits as dimUnit}
                  <option value={dimUnit} selected={dimensionsUnit === dimUnit}>{dimUnit}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="weight_value">Weight</label>
            <input type="number" name="weight_value" id="weight_value" bind:value={formData.weight_value} min="0" step="any" class="form-input">
          </div>

          <div class="form-group">
            <label for="weight_unit">Weight Unit</label>
            <select name="weight_unit" id="weight_unit" bind:value={formData.weight_unit} class="form-select">
              <option value="">Select unit (optional)</option>
              {#each options.weightUnits as weightUnit}
                <option value={weightUnit} selected={formData.weight_unit === weightUnit}>{weightUnit}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="package_type">Package Type</label>
            <select name="package_type" id="package_type" bind:value={formData.package_type} class="form-select">
              <option value="">Select packaging (optional)</option>
              {#each options.packageTypes as packageType}
                <option value={packageType} selected={formData.package_type === packageType}>{packageType}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="pin_count">Pin Count</label>
            <input type="number" name="pin_count" id="pin_count" bind:value={formData.pin_count} min="0" step="1" class="form-input">
          </div>
        </div>

        <div class="form-group">
          <label for="material_composition">Material Composition (JSON)</label>
          <textarea name="material_composition" id="material_composition" 
                    value={jsonEditors.material_composition} 
                    on:input={() => onJsonEditorChange('material_composition', jsonEditors.material_composition)} rows="5" class="form-textarea"></textarea>
          <p class="hint">Enter material composition in JSON format, e.g. {`{"body": "aluminum", "pins": "gold plated copper"}`}</p>
        </div>

        <div class="form-group">
          <label for="mechanical_properties">Additional Mechanical Properties (JSON)</label>
          <textarea name="mechanical_properties" id="mechanical_properties" 
                    value={jsonEditors.mechanical_properties} 
                    on:input={() => onJsonEditorChange('mechanical_properties', jsonEditors.mechanical_properties)} rows="5" class="form-textarea"></textarea>
          <p class="hint">Enter properties in JSON format, e.g. {`{"tensile_strength": "500 MPa"}`}</p>
        </div>

        <div class="form-group">
          <label for="material_composition">Material Composition (JSON)</label>
          <textarea name="material_composition" id="material_composition" 
                    value={jsonEditors.material_composition} 
                    on:input={() => onJsonEditorChange('material_composition', jsonEditors.material_composition)} rows="5"></textarea>
          <p class="hint">Enter material details in JSON format, e.g. {`{"metals": ["copper", "gold"]}`}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Thermal Properties Section -->
  <div class="form-section {activeSection === 'thermal' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('thermal')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('thermal')}>
      <h2>Thermal Properties</h2>
      <span class="toggle-icon">{activeSection === 'thermal' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'thermal' || activeSection === 'all'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="operating_temperature_min">Min Operating Temperature</label>
          <input type="number" name="operating_temperature_min" id="operating_temperature_min" 
                  bind:value={$formStore.operating_temperature_min} step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="operating_temperature_max">Max Operating Temperature</label>
          <input type="number" name="operating_temperature_max" id="operating_temperature_max" 
                  bind:value={$formStore.operating_temperature_max} step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="storage_temperature_min">Min Storage Temperature</label>
          <input type="number" name="storage_temperature_min" id="storage_temperature_min" 
                  bind:value={$formStore.storage_temperature_min} step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="storage_temperature_max">Max Storage Temperature</label>
          <input type="number" name="storage_temperature_max" id="storage_temperature_max" 
                  bind:value={$formStore.storage_temperature_max} step="any" class="form-input">
        </div>

        <div class="form-group">
          <label for="temperature_unit">Temperature Unit</label>
          <select name="temperature_unit" id="temperature_unit" bind:value={$formStore.temperature_unit} class="form-select">
            <option value="">Select unit (optional)</option>
            {#each options.temperatureUnits as tempUnit}
              <option value={tempUnit} selected={$formStore.temperature_unit === tempUnit}>{tempUnit}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="thermal_properties">Additional Thermal Properties (JSON)</label>
        <textarea name="thermal_properties" id="thermal_properties" 
                  value={jsonEditors.thermal_properties} 
                  on:input={() => onJsonEditorChange('thermal_properties', jsonEditors.thermal_properties)} rows="5" class="form-textarea"></textarea>
        <p class="hint">Enter properties in JSON format, e.g. {`{"thermal_conductivity": "2.5 W/mK"}`}</p>
      </div>
    </div>
  </div>

  <!-- Categorization & Classification Tab -->
  <div class="form-section {activeSection === 'categories' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('categories')}  role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('categories')}>
      <h2>Categories & Classification</h2>
      <span class="toggle-icon">{activeSection === 'categories' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'categories' || activeSection === 'all'}>
      <div class="form-group">
        <label for="categories">Categories</label>
        <MultiCategorySelector 
          bind:selectedCategoryIds
          categories={categories} 
        />
      </div>
      
      <!-- Part Family Selector -->
      <div class="form-group">
        <label for="part-families">Part Families</label>
        <div class="selector-with-actions">
          <select id="part-families-select" class="form-select">
            <option value="">Select a family</option>
            {#each partFamilies as family}
              <option value={family.id}>{family.name}</option>
            {/each}
          </select>
          <button type="button" class="add-button" on:click={handleAddFamily}>Add</button>
        </div>
        
        <!-- Selected Families Display -->
        <div class="selected-items">
          {#if selectedFamilies.length > 0}
            {#each selectedFamilies as family}
              <div class="tag-item">
                <span>{family.name}</span>
                <button type="button" class="remove-button" on:click={() => handleRemoveFamily(family.id)}>×</button>
              </div>
            {/each}
          {:else}
            <div class="hint">No families selected</div>
          {/if}
        </div>
      </div>
      
      <!-- Part Tags Selector -->
      <div class="form-group">
        <label for="part-tags">Part Tags</label>
        <div class="tag-input-container">
          <input type="text" id="tag-input" bind:value={newTagName} placeholder="Enter tag name" class="form-input">
          <button type="button" class="add-button" on:click={handleAddTag}>Add</button>
        </div>
        
        <!-- Selected Tags Display -->
        <div class="selected-items">
          {#if selectedTags.length > 0}
            {#each selectedTags as tag}
              <div class="tag-item">
                <span>{tag.name}</span>
                <button type="button" class="remove-button" on:click={() => handleRemoveTag(tag.id)}>×</button>
              </div>
            {/each}
          {:else}
            <div class="hint">No tags selected</div>
          {/if}
        </div>
      </div>
      
      <!-- Version Tags Selector -->
      <div class="form-group">
        <label for="version-tags">Version Tags</label>
        <div class="tag-input-container">
          <input type="text" id="version-tag-input" bind:value={newVersionTagName} placeholder="Enter version tag" class="form-input">
          <button type="button" class="add-button" on:click={handleAddVersionTag}>Add</button>
        </div>
        
        <!-- Selected Version Tags Display -->
        <div class="selected-items">
          {#if selectedVersionTags.length > 0}
            {#each selectedVersionTags as tag}
              <div class="tag-item">
                <span>{tag.name}</span>
                <button type="button" class="remove-button" on:click={() => handleRemoveVersionTag(tag.id)}>×</button>
              </div>
            {/each}
          {:else}
            <div class="hint">No version tags selected</div>
          {/if}
        </div>
      </div>
      <div class="form-group">
        <label for="manufacturers">Manufacturers</label>
        <ManufacturerSelector
          manufacturers={manufacturers}
          bind:selectedManufacturerParts={selectedManufacturerParts as any}
        />
        {#if isEditMode}
          <div class="debug-info">
            <span>Selected manufacturers: {selectedManufacturerParts.length}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>

    <!-- Additional Properties Section -->
    <div class="form-section {activeSection === 'additional' ? 'active' : ''}">
      <div class="section-header" on:click={() => toggleSection('additional')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('additional')}>
        <h2>Additional Properties</h2>
        <span class="toggle-icon">{activeSection === 'additional' ? '−' : '+'}</span>
      </div>
      <div class="section-content" class:visible={activeSection === 'additional' || activeSection === 'all'}>
        <div class="form-group">
          <label for="properties">General Properties (JSON)</label>
          <textarea name="properties" id="properties" 
                    value={jsonEditors.properties} 
                    on:input={() => onJsonEditorChange('properties', jsonEditors.properties)} rows="5" class="form-textarea"></textarea>
          <p class="hint">Enter properties in JSON format, e.g. {`{"property": "value"}`}</p>
          {#if errors && 'properties' in errors}<span class="error">{errors.properties}</span>{/if}
        </div>
        
        <div class="form-group">
          <label for="environmental_data">Environmental Data (JSON)</label>
          <textarea name="environmental_data" id="environmental_data" 
                    value={jsonEditors.environmental_data} 
                    on:input={() => onJsonEditorChange('environmental_data', jsonEditors.environmental_data)} rows="5" class="form-textarea"></textarea>
          <p class="hint">Enter environmental data in JSON format, e.g. {`{"RoHS_compliant": true}`}</p>
          {#if errors && 'environmental_data' in errors}<span class="error">{errors.environmental_data}</span>{/if}
        </div>
  
        <div class="form-group">
          <label for="revision_notes">Revision Notes</label>
          <textarea name="revision_notes" id="revision_notes" 
                   bind:value={$formStore.revision_notes} rows="3" class="form-textarea"></textarea>
          {#if $formErrors?.revision_notes}<span class="error">{$formErrors.revision_notes}</span>{/if}
        </div>
        
        {#if $formStore.version_status === LifecycleStatusEnum.RELEASED}
          <div class="form-group">
            <label for="released_at">Release Date</label>
            <input type="date" name="released_at" id="released_at" 
                   bind:value={$formStore.released_at} class="form-input">
            <p class="hint">Release date is required for RELEASED status</p>
            {#if $formErrors?.released_at}<span class="error">{$formErrors.released_at}</span>{/if}
          </div>
        {/if}
      </div>
    </div>

  {#if !hideButtons}
    <div class="form-actions">
      <button type="submit" class="btn-primary">{isEditMode ? 'Update Part' : 'Create Part'}</button>
      
      {#if isDashboardContext}
        <button type="button" class="btn-secondary" on:click={() => dispatch('cancel')}>Cancel</button>
      {:else if isEditMode}
        <button type="button" class="btn-secondary" on:click={() => history.back()}>Cancel</button>
      {/if}
    </div>
  {/if}
</form>

<style>
  .part-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    color: hsl(var(--foreground));
  }
  
  .form-section {
    margin-bottom: 1.5rem;
    border: 1px solid hsl(var(--border));
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
    box-shadow: 0 2px 6px hsl(var(--muted) / 0.1);
  }
  
  :global(.dark) .form-section {
    box-shadow: 0 3px 8px hsl(var(--muted) / 0.3);
  }
  
  .form-section:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px hsl(var(--muted) / 0.15);
  }
  
  :global(.dark) .form-section:hover {
    box-shadow: 0 4px 12px hsl(var(--muted) / 0.4);
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: hsl(var(--surface-100));
    cursor: pointer;
    transition: background-color 0.3s, color 0.3s;
    color: hsl(var(--foreground));
  }
  
  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: hsl(var(--foreground));
  }
  
  .toggle-icon {
    font-size: 1.5rem;
    line-height: 1;
    color: hsl(var(--primary));
  }
  
  .section-content {
    display: none;
    padding: 1rem;
    border-top: 1px solid hsl(var(--border));
    background-color: hsl(var(--card));
    transition: background-color 0.3s, color 0.3s;
  }
  
  /* This class controls the visibility of form sections */
  .visible {
    display: block !important; /* Force display to ensure visibility */
  }
  
  /* When activeSection is 'all', show all sections */
  :global([data-section-all="true"]) .section-content {
    display: block !important; /* Always show all sections */
  }
  
  /* Dashboard context special styling to ensure form is visible */
  :global(.dashboard-context) .form-section.active .section-content {
    display: block !important;
  }
  
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .dimensions-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }
  
  .dimension-field {
    display: flex;
    flex-direction: column;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }
  
  .form-input, .form-select, .form-textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid hsl(var(--border));
    border-radius: 4px;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }
  
 
  
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
  }
  
  textarea {
    resize: vertical;
    min-height: 100px;
  }
  
  .field-hint {
    font-size: 0.8rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.25rem;
    transition: color 0.3s;
    display: block;
  }
  
  :global(.dark) .field-hint {
    color: hsl(var(--muted-foreground) / 0.9);
  }
  
  .input-with-hint {
    display: flex;
    flex-direction: column;
  }
  
  .selector-with-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .tag-input-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .selected-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .tag-item {
    display: flex;
    align-items: center;
    background-color: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .tag-item .remove-button {
    background: none;
    border: none;
    color: hsl(var(--primary));
    cursor: pointer;
    margin-left: 0.5rem;
    padding: 0 0.25rem;
    font-size: 1rem;
    line-height: 1;
  }
  
  .tag-item .remove-button:hover {
    color: hsl(var(--destructive));
  }
  
  .add-button {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 4px;
    padding: 0.375rem 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .add-button:hover {
    background-color: hsl(var(--primary) / 0.9);
  }
  
  .hint {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
  
  .error {
    display: block;
    color: hsl(var(--destructive));
    font-size: 0.8rem;
    margin-top: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: hsl(var(--destructive) / 0.1);
    border-radius: 4px;
    border: 1px solid hsl(var(--destructive) / 0.2);
  }
  
  .form-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
  
  .btn-primary {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: background-color 0.3s;
  }
  
  .btn-primary:hover {
    background: hsl(var(--primary-dark));
  }
  
  .btn-secondary {
    background: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: background-color 0.3s;
  }
  
  .btn-secondary:hover {
    background: hsl(var(--secondary) / 0.8);
  }
  
  .active .section-header {
    background-color: hsl(var(--primary) / 0.1);
    border-bottom: 1px solid hsl(var(--primary) / 0.2);
  }
  
  :global(.dark) .active .section-header {
    background-color: hsl(var(--primary) / 0.2);
  }
  
  :global(.dark) .section-content {
    background-color: hsl(var(--card-foreground) / 0.02);
  }
  
  :global(.dark) .section-header:hover {
    background-color: hsl(var(--accent) / 0.2);
  }
  
  .section-header:hover {
    background-color: hsl(var(--accent) / 0.1);
  }
  .debug-info {
    margin-top: 0.25rem;
    padding: 0.25rem 0.5rem;
    background-color: hsl(var(--muted) / 0.1);
    border-radius: 4px;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }
</style>