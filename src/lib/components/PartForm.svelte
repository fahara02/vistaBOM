<!-- src/lib/components/PartForm.svelte -->

<script lang="ts">
  import { tick } from 'svelte';
  import { PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, LifecycleStatusEnum, PartStatusEnum } from '$lib/types';
  import type { SuperForm } from 'sveltekit-superforms';
  import type { createPartSchema } from '$lib/server/db/schema';

  export let form; // Already a store from superForm()
  export let errors; // Already a store from superForm()
  export let statuses: string[];
  export let isEditMode = false;
  export let enhance; // Function from superForm()
  // Provide default empty arrays to avoid potential issues
  export let packageTypes: string[] = [];
  export let weightUnits: string[] = [];
  export let dimensionUnits: string[] = [];
  // Control whether to show the form action buttons (useful when embedded in other components)
  export let showFormActions: boolean = true;
  
  // No longer needed - using enum values directly in the component

  const buttonText = isEditMode ? 'Save Changes' : 'Create Part';

  // Accordion state management
  let activeSection = 'basic';
  const toggleSection = (section: string) => {
    activeSection = activeSection === section ? '' : section;
  };

  // Initialize form fields on component mount to prevent null references
  import { onMount } from 'svelte';

  // Add reactive statement to ensure ALL fields are properly initialized
  $: if ($form) {
    // Initialize dimensions object if it doesn't exist
    if (!$form.dimensions) $form.dimensions = { length: null, width: null, height: null };
  }

  onMount(() => {
    // Initialize all JSON fields to empty objects if null
    // Ensure we're using the correct field names from the database schema
    if (!$form.technical_specifications) $form.technical_specifications = {};
    if (!$form.properties) $form.properties = {};
    if (!$form.electrical_properties) $form.electrical_properties = {};
    if (!$form.mechanical_properties) $form.mechanical_properties = {};
    if (!$form.thermal_properties) $form.thermal_properties = {};
    if (!$form.material_composition) $form.material_composition = {};
    if (!$form.environmental_data) $form.environmental_data = {};
    
    // Initialize dimensions according to schema requirements
    if (!$form.dimensions) {
      $form.dimensions = { length: null, width: null, height: null };
      console.log('Form initialization: dimensions set to object with null values');
    } else if ($form.dimensions === null) {
      // If null, convert to object with null values for UI editing
      $form.dimensions = { length: null, width: null, height: null };
      console.log('Form initialization: null dimensions converted to object with null values');
    } else {
      // Ensure all three dimension properties exist
      const dims = $form.dimensions;
      if (!('length' in dims)) dims.length = null;
      if (!('width' in dims)) dims.width = null;
      if (!('height' in dims)) dims.height = null;
      console.log('Form initialization: verified dimension properties exist', dims);
    }
    
    // Re-initialize JSON editors after setting defaults - use correct field names
    jsonEditors = {
      technicalSpecifications: jsonToString($form.technical_specifications),
      properties: jsonToString($form.properties),
      electricalProperties: jsonToString($form.electrical_properties),
      mechanicalProperties: jsonToString($form.mechanical_properties),
      thermalProperties: jsonToString($form.thermal_properties),
      materialComposition: jsonToString($form.material_composition),
      environmentalData: jsonToString($form.environmental_data),
      longDescription: jsonToString($form.long_description)
    };
    
    // Log all form fields to ensure everything is being sent
    console.log('🔄 PartForm INITIALIZED WITH ALL FIELDS:', {
      // Basic part info
      id: $form.id,
      part_id: $form.part_id,
      name: $form.name,
      version: $form.version,
      status: $form.status,
      part_status: $form.part_status,
      
      // Description fields
      short_description: $form.short_description,
      functional_description: $form.functional_description,
      long_description: $form.long_description,
      
      // Dimension & physical properties
      dimensions: $form.dimensions,
      dimensions_unit: $form.dimensions_unit,
      weight: $form.weight,
      weight_unit: $form.weight_unit,
      
      // Electrical properties
      voltage_rating_min: $form.voltage_rating_min,
      voltage_rating_max: $form.voltage_rating_max,
      current_rating_min: $form.current_rating_min,
      current_rating_max: $form.current_rating_max,
      power_rating_max: $form.power_rating_max,
      tolerance: $form.tolerance,
      tolerance_unit: $form.tolerance_unit,
      electrical_properties: $form.electrical_properties,
      
      // Thermal properties
      operating_temperature_min: $form.operating_temperature_min,
      operating_temperature_max: $form.operating_temperature_max,
      storage_temperature_min: $form.storage_temperature_min,
      storage_temperature_max: $form.storage_temperature_max,
      temperature_unit: $form.temperature_unit,
      thermal_properties: $form.thermal_properties,
      
      // Mechanical properties
      package_type: $form.package_type,
      pin_count: $form.pin_count,
      mechanical_properties: $form.mechanical_properties,
      material_composition: $form.material_composition,
      
      // Other properties
      technical_specifications: $form.technical_specifications,
      properties: $form.properties,
      environmental_data: $form.environmental_data,
      revision_notes: $form.revision_notes
    });
  });

  // Handle JSON fields
  function updateJsonField(editorFieldName: string, jsonString: string) {
    // Map editor field names to database field names
    const fieldMap: Record<string, string> = {
      'technicalSpecifications': 'technical_specifications',
      'properties': 'properties',
      'electricalProperties': 'electrical_properties',
      'mechanicalProperties': 'mechanical_properties',
      'thermalProperties': 'thermal_properties',
      'materialComposition': 'material_composition',
      'environmentalData': 'environmental_data',
      'longDescription': 'long_description'
    };

    const dbFieldName = fieldMap[editorFieldName] || editorFieldName;
    
    try {
      if (jsonString && jsonString.trim()) {
        $form[dbFieldName] = JSON.parse(jsonString);
      } else {
        $form[dbFieldName] = {};
      }
      console.log(`Updated JSON field ${dbFieldName}:`, $form[dbFieldName]);
    } catch (error) {
      console.error(`Error parsing JSON for ${dbFieldName}:`, error);
      // Keep the current value if there's a parsing error
    }
  }
  
  // Ensure dimensions object is initialized according to schema requirements
  function ensureDimensions() {
    console.log('Ensuring dimensions conform to schema requirements...');
    
    // If dimensions is undefined, initialize it properly
    if (!$form.dimensions) {
      $form.dimensions = { length: null, width: null, height: null };
      console.log('Initialized dimensions with null values:', $form.dimensions);
      return;
    }
    
    // Check if dimensions is an object
    if (typeof $form.dimensions === 'object' && $form.dimensions !== null) {
      const dims = $form.dimensions;
      
      // Ensure all required properties exist
      if (!('length' in dims)) dims.length = null;
      if (!('width' in dims)) dims.width = null;
      if (!('height' in dims)) dims.height = null;
      
      // Log the complete dimensions state
      console.log('Verified dimensions structure:', {
        dims,
        allNull: dims.length === null && dims.width === null && dims.height === null,
        anyNull: dims.length === null || dims.width === null || dims.height === null,
        allNumbers: typeof dims.length === 'number' && typeof dims.width === 'number' && typeof dims.height === 'number'
      });
    } else if ($form.dimensions === null) {
      // If null, convert to object with null values for UI
      $form.dimensions = { length: null, width: null, height: null };
      console.log('Converted null dimensions to object with null values for UI');
    }
  }
  function handleSubmit() {
    // First, update all JSON fields one last time before submission
    if (jsonEditors.technicalSpecifications) updateJsonField('technicalSpecifications', jsonEditors.technicalSpecifications);
    if (jsonEditors.properties) updateJsonField('properties', jsonEditors.properties);
    if (jsonEditors.electricalProperties) updateJsonField('electricalProperties', jsonEditors.electricalProperties);
    if (jsonEditors.mechanicalProperties) updateJsonField('mechanicalProperties', jsonEditors.mechanicalProperties);
    if (jsonEditors.thermalProperties) updateJsonField('thermalProperties', jsonEditors.thermalProperties);
    if (jsonEditors.materialComposition) updateJsonField('materialComposition', jsonEditors.materialComposition);
    if (jsonEditors.environmentalData) updateJsonField('environmentalData', jsonEditors.environmentalData);
    if (jsonEditors.longDescription) updateJsonField('longDescription', jsonEditors.longDescription);
    
    // Make sure dimensions is properly set
    ensureDimensions();
    
    // Comprehensive logging of ALL fields before submission
    console.log('📤 SUBMITTING COMPLETE FORM DATA:', {
      // Basic part info
      id: $form.id,
      part_id: $form.part_id,
      name: $form.name,
      version: $form.version,
      status: $form.status,
      partStatus: $form.partStatus,
      
      // Description fields
      short_description: $form.short_description,
      functional_description: $form.functional_description,
      long_description: $form.long_description,
      
      // Dimension & physical properties
      dimensions: $form.dimensions,
      dimensions_unit: $form.dimensions_unit,
      weight: $form.weight,
      weight_unit: $form.weight_unit,
      
      // Electrical properties
      voltage_rating_min: $form.voltage_rating_min,
      voltage_rating_max: $form.voltage_rating_max,
      current_rating_min: $form.current_rating_min,
      current_rating_max: $form.current_rating_max,
      power_rating_max: $form.power_rating_max,
      tolerance: $form.tolerance,
      tolerance_unit: $form.tolerance_unit,
      electrical_properties: $form.electrical_properties,
      
      // Thermal properties
      operating_temperature_min: $form.operating_temperature_min,
      operating_temperature_max: $form.operating_temperature_max,
      storage_temperature_min: $form.storage_temperature_min,
      storage_temperature_max: $form.storage_temperature_max,
      temperature_unit: $form.temperature_unit,
      thermal_properties: $form.thermal_properties,
      
      // Mechanical properties
      package_type: $form.package_type,
      pin_count: $form.pin_count,
      mechanical_properties: $form.mechanical_properties,
      material_composition: $form.material_composition,
      
      // Other properties
      technical_specifications: $form.technical_specifications,
      properties: $form.properties,
      environmental_data: $form.environmental_data,
      revision_notes: $form.revision_notes
    });
    
    // Also convert to flat format for easier debugging
    const fieldKeys = Object.keys($form);
    console.log(`📋 FORM CONTAINS ${fieldKeys.length} FIELDS:`, fieldKeys);
  }

  // Convert JSON to editable string
  function jsonToString(json: any): string {
    if (!json) return '';
    return typeof json === 'object' ? JSON.stringify(json, null, 2) : json.toString();
  }

  // Track state of JSON editor fields - match the database field names
  let jsonEditors = {
    technicalSpecifications: jsonToString($form.technical_specifications),
    properties: jsonToString($form.properties),
    electricalProperties: jsonToString($form.electrical_properties),
    mechanicalProperties: jsonToString($form.mechanical_properties),
    thermalProperties: jsonToString($form.thermal_properties),
    materialComposition: jsonToString($form.material_composition),
    environmentalData: jsonToString($form.environmental_data),
    longDescription: jsonToString($form.long_description)
  };

  // Log all form data changes for debugging
  $: {
    console.log('🔄 FORM DATA UPDATED:', $form);
    
    // Log specific information about dimensions for debugging
    if ($form && $form.dimensions) {
      console.log('DIMENSIONS STATE:', {
        type: typeof $form.dimensions,
        value: $form.dimensions,
        hasLengthProperty: $form.dimensions && 'length' in $form.dimensions,
        lengthType: $form.dimensions && typeof $form.dimensions.length,
        lengthValue: $form.dimensions && $form.dimensions.length,
        hasWidthProperty: $form.dimensions && 'width' in $form.dimensions,
        widthType: $form.dimensions && typeof $form.dimensions.width,
        widthValue: $form.dimensions && $form.dimensions.width,
        hasHeightProperty: $form.dimensions && 'height' in $form.dimensions,
        heightType: $form.dimensions && typeof $form.dimensions.height,
        heightValue: $form.dimensions && $form.dimensions.height
      });
    }
  }
  
  // Update the form when JSON fields change
  $: {
    // Ensure JSON editors map to correct database field names
    updateJsonField('technicalSpecifications', jsonEditors.technicalSpecifications); // technical_specifications
    updateJsonField('properties', jsonEditors.properties); // properties
    updateJsonField('electricalProperties', jsonEditors.electricalProperties); // electrical_properties
    updateJsonField('mechanicalProperties', jsonEditors.mechanicalProperties); // mechanical_properties
    updateJsonField('thermalProperties', jsonEditors.thermalProperties); // thermal_properties
    updateJsonField('materialComposition', jsonEditors.materialComposition); // material_composition
    updateJsonField('environmentalData', jsonEditors.environmentalData); // environmental_data
    updateJsonField('longDescription', jsonEditors.longDescription); // long_description
  }
</script>

<form method="POST" use:enhance class="part-form">
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
          <input name="name" id="name" bind:value={$form.name} required>
          {#if $errors.name}<span class="error">{$errors.name}</span>{/if}
        </div>

        <div class="form-group">
          <label for="version">Version</label>
          <input name="version" id="version" bind:value={$form.version} required 
                pattern="\d+\.\d+\.\d+" title="Format: x.y.z (e.g., 1.0.0)">
          {#if $errors.version}<span class="error">{$errors.version}</span>{/if}
        </div>
        
        <div class="form-group">
          <label for="status">Lifecycle Status</label>
          <select name="status" id="status" bind:value={$form.status} required>
            {#each statuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          {#if $errors.status}<span class="error">{$errors.status}</span>{/if}
        </div>
        
        <div class="form-group">
          <label for="partStatus">Part Status</label>
          <select name="partStatus" id="partStatus" bind:value={$form.partStatus}>
            <option value={PartStatusEnum.CONCEPT}>Concept</option>
            <option value={PartStatusEnum.ACTIVE}>Active</option>
            <option value={PartStatusEnum.OBSOLETE}>Obsolete</option>
            <option value={PartStatusEnum.ARCHIVED}>Archived</option>
          </select>
          {#if $errors.partStatus}<span class="error">{$errors.partStatus}</span>{/if}
        </div>

        <!-- is_public field belongs to Part, not PartVersion -->
      </div>

      <div class="form-group">
        <label for="short_description">Short Description</label>
        <input name="short_description" id="short_description" bind:value={$form.short_description}>
        {#if $errors.short_description}<span class="error">{$errors.short_description}</span>{/if}
      </div>

      <div class="form-group">
        <label for="functional_description">Functional Description</label>
        <textarea name="functional_description" id="functional_description" 
                  bind:value={$form.functional_description} rows="3"></textarea>
        {#if $errors.functional_description}<span class="error">{$errors.functional_description}</span>{/if}
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
                 bind:value={$form.voltageRatingMin} step="any">
        </div>

        <div class="form-group">
          <label for="voltageRatingMax">Max Voltage Rating (V)</label>
          <input type="number" name="voltageRatingMax" id="voltageRatingMax" 
                 bind:value={$form.voltageRatingMax} step="any">
        </div>

        <div class="form-group">
          <label for="currentRatingMin">Min Current Rating (A)</label>
          <input type="number" name="currentRatingMin" id="currentRatingMin" 
                 bind:value={$form.currentRatingMin} step="any">
        </div>

        <div class="form-group">
          <label for="currentRatingMax">Max Current Rating (A)</label>
          <input type="number" name="currentRatingMax" id="currentRatingMax" 
                 bind:value={$form.currentRatingMax} step="any">
        </div>

        <div class="form-group">
          <label for="powerRatingMax">Max Power Rating (W)</label>
          <input type="number" name="powerRatingMax" id="powerRatingMax" 
                 bind:value={$form.powerRatingMax} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="tolerance">Tolerance</label>
          <input type="number" name="tolerance" id="tolerance" 
                 bind:value={$form.tolerance} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="tolerance_unit">Tolerance Unit</label>
          <input name="tolerance_unit" id="tolerance_unit" bind:value={$form.tolerance_unit}>
        </div>
      </div>

      <div class="form-group">
        <label for="electrical_properties">Additional Electrical Properties (JSON)</label>
        <textarea name="electrical_properties" id="electrical_properties" 
                  bind:value={jsonEditors.electricalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format, e.g. {`{"resistance": "10 ohm"}`}</p>
        {#if $errors.electrical_properties}<span class="error">{$errors.electrical_properties}</span>{/if}
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
                   bind:value={$form.dimensions.length} min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions_width">Width</label>
            <input type="number" name="dimensions.width" id="dimensions_width" 
                   on:focus={ensureDimensions}
                   bind:value={$form.dimensions.width} min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions_height">Height</label>
            <input type="number" name="dimensions.height" id="dimensions_height" 
                   on:focus={ensureDimensions}
                   bind:value={$form.dimensions.height} min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions_unit">Unit</label>
            <select name="dimensions_unit" id="dimensions_unit" bind:value={$form.dimensions_unit}>
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
          <input type="number" name="weight" id="weight" bind:value={$form.weight} min="0" step="any">
        </div>

        <div class="form-group">
          <label for="weight_unit">Weight Unit</label>
          <select name="weight_unit" id="weight_unit" bind:value={$form.weight_unit}>
            <option value="">Select...</option>
            {#each weightUnits as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="package_type">Package Type</label>
          <select name="package_type" id="package_type" bind:value={$form.package_type}>
            <option value="">Select...</option>
            {#each packageTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="pin_count">Pin Count</label>
          <input type="number" name="pin_count" id="pin_count" bind:value={$form.pin_count} min="0" step="1">
        </div>
      </div>

      <div class="form-group">
        <label for="mechanical_properties">Additional Mechanical Properties (JSON)</label>
        <textarea name="mechanical_properties" id="mechanical_properties" 
                  bind:value={jsonEditors.mechanicalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format</p>
        {#if $errors.mechanical_properties}<span class="error">{$errors.mechanical_properties}</span>{/if}
      </div>

      <div class="form-group">
        <label for="material_composition">Material Composition (JSON)</label>
        <textarea name="material_composition" id="material_composition" 
                  bind:value={jsonEditors.materialComposition} rows="5"></textarea>
        <p class="hint">Enter material details in JSON format</p>
        {#if $errors.material_composition}<span class="error">{$errors.material_composition}</span>{/if}
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
                 bind:value={$form.operating_temperature_min} step="any">
        </div>

        <div class="form-group">
          <label for="operating_temperature_max">Max Operating Temperature</label>
          <input type="number" name="operating_temperature_max" id="operating_temperature_max" 
                 bind:value={$form.operating_temperature_max} step="any">
        </div>

        <div class="form-group">
          <label for="storage_temperature_min">Min Storage Temperature</label>
          <input type="number" name="storage_temperature_min" id="storage_temperature_min" 
                 bind:value={$form.storage_temperature_min} step="any">
        </div>

        <div class="form-group">
          <label for="storage_temperature_max">Max Storage Temperature</label>
          <input type="number" name="storage_temperature_max" id="storage_temperature_max" 
                 bind:value={$form.storage_temperature_max} step="any">
        </div>
      </div>
      
      <div class="form-group">
        <label for="thermal_properties">Additional Thermal Properties (JSON)</label>
        <textarea name="thermal_properties" id="thermal_properties" 
                  bind:value={jsonEditors.thermalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format</p>
        {#if $errors.thermal_properties}<span class="error">{$errors.thermal_properties}</span>{/if}
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
        {#if $errors.properties}<span class="error">{$errors.properties}</span>{/if}
      </div>
      
      <div class="form-group">
        <label for="environmental_data">Environmental Data (JSON)</label>
        <textarea name="environmental_data" id="environmental_data" 
                  bind:value={jsonEditors.environmentalData} rows="5"></textarea>
        <p class="hint">Enter environmental data in JSON format</p>
        {#if $errors.environmental_data}<span class="error">{$errors.environmental_data}</span>{/if}
      </div>

      <div class="form-group">
        <label for="revision_notes">Revision Notes</label>
        <textarea name="revision_notes" id="revision_notes" 
                 bind:value={$form.revision_notes} rows="3"></textarea>
      </div>
    </div>
  </div>

  {#if showFormActions}
    <div class="form-actions">
      <button type="submit" class="btn-primary">{buttonText}</button>
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
  }
  
  .form-section {
    margin-bottom: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    overflow: hidden;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #f8f9fa;
    cursor: pointer;
  }
  
  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .toggle-icon {
    font-size: 1.5rem;
    line-height: 1;
  }
  
  .section-content {
    display: none;
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
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
  }
  
  input, select, textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  textarea {
    resize: vertical;
  }
  
  .hint {
    font-size: 0.8rem;
    color: #6c757d;
    margin-top: 0.25rem;
  }
  
  .error {
    display: block;
    color: #dc3545;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  
  .form-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-primary {
    background-color: #4c6ef5;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .active .section-header {
    background-color: #e7f1ff;
  }
</style>