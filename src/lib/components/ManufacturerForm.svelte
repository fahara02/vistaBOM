<!-- src/lib/components/ManufacturerForm.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { onDestroy } from 'svelte';
  import type { SuperForm } from 'sveltekit-superforms';
  import type { SuperFormData } from 'sveltekit-superforms/client';
  import type { z } from 'zod';
  
    // Using a type alias for Json since we can't import it directly
  type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
  
  // Define the type for the form schema
  interface ManufacturerFormData extends Record<string, unknown> {
    id: string;
    name: string;
    description?: string | null;
    website_url?: string | null;
    logo_url?: string | null;
    contact_info?: string | null; // Support contact_info field if present
    custom_fields_json?: string | null; // Match the schema definition exactly (string | null)
    created_by?: string | null;
    created_at?: Date | string | null; // Make optional to match actual form data
    updated_by?: string | null;
    updated_at?: Date | string | null; // Make optional to match actual form data
    }
    
    // Props - Accept the form in the proper format
    export let form: any; // SuperForm<ManufacturerFormData> | SuperFormData<ManufacturerFormData>;
    // Add a reactive accessible form value to use for binding
    let formData: ManufacturerFormData;
    // Create a reactive statement to check if form is a SuperForm or plain data
    $: isStoreForm = form && 'subscribe' in form;
    export let errors: any; // Form validation errors
    export let submitting: boolean = false;
    export let delayed: boolean = false;
    export let isEditMode: boolean = false;
    export let hideButtons: boolean = false; // Option to hide submit/cancel buttons
    
    // Optional callback functions
    export let onCancel: (() => void) | undefined = undefined;
    
    // Local state
    let showCustomFieldsHelp = false;
    
    // Initialize formData with default empty values
    $: formData = isStoreForm ? $form : (form && form.data ? form.data : {
      id: '',
      name: '',
      description: '',
      website_url: '',
      logo_url: '',
      contact_info: '',
      custom_fields_json: '{}',
      created_by: null,
      created_at: new Date(),
      updated_by: null,
      updated_at: new Date()
    });
    
    // Debug the form data to help diagnose issues
    $: console.log('Form binding mode:', isStoreForm ? 'Store' : 'Direct');
    $: console.log('Current form data:', formData);
    
    
    // We don't need cleanup anymore since we're using reactive statements
    
    // Debug current form data
    $: console.log('Current manufacturer form data:', formData);
    
    // Additional debugging for form data
    $: if (isStoreForm) {
      console.log('Store form data:', $form);
    } else if (form && 'data' in form) {
      console.log('Direct form data:', form.data);
    }
    
    // Validate JSON
    function validateJSON(jsonString: string | undefined | null): boolean {
      if (!jsonString) return true;
      try {
        JSON.parse(jsonString);
        return true;
      } catch (e) {
        return false;
      }
    }
  </script>
  
  <div class="form-fields">
    <div class="form-group">
      <label for="name">Name <span class="required">*</span></label>
      <input 
        id="name" 
        name="name" 
        type="text" 
        bind:value={formData.name} 
        on:input={() => { if(isStoreForm) $form.name = formData.name; }}
        class="form-control" 
        required
      />
      {#if errors.name}
        <span class="error-message">{errors.name}</span>
      {/if}
    </div>
    
    <div class="form-group">
      <label for="description">Description</label>
      <textarea 
        id="description" 
        name="description" 
        bind:value={formData.description} 
        on:input={() => { if(isStoreForm) $form.description = formData.description; }}
        class="form-control"
        rows="4"
      ></textarea>
      {#if errors.description}
        <span class="error-message">{errors.description}</span>
      {/if}
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="website_url">Website URL</label>
        <input 
          id="website_url" 
          name="website_url" 
          type="url" 
          bind:value={formData.website_url} 
          on:input={() => { if(isStoreForm) $form.website_url = formData.website_url; }}
          class="form-control"
          placeholder="https://example.com"
        />
        {#if errors.website_url}
          <span class="error-message">{errors.website_url}</span>
        {/if}
      </div>
      
      <div class="form-group">
        <label for="logo_url">Logo URL</label>
        <input 
          id="logo_url" 
          name="logo_url" 
          type="url" 
          bind:value={formData.logo_url} 
          on:input={() => { if(isStoreForm) $form.logo_url = formData.logo_url; }}
          class="form-control"
          placeholder="https://example.com/logo.png"
        />
        {#if errors.logo_url}
          <span class="error-message">{errors.logo_url}</span>
        {/if}
      </div>
    </div>
  
        <!-- Custom fields help message -->
    <div class="form-group">
      <small class="help-text">Add any additional manufacturer-specific fields as a JSON object.</small>
    </div>
    
    <div class="form-group custom-fields-container">
      <div class="custom-fields-header">
        <label for="custom_fields_json">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 8h10M7 12h10M7 16h10" />
          </svg>
          Custom Fields (JSON)
        </label>
        <small class="json-status {validateJSON(formData.custom_fields_json) ? 'valid-json' : 'invalid-json'}">
        {validateJSON(formData.custom_fields_json) ? 'Valid JSON' : 'Invalid JSON'}
      </small>
      {#if formData.custom_fields_json && formData.custom_fields_json.trim() !== '{}' && formData.custom_fields_json.trim() !== ''}
        <small class="help-text">Custom fields detected</small>
      {/if}
      </div>
      
      <div class="code-editor-container">
        <div class="code-editor-tools">
          <span class="field-hint">Enter a valid JSON object with your custom fields</span>
          <button type="button" class="format-button" on:click={() => {
            if (formData.custom_fields_json && validateJSON(formData.custom_fields_json)) {
              formData.custom_fields_json = JSON.stringify(JSON.parse(formData.custom_fields_json), null, 2);
            }
          }}>
            Format JSON
          </button>
        </div>
        
        <textarea 
          id="custom_fields_json" 
          name="custom_fields_json"
          bind:value={formData.custom_fields_json} 
          on:input={() => { if(isStoreForm) $form.custom_fields_json = formData.custom_fields_json; }}
          class="form-control code-input"
          rows="8"
          placeholder="Enter your custom fields in JSON format"
        ></textarea>
        
        {#if formData.custom_fields_json && !validateJSON(formData.custom_fields_json)}
          <span class="error-message">JSON format is invalid. Please check for missing commas, quotes, or braces.</span>
        {/if}
      </div>
      
      <div class="helper-toggle">
        <button type="button" class="toggle-button" on:click={() => showCustomFieldsHelp = !showCustomFieldsHelp}>
          <span class="toggle-icon">{showCustomFieldsHelp ? '−' : '+'}</span>
          <span class="toggle-text">{showCustomFieldsHelp ? 'Hide Help' : 'Show Help & Examples'}</span>
        </button>
      </div>
      
      {#if showCustomFieldsHelp}
        <div class="custom-fields-help" transition:slide={{ duration: 300 }}>
          <p>Custom fields let you store additional information about the manufacturer that doesn't fit in the standard fields.</p>
          <ul>
            <li><strong>Text values</strong>: Use quotes ("value")</li>
            <li><strong>Numbers</strong>: Enter without quotes (1234)</li>
            <li><strong>Booleans</strong>: Use true or false</li>
          </ul>
          <div class="example-json">
            <p><strong>Example:</strong></p>
            <pre>{`{
    "foundedYear": 1985,
    "headquarters": "Tokyo, Japan",
    "employees": 5000,
    "hasDistributors": true
  }`}</pre>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  {#if !hideButtons}
    <div class="form-actions">
      <button 
        type="submit" 
        class="enhanced-btn submit-btn"
        disabled={submitting || delayed || (formData && formData.custom_fields_json ? !validateJSON(formData.custom_fields_json) : false)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Manufacturer'}
      </button>
      {#if onCancel}
        <button type="button" class="enhanced-btn cancel-btn" on:click={onCancel}>
          <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Cancel
        </button>
      {/if}
    </div>
  {/if}
  
  <style>
    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-group label {
      font-weight: 500;
      color: hsl(var(--foreground));
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .required {
      color: hsl(var(--destructive));
    }
    
    input.form-control,
    textarea.form-control {
      padding: 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid hsl(var(--input-border));
      font-size: 1rem;
      color: hsl(var(--input-foreground));
      background-color: hsl(var(--input));
      transition: border-color 0.15s, background-color 0.3s, color 0.3s;
      width: 100%;
    }
    
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: hsl(var(--ring));
      box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }
    
    textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid hsl(var(--border));
    }
    
    .custom-fields-container {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid hsl(var(--border));
    }
    
    .error-message {
      font-size: 0.875rem;
      color: hsl(var(--destructive));
      margin-top: 0.25rem;
      background-color: hsl(var(--destructive) / 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    
    .help-text {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      margin-top: 0.25rem;
    }
    
    .custom-fields-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    .code-editor-tools {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .format-button {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background-color: hsl(var(--secondary));
      border: 1px solid hsl(var(--border));
      border-radius: 0.25rem;
      cursor: pointer;
      color: hsl(var(--secondary-foreground));
      transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .format-button:hover {
      background-color: hsl(var(--secondary) / 0.8);
    }
    
    .helper-toggle {
      margin-top: 0.5rem;
      display: flex;
      justify-content: flex-start;
    }
    
    .enhanced-btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 0.375rem;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-width: 120px;
      height: 2.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    
    .submit-btn {
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }
    
    .submit-btn:hover {
      background-color: hsl(var(--primary) / 0.9);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .cancel-btn {
      background-color: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      border: 1px solid hsl(var(--border));
    }
    
    .cancel-btn:hover {
      background-color: hsl(var(--secondary) / 0.9);
      border-color: hsl(var(--border) / 0.8);
    }
    
    .btn-icon {
      width: 16px;
      height: 16px;
      stroke-width: 2.5;
    }
    
    .enhanced-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
    
    .toggle-button {
      background: none;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: hsl(var(--primary));
      cursor: pointer;
      padding: 0.25rem 0;
    }
    
    .toggle-icon {
      font-size: 1rem;
      width: 1rem;
      text-align: center;
      line-height: 1;
    }
    
    .toggle-text {
      font-weight: 500;
    }
    
    .custom-fields-help {
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: hsl(var(--muted));
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      color: hsl(var(--foreground));
      border: 1px dashed hsl(var(--border));
    }
    
    .custom-fields-help p {
      margin-top: 0;
      margin-bottom: 0.5rem;
    }
    
    .custom-fields-help ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    
    .custom-fields-help li {
      margin-bottom: 0.25rem;
      color: hsl(var(--muted-foreground));
    }
    
    .example-json {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed hsl(var(--border));
    }
    
    .example-json pre {
      background-color: hsl(var(--input));
      border: 1px solid hsl(var(--border));
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin: 0.5rem 0 0;
      font-size: 0.75rem;
      overflow: auto;
      color: hsl(var(--foreground));
    }
    
    .error-message {
      color: hsl(var(--destructive));
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .field-hint {
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
    }
    
    .json-status {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    
    .valid-json {
      color: hsl(var(--success));
      background-color: hsl(var(--success) / 0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    
    .invalid-json {
      color: hsl(var(--destructive));
      background-color: hsl(var(--destructive) / 0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    
    .icon {
      display: inline-block;
      vertical-align: middle;
    }
  </style>
  