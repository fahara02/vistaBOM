<!-- src/lib/components/PartForm.svelte -->

<script lang="ts">
import { createPartSchema } from '$lib/schema/schema';
import type { Category, CreatePart, Dimensions, JsonValue, Manufacturer, ManufacturerPart, PartFormData, PartVersion } from '$lib/types/schemaTypes';
import type { ManufacturerDisplay, ManufacturerPartInput } from '$lib/types/componentTypes';
import { adaptManufacturer, prepareManufacturerPartForSubmission } from '$lib/types/componentTypes';
import { DimensionUnitEnum, LifecycleStatusEnum, PackageTypeEnum, PartStatusEnum, TemperatureUnitEnum, WeightUnitEnum } from '$lib/types/enums';
import { createEventDispatcher, onMount } from 'svelte';
import { superForm } from 'sveltekit-superforms/client';
import type { z } from 'zod';
import { prepareFormDataForValidation } from '../utils/formUtils';
import ManufacturerSelector from './ManufacturerSelector.svelte';
import MultiCategorySelector from './MultiCategorySelector.svelte';

// Event dispatcher to send form updates to parent component
const dispatch = createEventDispatcher<{
  formUpdate: Record<string, any>;
}>();

// We now import ManufacturerPartInput from componentTypes.ts
// No need to redefine it here;

// Extend CreatePart with the additional fields needed for the form
type PartFormExtended = CreatePart & {
  id: string;
  part_id?: string;
  status_in_bom: PartStatusEnum;
  weight_value?: number | null;
  manufacturer_parts: ManufacturerPartInput[] | string;
  // Ensure all properties from schema.ts are included
  properties: Record<string, JsonValue>;
  technical_specifications: Record<string, JsonValue>;
  electrical_properties: Record<string, JsonValue>;
  mechanical_properties: Record<string, JsonValue>;
  thermal_properties: Record<string, JsonValue>;
  material_composition: Record<string, JsonValue>;
  environmental_data: Record<string, JsonValue>;
};

// Define a FormData type for our component's use
type FormDataType = {
  partForm?: Record<string, any>;
  [key: string]: any;
};

// Define an ErrorsType for our component's use that accommodates SuperForm validation errors
type ErrorsType = Record<string, string | string[] | undefined> | Record<string, any> | undefined;

// REACTIVE DATAS
// These are input props provided to the component
// Allow form data to be passed directly or via a data object
export let data: FormDataType = {};
// Note: We're accessing errors through formErrors from superForm, so making this a const
export const errors: ErrorsType = {};
// Optional direct props for standalone edit page context - these take precedence over data object props
export let form: any = undefined;
export let enhance: any = undefined; // Will be used in SuperForm initialization
// Direct access to server form data - reliable source for edit mode
// We're expecting SuperForm's structure which contains a data property
export let serverFormData: { data: Record<string, unknown>; [key: string]: unknown } | undefined = undefined;

// Initialize reactive form data with schema defaults
let formData: PartFormExtended = {
  id: '',
  part_name: '',
  part_version: '0.1.0',
  version_status: LifecycleStatusEnum.DRAFT,
  status_in_bom: PartStatusEnum.CONCEPT,
  long_description: '',
  manufacturer_parts: [], // Initialize as empty array
  category_ids: '',
  short_description: '',
  properties: {},
  part_weight: undefined, // Changed from null to undefined for type correctness
  weight_unit: undefined, // Changed from null to undefined for type correctness
  weight_value: undefined, // Changed from null to undefined for type correctness
  technical_specifications: {},
  electrical_properties: {},
  mechanical_properties: {},
  thermal_properties: {},
  material_composition: {},
  environmental_data: {},
  // Add missing required properties
  compliance_info: [],
  attachments: [],
  representations: [],
  structure: [],
  supplier_parts: [],
  custom_fields: {},
  dimensions_unit: null,
  package_type: null,
  is_public: false,
  dimensions: { length: null as unknown as number, width: null as unknown as number, height: null as unknown as number },

};

// Initialize SuperForm at component top level
const { form: formStore, enhance: enhanceStore, errors: formErrors } = superForm(
  // Use provided form data or empty object
  (form !== undefined ? form : data?.form || {}) as PartFormExtended,
  {
    resetForm: false,
    dataType: 'json',
    ...(enhance ? enhance : {}),
    // Log all form update events to trace data flow
    onUpdated: (event) => {
      console.log(' FORM DATA UPDATED:', event.form);
      // Keep formData in sync with the form store
      formData = { ...formData, ...event.form };
      console.log('DIMENSIONS STATE:', formData.dimensions);
      
      // Dispatch form update event to parent component when in dashboard context
      if (isDashboardContext) {
        // Only send the data when it's meaningful (not during initialization)
        if (isFormInitialized) {
          dispatch('formUpdate', formData);
        }
      }
    }
  }
);

// Form variables - initialize to empty string by default, will be set during initialization
// Default all sections to be active in edit mode

// Options for enum fields
export const options = {
  statuses: Object.values(LifecycleStatusEnum),
  packageTypes: Object.values(PackageTypeEnum),
  weightUnits: Object.values(WeightUnitEnum),
  dimensionUnits: Object.values(DimensionUnitEnum),
  partStatuses: Object.values(PartStatusEnum),
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
let dimensions: Dimensions = { length: null as unknown as number, width: null as unknown as number, height: null as unknown as number };
let dimensionsUnit: DimensionUnitEnum | null = null;
// Component props
export let partData: CreatePart | undefined = undefined;
export let versionData: PartVersion | undefined = undefined;
export let categories: Category[] = [];
// Using ManufacturerDisplay from componentTypes.ts
export let manufacturers: ManufacturerDisplay[] = [];
// Initialize with explicit type to avoid 'never[]' type inference issues
export let selectedCategoryIds: Array<string> = [];
// Using ManufacturerPart from schema.ts

export let selectedManufacturerParts: ManufacturerPartInput[] = [];

// Safe parsing helper for dimensions and other numeric fields
function parseFloatOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}

// Helper function to safely parse manufacturer_parts from any source
function parseManufacturerParts(value: any): ManufacturerPartInput[] {
  if (!value) return [];
  
  // Already an array of the right type
  if (Array.isArray(value)) {
    return value.map(part => ({
      manufacturer_id: part.manufacturer_id || '',
      manufacturer_part_number: part.manufacturer_part_number || '',
      is_recommended: !!part.is_recommended,
      description: part.description,
      datasheet_url: part.datasheet_url,
      product_url: part.product_url
    }));
  }
  
  // It's a string, try to parse it
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(part => ({
          manufacturer_id: part.manufacturer_id || '',
          manufacturer_part_number: part.manufacturer_part_number || '',
          is_recommended: !!part.is_recommended,
          description: part.description,
          datasheet_url: part.datasheet_url,
          product_url: part.product_url
        }));
      }
    } catch (e) {
      console.error('Error parsing manufacturer_parts:', e);
    }
  }
  
  return [];
}

// Initialize JSON editors with empty objects
let jsonEditors = {
  technicalSpecs: '{}',
  properties: '{}',
  electricalProperties: '{}',
  mechanicalProperties: '{}',
  thermalProperties: '{}',
  materialComposition: '{}',
  environmentalData: '{}',
  fullDescription: '{}'
};

// Handle JSON editor changes
function onJsonEditorChange(editorName: string, value: string): void {
  jsonEditors[editorName as keyof typeof jsonEditors] = value;
}

// Convert JSON to editable string safely with better error handling
function jsonToString(json: any): string {
  if (!json) return '{}';
  try {
    if (typeof json === 'string') {
      // Try to parse the string as JSON
      try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Not valid JSON, return empty object
        return '{}';
    }
    } else {
      return JSON.stringify(json, null, 2);
    }
  } catch (error) {
    console.error('Error converting JSON to string:', error);
    return '{}';
  }
}

// Check if dimensions are complete
function isCompleteDimensions(dims: Dimensions): dims is { length: number; width: number; height: number } {
  return dims.length != null && dims.width != null && dims.height != null;
}

// Ensure dimensions is always a properly formatted object
function ensureDimensions(dims: any): Dimensions {
  // Default empty dimensions object
  const defaultDims: Dimensions = { 
    length: null as unknown as number, 
    width: null as unknown as number, 
    height: null as unknown as number 
  };
  
  if (!dims) return defaultDims;
  
  // Handle string format (from form submission)
  if (typeof dims === 'string') {
    try {
      return { ...defaultDims, ...JSON.parse(dims) };
    } catch (e) {
      console.error('Error parsing dimensions from string:', e);
      return defaultDims;
    }
  }
  
  // Handle object format but ensure it has the expected shape
  if (typeof dims === 'object') {
    return {
      length: parseFloatOrNull(dims.length) as unknown as number,
      width: parseFloatOrNull(dims.width) as unknown as number,
      height: parseFloatOrNull(dims.height) as unknown as number
    };
  }
  
  return defaultDims;
}

// Simple function to get the current form data
function getData(): Record<string, any> {
  try {
    // Use formData as the source of truth
    return { ...formData };
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
    if ($form) {
      ($form as Record<string, unknown>)[fieldName] = value;
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

// Prepare form submission with enhanced validation and constraint handling
function prepareFormSubmission(): Record<string, unknown> {
  // Start with data from formData to ensure we have complete data
  const extractedFormData: Record<string, unknown> = { ...getData() };
  
  // CRITICAL FIX: Handle dimensions specially - enforce paired fields constraint
  if (isCompleteDimensions(dimensions) && dimensionsUnit) {
    // Both dimensions and dimensions_unit must be present together
    extractedFormData.dimensions = dimensions;
    extractedFormData.dimensions_unit = dimensionsUnit;
  } else if (!isCompleteDimensions(dimensions) && !dimensionsUnit) {
    // Neither dimensions nor dimensions_unit are present - valid state
    extractedFormData.dimensions = null;
    extractedFormData.dimensions_unit = null;
  } else {
    // One is present but not the other - enforce both being null to avoid constraint violation
    console.warn('Dimensions data is incomplete, nullifying both dimensions and unit');
    extractedFormData.dimensions = null;
    extractedFormData.dimensions_unit = null;
  }
  
  // CRITICAL FIX: Check other paired fields to avoid database constraint violations
  const pairedFields = [
    ['weight_value', 'weight_unit'],
    ['tolerance', 'tolerance_unit'],
    ['operating_temperature_min', 'temperature_unit'],
    ['operating_temperature_max', 'temperature_unit'],
    ['storage_temperature_min', 'temperature_unit'],
    ['storage_temperature_max', 'temperature_unit']
  ];
  
  pairedFields.forEach(([valueField, unitField]) => {
    const hasValue = extractedFormData[valueField] !== null && 
                    extractedFormData[valueField] !== undefined && 
                    extractedFormData[valueField] !== '';
    const hasUnit = extractedFormData[unitField] !== null && 
                   extractedFormData[unitField] !== undefined && 
                   extractedFormData[unitField] !== '';
    
    if (hasValue && !hasUnit) {
      console.warn(`Field ${valueField} has value but ${unitField} is missing, nullifying both`);
      extractedFormData[valueField] = null;
    } else if (!hasValue && hasUnit) {
      console.warn(`Field ${unitField} has value but ${valueField} is missing, keeping unit`);
      // Keep the unit as it might be used for other paired fields
    }
  });
  
  // For required ID fields that should be part of the form submission
  if (isEditMode && !extractedFormData.id && partData && 'id' in partData) {
    extractedFormData.id = partData.id;
  }
  
  // CRITICAL FIX: Ensure relationship data is properly formatted
  extractedFormData.category_ids = selectedCategoryIds.join(',');
  extractedFormData.manufacturer_parts = JSON.stringify(selectedManufacturerParts.map(part => ({
    ...part,
    is_recommended: !!part.is_recommended // Ensure boolean
  })));
  
  // Use our helper function to prepare manufacturer parts for submission
  // This ensures consistent transformation from input types to schema types
  extractedFormData.manufacturer_parts = JSON.stringify(
    selectedManufacturerParts.map(part => prepareManufacturerPartForSubmission(part))
  );
  
  // Ensure all enum fields are either valid enum values or null (not empty strings)
  ['version_status', 'status_in_bom', 'package_type', 'weight_unit', 'dimensions_unit', 'temperature_unit'].forEach(field => {
    if (extractedFormData[field] === '') {
      extractedFormData[field] = null;
    }
  });
  
  // Enhanced JSON field handling with validation
  const parseJsonField = (val: any, field: string) => {
    // Already an object, just return it
    if (val && typeof val === 'object') return val;
    
    // If null or empty, return empty object
    if (!val) return {};
    
    // If it's a string, try to parse it
    if (typeof val === 'string') {
      try {
        // Handle special case of empty string
        if (val.trim() === '') return {};
        return JSON.parse(val);
      } catch (e) {
        console.error(`Error parsing ${field}:`, e);
        // For fields that should be strings but might be handled as JSON
        if (['long_description', 'functional_description'].includes(field)) {
          return val; // Keep as string
        }
        return {}; // For actual JSON fields, return empty object
      }
    }
    
    // For any other type, convert to string
    return {};
  };
  
  // Apply our validation utility to ensure all fields have the right types
  const validatedData = prepareFormDataForValidation(extractedFormData);
  Object.assign(extractedFormData, validatedData);
  console.log('Form data validated for submission:', extractedFormData);
  
  return extractedFormData;
}

onMount(() => {
  console.log('PartForm mounted - initializing with mode:', isEditMode ? 'EDIT' : 'ADD');
  console.log('isDashboardContext:', isDashboardContext);
  console.log('Part data:', partData);
  console.log('Version data:', versionData);
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
          const processedData: PartFormExtended = {
            // Start with existing defaults
            ...formData,
            
            // Essential fields - using proper null checking and defaults
            id: serverData.id ?? '',
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
            
            // Object fields - ensure they're objects even if null
            technical_specifications: serverData.technical_specifications ?? {},
            properties: serverData.properties ?? {}, 
            electrical_properties: serverData.electrical_properties ?? {},
            mechanical_properties: serverData.mechanical_properties ?? {},
            thermal_properties: serverData.thermal_properties ?? {},
            material_composition: serverData.material_composition ?? {},
            environmental_data: serverData.environmental_data ?? {},
            
            // Dimensions handling
            dimensions: serverData.dimensions ?? { length: null, width: null, height: null },
            dimensions_unit: serverData.dimensions_unit ?? '',
            
            // Physical properties
            part_weight: serverData.weight ?? null,
            weight_unit: serverData.weight_unit ?? '',
            package_type: serverData.package_type ?? '',
            pin_count: serverData.pin_count ?? null,
            
            // Electrical properties
            voltage_rating_min: serverData.voltage_rating_min ?? null,
            voltage_rating_max: serverData.voltage_rating_max ?? null,
            
            // Default values for remaining required fields
            manufacturer_parts: [] as ManufacturerPartInput[], // Use empty array instead of string
            category_ids: '',
          };
          
          // Update the form store and local data with properly typed data
          $formStore = processedData;
          formData = processedData;
          console.log('Form initialized with properly typed data:', $formStore);
          
          // Log all form inputs to debug which fields are binding correctly
          console.log('FORM FIELDS AFTER DATA MAPPING:');
          console.log('- id:', formData.id);
          console.log('- part_name:', formData.part_name);
          console.log('- part_version:', formData.part_version);
          console.log('- version_status:', formData.version_status);
          console.log('- short_description:', formData.short_description);
          console.log('- dimensions:', formData.dimensions);
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
  
  // SIMPLE DIRECT FIX: In edit mode, if we have server data and form is initializing, use it
  if (isEditMode && isFormInitialized === false) {
    // Priority order for initialization data:
    // 1. serverFormData.data direct prop from edit page (most reliable)
    // 2. data.form from component props
    if (serverFormData?.data && Object.keys(serverFormData.data).length > 0) {
      console.log('DIRECT INITIALIZATION: Using serverFormData.data prop');
      // Use Record<string, any> to safely access properties that might not exist in PartsFormData
      const serverData = serverFormData.data as Record<string, any>;
      
      // Create a complete object with all required fields
      const updatedData: PartFormExtended = {
        // Start with existing defaults
        ...formData,
        
        // Essential fields with fallbacks to current values
        id: serverData.id ?? formData.id,
        part_name: serverData.part_name ?? (serverData.name ?? formData.part_name),
        part_version: serverData.part_version ?? (serverData.version ?? formData.part_version),
        // Handle specific case of Lifecycle and Part status enums
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
      // Set default values for required fields to ensure form works in dashboard context
      formData = {
        ...formData,
        id: '',
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
        const mappedData: PartFormExtended = {
          // Include defaults for missing fields
          ...formData,
          
          // Essential fields
          id: serverData.id ?? '',
          part_name: serverData.part_name ?? (serverData.name ?? ''),
          part_version: serverData.part_version ?? (serverData.version ?? '0.1.0'),
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
          
          // Object properties
          technical_specifications: serverData.technical_specifications ?? {},
          properties: serverData.properties ?? {}, 
          electrical_properties: serverData.electrical_properties ?? {},
          mechanical_properties: serverData.mechanical_properties ?? {},
          thermal_properties: serverData.thermal_properties ?? {},
          material_composition: serverData.material_composition ?? {},
          environmental_data: serverData.environmental_data ?? {},
          
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
        formData = { ...formData, ...data.form };
        // Make sure the form store has the data too
        $formStore = data.form;
        
        // Parse dimensions if needed
        if (form.dimensions) {
          try {
            if (typeof form.dimensions === 'string') {
              formData.dimensions = JSON.parse(form.dimensions);
            } else {
              formData.dimensions = form.dimensions;
            }
          } catch (e) {
            console.error('Error parsing dimensions:', e);
          }
        }
        
        // CRITICAL FIX: Update the SuperForm store directly instead of local object
        // This is necessary because the form inputs are bound to $formStore, not formData
        $formStore = { ...$formStore, ...formData };
        console.log('Updated formStore with direct form prop:', $formStore);
        
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
      else if (partData && versionData && Object.keys(partData).length > 0) {
        // Map part data to form fields
        console.log('LOWEST PRIORITY: Using partData/versionData manual mapping');
        console.log('Part data:', partData);
        console.log('Version data:', versionData);
        
        // Helper function to properly process field values
        const processField = (value: any, fieldName: string) => {
          // Handle null/undefined
          if (value === null || value === undefined) {
            return null;
          }
          
          // Handle boolean conversion (strings 'true'/'false' to actual booleans)
          if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
            return value.toLowerCase() === 'true';
          }
          
          // Return unchanged value for other types
          return value;
        };
        
        // Make more form sections visible in edit mode
        activeSection = 'basic'; // Always show basic section in edit mode
      } else if (versionData && Object.keys(versionData).length > 0) {
        // Fallback to version data if available
        console.log('EDIT MODE: Using version data:', versionData);
        
        // Make a deep copy to avoid reference issues
        formData = { 
          ...formData,
          ...JSON.parse(JSON.stringify(versionData))
        };
        
        // Ensure core fields are properly set
        if (versionData.version_status) formData.version_status = versionData.version_status as LifecycleStatusEnum;
        // Use type assertion for status_in_bom
        if ((versionData as any).status_in_bom) formData.status_in_bom = (versionData as any).status_in_bom as PartStatusEnum;
        
        // Handle dimensions specially
        if (versionData.dimensions) {
          dimensions = ensureDimensions(versionData.dimensions);
          dimensionsUnit = versionData.dimensions_unit as DimensionUnitEnum || null;
          console.log('Setting dimensions from version data:', dimensions, dimensionsUnit);
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
          const formCategories = $formStore.category_ids || [];
          console.log('Form categories:', formCategories);
          
          // Handle different formats of category_ids
          if (Array.isArray(formCategories)) {
            selectedCategoryIds = formCategories;
          } else if (typeof formCategories === 'string') {
            try {
              selectedCategoryIds = JSON.parse(formCategories);
            } catch(e) {
              console.error('Could not parse category_ids string:', e);
              selectedCategoryIds = [];
            }
          } else {
            // Explicitly set as string array to avoid 'never[]' type error
            selectedCategoryIds = [] as string[];
          }
          
          console.log('Selected categories after init:', selectedCategoryIds);
        } else {
          console.log('No category IDs data in form');
        }
        
        // Try to extract active manufacturers from the form data
        if ($formStore?.manufacturer_parts) {
          // Get the manufacturer parts data
          const manParts = $formStore.manufacturer_parts;
          
          try {
            // If it's a string, try to parse it
            if (typeof manParts === 'string') {
              // Only try to parse if it's not an empty string
              if (manParts.trim()) {
                try {
                  const parsed = JSON.parse(manParts);
                  selectedManufacturerParts = parseManufacturerParts(parsed);
                } catch (e) {
                  console.error('Error parsing manufacturer parts:', e);
                  selectedManufacturerParts = [];
                }
              } else {
                selectedManufacturerParts = [];
              }
            } else {
              // Use our helper function to safely parse manufacturer parts
              selectedManufacturerParts = parseManufacturerParts(manParts);
              console.log('Selected manufacturer parts after init:', selectedManufacturerParts);
            }
          } catch (e) {
            console.error('Error processing manufacturer parts:', e);
            selectedManufacturerParts = [];
          }
        } else {
          console.log('No manufacturer parts data in form');
        }
      } catch (err) {
        console.error('Error in form initialization:', err);
      }
// End of try-catch block
    } else {
      console.log('Form already initialized, skipping initialization');
    }
  }

  // Define handleSubmit function - called when the form is submitted
  function handleSubmit() {
    try {
      console.log('Form submitted with values:', $formStore);
      
      // CRITICAL FIX: Properly prepare all data for submission to avoid constraint violations
      const validatedFormData = prepareFormSubmission();
      
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
  onMount(() => {
    initializeForm();
  });
</script>


<form class="part-form" method="POST" use:enhance={enhanceStore} on:submit={handleSubmit} data-section-all={activeSection === 'all' ? 'true' : 'false'}>  
  <!-- Hidden inputs for form submission - bound to formStore for consistency -->
  <input type="hidden" name="part_name" value={$formStore.part_name || ''} />
  <input type="hidden" name="part_version" value={$formStore.part_version || '0.1.0'} />
  <input type="hidden" name="version_status" value={$formStore.version_status || LifecycleStatusEnum.DRAFT} />
  <input type="hidden" name="status_in_bom" value={$formStore.status_in_bom || PartStatusEnum.CONCEPT} />

  <!-- Basic Information -->
  <div class="form-section {activeSection === 'basic' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('basic')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('basic')}>
      <h2>Basic Information</h2>
      <span class="toggle-icon">{activeSection === 'basic' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'basic' || activeSection === 'all'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="part_name">Name</label>
          <input name="part_name" id="part_name" bind:value={$formStore.part_name} required />
          {#if $formErrors?.part_name}<span class="error">{$formErrors.part_name}</span>{/if}
        </div>
        <div class="form-group">
          <label for="part_version">Version</label>
          <input name="part_version" id="part_version" bind:value={$formStore.part_version} required pattern="\d+\.\d+\.\d+" />
          {#if $formErrors?.part_version}<span class="error">{$formErrors.part_version}</span>{/if}
        </div>
        <div class="form-group">
          <label for="version_status">Lifecycle Status</label>
          <select name="version_status" id="version_status" bind:value={$formStore.version_status} required>
            {#each options.statuses as statusOption}
              <option value={statusOption}>{statusOption}</option>
            {/each}
          </select>
          {#if $formErrors?.version_status}<span class="error">{$formErrors.version_status}</span>{/if}
        </div>
        <div class="form-group">
          <label for="status_in_bom">Part Status</label>
          <select name="status_in_bom" id="status_in_bom" bind:value={$formStore.status_in_bom}>
            {#each options.partStatuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          {#if $formErrors?.status_in_bom}<span class="error">{$formErrors.status_in_bom}</span>{/if}
        </div>
      </div>
      <div class="form-group">
        <label for="short_description">Short Description</label>
        <input name="short_description" id="short_description" bind:value={$formStore.short_description} />
      </div>
      <div class="form-group">
        <label for="long_description">Description</label>
        <textarea name="long_description" id="long_description" bind:value={$formStore.long_description} rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="functional_description">Functional Description</label>
        <textarea name="functional_description" id="functional_description" bind:value={$formStore.functional_description} rows="3"></textarea>
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
                 bind:value={formData.voltage_rating_min} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="voltage_rating_max">Max Voltage (V)</label>
          <input type="number" name="voltage_rating_max" id="voltage_rating_max" 
                 bind:value={formData.voltage_rating_max} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="current_rating_min">Min Current (A)</label>
          <input type="number" name="current_rating_min" id="current_rating_min" 
                 bind:value={formData.current_rating_min} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="current_rating_max">Max Current (A)</label>
          <input type="number" name="current_rating_max" id="current_rating_max" 
                 bind:value={formData.current_rating_max} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="power_rating_max">Max Power Rating (W)</label>
          <input type="number" name="power_rating_max" id="power_rating_max" 
                 bind:value={formData.power_rating_max} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="tolerance">Tolerance</label>
          <input type="number" name="tolerance" id="tolerance" 
                 bind:value={formData.tolerance} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="tolerance_unit">Tolerance Unit</label>
          <input name="tolerance_unit" id="tolerance_unit" bind:value={formData.tolerance_unit}>
        </div>
      </div>

      <div class="form-group">
        <label for="electrical_properties">Additional Electrical Properties (JSON)</label>
        <textarea name="electrical_properties" id="electrical_properties" 
                  value={jsonEditors.electricalProperties || '{}'}
                  on:input={(e) => onJsonEditorChange('electricalProperties', e.currentTarget.value)} rows="5"></textarea>
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
      <div class="form-group">
        <label for="dimensions">Dimensions</label>
        <div class="dimensions-container">
          <div class="dimension-field">
            <label for="dimensions_length">Length</label>
            <input type="number" name="dimensions.length" id="dimensions_length" 
                   on:focus={ensureDimensions}
                   bind:value={dimensions.length} min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions_width">Width</label>
            <input type="number" name="dimensions.width" id="dimensions_width" 
                   on:focus={ensureDimensions}
                   bind:value={dimensions.width} min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions_height">Height</label>
            <input type="number" name="dimensions.height" id="dimensions_height" 
                   on:focus={ensureDimensions}
                   bind:value={dimensions.height} min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions_unit">Unit</label>
            <select name="dimensions_unit" id="dimensions_unit" bind:value={dimensionsUnit}>
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
          <input type="number" name="weight_value" id="weight_value" bind:value={formData.weight_value} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="weight_unit">Weight Unit</label>
          <select name="weight_unit" id="weight_unit" bind:value={formData.weight_unit}>
            <option value="">Select unit (optional)</option>
            {#each options.weightUnits as weightUnit}
              <option value={weightUnit} selected={formData.weight_unit === weightUnit}>{weightUnit}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="package_type">Package Type</label>
          <select name="package_type" id="package_type" bind:value={formData.package_type}>
            <option value="">Select packaging (optional)</option>
            {#each options.packageTypes as packageType}
              <option value={packageType} selected={formData.package_type === packageType}>{packageType}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="pin_count">Pin Count</label>
          <input type="number" name="pin_count" id="pin_count" bind:value={formData.pin_count} min="0" step="1">
        </div>
      </div>

      <div class="form-group">
        <label for="mechanical_properties">Additional Mechanical Properties (JSON)</label>
        <textarea name="mechanical_properties" id="mechanical_properties" 
                  value={jsonEditors.mechanicalProperties || '{}'}
                  on:input={(e) => onJsonEditorChange('mechanicalProperties', e.currentTarget.value)} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format, e.g. {`{"tensile_strength": "500 MPa"}`}</p>
      </div>

      <div class="form-group">
        <label for="material_composition">Material Composition (JSON)</label>
        <textarea name="material_composition" id="material_composition" 
                  value={jsonEditors.materialComposition || '{}'}
                  on:input={(e) => onJsonEditorChange('materialComposition', e.currentTarget.value)} rows="5"></textarea>
        <p class="hint">Enter material details in JSON format, e.g. {`{"metals": ["copper", "gold"]}`}</p>
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
                  bind:value={formData.operating_temperature_min} step="any">
        </div>

        <div class="form-group">
          <label for="operating_temperature_max">Max Operating Temperature</label>
          <input type="number" name="operating_temperature_max" id="operating_temperature_max" 
                  bind:value={formData.operating_temperature_max} step="any">
        </div>

        <div class="form-group">
          <label for="storage_temperature_min">Min Storage Temperature</label>
          <input type="number" name="storage_temperature_min" id="storage_temperature_min" 
                  bind:value={formData.storage_temperature_min} step="any">
        </div>

        <div class="form-group">
          <label for="storage_temperature_max">Max Storage Temperature</label>
          <input type="number" name="storage_temperature_max" id="storage_temperature_max" 
                  bind:value={formData.storage_temperature_max} step="any">
        </div>

        <div class="form-group">
          <label for="temperature_unit">Temperature Unit</label>
          <select name="temperature_unit" id="temperature_unit" bind:value={formData.temperature_unit}>
            <option value="">Select unit (optional)</option>
            {#each options.temperatureUnits as tempUnit}
              <option value={tempUnit} selected={formData.temperature_unit === tempUnit}>{tempUnit}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="thermal_properties">Additional Thermal Properties (JSON)</label>
        <textarea name="thermal_properties" id="thermal_properties" 
                  value={jsonEditors.thermalProperties || '{}'}
                  on:input={(e) => onJsonEditorChange('thermalProperties', e.currentTarget.value)} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format, e.g. {`{"thermal_conductivity": "2.5 W/mK"}`}</p>
      </div>
    </div>
  </div>
  
  <!-- Relationships -->
  <div class="form-section {activeSection === 'relationships' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('relationships')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('relationships')}>
      <h2>Categories & Manufacturers</h2>
      <span class="toggle-icon">{activeSection === 'relationships' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'relationships' || activeSection === 'all'}>
      <div class="form-group">
        <label for="part-categories">Part Categories</label>
        <MultiCategorySelector 
          id="part-categories" 
          {categories} 
          bind:selectedCategoryIds 
          name="category_ids" 
          required={false} 
        />
        {#if isEditMode}
          <div class="debug-info">
            <small>Selected categories: {Array.isArray(selectedCategoryIds) ? selectedCategoryIds.length : 0}</small>
          </div>
        {/if}
      </div>
      <div class="form-group">
        <label for="manufacturers">Manufacturers</label>
        <ManufacturerSelector 
          manufacturers={manufacturers} 
          bind:selectedManufacturerParts 
        />
        {#if isEditMode}
          <div class="debug-info">
            <small>Selected manufacturer parts: {Array.isArray(selectedManufacturerParts) ? selectedManufacturerParts.length : 0}</small>
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
                    value={jsonEditors.properties || '{}'} 
                    on:input={(e) => onJsonEditorChange('properties', e.currentTarget.value)} rows="5"></textarea>
          <p class="hint">Enter properties in JSON format, e.g. {`{"property": "value"}`}</p>
          {#if errors && errors.properties}<span class="error">{errors.properties}</span>{/if}
        </div>
        
        <div class="form-group">
          <label for="environmental_data">Environmental Data (JSON)</label>
          <textarea name="environmental_data" id="environmental_data" 
                    value={jsonEditors.environmentalData || '{}'}
                    on:input={(e) => onJsonEditorChange('environmentalData', e.currentTarget.value)} rows="5"></textarea>
          <p class="hint">Enter environmental data in JSON format, e.g. {`{"RoHS_compliant": true}`}</p>
          {#if errors && errors.environmental_data}<span class="error">{errors.environmental_data}</span>{/if}
        </div>
  
        <div class="form-group">
          <label for="revision_notes">Revision Notes</label>
          <textarea name="revision_notes" id="revision_notes" 
                   bind:value={formData.revision_notes} rows="3"></textarea>
        </div>
      </div>
    </div>

  {#if !hideButtons && !isDashboardContext}
    <div class="form-actions">
      <button type="submit" class="btn-primary">{isEditMode ? 'Update Part' : 'Create Part'}</button>
      {#if isEditMode}
        <button type="button" class="btn-secondary" on:click={() => history.back()}>Cancel</button>
      {/if}
    </div>
  {/if}
</form>

<style>
  .part-form {
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
  
  input, select, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid hsl(var(--input-border));
    border-radius: 4px;
    font-size: 1rem;
    background-color: hsl(var(--input));
    color: hsl(var(--input-foreground));
    transition: border-color 0.15s, background-color 0.3s, color 0.3s, box-shadow 0.15s;
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
  
  /* Add field hints like this if needed in the future
  .hint {
    font-size: 0.8rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.25rem;
    transition: color 0.3s;
  }
  
  :global(.dark) .hint {
    color: hsl(var(--muted-foreground) / 0.9);
  }
  */
  
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