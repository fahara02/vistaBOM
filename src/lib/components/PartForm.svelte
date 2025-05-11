<!-- src/lib/components/PartForm.svelte -->

<script lang="ts">
  import { tick } from 'svelte';
  import type { PackageTypeEnum, WeightUnitEnum, DimensionUnitEnum, LifecycleStatusEnum } from '$lib/types';
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

  const buttonText = isEditMode ? 'Save Changes' : 'Create Part';

  // Accordion state management
  let activeSection = 'basic';
  const toggleSection = (section: string) => {
    activeSection = activeSection === section ? '' : section;
  };

  // Initialize form fields on component mount to prevent null references
  import { onMount } from 'svelte';

  // Add reactive statement to ensure JSON fields are properly initialized but DON'T set dimensions
  $: if ($form) {
    // DON'T initialize dimensions with zeros - causes validation errors
    // Let the client code handle dimensions only when user inputs values
    if (!$form.technicalSpecifications) $form.technicalSpecifications = {};
    if (!$form.properties) $form.properties = {};
    if (!$form.electricalProperties) $form.electricalProperties = {};
    if (!$form.mechanicalProperties) $form.mechanicalProperties = {};
    if (!$form.materialComposition) $form.materialComposition = {};
    if (!$form.environmentalData) $form.environmentalData = {};
  }

  onMount(() => {
    // Don't initialize dimensions here - let the form handle it only when user inputs values
    
    // Initialize all JSON fields to empty objects if null
    if (!$form.technicalSpecifications) $form.technicalSpecifications = {};
    if (!$form.properties) $form.properties = {};
    if (!$form.electricalProperties) $form.electricalProperties = {};
    if (!$form.mechanicalProperties) $form.mechanicalProperties = {};
    if (!$form.thermalProperties) $form.thermalProperties = {};
    if (!$form.materialComposition) $form.materialComposition = {};
    if (!$form.environmentalData) $form.environmentalData = {};
    
    // Re-initialize JSON editors after setting defaults
    jsonEditors = {
      technicalSpecifications: jsonToString($form.technicalSpecifications),
      properties: jsonToString($form.properties),
      electricalProperties: jsonToString($form.electricalProperties),
      mechanicalProperties: jsonToString($form.mechanicalProperties),
      thermalProperties: jsonToString($form.thermalProperties),
      materialComposition: jsonToString($form.materialComposition),
      environmentalData: jsonToString($form.environmentalData),
      longDescription: jsonToString($form.longDescription)
    };
  });

  // Handle JSON fields
  function updateJsonField(field: string, value: string) {
    try {
      $form[field] = value ? JSON.parse(value) : null;
    } catch (e) {
      // Keep the string value for now, will be validated by the server
    }
  }

  // Convert JSON to editable string
  function jsonToString(json: any): string {
    if (!json) return '';
    return typeof json === 'object' ? JSON.stringify(json, null, 2) : json.toString();
  }

  // Track state of JSON editor fields
  let jsonEditors = {
    technicalSpecifications: jsonToString($form.technicalSpecifications),
    properties: jsonToString($form.properties),
    electricalProperties: jsonToString($form.electricalProperties),
    mechanicalProperties: jsonToString($form.mechanicalProperties),
    thermalProperties: jsonToString($form.thermalProperties),
    materialComposition: jsonToString($form.materialComposition),
    environmentalData: jsonToString($form.environmentalData),
    longDescription: jsonToString($form.longDescription)
  };

  // Update the form when JSON fields change
  $: {
    updateJsonField('technicalSpecifications', jsonEditors.technicalSpecifications);
    updateJsonField('properties', jsonEditors.properties);
    updateJsonField('electricalProperties', jsonEditors.electricalProperties);
    updateJsonField('mechanicalProperties', jsonEditors.mechanicalProperties);
    updateJsonField('thermalProperties', jsonEditors.thermalProperties);
    updateJsonField('materialComposition', jsonEditors.materialComposition);
    updateJsonField('environmentalData', jsonEditors.environmentalData);
    updateJsonField('longDescription', jsonEditors.longDescription);
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

        <!-- is_public field belongs to Part, not PartVersion -->
      </div>

      <div class="form-group">
        <label for="shortDescription">Short Description</label>
        <input name="shortDescription" id="shortDescription" bind:value={$form.shortDescription}>
        {#if $errors.shortDescription}<span class="error">{$errors.shortDescription}</span>{/if}
      </div>

      <div class="form-group">
        <label for="functionalDescription">Functional Description</label>
        <textarea name="functionalDescription" id="functionalDescription" 
                  bind:value={$form.functionalDescription} rows="3"></textarea>
        {#if $errors.functionalDescription}<span class="error">{$errors.functionalDescription}</span>{/if}
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
          <label for="toleranceUnit">Tolerance Unit</label>
          <input name="toleranceUnit" id="toleranceUnit" bind:value={$form.toleranceUnit}>
        </div>
      </div>

      <div class="form-group">
        <label for="electricalProperties">Additional Electrical Properties (JSON)</label>
        <textarea name="electricalProperties" id="electricalProperties" 
                  bind:value={jsonEditors.electricalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format, e.g. {`{"resistance": "10 ohm"}`}</p>
        {#if $errors.electricalProperties}<span class="error">{$errors.electricalProperties}</span>{/if}
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
            <label for="dimensions.length">Length</label>
            <input type="number" name="dimensions.length" id="dimensions.length" 
                   min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions.width">Width</label>
            <input type="number" name="dimensions.width" id="dimensions.width" 
                   min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensions.height">Height</label>
            <input type="number" name="dimensions.height" id="dimensions.height" 
                   min="0" step="any">
          </div>
          <div class="dimension-field">
            <label for="dimensionsUnit">Unit</label>
            <select name="dimensionsUnit" id="dimensionsUnit" bind:value={$form.dimensionsUnit}>
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
          <label for="weightUnit">Weight Unit</label>
          <select name="weightUnit" id="weightUnit" bind:value={$form.weightUnit}>
            <option value="">Select...</option>
            {#each weightUnits as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="packageType">Package Type</label>
          <select name="packageType" id="packageType" bind:value={$form.packageType}>
            <option value="">Select...</option>
            {#each packageTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="pinCount">Pin Count</label>
          <input type="number" name="pinCount" id="pinCount" bind:value={$form.pinCount} min="0" step="1">
        </div>
      </div>

      <div class="form-group">
        <label for="mechanicalProperties">Additional Mechanical Properties (JSON)</label>
        <textarea name="mechanicalProperties" id="mechanicalProperties" 
                  bind:value={jsonEditors.mechanicalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format</p>
        {#if $errors.mechanicalProperties}<span class="error">{$errors.mechanicalProperties}</span>{/if}
      </div>

      <div class="form-group">
        <label for="materialComposition">Material Composition (JSON)</label>
        <textarea name="materialComposition" id="materialComposition" 
                  bind:value={jsonEditors.materialComposition} rows="5"></textarea>
        <p class="hint">Enter material details in JSON format</p>
        {#if $errors.materialComposition}<span class="error">{$errors.materialComposition}</span>{/if}
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
          <label for="operatingTemperatureMin">Min Operating Temperature</label>
          <input type="number" name="operatingTemperatureMin" id="operatingTemperatureMin" 
                 bind:value={$form.operatingTemperatureMin} step="any">
        </div>

        <div class="form-group">
          <label for="operatingTemperatureMax">Max Operating Temperature</label>
          <input type="number" name="operatingTemperatureMax" id="operatingTemperatureMax" 
                 bind:value={$form.operatingTemperatureMax} step="any">
        </div>

        <div class="form-group">
          <label for="storageTemperatureMin">Min Storage Temperature</label>
          <input type="number" name="storageTemperatureMin" id="storageTemperatureMin" 
                 bind:value={$form.storageTemperatureMin} step="any">
        </div>

        <div class="form-group">
          <label for="storageTemperatureMax">Max Storage Temperature</label>
          <input type="number" name="storageTemperatureMax" id="storageTemperatureMax" 
                 bind:value={$form.storageTemperatureMax} step="any">
        </div>
      </div>
      
      <div class="form-group">
        <label for="thermalProperties">Additional Thermal Properties (JSON)</label>
        <textarea name="thermalProperties" id="thermalProperties" 
                  bind:value={jsonEditors.thermalProperties} rows="5"></textarea>
        <p class="hint">Enter properties in JSON format</p>
        {#if $errors.thermalProperties}<span class="error">{$errors.thermalProperties}</span>{/if}
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
        <label for="environmentalData">Environmental Data (JSON)</label>
        <textarea name="environmentalData" id="environmentalData" 
                  bind:value={jsonEditors.environmentalData} rows="5"></textarea>
        <p class="hint">Enter environmental data in JSON format</p>
        {#if $errors.environmentalData}<span class="error">{$errors.environmentalData}</span>{/if}
      </div>

      <div class="form-group">
        <label for="revisionNotes">Revision Notes</label>
        <textarea name="revisionNotes" id="revisionNotes" 
                 bind:value={$form.revisionNotes} rows="3"></textarea>
      </div>
    </div>
  </div>

  <div class="form-actions">
    <button type="submit" class="btn-primary">{buttonText}</button>
    {#if isEditMode}
      <button type="button" class="btn-secondary" on:click={() => history.back()}>Cancel</button>
    {/if}
  </div>
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