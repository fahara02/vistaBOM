<!-- src/lib/components/SupplierForm.svelte -->
<script lang="ts">
  import { formatContactInfoForDisplay, validateJSON } from '$lib/utils/util';
  import type { SupplierFormData } from '@/types/formTypes';
  import { slide } from 'svelte/transition';
  import type { SuperForm } from 'sveltekit-superforms';
  import type { SuperFormData } from 'sveltekit-superforms/client';


  // Props
  export let form: SuperForm<SupplierFormData> | SuperFormData<SupplierFormData>;
  export let errors: any; // Form validation errors
  export let submitting: boolean = false;
  export let delayed: boolean = false;
  export let isEditMode: boolean = false;
  export let hideButtons: boolean = false; // Option to hide submit/cancel buttons
  
  // Optional callback functions
  export let onCancel: (() => void) | undefined = undefined;
  
  // Local state
  let showContactExamples = false;
  let showCustomFieldsHelp = false;
  let contactInfoFormatted = false;
  let formData: SupplierFormData;
  
  // Initialize formData with default values to prevent undefined errors
  formData = {
    supplier_id: '',
    supplier_name: '',
    supplier_description: null,
    website_url: null,
    contact_info: null,
    logo_url: null,
    custom_fields_json: '',
    created_by: '',
    created_at: new Date(),
    updated_by: '',
    updated_at: new Date()
  };
  
  // Handle form data - access differently based on whether it's a SuperForm or SuperFormData
  $: {
    if ('subscribe' in form) {
      // For SuperForm type which has a subscribe method
      form.subscribe((value) => {
        // Safe way to merge values without spread operator type issues
        if (value && value.data) {
          const newData = value.data as Partial<SupplierFormData>;
          // Update each property individually
          if (newData.supplier_id !== undefined) formData.supplier_id = newData.supplier_id;
          if (newData.supplier_name !== undefined) formData.supplier_name = newData.supplier_name;
          if (newData.supplier_description !== undefined) formData.supplier_description = newData.supplier_description;
          if (newData.website_url !== undefined) formData.website_url = newData.website_url;
          if (newData.contact_info !== undefined) formData.contact_info = newData.contact_info;
          if (newData.logo_url !== undefined) formData.logo_url = newData.logo_url;
          if (newData.custom_fields_json !== undefined) formData.custom_fields_json = newData.custom_fields_json;
          if (newData.created_by !== undefined) formData.created_by = newData.created_by;
          if (newData.created_at !== undefined) formData.created_at = newData.created_at;
          if (newData.updated_by !== undefined) formData.updated_by = newData.updated_by;
          if (newData.updated_at !== undefined) formData.updated_at = newData.updated_at;
        }
      });
    } else if ('data' in form && form.data) {
      // For direct SuperFormData type
      const newData = form.data as Partial<SupplierFormData>;
      // Update each property individually
      if (newData.id !== undefined) formData.id = newData.id;
      if (newData.supplier_name !== undefined) formData.supplier_name = newData.supplier_name;
      if (newData.supplier_description !== undefined) formData.supplier_description = newData.supplier_description;
      if (newData.website_url !== undefined) formData.website_url = newData.website_url;
      if (newData.contact_info !== undefined) formData.contact_info = newData.contact_info;
      if (newData.logo_url !== undefined) formData.logo_url = newData.logo_url;
      if (newData.custom_fields_json !== undefined) formData.custom_fields_json = newData.custom_fields_json;
      if (newData.created_by !== undefined) formData.created_by = newData.created_by;
      if (newData.created_at !== undefined) formData.created_at = newData.created_at;
      if (newData.updated_by !== undefined) formData.updated_by = newData.updated_by;
      if (newData.updated_at !== undefined) formData.updated_at = newData.updated_at;
    } else {
      console.error('Form prop does not have expected structure');
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
      bind:value={formData.supplier_name}
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
      bind:value={formData.supplier_description}
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
        class="form-control"
        placeholder="https://example.com/logo.png"
      />
      {#if errors.logo_url}
        <span class="error-message">{errors.logo_url}</span>
      {/if}
    </div>
  </div>

  <div class="form-group">
    <label for="contact_info">Contact Information</label>
    <div class="contact-info-help">
      <span class="field-hint">Enter contact details such as email, phone, or address</span>
    </div>
    <!-- Initialize contact_info with formatted value if not already done -->
    {#if formData.contact_info && !contactInfoFormatted}
      <!-- One-time initialization to format contact info for better display -->
      {@const formattedContact = formatContactInfoForDisplay(formData.contact_info)}
      {@const _ = formattedContact && (formData.contact_info = formattedContact as any) && (contactInfoFormatted = true)}
    {/if}
    <textarea 
      id="contact_info" 
      name="contact_info" 
      bind:value={formData.contact_info}
      class="form-control"
      rows="3"
      placeholder="email: example@domain.com; phone: (123) 456-7890"
    ></textarea>
    {#if errors.contact_info}
      <span class="error-message">{errors.contact_info}</span>
    {/if}
    <div class="contact-info-preview">
      {#if formData && formData.contact_info}
        <div class="preview-heading">Contact Information Preview:</div>
        <div class="contact-list">
          {#each (typeof formData.contact_info === 'object' && formData.contact_info ? formatContactInfoForDisplay(formData.contact_info) : '').split(';') as contactItem}
            {#if contactItem.trim()}
              <div class="contact-item">
                {#if contactItem.toLowerCase().includes('email')}
                  <span class="contact-icon">📧</span>
                {:else if contactItem.toLowerCase().includes('phone') || contactItem.toLowerCase().includes('mobile')}
                  <span class="contact-icon">📞</span>
                {:else if contactItem.toLowerCase().includes('address')}
                  <span class="contact-icon">📍</span>
                {:else}
                  <span class="contact-icon">ℹ️</span>
                {/if}
                <span class="contact-text">{contactItem.trim()}</span>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
    <div class="helper-toggle">
      <button type="button" class="toggle-button" on:click={() => showContactExamples = !showContactExamples}>
        <span class="toggle-icon">{showContactExamples ? '−' : '+'}</span>
        <span class="toggle-text">{showContactExamples ? 'Hide Examples' : 'Show Contact Examples'}</span>
      </button>
    </div>
    
    {#if showContactExamples}
      <div class="field-examples" transition:slide={{ duration: 300 }}>
        <p>Examples:</p>
        <ul>
          <li><code>email: contact@example.com; phone: (123) 456-7890; address: 123 Main St</code></li>
          <li><code>{`{"email":"contact@example.com","phone":"(123) 456-7890"}`}</code> (JSON format)</li>
          <li><code>{`{"mobile":"0086-755-83210457","email":"sales@lcsc.com"}`}</code> (JSON with mobile)</li>
        </ul>
      </div>
    {/if}
  </div>
  
  <div class="form-group custom-fields-container">
    <div class="custom-fields-header">
      <label for="custom_fields_json">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 8h10M7 12h10M7 16h10" />
        </svg>
        Custom Fields (JSON)
      </label>
      <div class="json-status">
        {#if formData.custom_fields_json}
          {#if validateJSON(formData.custom_fields_json)}
            <span class="valid-json">✓ Valid JSON</span>
          {:else}
            <span class="invalid-json">✗ Invalid JSON</span>
          {/if}
        {/if}
      </div>
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
        <p>Custom fields let you store additional information about the supplier that doesn't fit in the standard fields.</p>
        <ul>
          <li><strong>Text values</strong>: Use quotes ("value")</li>
          <li><strong>Numbers</strong>: Enter without quotes (1234)</li>
          <li><strong>Booleans</strong>: Use true or false</li>
        </ul>
        <div class="example-json">
          <p><strong>Example:</strong></p>
          <pre>{`{
  "taxId": "123-45-6789",
  "employeeCount": 250,
  "isPreferredVendor": true,
  "paymentTerms": "Net 30" 
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
      class="primary-button"
      disabled={submitting || delayed || (formData && formData.custom_fields_json ? !validateJSON(formData.custom_fields_json) : false)}
    >
      {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Supplier'}
    </button>
    {#if onCancel}
      <button type="button" class="secondary-button" on:click={onCancel}>Cancel</button>
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
  textarea.form-control,
  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid hsl(var(--input-border));
    border-radius: 4px;
    font-size: 1rem;
    background-color: hsl(var(--input));
    color: hsl(var(--input-foreground));
    transition: border-color 0.15s, background-color 0.3s, color 0.3s, box-shadow 0.15s;
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
  
  .contact-info-help {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    color: hsl(var(--muted-foreground));
  }
  
  .contact-info-preview {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    background-color: hsl(var(--muted));
  }
  
  .preview-heading {
    font-weight: 500;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }
  
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  
  .contact-item {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    padding: 0.25rem 0;
  }
  
  .contact-icon {
    width: 1.5rem;
    margin-right: 0.5rem;
    text-align: center;
  }
  
  .contact-text {
    flex: 1;
    color: hsl(var(--foreground));
  }
  
  .field-examples {
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    padding: 0.75rem;
    background-color: hsl(var(--muted));
    border-radius: 0.375rem;
    border: 1px solid hsl(var(--border));
  }
  
  .field-examples p {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }
  
  .field-examples ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  .field-examples li {
    margin-bottom: 0.5rem;
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
    font-size: 0.875rem;
    color: hsl(var(--foreground));
    padding: 1rem;
    background-color: hsl(var(--muted));
    border-radius: 0.375rem;
    border: 1px dashed hsl(var(--border));
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
    border: 1px solid hsl(var(--input-border));
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
