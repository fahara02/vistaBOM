<!-- src/routes/manufacturer/[id]/edit/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import ManufacturerForm from '$lib/components/forms/ManufacturerForm.svelte';
  
  export let data: PageData;
  
  // Extract manufacturer data
  const { manufacturer } = data;  
            // Initialize the form with SuperForms - moved to top level to avoid store subscription issues
  // Direct debug of the form data from server
  console.log('Raw form data from server:', data.form);
  
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
      // Stay on same page after successful edit, just like supplier form
    }
  });
  
  // For additional debugging 
  function handleSubmit() {
    console.log('Manual submit handler fired');
    // The actual submission is handled by the enhance directive
  }
  
  // Handle cancel/back to list
  function goBack() {
    goto('/manufacturer');
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
  
  let showConfirmDelete = false;
</script>

<svelte:head>
  <title>Edit Manufacturer: {manufacturer.manufacturer_name}</title>
</svelte:head>

<div class="edit-page-container">
  <header class="page-header">
    <div class="header-content">
      <h1>Edit Manufacturer</h1>
      <div class="bread-crumbs">
        <a href="/dashboard">Dashboard</a> &gt;
        <a href="/manufacturer">Manufacturers</a> &gt;
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
          <h2>Edit {manufacturer.manufacturer_name}</h2>
          {#if manufacturer.logo_url}
            <div class="logo-preview">
              <img src={manufacturer.logo_url} alt="{manufacturer.manufacturer_name} logo" />
            </div>
          {/if}
        </div>
        
        {#if $form}
          <!-- Debug what we have before passing to component -->
          <pre style="display: none;">Form type: {typeof form}, Has subscribe: {'subscribe' in form ? 'yes' : 'no'}</pre>
          <pre style="display: none;">Form data: {JSON.stringify($form, null, 2)}</pre>
          
          <!-- Pass only the props that the component actually accepts -->
          <ManufacturerForm
            data={$form}
            errors={$errors}
            isEditMode={true}
            hideButtons={false}
            submitText="Save Changes"
            isDashboardContext={false}
          />
          
          <!-- Cancel button outside the form -->
          <div class="form-actions">
            <button type="button" class="secondary-btn" on:click={goBack}>Cancel</button>
          </div>
        {/if}
        
        <div class="form-actions delete-action">
          <button type="button" class="danger-button" on:click={() => showConfirmDelete = true}>
            Delete Manufacturer
          </button>
        </div>
      </form>
    </div>
    
    <div class="info-sidebar">
      <div class="info-card">
        <h3>About This Manufacturer</h3>
        <div class="info-item">
          <span class="info-label">Created:</span>
          <span class="info-value">{new Date(manufacturer.created_at).toLocaleDateString()}</span>
        </div>
        {#if manufacturer.updated_at}
          <div class="info-item">
            <span class="info-label">Last Updated:</span>
            <span class="info-value">{new Date(manufacturer.updated_at).toLocaleDateString()}</span>
          </div>
        {/if}
        <div class="info-hint">
          <p>
            <strong>Custom Fields:</strong> Use these to add any additional information about the manufacturer in JSON format.
          </p>
          <p>Example of valid JSON:</p>
          <pre>{`{
  "foundedYear": 1985,
  "headquarters": "Tokyo, Japan",
  "website": "https://example.com"
}`}</pre>
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
      <p>Are you sure you want to delete <strong>{manufacturer.manufacturer_name}</strong>?</p>
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
    background-color: hsl(var(--background));
    color: hsl(var(--destructive));
    font-weight: 500;
    border-radius: 0.375rem;
    border: 1px solid hsl(var(--destructive));
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .danger-button:hover {
    background-color: hsl(var(--destructive) / 0.2);
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
  
  .info-hint pre {
    background-color: hsl(var(--input));
    padding: 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    overflow: auto;
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
