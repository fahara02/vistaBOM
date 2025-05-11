<!-- src/routes/manufacturer/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import Manufacturer from '$lib/components/manufacturer.svelte';
  
  export let data: PageData;
  const { form, errors } = superForm(data.form);
  const { manufacturers, user } = data;
  let showForm = false;
</script>

<h1>Manufacturers</h1>
<button type="button" on:click={() => showForm = !showForm} class="toggle-btn">
  {showForm ? 'Cancel' : 'Add Manufacturer'}
</button>
{#if showForm}
  <form method="POST" class="create-form">
    <h2>Add New Manufacturer</h2>
    <div class="field">
      <label for="name">Name</label>
      <input id="name" name="name" bind:value={$form.name} required />
      {#if $errors.name}
        <span class="error">{$errors.name}</span>
      {/if}
    </div>
    <div class="field">
      <label for="description">Description</label>
      <textarea id="description" name="description" bind:value={$form.description}></textarea>
      {#if $errors.description}
        <span class="error">{$errors.description}</span>
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
      <button type="submit">Create</button>
    </div>
  </form>
{/if}

{#each manufacturers as manufacturer}
  <Manufacturer {manufacturer} currentUserId={user?.id} />
{/each}

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

  .error + input,
  .error + textarea {
    border-color: #dc2626;
  }

  .error + input:focus,
  .error + textarea:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
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