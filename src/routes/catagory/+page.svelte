<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import CategoryItem from '$lib/components/CategoryItem.svelte';

  export let data: PageData;
  const { form, errors } = superForm(data.form);
  const { categories, user } = data;
  let showForm = false;
</script>

<h1>Categories</h1>
<button type="button" on:click={() => showForm = !showForm} class="toggle-btn">
  {showForm ? 'Cancel' : 'Add Category'}
</button>

{#if showForm}
  <form method="POST" class="create-form" id="create-category">
    <h2>Add New Category</h2>
    <label>
      Name*
      <input id="name" name="name" bind:value={$form.name} required />
      {#if $errors.name}<span class="error">{$errors.name}</span>{/if}
    </label>
    <label>
      Parent
      <select id="parent_id" name="parent_id" bind:value={$form.parent_id}>
        <option value="">None</option>
        {#each categories as c}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
      {#if $errors.parent_id}<span class="error">{$errors.parent_id}</span>{/if}
    </label>
    <label>
      Description
      <textarea id="description" name="description" bind:value={$form.description}></textarea>
      {#if $errors.description}<span class="error">{$errors.description}</span>{/if}
    </label>
    <label>
      <input type="checkbox" name="is_public" bind:checked={$form.is_public} /> Public
      {#if $errors.is_public}<span class="error">{$errors.is_public}</span>{/if}
    </label>
    <div class="form-actions">
      <button type="submit">Create</button>
    </div>
  </form>
{/if}

{#each categories as category}
  <CategoryItem {category} currentUserId={user?.id} />
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

  .create-form {
    background: #ffffff;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 3rem;
    max-width: 800px;
    display: grid;
    gap: 1.5rem;
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
  textarea,
  select {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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

  .form-actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
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