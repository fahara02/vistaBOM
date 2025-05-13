<!-- src/lib/components/PartForm.svelte -->

<script lang="ts">
  import { tick } from 'svelte';
  import { PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, LifecycleStatusEnum, PartStatusEnum } from '$lib/types';
  import type { SuperForm } from 'sveltekit-superforms';
  import type { SuperFormData } from 'sveltekit-superforms/client';
  import type { ValidationErrors } from 'sveltekit-superforms';
  import type { z } from 'zod';
  import type { createPartSchema } from '$lib/server/db/schema';
  import MultiCategorySelector from './MultiCategorySelector.svelte';
 
  import ManufacturerSelector from './ManufacturerSelector.svelte';

  // Define a type for the form data
  interface FormData {
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

  // Define proper type for dimensions to avoid TypeScript errors
  interface Dimensions {
    length: number | null;
    width: number | null;
    height: number | null;
    [key: string]: number | null | undefined;
  }

  // Helper function to convert string/number to number or null if invalid
  function parseFloatOrNull(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? null : parsed;
  }

  // Define a snake_case version of the schema to handle both naming conventions
  type SnakeCasePartSchema = {
    name: string;
    version: string;
    status: LifecycleStatusEnum;
    part_status: PartStatusEnum;
    properties?: unknown;
    short_description?: string | null;
    long_description?: unknown;
    functional_description?: string | null;
    technical_specifications?: unknown;
    voltage_rating_min?: number | null;
    voltage_rating_max?: number | null;
    current_rating_min?: number | null;
    current_rating_max?: number | null;
    power_rating_max?: number | null;
    tolerance?: number | null;
    tolerance_unit?: string | null;
    dimensions?: Dimensions | null;
    dimensions_unit?: string | null;
    weight?: number | null;
    weight_unit?: string | null;
    package_type?: string | null;
    pin_count?: number | null;
    operating_temperature_min?: number | null;
    operating_temperature_max?: number | null;
    storage_temperature_min?: number | null;
    storage_temperature_max?: number | null;
    temperature_unit?: string | null;
    revision_notes?: string | null;
  };

  // Combine both schema versions into a flexible type
  type FlexiblePartSchema = z.infer<typeof createPartSchema> | SnakeCasePartSchema;

  export let form: SuperForm<FlexiblePartSchema> | SuperFormData<FlexiblePartSchema> | FormData;
  // Accept any error type - can be Record<string, string[]>, ValidationErrors, or SuperFormErrors
  // Since SuperFormErrors has a subscribe method and additional properties
  export let errors: any = null;

  // Helper function to extract the data from form (regardless of form type)
  function getData(form: SuperForm<FlexiblePartSchema> | SuperFormData<FlexiblePartSchema> | FormData): Record<string, unknown> {
    let data;
    
    if ('form' in form) {
      // It's a SuperForm or SuperFormData
      data = form.form;
    } else {
      // It's a FormData object
      data = form;
    }
    
    // Handle field name mismatches (snake_case vs camelCase)
    // Normalize the data format to work with either version of property names
    const normalizedData = { ...data };
    
    // Handle part_status vs partStatus mismatch
    if ('part_status' in normalizedData && !('partStatus' in normalizedData)) {
      normalizedData.partStatus = normalizedData.part_status;
    } else if ('partStatus' in normalizedData && !('part_status' in normalizedData)) {
      normalizedData.part_status = normalizedData.partStatus;
    }
    
    return normalizedData as Record<string, unknown>;
  }

  // Helper function to safely update a field in the form
  function updateField(fieldName: string, value: any): void {
    const formData = getData(form);
    if (formData) {
      formData[fieldName] = value;
    }
  }

  export let statuses: string[];
  export let isEditMode = false;
  export let enhance: (node: HTMLFormElement) => { destroy: () => void };
  // Provide default empty arrays to avoid potential issues
  export let packageTypes: string[] = [];
  export let weightUnits: string[] = [];
  export let dimensionUnits: string[] = [];
  // Category and manufacturer data for relationship management
  export let categories: any[] = [];
  export let manufacturers: any[] = [];
  export let hideButtons: boolean = false;
  export let selectedCategoryIds: string[] = [];
  export let selectedManufacturerParts: any[] = [];
  // Whether this form is embedded in another component
  export let isEmbedded: boolean = false;

  // No longer needed - using enum values directly in the component

  // Accordion state management
  let activeSection = 'basic';
  const toggleSection = (section: string) => {
    activeSection = activeSection === section ? '' : section;
  };

  // Initialize form fields on component mount to prevent null references
  import { onMount } from 'svelte';

  // Create reactive variables for form data binding
  $: formData = getData(form);
  
  // Create reactive variables for dimensions to avoid binding issues
  $: dimensions = formData?.dimensions ? formData.dimensions as Dimensions : { length: null, width: null, height: null } as Dimensions;
  $: dimensionsUnit = formData?.dimensions_unit || '';
  
  // Ensure dimensions object is properly initialized for form manipulation
  function ensureDimensions() {
    const formData = getData(form);
    if (!formData.dimensions) {
      formData.dimensions = { length: null, width: null, height: null } as Dimensions;
    } else if (typeof formData.dimensions === 'object') {
      // Make sure all properties exist by casting to the proper type
      const dims = formData.dimensions as Dimensions;
      if (dims.length === undefined || dims.length === null) dims.length = null;
      if (dims.width === undefined || dims.width === null) dims.width = null;
      if (dims.height === undefined || dims.height === null) dims.height = null;
    } else {
      // If dimensions is not an object, initialize it properly
      console.warn('Dimensions was not an object, resetting to empty object');
      formData.dimensions = { length: null, width: null, height: null } as Dimensions;
    }
  }
  
  // Update main form data when dimensions change
  $: if (formData) {
    formData.dimensions = dimensions;
    formData.dimensions_unit = dimensionsUnit;
  }

  onMount(() => {
    // Initialize all JSON fields to empty objects if null
    // Ensure we're using the correct field names from the database schema
    const formData = getData(form);
    if (formData) {
      if (!formData.technical_specifications) formData.technical_specifications = {};
      if (!formData.properties) formData.properties = {};
      if (!formData.electrical_properties) formData.electrical_properties = {};
      if (!formData.mechanical_properties) formData.mechanical_properties = {};
      if (!formData.thermal_properties) formData.thermal_properties = {};
      if (!formData.material_composition) formData.material_composition = {};
      if (!formData.environmental_data) formData.environmental_data = {};
      if (!formData.long_description) formData.long_description = {};

      // Initialize and validate dimensions using the existing ensureDimensions function
      ensureDimensions();
      
      // Double-check dimensions is properly initialized after ensureDimensions
      if (!formData.dimensions || typeof formData.dimensions !== 'object') {
        formData.dimensions = { length: null, width: null, height: null } as Dimensions;
      }

      console.log('Form initialization: verified dimension properties exist', formData.dimensions);
    
      // Initialize JSON editors with stringified values for easier editing
      jsonEditors = {
        technicalSpecs: jsonToString(formData.technical_specifications),
        properties: jsonToString(formData.properties),
        electricalProperties: jsonToString(formData.electrical_properties),
        mechanicalProperties: jsonToString(formData.mechanical_properties),
        thermalProperties: jsonToString(formData.thermal_properties),
        materialComposition: jsonToString(formData.material_composition),
        environmentalData: jsonToString(formData.environmental_data),
        longDescription: jsonToString(formData.long_description)
      };

      // Initialize category and manufacturer relationships if in edit mode
      if (isEditMode) {
        try {
          // Initialize manufacturer parts from existing data if available
          if (formData.manufacturer_parts && typeof formData.manufacturer_parts === 'string') {
            const parsedManufacturerParts = JSON.parse(formData.manufacturer_parts);
            selectedManufacturerParts = Array.isArray(parsedManufacturerParts) ? parsedManufacturerParts : [];
            console.log('Initialized manufacturer parts:', selectedManufacturerParts);
          }
          
          // Initialize category IDs from existing data if available
          if (formData.category_ids && typeof formData.category_ids === 'string') {
            selectedCategoryIds = formData.category_ids.split(',').filter((id: string) => id.trim() !== '');
            console.log('Initialized category IDs:', selectedCategoryIds);
          }
        } catch (error) {
          console.error('Error initializing relationship data:', error);
        }
      }

      // Log all form fields to ensure everything is being sent
      console.log('🔄 PartForm INITIALIZED WITH ALL FIELDS:', {
        // Basic part info
        id: formData.id,
        part_id: formData.part_id,
        name: formData.name,
        version: formData.version,
        status: formData.status,
        part_status: formData.part_status,
        
        // Description fields
        short_description: formData.short_description,
        functional_description: formData.functional_description,
        long_description: formData.long_description,
        
        // Physical properties
        dimensions: {
          length: parseFloatOrNull(dimensions.length),
          width: parseFloatOrNull(dimensions.width),
          height: parseFloatOrNull(dimensions.height)
        } as Dimensions,
        dimensions_unit: formData.dimensions_unit,
        weight: formData.weight,
        weight_unit: formData.weight_unit,
        
        // Electrical properties
        voltage_rating_min: formData.voltage_rating_min,
        voltage_rating_max: formData.voltage_rating_max,
        current_rating_min: formData.current_rating_min,
        current_rating_max: formData.current_rating_max,
        power_rating_max: formData.power_rating_max,
        tolerance: formData.tolerance,
        tolerance_unit: formData.tolerance_unit,
        electrical_properties: formData.electrical_properties,
        
        // Thermal properties
        operating_temperature_min: formData.operating_temperature_min,
        operating_temperature_max: formData.operating_temperature_max,
        storage_temperature_min: formData.storage_temperature_min,
        storage_temperature_max: formData.storage_temperature_max,
        temperature_unit: formData.temperature_unit,
        thermal_properties: formData.thermal_properties,
        
        // Mechanical properties
        package_type: formData.package_type,
        pin_count: formData.pin_count,
        mechanical_properties: formData.mechanical_properties,
        material_composition: formData.material_composition,
        
        // Other properties
        technical_specifications: formData.technical_specifications,
        properties: formData.properties,
        environmental_data: formData.environmental_data,
      });
    }
  });

  // Handle JSON fields
  function updateJsonField(editorFieldName: string, jsonString: string) {
    const formData = getData(form);
    if (!formData) return;

    // Map editor field names to database field names
    const fieldMap: Record<string, string> = {
      technicalSpecs: 'technical_specifications',
      properties: 'properties',
      electricalProperties: 'electrical_properties',
      mechanicalProperties: 'mechanical_properties',
      thermalProperties: 'thermal_properties',
      materialComposition: 'material_composition',
      environmentalData: 'environmental_data',
      longDescription: 'long_description'
    };

    // Get the corresponding form field name
    const formField = fieldMap[editorFieldName];

    if (!formField) {
      console.error(`No matching form field for editor field: ${editorFieldName}`);
      return;
    }

    try {
      // Parse the JSON string into an object, or use the original if parsing fails
      let jsonValue = jsonString;

      try {
        // Only parse if it's a valid JSON string
        if (jsonString.trim().startsWith('{') || jsonString.trim().startsWith('[')) {
          jsonValue = JSON.parse(jsonString);
        }
      } catch (e) {
        console.warn(`Could not parse JSON for ${formField}, using as plain text:`, e);
      }

      // Update the form field with the parsed value
      formData[formField] = jsonValue;

      // Log the update for debugging
      console.log(`Updated form field ${formField} with value:`, jsonValue);
    } catch (error) {
      console.error(`Error updating ${formField}:`, error);
    }
  }

  // Handle form submission
  function handleSubmit() {
    // First, update all JSON fields one last time before submission
    if (jsonEditors.technicalSpecs) updateJsonField('technicalSpecs', jsonEditors.technicalSpecs);
    if (jsonEditors.properties) updateJsonField('properties', jsonEditors.properties);
    if (jsonEditors.electricalProperties) updateJsonField('electricalProperties', jsonEditors.electricalProperties);
    if (jsonEditors.mechanicalProperties) updateJsonField('mechanicalProperties', jsonEditors.mechanicalProperties);
    if (jsonEditors.thermalProperties) updateJsonField('thermalProperties', jsonEditors.thermalProperties);
    if (jsonEditors.materialComposition) updateJsonField('materialComposition', jsonEditors.materialComposition);
    if (jsonEditors.environmentalData) updateJsonField('environmentalData', jsonEditors.environmentalData);
    if (jsonEditors.longDescription) updateJsonField('longDescription', jsonEditors.longDescription);
    
    // Make sure dimensions is properly set
    ensureDimensions();
    
    // Add relationship data
    const formData = getData(form);
    if (formData) {
      formData.category_ids = selectedCategoryIds.join(',');
      formData.manufacturer_parts = JSON.stringify(selectedManufacturerParts);
    }
    
    // Comprehensive logging of ALL fields before submission
    console.log('📤 SUBMITTING COMPLETE FORM DATA:', formData);
    
    // Also convert to flat format for easier debugging
    const fieldKeys = formData ? Object.keys(formData) : [];
    console.log(`📋 FORM CONTAINS ${fieldKeys.length} FIELDS:`, fieldKeys);
  }

  // Convert JSON to editable string
  function jsonToString(json: any): string {
    if (!json) return '';
    return typeof json === 'string' ? json : JSON.stringify(json, null, 2);
  }

  // Track state of JSON editor fields - match the database field names
  let jsonEditors = {
    technicalSpecs: '',
    properties: '',
    electricalProperties: '',
    mechanicalProperties: '',
    thermalProperties: '',
    materialComposition: '',
    environmentalData: '',
    longDescription: ''
  };

  // Log all form data changes for debugging
  $: {
    console.log('🔄 FORM DATA UPDATED:', form);

    // Log specific information about dimensions for debugging
    const formData = getData(form);
    if (formData && formData.dimensions && typeof formData.dimensions === 'object') {
      // Cast dimensions to proper type
      const dims = formData.dimensions as Dimensions;
      console.log('DIMENSIONS STATE:', {
        type: typeof dims,
        value: dims,
        lengthType: typeof dims.length,
        lengthValue: dims.length,
        widthType: typeof dims.width,
        widthValue: dims.width,
        heightType: typeof dims.height,
        heightValue: dims.height
      });
    }
  }

  // Update the form when JSON fields change
  $: if (form) {
    const formData = getData(form);
    if (formData) {
      // Ensure JSON editors map to correct database field names
      updateJsonField('technicalSpecs', jsonEditors.technicalSpecs); // technical_specifications
      updateJsonField('properties', jsonEditors.properties); // properties
      updateJsonField('electricalProperties', jsonEditors.electricalProperties); // electrical_properties
      updateJsonField('mechanicalProperties', jsonEditors.mechanicalProperties); // mechanical_properties
      updateJsonField('thermalProperties', jsonEditors.thermalProperties); // thermal_properties
      updateJsonField('materialComposition', jsonEditors.materialComposition); // material_composition
      updateJsonField('environmentalData', jsonEditors.environmentalData); // environmental_data
      updateJsonField('longDescription', jsonEditors.longDescription); // long_description
    }
  }
</script>

<form method="POST" use:enhance on:submit={handleSubmit} class="part-form">
  <!-- Basic Information Section -->
  <div class="form-section {activeSection === 'basic' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('basic')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('basic')}>
      <h2>Basic Information</h2>
      <span class="toggle-icon">{activeSection === 'basic' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'basic'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="name">Name</label>
          <input name="name" id="name" bind:value={formData.name} required>
          {#if errors && errors.name}<span class="error">{errors.name}</span>{/if}
        </div>

        <div class="form-group">
          <label for="version">Version</label>
          <input name="version" id="version" bind:value={formData.version} required 
                pattern="\d+\.\d+\.\d+" title="Format: x.y.z (e.g., 1.0.0)">
          {#if errors && errors.version}<span class="error">{errors.version}</span>{/if}
        </div>

        <div class="form-group">
          <label for="status">Lifecycle Status</label>
          <select name="status" id="status" bind:value={formData.status} required>
            {#each statuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          {#if errors && errors.status}<span class="error">{errors.status}</span>{/if}
        </div>

        <div class="form-group">
          <label for="partStatus">Part Status</label>
          <select name="partStatus" id="partStatus" bind:value={formData.part_status}>
            <option value={PartStatusEnum.CONCEPT}>Concept</option>
            <option value={PartStatusEnum.ACTIVE}>Active</option>
            <option value={PartStatusEnum.OBSOLETE}>Obsolete</option>
            <option value={PartStatusEnum.ARCHIVED}>Archived</option>
          </select>
          {#if errors && errors.partStatus}<span class="error">{errors.partStatus}</span>{/if}
        </div>

        <!-- is_public field belongs to Part, not PartVersion -->
      </div>

      <div class="form-group">
        <label for="short_description">Short Description</label>
        <input name="short_description" id="short_description" bind:value={formData.short_description}>
        {#if errors && errors.short_description}<span class="error">{errors.short_description}</span>{/if}
      </div>

      <div class="form-group">
        <label for="functional_description">Functional Description</label>
        <textarea name="functional_description" id="functional_description" 
                  bind:value={formData.functional_description} rows="3"></textarea>
        {#if errors && errors.functional_description}<span class="error">{errors.functional_description}</span>{/if}
      </div>
    </div>
  </div>

  <!-- Electrical Properties Section -->
  <div class="form-section {activeSection === 'electrical' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('electrical')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('electrical')}>
      <h2>Electrical Properties</h2>
      <span class="toggle-icon">{activeSection === 'electrical' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'electrical'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="voltageRatingMin">Min Voltage Rating (V)</label>
          <input type="number" name="voltageRatingMin" id="voltageRatingMin" 
                 bind:value={formData.voltage_rating_min} step="any">
        </div>

        <div class="form-group">
          <label for="voltageRatingMax">Max Voltage Rating (V)</label>
          <input type="number" name="voltageRatingMax" id="voltageRatingMax" 
                 bind:value={formData.voltage_rating_max} step="any">
        </div>

        <div class="form-group">
          <label for="currentRatingMin">Min Current Rating (A)</label>
          <input type="number" name="currentRatingMin" id="currentRatingMin" 
                 bind:value={formData.current_rating_min} step="any">
        </div>

        <div class="form-group">
          <label for="currentRatingMax">Max Current Rating (A)</label>
          <input type="number" name="currentRatingMax" id="currentRatingMax" 
                 bind:value={formData.current_rating_max} step="any">
        </div>

        <div class="form-group">
          <label for="powerRatingMax">Max Power Rating (W)</label>
          <input type="number" name="powerRatingMax" id="powerRatingMax" 
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
                  bind:value={jsonEditors.electricalProperties} rows="5"></textarea>
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
    <div class="section-content" class:visible={activeSection === 'mechanical'}>
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
              <option value="">Select...</option>
              {#each dimensionUnits as unit}
                <option value={unit}>{unit}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="weight">Weight</label>
          <input type="number" name="weight" id="weight" bind:value={formData.weight} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="weight_unit">Weight Unit</label>
          <select name="weight_unit" id="weight_unit" bind:value={formData.weight_unit}>
            <option value="">Select...</option>
            {#each weightUnits as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="package_type">Package Type</label>
          <select name="package_type" id="package_type" bind:value={formData.package_type}>
            <option value="">Select...</option>
            {#each packageTypes as type}
              <option value={type}>{type}</option>
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
                  bind:value={jsonEditors.mechanicalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format</p>
      </div>

      <div class="form-group">
        <label for="material_composition">Material Composition (JSON)</label>
        <textarea name="material_composition" id="material_composition" 
                  bind:value={jsonEditors.materialComposition} rows="5"></textarea>
        <p class="hint">Enter material details in JSON format</p>
      </div>
    </div>
  </div>

  <!-- Thermal Properties Section -->
  <div class="form-section {activeSection === 'thermal' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('thermal')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('thermal')}>
      <h2>Thermal Properties</h2>
      <span class="toggle-icon">{activeSection === 'thermal' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'thermal'}>
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
      </div>
      
      <div class="form-group">
        <label for="thermal_properties">Additional Thermal Properties (JSON)</label>
        <textarea name="thermal_properties" id="thermal_properties" 
                  bind:value={jsonEditors.thermalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format</p>
      </div>
    </div>
  </div>

  <!-- Relationships Section -->
  <div class="form-section {activeSection === 'relationships' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('relationships')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('relationships')}>
      <h2>Categories & Manufacturers</h2>
      <span class="toggle-icon">{activeSection === 'relationships' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'relationships'}>
      <!-- Categories Section -->
      <div class="form-group">
        <label for="part-categories">Part Categories</label>
        <MultiCategorySelector
          id="part-categories"
          {categories}
          bind:selectedCategoryIds={selectedCategoryIds}
          placeholder="Select categories for this part..."
          name="category_ids"
          width="w-full"
        />
        <p class="hint">Select one or more categories for this part</p>
      </div>
      
      <!-- Manufacturers Section -->
      <div class="form-group">
        <ManufacturerSelector
          {manufacturers}
          bind:selectedManufacturerParts={selectedManufacturerParts}
          width="w-full"
        />
        <p class="hint">Add manufacturer-specific part numbers and datasheets</p>
      </div>
    </div>
  </div>

  <!-- Additional Properties Section -->
  <div class="form-section {activeSection === 'additional' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('additional')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('additional')}>
      <h2>Additional Properties</h2>
      <span class="toggle-icon">{activeSection === 'additional' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'additional'}>
      <div class="form-group">
        <label for="properties">Generic Properties (JSON)</label>
        <textarea name="properties" id="properties" 
                  bind:value={jsonEditors.properties} rows="5"></textarea>
        <p class="hint">Enter additional properties in JSON format</p>
        {#if errors && errors.properties}<span class="error">{errors.properties}</span>{/if}
      </div>
      
      <div class="form-group">
        <label for="environmental_data">Environmental Data (JSON)</label>
        <textarea name="environmental_data" id="environmental_data" 
                  bind:value={jsonEditors.environmentalData} rows="5"></textarea>
        <p class="hint">Enter environmental data in JSON format</p>
        {#if errors && errors.environmental_data}<span class="error">{errors.environmental_data}</span>{/if}
      </div>

      <div class="form-group">
        <label for="revision_notes">Revision Notes</label>
        <textarea name="revision_notes" id="revision_notes" 
                 bind:value={formData.revision_notes} rows="3"></textarea>
      </div>
    </div>
  </div>

  {#if !isEmbedded && !hideButtons}
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
    transition: border-color 0.3s, box-shadow 0.3s;
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
  
  .visible {
    display: block;
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
  
  .hint {
    font-size: 0.8rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.25rem;
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
</style>