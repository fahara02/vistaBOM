<!-- src/lib/components/PartForm.svelte -->

<script lang="ts">
import type { categorySchema, createPartSchema, manufacturerSchema } from '$lib/server/db/schema';
import { DimensionUnitEnum, LifecycleStatusEnum, PackageTypeEnum, PartStatusEnum, TemperatureUnitEnum, WeightUnitEnum, type Dimensions } from '@/types/types';
import { onMount } from 'svelte';
import type { SuperForm } from 'sveltekit-superforms';
import type { SuperFormData } from 'sveltekit-superforms/client';
import type { z } from 'zod';
import ManufacturerSelector from './ManufacturerSelector.svelte';
import MultiCategorySelector from './MultiCategorySelector.svelte';


//DECLARATION OF TYPES 
type SnakeCasePartSchema = z.infer<typeof createPartSchema>;
// Define Category and Manufacturer types based on schema
type Category = z.infer<typeof categorySchema>;
// Update Manufacturer type to match schema
type partManufacturer = z.infer<typeof manufacturerSchema> ;
// Updated type based on new schema
type PartsFormData = SnakeCasePartSchema & {
  id?: string;
  category_ids?: string;
  manufacturer_parts?: string;
  dimensions?: Dimensions | null;
};   
 
type FlexiblePartSchema = z.infer<typeof createPartSchema> | SnakeCasePartSchema|PartsFormData;


//REACTIVE DATAS
export let form: FlexiblePartSchema | SuperForm<FlexiblePartSchema> | SuperFormData<FlexiblePartSchema>;
export let errors: any = null;
export const options = {
  statuses: Object.values(LifecycleStatusEnum),
  packageTypes: Object.values(PackageTypeEnum),
  weightUnits: Object.values(WeightUnitEnum),
  dimensionUnits: Object.values(DimensionUnitEnum),
  partStatuses: Object.values(PartStatusEnum),
  temperatureUnits: Object.values(TemperatureUnitEnum)
}; 
export let partData: Partial<z.infer<typeof createPartSchema>> | undefined = undefined;
export let versionData: Partial<z.infer<typeof createPartSchema>> | undefined = undefined
export let categories: Category[] = [];
export let manufacturers: partManufacturer[] = [];
export let selectedCategoryIds: string[] = [];
export let selectedManufacturerParts: any[] = [];
export let isEditMode: boolean = false;
export let hideButtons: boolean = false;
export let isEmbedded: boolean = false; 
export let isFormInitialized: boolean = false;
  // Used by the parent component - converting to const as recommended by linter
export const enhance: ((node: HTMLFormElement) => { destroy: () => void }) | null = null;
  // Reactive dimensions
let dimensions: Dimensions = { length: null, width: null, height: null };
let dimensionsUnit: DimensionUnitEnum | null = null;
let activeSection = 'basic';

  
  // Initialize JSON editors with empty objects
  let jsonEditors = {
    technicalSpecs: '{}',
    properties: '{}',
    electricalProperties: '{}',
    mechanicalProperties: '{}',
    thermalProperties: '{}',
    materialComposition: '{}',
    environmentalData: '{}',
    longDescription: '{}'
  };


   // Reactive form data initialized with schema defaults
  let formData: Partial<z.infer<typeof createPartSchema>> = {
    name: '',
    version: '0.1.0',
    lifecycle_status: LifecycleStatusEnum.DRAFT,
    part_status: PartStatusEnum.CONCEPT,
    short_description: '',
    functional_description: '',
    revision_notes: '',
    dimensions: null,
    dimensions_unit: null,
    temperature_unit: null,
    weight_unit: null,
    tolerance_unit: null,
    operating_temperature_min: null,
    operating_temperature_max: null,
    storage_temperature_min: null,
    storage_temperature_max: null,
    voltage_rating_min: null,
    voltage_rating_max: null,
    current_rating_min: null,
    current_rating_max: null,
    power_rating_max: null,
    tolerance: null,
    weight: null,
    package_type: null,
    pin_count: null,
    technical_specifications: {},
    properties: {},
    electrical_properties: {},
    mechanical_properties: {},
    thermal_properties: {},
    material_composition: {},
    environmental_data: {},
    long_description: {}
  };
//HELPER FUNCTIONS 
  // Helper function to extract the data from form (regardless of form type)
  function getData(formInput: typeof form): Record<string, any> {
    if (!form) return {};
    
    let data: Record<string, any> = {};
    
    // Handle various form types that may be passed
    if ('subscribe' in form) {
      // It's a Svelte store (likely from SuperForm)
      try {
        // Access the current value using subscribe
        const formStore = form as { subscribe: Function };
        let storeValue: Record<string, any> | null = null;
        const unsubscribe = formStore.subscribe((value: Record<string, any>) => {
          storeValue = value;
        });
        unsubscribe();
        data = storeValue ? Object.assign({}, storeValue) : {};
      } catch (e) {
        console.error('Error accessing form store:', e);
      }
    } else if ('form' in form) {
      // It's a SuperForm instance with a form property
      const formObj = form.form as Record<string, any>;
      data = Object.assign({}, formObj);
    } else {
      // It's a direct data object
      data = Object.assign({}, form as Record<string, any>);
    }
     return data; // 

  }
  // Update form data non-reactively
function updateFormData(fieldName: string, value: any): void {
    const target = 'form' in form ? (form.form as any) : (form as any);
    target[fieldName] = value;
} 

 

  // Handle JSON editor changes
  function onJsonEditorChange(editorName: string, value: string) {
    jsonEditors[editorName as keyof typeof jsonEditors] = value;
  }

   // Convert JSON to editable string safely with better error handling
  function jsonToString(json: any): string {
    if (!json) return '';
    try {
      if (typeof json === 'string') {
        // Try to parse the string as JSON
        try {
          const parsed = JSON.parse(json);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Not valid JSON, return the string as is
          return json;
        }
      } else {
        return JSON.stringify(json, null, 2);
      }
    } catch (error) {
      console.error('Error converting JSON to string:', error);
      return '';
      return '{}'; 
    }
  }

  function isCompleteDimensions(dims: Dimensions): dims is { length: number; width: number; height: number } {
    return dims.length != null && dims.width != null && dims.height != null;
  }


//REACTIVITY
    // Sync dimensions

   // Update these values when formData changes
  $: {
    if (formData) {
      // Handle dimensions safely - parse if string, use directly if object
      if (formData.dimensions) {
        if (typeof formData.dimensions === 'string') {
          try {
            dimensions = JSON.parse(formData.dimensions) as Dimensions;
          } catch (e) {
            dimensions = { length: null, width: null, height: null };
            console.warn('Failed to parse dimensions from string:', e);
          }
        } else {
          dimensions = formData.dimensions as Dimensions;
        }
      }
      
      // Set dimension unit
      dimensionsUnit = formData.dimensions_unit || null;
    }
  }
    $: if (formData) {
    
    formData.dimensions_unit = dimensionsUnit;
  }

  // No longer needed - using enum values directly in the component


  const toggleSection = (section: string) => {
    activeSection = activeSection === section ? '' : section;
  };

  
  // Prepare form submission
 function prepareFormSubmission(): Record<string, any> {
    const extractedFormData: Record<string, any> = { ...getData(form), ...formData };
    const domInputs = document.querySelectorAll('input, select, textarea');
    domInputs.forEach((el) => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (input.name) extractedFormData[input.name] = input.value;
    });

    const jsonFieldMap: Record<string, string> = { /* ... */ };
    Object.entries(jsonFieldMap).forEach(([editor, field]) => {
      extractedFormData[field] = JSON.parse(jsonEditors[editor as keyof typeof jsonEditors] || '{}');
    });

    if (isCompleteDimensions(dimensions)) {
      extractedFormData.dimensions = dimensions;
    } else {
      extractedFormData.dimensions = null;
    }
    extractedFormData.category_ids = selectedCategoryIds.join(',');
    extractedFormData.manufacturer_parts = JSON.stringify(selectedManufacturerParts);

    return extractedFormData;
  }

 // Initialize form on mount
  onMount(() => {
    const currentFormData = getData(form);
    if (!isFormInitialized || !currentFormData.name) {
      isFormInitialized = false;
    }

    if (!isFormInitialized && Object.keys(currentFormData).length > 0) {
      formData = { ...formData, ...currentFormData };
      dimensions = formData.dimensions || { length: null, width: null, height: null };
      dimensionsUnit = formData.dimensions_unit || null;

      const jsonFields: (keyof z.infer<typeof createPartSchema>)[] = [
        'technical_specifications',
        'properties',
        'electrical_properties',
        'mechanical_properties',
        'thermal_properties',
        'material_composition',
        'environmental_data',
        'long_description'
      ];
      jsonFields.forEach((field) => {
         const key = field as keyof typeof formData;
         const value = currentFormData[key] || {};
        formData[key] = typeof value === 'string' ? JSON.parse(value) || {} : value;
        const editorKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        jsonEditors[editorKey as keyof typeof jsonEditors] = JSON.stringify(formData[key], null, 2);
      });

     if (isEditMode && partData && versionData) {
      if (partData && 'part_status' in partData) {
        formData.part_status = partData.part_status as PartStatusEnum;
      } else {
        formData.part_status = PartStatusEnum.CONCEPT;
      }
      if (versionData && 'category_ids' in versionData) {
        selectedCategoryIds = String(versionData.category_ids).split(',');
      } else {
        selectedCategoryIds = [];
      }
      if (versionData && 'manufacturer_parts' in versionData) {
        selectedManufacturerParts = JSON.parse(String(versionData.manufacturer_parts));
      } else {
        selectedManufacturerParts = [];
      }
    }

      isFormInitialized = true;
    }
  });


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

  

</script>

<div class="part-form">
  <!-- Hidden inputs -->
  <input type="hidden" name="name" value={formData.name || ''} />
  <input type="hidden" name="version" value={formData.version || '0.1.0'} />
  <input type="hidden" name="lifecycle_status" value={formData.lifecycle_status || LifecycleStatusEnum.DRAFT} />
  <input type="hidden" name="part_status" value={formData.part_status || PartStatusEnum.CONCEPT} />

  <!-- Basic Information -->
  <div class="form-section {activeSection === 'basic' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('basic')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('basic')}>
      <h2>Basic Information</h2>
      <span class="toggle-icon">{activeSection === 'basic' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'basic'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="name">Name</label>
          <input name="name" id="name" bind:value={formData.name} required />
          {#if errors?.name}<span class="error">{errors.name}</span>{/if}
        </div>
        <div class="form-group">
          <label for="version">Version</label>
          <input name="version" id="version" bind:value={formData.version} required pattern="\d+\.\d+\.\d+" />
          {#if errors?.version}<span class="error">{errors.version}</span>{/if}
        </div>
        <div class="form-group">
          <label for="lifecycle_status">Lifecycle Status</label>
          <select name="lifecycle_status" id="lifecycle_status" bind:value={formData.lifecycle_status} required>
            {#each options.statuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          {#if errors?.lifecycle_status}<span class="error">{errors.lifecycle_status}</span>{/if}
        </div>
        <div class="form-group">
          <label for="part_status">Part Status</label>
          <select name="part_status" id="part_status" bind:value={formData.part_status}>
            {#each options.partStatuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          {#if errors?.part_status}<span class="error">{errors.part_status}</span>{/if}
        </div>
      </div>
      <div class="form-group">
        <label for="short_description">Short Description</label>
        <input name="short_description" id="short_description" bind:value={formData.short_description} />
      </div>
      <div class="form-group">
        <label for="functional_description">Functional Description</label>
        <textarea name="functional_description" id="functional_description" bind:value={formData.functional_description} rows="3"></textarea>
      </div>
    </div>
  </div>

  <!-- Electrical Properties -->
  <div class="form-section {activeSection === 'electrical' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('electrical')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('electrical')}>
      <h2>Electrical Properties</h2>
      <span class="toggle-icon">{activeSection === 'electrical' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'electrical'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="voltage_rating_min">Min Voltage (V)</label>
          <input type="number" name="voltage_rating_min" id="voltage_rating_min" bind:value={formData.voltage_rating_min} step="any" />
        </div>
        <div class="form-group">
          <label for="voltage_rating_max">Max Voltage (V)</label>
          <input type="number" name="voltage_rating_max" id="voltage_rating_max" bind:value={formData.voltage_rating_max} step="any" />
        </div>
        <div class="form-group">
          <label for="current_rating_min">Min Current (A)</label>
          <input type="number" name="current_rating_min" id="current_rating_min" bind:value={formData.current_rating_min} step="any" />
        </div>
        <div class="form-group">
          <label for="current_rating_max">Max Current (A)</label>
          <input type="number" name="current_rating_max" id="current_rating_max" bind:value={formData.current_rating_max} step="any" />
        </div>
        <div class="form-group">
          <label for="power_rating_max">Max Power (W)</label>
          <input type="number" name="power_rating_max" id="power_rating_max" bind:value={formData.power_rating_max} min="0" step="any" />
        </div>
        <div class="form-group">
          <label for="tolerance">Tolerance</label>
          <input type="number" name="tolerance" id="tolerance" bind:value={formData.tolerance} min="0" step="any" />
        </div>
        <div class="form-group">
          <label for="tolerance_unit">Tolerance Unit</label>
          <input name="tolerance_unit" id="tolerance_unit" bind:value={formData.tolerance_unit} />
        </div>
      </div>
      <div class="form-group">
        <label for="electrical_properties">Additional Electrical Properties (JSON)</label>
        <textarea name="electrical_properties" id="electrical_properties" value={jsonEditors.electricalProperties} on:input={(e) => onJsonEditorChange('electricalProperties', e.currentTarget.value)} rows="5"></textarea>
      </div>
    </div>
  </div>

  <!-- Mechanical Properties -->
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
            <input type="number" name="dimensions.length" id="dimensions_length" bind:value={dimensions.length} min="0" step="any" />
          </div>
          <div class="dimension-field">
            <label for="dimensions_width">Width</label>
            <input type="number" name="dimensions.width" id="dimensions_width" bind:value={dimensions.width} min="0" step="any" />
          </div>
          <div class="dimension-field">
            <label for="dimensions_height">Height</label>
            <input type="number" name="dimensions.height" id="dimensions_height" bind:value={dimensions.height} min="0" step="any" />
          </div>
          <div class="dimension-field">
            <label for="dimensions_unit">Unit</label>
            <select name="dimensions_unit" id="dimensions_unit" bind:value={dimensionsUnit}>
              <option value="">Select unit</option>
              {#each options.dimensionUnits as unit}
                <option value={unit}>{unit}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="weight">Weight</label>
          <input type="number" name="weight" id="weight" bind:value={formData.weight} min="0" step="any" />
        </div>
        <div class="form-group">
          <label for="weight_unit">Weight Unit</label>
          <select name="weight_unit" id="weight_unit" bind:value={formData.weight_unit}>
            <option value="">Select unit</option>
            {#each options.weightUnits as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="package_type">Package Type</label>
          <select name="package_type" id="package_type" bind:value={formData.package_type}>
            <option value="">Select package</option>
            {#each options.packageTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="pin_count">Pin Count</label>
          <input type="number" name="pin_count" id="pin_count" bind:value={formData.pin_count} min="0" step="1" />
        </div>
      </div>
      <div class="form-group">
        <label for="mechanical_properties">Additional Mechanical Properties (JSON)</label>
        <textarea name="mechanical_properties" id="mechanical_properties" value={jsonEditors.mechanicalProperties} on:input={(e) => onJsonEditorChange('mechanicalProperties', e.currentTarget.value)} rows="5"></textarea>
      </div>
    </div>
  </div>

  <!-- Thermal Properties -->
  <div class="form-section {activeSection === 'thermal' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('thermal')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('thermal')}>
      <h2>Thermal Properties</h2>
      <span class="toggle-icon">{activeSection === 'thermal' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'thermal'}>
      <div class="form-grid">
        <div class="form-group">
          <label for="operating_temperature_min">Min Operating Temp</label>
          <input type="number" name="operating_temperature_min" id="operating_temperature_min" bind:value={formData.operating_temperature_min} step="any" />
        </div>
        <div class="form-group">
          <label for="operating_temperature_max">Max Operating Temp</label>
          <input type="number" name="operating_temperature_max" id="operating_temperature_max" bind:value={formData.operating_temperature_max} step="any" />
        </div>
        <div class="form-group">
          <label for="storage_temperature_min">Min Storage Temp</label>
          <input type="number" name="storage_temperature_min" id="storage_temperature_min" bind:value={formData.storage_temperature_min} step="any" />
        </div>
        <div class="form-group">
          <label for="storage_temperature_max">Max Storage Temp</label>
          <input type="number" name="storage_temperature_max" id="storage_temperature_max" bind:value={formData.storage_temperature_max} step="any" />
        </div>
        <div class="form-group">
          <label for="temperature_unit">Temperature Unit</label>
          <select name="temperature_unit" id="temperature_unit" bind:value={formData.temperature_unit}>
            <option value="">Select unit</option>
            {#each options.temperatureUnits as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="thermal_properties">Additional Thermal Properties (JSON)</label>
        <textarea name="thermal_properties" id="thermal_properties" value={jsonEditors.thermalProperties} on:input={(e) => onJsonEditorChange('thermalProperties', e.currentTarget.value)} rows="5"></textarea>
      </div>
    </div>
  </div>

  <!-- Relationships -->
  <div class="form-section {activeSection === 'relationships' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('relationships')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('relationships')}>
      <h2>Categories & Manufacturers</h2>
      <span class="toggle-icon">{activeSection === 'relationships' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'relationships'}>
      <div class="form-group">
        <label for="part-categories">Part Categories</label>
        <MultiCategorySelector id="part-categories" {categories} bind:selectedCategoryIds name="category_ids" />
      </div>
      <div class="form-group">
        <label for="manufacturers">Manufacturers</label>
        <ManufacturerSelector {manufacturers} bind:selectedManufacturerParts />
      </div>
    </div>
  </div>

  <!-- Additional Properties -->
  <div class="form-section {activeSection === 'additional' ? 'active' : ''}">
    <div class="section-header" on:click={() => toggleSection('additional')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleSection('additional')}>
      <h2>Additional Properties</h2>
      <span class="toggle-icon">{activeSection === 'additional' ? '−' : '+'}</span>
    </div>
    <div class="section-content" class:visible={activeSection === 'additional'}>
      <div class="form-group">
        <label for="properties">General Properties (JSON)</label>
        <textarea name="properties" id="properties" value={jsonEditors.properties} on:input={(e) => onJsonEditorChange('properties', e.currentTarget.value)} rows="5"></textarea>
      </div>
      <div class="form-group">
        <label for="environmental_data">Environmental Data (JSON)</label>
        <textarea name="environmental_data" id="environmental_data" value={jsonEditors.environmentalData} on:input={(e) => onJsonEditorChange('environmentalData', e.currentTarget.value)} rows="5"></textarea>
      </div>
      <div class="form-group">
        <label for="revision_notes">Revision Notes</label>
        <textarea name="revision_notes" id="revision_notes" bind:value={formData.revision_notes} rows="3"></textarea>
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
</div>

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
    transition: color 0.3s;
  }
  
  :global(.dark) .hint {
    color: hsl(var(--muted-foreground) / 0.9);
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
</style>