<!-- src/routes/manufacturer/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import GridView from '$lib/components/grid/GridView.svelte';
  import { enhance } from '$app/forms';
  import type { Manufacturer } from '$lib/types/types';
  
  export let data: PageData;
  const { form, errors, enhance: formEnhance } = superForm(data.form, {
    onResult: ({ result }) => {
      if (result.type === 'success') {
        showForm = false;
        refreshData = true;
      }
    }
  });
  
  const { manufacturers, user } = data;
  let showForm = false;
  let editingManufacturer: Manufacturer | null = null;
  let refreshData = false;
  
  // Function to handle edit request from grid
  function handleEdit(event: CustomEvent) {
    const manufacturer = event.detail.item as Manufacturer;
    editingManufacturer = manufacturer;
    // Populate form with manufacturer data
    $form.manufacturer_name = manufacturer.manufacturer_name;
    $form.manufacturer_description = manufacturer.manufacturer_description || '';
    $form.website_url = manufacturer.website_url || '';
    $form.logo_url = manufacturer.logo_url || '';
    // Show the form
    showForm = true;
  }
  
  // Function to handle refresh request from grid
  function handleRefresh() {
    refreshData = true;
  }
  
  // Reset form when canceling
  function resetForm() {
    editingManufacturer = null;
    $form.manufacturer_name = '';
    $form.manufacturer_description = '';
    $form.website_url = '';
    $form.logo_url = '';
    showForm = false;
  }
</script>

<h1>Manufacturers</h1>

<!-- Only show Add button if user is logged in -->
{#if user}
  <button type="button" on:click={() => showForm ? resetForm() : showForm = true} class="toggle-btn">
    {showForm ? 'Cancel' : 'Add Manufacturer'}
  </button>
  
  {#if showForm}
    <form method="POST" action="{editingManufacturer ? '?/editManufacturer' : '?/default'}" class="create-form" use:formEnhance>
      <h2>{editingManufacturer ? 'Edit' : 'Add New'} Manufacturer</h2>
      
      {#if editingManufacturer}
        <input type="hidden" name="manufacturer_id" value={editingManufacturer.manufacturer_id} />
      {/if}
      
      <div class="field">
        <label for="manufacturer_name">Name</label>
        <input id="manufacturer_name" name="manufacturer_name" bind:value={$form.manufacturer_name} required />
        {#if $errors.manufacturer_name}
          <span class="error">{$errors.manufacturer_name}</span>
        {/if}
      </div>
      
      <div class="field">
        <label for="manufacturer_description">Description</label>
        <textarea id="manufacturer_description" name="manufacturer_description" bind:value={$form.manufacturer_description}></textarea>
        {#if $errors.manufacturer_description}
          <span class="error">{$errors.manufacturer_description}</span>
        {/if}
      </div>
      
      <div class="field">
        <label for="website_url">Website URL</label>
        <input id="website_url" name="website_url" type="url" bind:value={$form.website_url} />
        {#if $errors.website_url}
          <span class="error">{$errors.website_url}</span>
        {/if}
      </div>
      
      <div class="field">
        <label for="logo_url">Logo URL</label>
        <input id="logo_url" name="logo_url" type="url" bind:value={$form.logo_url} />
        {#if $errors.logo_url}
          <span class="error">{$errors.logo_url}</span>
        {/if}
      </div>
      
      <div class="actions">
        <button type="button" class="cancel-btn" on:click={resetForm}>Cancel</button>
        <button type="submit">{editingManufacturer ? 'Update' : 'Create'}</button>
      </div>
    </form>
  {/if}
{/if}

<!-- Use the new GridView component -->
<div class="grid-container">
  <GridView 
    items={manufacturers} 
    entityType="manufacturer" 
    currentUserId={user?.id || ''}
    on:edit={handleEdit}
    on:refresh={handleRefresh}
  />
</div>

{#if refreshData}
  <form method="GET" id="refresh-form">
    <input type="hidden" name="_={new Date().getTime()}" />
  </form>
  <script>
    document.getElementById('refresh-form').submit();
  </script>
{/if}
<style>
  h1 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: #1a1a1a;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: #2d2d2d;
  }

  .create-form {
    background: #ffffff;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 3rem;
    max-width: 800px;
  }

  .field {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 600;
    color: #404040;
    font-size: 0.95rem;
  }

  input,
  textarea {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  input[type="url"] {
    font-family: monospace;
    font-size: 0.9rem;
  }

  .error {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #fef2f2;
    border-radius: 4px;
    border: 1px solid #fecaca;
  }

  /* Error styling is handled by the error class directly */
  input:focus,
  textarea:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
  }

  button[type="submit"] {
    background: #4f46e5;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button[type="submit"]:hover {
    background: #4338ca;
  }

  button[type="submit"]:active {
    transform: scale(0.98);
  }

  .toggle-btn {
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #4f46e5;
    color: white;
  }

  .toggle-btn:hover {
    background: #4338ca;
  }

  .toggle-btn:active {
    transform: scale(0.98);
  }

  @media (max-width: 640px) {
    .create-form {
      padding: 1.5rem;
      margin-left: -1rem;
      margin-right: -1rem;
      border-radius: 0;
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.5rem;
    }
  }
</style>