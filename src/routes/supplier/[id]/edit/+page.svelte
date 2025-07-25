<!-- src/routes/supplier/[id]/edit/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { parseContactInfo, formatContactInfoForDisplay } from '$lib/utils/util';
  import { slide } from 'svelte/transition';
  
  export let data: PageData;
  
  // Extract supplier data
  const { supplier } = data;
  
  // Track if we've already formatted the contact info to prevent loops
  let contactInfoFormatted = false;
  
  // Toggle state for collapsible sections
  let showContactExamples = false;
  let showCustomFieldsHelp = false;
  
  // Note: formatContactInfoForDisplay has been moved to the shared utils file
  
  // Initialize the form with SuperForms - moved to top level to avoid store subscription issues
  const { form, errors, enhance, submitting, delayed, message } = superForm(data.form, {
    dataType: 'json',
    multipleSubmits: 'prevent',
    resetForm: false,
    onUpdate: ({ form: updatedForm }) => {
      // Update the form data when it changes (using updatedForm to avoid name collision)
      $form = updatedForm.data;
    },
    onSubmit: ({ cancel, formData, formElement }) => {
      // Debug the submission
      console.log('Form submit triggered');
      console.log('Form data being submitted:', formData);
      
      // Adds validation check if needed
      if (!formElement.checkValidity()) {
        console.log('Form validation failed');
        cancel();
      }
    },
    onResult: ({ result }) => {
      // Success notification handled by the message
      console.log('Form submission result:', result);
    }
  });
  
  // For additional debugging 
  function handleSubmit() {
    console.log('Manual submit handler fired');
    // The actual submission is handled by the enhance directive
  }
  
  // Handle cancel/back to list
  function goBack() {
    goto('/supplier');
  }
  
  // Handle JSON validation for custom fields
  function validateJSON(jsonString: string | undefined | null): boolean {
    try {
      if (jsonString) {
        JSON.parse(jsonString);
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Track the custom fields as a string for editing
  let customFieldsValue = '';
  
  // Initialize and keep the custom fields value in sync with the form
  $: {
    if ($form.custom_fields) {
      if (typeof $form.custom_fields === 'object') {
        customFieldsValue = JSON.stringify($form.custom_fields, null, 2);
      } else if (typeof $form.custom_fields === 'string') {
        customFieldsValue = $form.custom_fields;
      }
    } else {
      customFieldsValue = '';
    }
  }
  
  // Handle input changes to update the form value
  function handleCustomFieldsInput() {
    if (validateJSON(customFieldsValue)) {
      try {
        // If it's valid JSON, parse it and store as object
        if (customFieldsValue.trim()) {
          $form.custom_fields = JSON.parse(customFieldsValue);
        } else {
          $form.custom_fields = {};
        }
      } catch (e) {
        // If parsing fails, store as string
        $form.custom_fields = customFieldsValue;
      }
    } else {
      // If invalid, just store the raw string
      $form.custom_fields = customFieldsValue;
    }
  }
  
  let showConfirmDelete = false;
</script>

<svelte:head>
  <title>Edit Supplier: {supplier.supplier_name}</title>
</svelte:head>

<div class="edit-page-container">
  <header class="page-header">
    <div class="header-content">
      <h1>Edit Supplier</h1>
      <div class="bread-crumbs">
        <a href="/dashboard">Dashboard</a> &gt;
        <a href="/supplier">Suppliers</a> &gt;
        <span>Edit</span>
      </div>
    </div>
    <button class="back-button" on:click={goBack}>
      Back to List
    </button>
  </header>
  
  {#if $message}
    <div class="alert {typeof $message === 'string' && $message.includes('success') ? 'success' : 'error'}">
      {typeof $message === 'string' ? $message : 'Operation completed'}
    </div>
  {/if}
  
  <div class="content-container">
    <div class="form-container">
      <form method="POST" action="?/update" use:enhance on:submit={handleSubmit} class="edit-form">
        <div class="form-header">
          <h2>Edit {supplier.supplier_name}</h2>
          {#if supplier.logo_url}
            <div class="logo-preview">
              <img src={supplier.logo_url} alt="{supplier.supplier_name} logo" />
            </div>
          {/if}
        </div>
        
        <div class="form-fields">
          <div class="form-group">
            <label for="supplier_name">Name <span class="required">*</span></label>
            <input 
              id="supplier_name" 
              name="supplier_name" 
              type="text" 
              bind:value={$form.supplier_name}
              class="form-control" 
              required
            />
            {#if $errors.supplier_name}
              <span class="error-message">{$errors.supplier_name}</span>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="supplier_description" 
              name="supplier_description" 
              bind:value={$form.supplier_description}
              class="form-control"
              rows="4"
            ></textarea>
            {#if $errors.supplier_description}
              <span class="error-message">{$errors.supplier_description}</span>
            {/if}
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="website_url">Website URL</label>
              <input 
                id="website_url" 
                name="website_url" 
                type="url" 
                bind:value={$form.website_url}
                class="form-control"
                placeholder="https://example.com"
              />
              {#if $errors.website_url}
                <span class="error-message">{$errors.website_url}</span>
              {/if}
            </div>
            
            <div class="form-group">
              <label for="logo_url">Logo URL</label>
              <input 
                id="logo_url" 
                name="logo_url" 
                type="url" 
                bind:value={$form.logo_url}
                class="form-control"
                placeholder="https://example.com/logo.png"
              />
              {#if $errors.logo_url}
                <span class="error-message">{$errors.logo_url}</span>
              {/if}
            </div>
          </div>

          <div class="form-group">
            <label for="contact_info">Contact Information</label>
            <div class="contact-info-help">
              <span class="field-hint">Enter contact details such as email, phone, or address</span>
            </div>
            <!-- Initialize contact_info with formatted value if not already done -->
            {#if $form.contact_info && !contactInfoFormatted}
              <!-- One-time initialization to format contact info for better display -->
              {@const formattedContact = formatContactInfoForDisplay($form.contact_info)}
              {@const _ = formattedContact && ($form.contact_info = formattedContact) && (contactInfoFormatted = true)}
            {/if}
            <textarea 
              id="contact_info" 
              name="contact_info" 
              bind:value={$form.contact_info}
              class="form-control"
              rows="3"
              placeholder="email: example@domain.com; phone: (123) 456-7890"
            ></textarea>
            {#if $errors.contact_info}
              <span class="error-message">{$errors.contact_info}</span>
            {/if}
            <div class="contact-info-preview">
              {#if $form.contact_info}
                <div class="preview-heading">Contact Information Preview:</div>
                <div class="contact-list">
                  {#each formatContactInfoForDisplay($form.contact_info).split(';') as contactItem}
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
                {#if $form.custom_fields}
                  {#if validateJSON(typeof $form.custom_fields === 'string' ? $form.custom_fields : JSON.stringify($form.custom_fields))}
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
                  if (customFieldsValue && validateJSON(customFieldsValue)) {
                    customFieldsValue = JSON.stringify(JSON.parse(customFieldsValue), null, 2);
                    handleCustomFieldsInput();
                  }
                }}>
                  Format JSON
                </button>
              </div>
              
              <textarea 
                id="custom_fields" 
                name="custom_fields" 
                bind:value={customFieldsValue}
                class="form-control code-input"
                rows="8"
                placeholder="Enter your custom fields in JSON format"
                on:input={handleCustomFieldsInput}
              ></textarea>
              
              {#if customFieldsValue && !validateJSON(customFieldsValue)}
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
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="primary-button"
            disabled={Boolean($submitting || $delayed || (customFieldsValue && !validateJSON(customFieldsValue)))}
          >
            {$submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" class="secondary-button" on:click={goBack}>Cancel</button>
          <button type="button" class="danger-button" on:click={() => showConfirmDelete = true}>
            Delete Supplier
          </button>
        </div>
      </form>
    </div>
    
    <div class="info-sidebar">
      <div class="info-card">
        <h3>About This Supplier</h3>
        <div class="info-item">
          <span class="info-label">Created:</span>
          <span class="info-value">{new Date(supplier.created_at).toLocaleDateString()}</span>
        </div>
        {#if supplier.updated_at}
          <div class="info-item">
            <span class="info-label">Last Updated:</span>
            <span class="info-value">{new Date(supplier.updated_at).toLocaleDateString()}</span>
          </div>
        {/if}
        <div class="info-hint">
          <p>
            <strong>Custom Fields:</strong> Use these to add any additional information about the supplier that might be useful for your organization.
          </p>
          <p>Common supplier fields might include payment terms, preferred carrier, account numbers, or tax information.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showConfirmDelete}
  <div class="modal-overlay">
    <div class="modal-content">
      <h2>Confirm Deletion</h2>
      <p>Are you sure you want to delete <strong>{supplier.supplier_name}</strong>?</p>
      <p class="warning">This action cannot be undone.</p>
      
      <div class="modal-actions">
        <form method="POST" action="?/delete" use:enhance>
          <button type="submit" class="danger-button">Yes, Delete</button>
        </form>
        <button class="secondary-button" on:click={() => showConfirmDelete = false}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .edit-page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    color: hsl(var(--foreground));
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .header-content h1 {
    margin: 0;
    font-size: 2rem;
    color: hsl(var(--foreground));
  }
  
  .bread-crumbs {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.5rem;
  }
  
  .bread-crumbs a {
    color: hsl(var(--primary));
    text-decoration: none;
    transition: color 0.3s;
  }
  
  .bread-crumbs a:hover {
    text-decoration: underline;
    color: hsl(var(--primary-dark));
  }
  
  .back-button {
    padding: 0.5rem 1rem;
    background-color: hsl(var(--secondary));
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--secondary-foreground));
    cursor: pointer;
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
  }
  
  .back-button:hover {
    background-color: hsl(var(--secondary) / 0.8);
  }
  
  .alert {
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1.5rem;
  }
  
  .success {
    background-color: hsl(var(--success) / 0.2);
    border: 1px solid hsl(var(--success));
    color: hsl(var(--success));
  }
  
  .error {
    background-color: hsl(var(--destructive) / 0.2);
    border: 1px solid hsl(var(--destructive));
    color: hsl(var(--destructive));
  }
  
  .content-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }
  
  .form-container {
    background-color: hsl(var(--card));
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    padding: 1.5rem;
    border: 1px solid hsl(var(--border));
  }
  
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .form-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: hsl(var(--card-foreground));
  }
  
  .logo-preview {
    max-width: 100px;
    max-height: 100px;
    overflow: hidden;
    border-radius: 0.375rem;
    border: 1px solid hsl(var(--border));
    padding: 0.5rem;
    background: hsl(var(--background));
  }
  
  .logo-preview img {
    width: 100%;
    height: auto;
    object-fit: contain;
  }
  
  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-group label {
    font-weight: 500;
    color: hsl(var(--foreground));
    font-size: 0.875rem;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid hsl(var(--input-border));
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: hsl(var(--input-foreground));
    background-color: hsl(var(--input));
    transition: border-color 0.15s, background-color 0.3s, color 0.3s;
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
  
  /* Button styling is now directly applied to primary-button, secondary-button, and danger-button classes */
  
  .danger-button {
    margin-left: auto;
    padding: 0.75rem 1.5rem;
    background-color: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
    font-weight: 500;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .danger-button:hover {
    background-color: hsl(var(--destructive-dark));
  }
  
  .info-sidebar {
    position: sticky;
    top: 2rem;
  }
  
  .info-card {
    background-color: hsl(var(--card));
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid hsl(var(--border));
  }
  
  .info-card h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: hsl(var(--card-foreground));
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .info-item {
    display: flex;
    margin-bottom: 0.75rem;
  }
  
  .info-label {
    flex: 0 0 35%;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    padding-right: 1rem;
  }
  
  .info-value {
    flex: 0 0 65%;
    color: hsl(var(--foreground));
  }
  
  .info-hint {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid hsl(var(--border));
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
  
  /* Contact info styling is handled in the contact-info-preview class */
  
  .custom-fields-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  /* JSON helper styles are now part of the custom-fields-help class */
  
  .code-editor-tools {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .format-button {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background-color: hsl(var(--input));
    border: 1px solid hsl(var(--input-border));
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .format-button:hover {
    background-color: hsl(var(--input-dark));
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
    border: 1px solid hsl(var(--input-border));
    border-radius: 0.375rem;
    padding: 0.75rem;
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    overflow: auto;
    color: hsl(var(--foreground));
  }
  
  /* Contact Information Preview Styling */
  .contact-info-preview {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    background-color: hsl(var(--muted));
  }
  
  .preview-heading {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }
  
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .contact-item {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    padding: 0.25rem 0;
  }
  
  .contact-icon {
    font-size: 1.25rem;
  }
  
  .contact-text {
    flex: 1;
    color: hsl(var(--foreground));
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
  }
  
  .modal-content {
    background-color: white;
    border-radius: 0.5rem;
    padding: 2rem;
    max-width: 450px;
    width: 100%;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  .modal-content h2 {
    margin-top: 0;
    color: #111827;
  }
  
  .warning {
    color: #dc2626;
    font-weight: 500;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  @media (max-width: 768px) {
    .content-container {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column;
      align-items: stretch;
    }
    
    .danger-button {
      margin-left: 0;
      margin-top: 1rem;
    }
  }
</style>
