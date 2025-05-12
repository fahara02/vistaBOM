<!-- src/routes/catagory/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import CategoryItem from '$lib/components/CategoryItem.svelte';
  import CategoryTree from '$lib/components/CategoryTree.svelte';
  import CategoryComboBox from '$lib/components/CategoryComboBox.svelte';

  export let data: PageData;
  const { form, errors, enhance } = superForm(data.form, {
    onResult: ({ result }) => {
      // Close form after successful submission
      if (result.type === 'success') {
        showForm = false;
      }
    }
  });
  
  const { categories, user } = data;
  let showForm = false;
  let viewMode: 'tree' | 'list' = 'tree';
  let selectedCategoryId: string | null = null;
  
  // Handle category selection from the tree view
  function handleCategorySelect(event: CustomEvent<{categoryId: string}>) {
    selectedCategoryId = event.detail.categoryId;
  }
</script>

<div class="header-container">
  <h1>Categories</h1>
  <div class="header-actions">
    <div class="view-toggle">
      <button 
        type="button" 
        class="view-toggle-btn {viewMode === 'tree' ? 'active' : ''}" 
        on:click={() => viewMode = 'tree'}
      >
        <i class="fas fa-sitemap"></i> <span>Tree View</span>
      </button>
      <button 
        type="button" 
        class="view-toggle-btn {viewMode === 'list' ? 'active' : ''}" 
        on:click={() => viewMode = 'list'}
      >
        <i class="fas fa-list"></i> <span>List View</span>
      </button>
    </div>
    <button type="button" on:click={() => showForm = !showForm} class="toggle-btn">
      {showForm ? 'Cancel' : 'Add Category'}
    </button>
  </div>
</div>

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
      <CategoryComboBox 
        {categories} 
        bind:value={$form.parent_id} 
        name="parent_id" 
        placeholder="Select parent category..." 
      />
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

<div class="category-container">
  {#if viewMode === 'tree'}
    <div class="tree-view-container">
      <CategoryTree 
        {categories} 
        bind:selectedCategoryId={selectedCategoryId} 
        expandSelected={true} 
        on:select={handleCategorySelect} 
      />
    </div>
  {:else}
    <div class="list-view-container">
      {#each categories as category}
        <CategoryItem {category} currentUserId={user?.id} />
      {/each}
    </div>
  {/if}
</div>

<style>
  h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: #2d2d2d;
  }
  
  /* Header Styles */
  .header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .view-toggle {
    display: flex;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
  }
  
  .view-toggle-btn {
    padding: 0.5rem 0.75rem;
    border: none;
    background: #f5f5f5;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #555;
  }
  
  .view-toggle-btn.active {
    background: #e0e0e0;
    color: #222;
    font-weight: 500;
  }
  
  .view-toggle-btn i {
    font-size: 0.75rem;
  }

  .toggle-btn {
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
  
  /* Category Container Styles */
  .category-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .tree-view-container {
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    padding: 1rem;
    min-height: 300px;
  }
  
  .list-view-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Form Styles */
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

  /* Use label instead of .field for form styling */

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

  @media (max-width: 768px) {
    .header-container {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .header-actions {
      width: 100%;
      justify-content: space-between;
    }
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
    
    .view-toggle-btn span {
      display: none;
    }
  }
</style>