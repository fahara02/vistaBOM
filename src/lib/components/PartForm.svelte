<!-- src/lib/components/PartForm.svelte -->

<script lang="ts">
  import type { LifecycleStatusEnum } from '$lib/types';
  import type { SuperForm } from 'sveltekit-superforms';
  import type { createPartSchema } from '$lib/server/db/schema';

  export let form; // Already a store from superForm()
  export let errors; // Already a store from superForm()
  export let statuses: string[];
  export let isEditMode = false;
  export let enhance; // Function from superForm()

  const buttonText = isEditMode ? 'Save Version' : 'Create Part';
</script>

<form method="POST" use:enhance class="part-form">
  <div class="form-group">
    <label for="name">Name</label>
    <input name="name" bind:value={$form.name} required>
    {#if $errors.name}<span class="error">{$errors.name}</span>{/if}
  </div>

  <div class="form-group">
    <label for="version">Version</label>
    <input name="version" bind:value={$form.version} required pattern="\d+\.\d+\.\d+" title="Format: x.y.z (e.g., 1.0.0)">
    {#if $errors.version}<span class="error">{$errors.version}</span>{/if}
  </div>

  <div class="form-group">
    <label for="status">Status</label>
    <select name="status" bind:value={$form.status} required>
      {#each statuses as status}
        <option value={status}>{status.toLowerCase().replace('_', ' ')}</option>
      {/each}
    </select>
    {#if $errors.status}<span class="error">{$errors.status}</span>{/if}
  </div>

  <div class="form-group">
    <label for="short_description">Short Description</label>
    <input name="short_description" bind:value={$form.short_description}>
    {#if $errors.short_description}<span class="error">{$errors.short_description}</span>{/if}
  </div>

  <button type="submit" class="btn-primary">{buttonText}</button>
  {#if isEditMode}
    <button type="button" class="btn-secondary" on:click={() => history.back()}>Cancel</button>
  {/if}
</form>

<style>
  .part-form {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input, select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .error {
    display: block;
    color: red;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  
  .btn-primary {
    background-color: #4c6ef5;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 0.5rem;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>