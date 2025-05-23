<!-- src/routes/parts/form-debug.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { superForm } from 'sveltekit-superforms/client';
  import { PartForm } from '$lib/components/forms';
  
  // Create a sample data structure to mimic what comes from the server
  const mockData = {
    id: 'test-id',
    name: 'Test Part',
    version: '1.0.0',
    short_description: 'This is a test part to debug form issues',
    status: 'active',
    part_status: 'production',
    dimensions: { length: 10, width: 5, height: 2 },
    weight: 100,
    weight_unit: 'g'
  };
  
  // Initialize a form with the mock data
  const { form, errors, enhance } = superForm(mockData, {
    dataType: 'json'
  });
  
  let isEditMode = true;
  let displayRawForm = false;
  
  function toggleRawForm() {
    displayRawForm = !displayRawForm;
  }
  
  onMount(() => {
    console.log('Form Debug Page Mounted');
    console.log('Initial form data:', $form);
  });
</script>

<div class="debug-container">
  <h1>Form Debug Page</h1>
  
  <div class="controls">
    <button on:click={toggleRawForm}>
      {displayRawForm ? 'Hide' : 'Show'} Raw Form Data
    </button>
    <label>
      <input type="checkbox" bind:checked={isEditMode}>
      Edit Mode
    </label>
  </div>
  
  {#if displayRawForm}
    <div class="raw-data">
      <h2>Raw Form Data</h2>
      <pre>{JSON.stringify($form, null, 2)}</pre>
    </div>
  {/if}
  
  <div class="form-container">
    <h2>Form Component</h2>
    <!-- The PartForm already defines these options internally -->
    <!-- Removed custom statuses, packageTypes, etc. arrays -->
    <PartForm
      {form}
      {errors}
      {enhance}
      isEditMode={isEditMode}
    />
  </div>
</div>

<style>
  .debug-container {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: hsl(var(--muted));
    border-radius: 4px;
  }
  
  .raw-data {
    background: hsl(var(--card));
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border: 1px solid hsl(var(--border));
  }
  
  pre {
    white-space: pre-wrap;
    overflow-x: auto;
    max-height: 300px;
    background: hsl(var(--muted));
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .form-container {
    background: hsl(var(--card));
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid hsl(var(--border));
  }
</style>
