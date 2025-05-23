<!-- src/routes/category/+page.svelte -->
<script lang="ts">
  // Import from sveltekit-superforms/client for proper client-side handling
  import { superForm } from 'sveltekit-superforms/client';
  import type { SuperValidated } from 'sveltekit-superforms/client';
  import { z } from 'zod';
  import type { Category } from '@/types/types';
  
  // Import components - SvelteKit will resolve these correctly 
  // even if TypeScript complains
  import CategoryItem from '$lib/components/forms/CategoryItem.svelte';
  import CategoryTree from '$lib/components/forms/CategoryTree.svelte';
  import CategoryComboBox from '$lib/components/forms/CategoryComboBox.svelte';
  
  // Define the category schema for validation
  const categorySchema = z.object({
    category_name: z.string().min(1),
    parent_id: z.string().uuid().optional().nullable(),
    category_description: z.string().optional().nullable(),
    is_public: z.boolean().default(true)
  });
  
  // Category schema from server - matches our database fields exactly
  type CategoryData = {
    category_id: string;
    category_name: string;
    category_path: string;
    parent_id: string | null;
    parent_name: string | null;
    is_public: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    custom_fields: Record<string, unknown> | null;
    deleted_at?: string | null;
  };
  
  // Category adapter to match the required type for CategoryTree
  function adaptCategoryForTree(dbCategory: CategoryData): Category {
    return {
      id: dbCategory.category_id,
      name: dbCategory.category_name,
      category_id: dbCategory.category_id, // Keep original field for compatibility
      category_name: dbCategory.category_name, // Keep original field for compatibility
      category_path: dbCategory.category_path,
      path: dbCategory.category_path,
      parent_id: dbCategory.parent_id,
      parentId: dbCategory.parent_id,
      description: null,
      is_public: dbCategory.is_public,
      isPublic: dbCategory.is_public,
      created_by: dbCategory.created_by,
      createdBy: dbCategory.created_by,
      created_at: new Date(dbCategory.created_at),
      createdAt: new Date(dbCategory.created_at),
      updated_at: new Date(dbCategory.updated_at),
      updatedAt: new Date(dbCategory.updated_at),
      is_deleted: dbCategory.is_deleted,
      isDeleted: dbCategory.is_deleted,
      deleted_at: dbCategory.deleted_at ? new Date(dbCategory.deleted_at) : null,
      deletedAt: dbCategory.deleted_at ? new Date(dbCategory.deleted_at) : null,
      parent_name: dbCategory.parent_name,
      parentName: dbCategory.parent_name,
      custom_fields: dbCategory.custom_fields,
      customFields: dbCategory.custom_fields
    } as Category;
  }
  

  
  // Form data structure to properly type all form fields
  // Use type instead of interface and extend Record<string, unknown> to satisfy superForm constraints
  type CategoryFormData = Record<string, unknown> & {
    category_name: string;
    parent_id: string | null;
    category_description: string | null;
    is_public: boolean;
  }
  
  // Page data sent from the server
  interface PageData {
    user: { user_id: string; role: string };
    categories: CategoryData[];
    form: SuperValidated<CategoryFormData>;
  }

  export let data: PageData;
  const { form, errors, enhance } = superForm<CategoryFormData>(data.form as SuperValidated<CategoryFormData>, {
    onResult: ({ result }) => {
      // Close form after successful submission
      if (result.type === 'success') {
        showForm = false;
      }
    }
  });
  
  // Make categories a let variable so it can be updated when items are deleted
  let { categories: dbCategories } = data;
  const { user } = data;
  
  // Convert DB categories to the format needed by components
  $: categories = dbCategories.map(adaptCategoryForTree);
  
  let showForm = false;
  let viewMode: 'tree' | 'list' = 'tree';
  let selectedCategoryId: string | null = null;
  
  // Helper functions with proper type definitions
  // Simple function declarations with explicit return types and no defaults
  function toggleCategoryInfo(categoryId: string, shouldExpand: boolean): void {
    console.log(`Toggling category ${categoryId}, expand: ${shouldExpand}`);
  }

  function enableTreeFeature(enabled: boolean): void {
    console.log(`Tree feature ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  function handleExport(format: string): void {
    console.log(`Exporting in ${format} format`);
  }

  // Handle category selection from the tree view
  // Event handlers with proper typing
  function handleCategorySelect(event: CustomEvent<{categoryId: string}>): void {
    selectedCategoryId = event.detail.categoryId;
  }

  function handleCategoryFilter(event: CustomEvent<{filter: string}>): void {
    console.log('Filter event:', event.detail.filter);
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
      <input id="category_name" name="category_name" bind:value={$form.category_name} required />
      {#if $errors.category_name}<span class="error">{$errors.category_name}</span>{/if}
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
      <textarea id="category_description" name="category_description" bind:value={$form.category_description}></textarea>
      {#if $errors.category_description}<span class="error">{$errors.category_description}</span>{/if}
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
        bind:selectedCategoryId 
        expandSelected={true} 
        on:select={handleCategorySelect} 
      />
    </div>
  {:else}
    <div class="list-view-container">
      {#each categories as category}
        <CategoryItem 
          {category} 
          currentUserId={user?.user_id} 
          on:deleted={(e) => {
            // Remove the deleted category from the array
            const categoryId = e.detail.categoryId;
            // Filter both the original and adapted category arrays
            dbCategories = dbCategories.filter(c => c.category_id !== categoryId);
            // Categories will be automatically updated via the reactive statement
          }}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: hsl(var(--foreground));
    transition: color 0.3s;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: hsl(var(--foreground));
    transition: color 0.3s;
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
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid hsl(var(--border));
    transition: border-color 0.3s;
  }
  
  .view-toggle-btn {
    padding: 0.5rem 0.75rem;
    border: none;
    background: hsl(var(--surface-100));
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    transition: background-color 0.3s, color 0.3s;
  }
  
  .view-toggle-btn.active {
    background: hsl(var(--surface-300));
    color: hsl(var(--foreground));
    font-weight: 500;
  }
  
  .view-toggle-btn:hover:not(.active) {
    background: hsl(var(--surface-200));
    color: hsl(var(--foreground));
  }
  
  .view-toggle-btn i {
    font-size: 0.75rem;
  }

  .toggle-btn {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: hsl(var(--category-color));
    color: white;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-btn:hover {
    background: hsl(var(--category-color) / 0.8);
    box-shadow: 0 2px 5px hsl(var(--category-color) / 0.3);
  }

  .toggle-btn:active {
    transform: translateY(1px);
  }
  
  /* Category Container Styles */
  .category-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .tree-view-container {
    border-radius: 0.75rem;
    background: hsl(var(--surface-100));
    box-shadow: 0 2px 6px hsl(var(--muted) / 0.15);
    padding: 1.25rem;
    min-height: 350px;
    border: 1px solid hsl(var(--border));
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
  }
  
  .list-view-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: hsl(var(--surface-100));
    border-radius: 0.75rem;
    padding: 1.25rem;
    min-height: 350px;
    border: 1px solid hsl(var(--border));
    box-shadow: 0 2px 6px hsl(var(--muted) / 0.15);
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
  }
  
  /* Dark mode adjustments */
  :global(.dark) .tree-view-container,
  :global(.dark) .list-view-container {
    box-shadow: 0 4px 8px hsl(217 33% 10% / 0.4);
    border-color: hsl(var(--card-border));
  }
  
  :global(.dark) .toggle-btn {
    box-shadow: 0 2px 4px hsl(var(--category-color) / 0.3);
  }
  
  :global(.dark) .toggle-btn:hover {
    background: hsl(var(--category-color) / 0.9);
    box-shadow: 0 3px 6px hsl(var(--category-color) / 0.4);
  }

  /* Form Styles */
  .create-form {
    background: hsl(var(--surface-100));
    padding: 2rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px hsl(var(--muted) / 0.1);
    border: 1px solid hsl(var(--border));
    margin-bottom: 3rem;
    max-width: 800px;
    display: grid;
    gap: 1.5rem;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
  }

  /* Use label instead of .field for form styling */
  label {
    font-weight: 600;
    color: hsl(var(--foreground));
    font-size: 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: color 0.3s;
  }
  
  /* Dark mode form styles */
  :global(.dark) .create-form {
    box-shadow: 0 4px 12px hsl(217 33% 5% / 0.3);
    border-color: hsl(var(--card-border));
  }

  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s ease;
    background-color: hsl(var(--surface-50));
    color: hsl(var(--foreground));
  }

  input:focus, textarea:focus {
    border-color: hsl(var(--category-color));
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--category-color) / 0.2);
  }

  input[type="checkbox"] {
    width: auto;
    margin-right: 0.5rem;
    accent-color: hsl(var(--category-color));
  }
  
  :global(.dark) input, :global(.dark) textarea {
    background-color: hsl(var(--surface-200));
    border-color: hsl(var(--card-border));
  }

  .error {
    color: hsl(var(--destructive));
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
  }

  button[type="submit"] {
    padding: 0.75rem 1.5rem;
    background: hsl(var(--category-color));
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 8rem;
  }

  button[type="submit"]:hover {
    background: hsl(var(--category-color) / 0.85);
    box-shadow: 0 2px 5px hsl(var(--category-color) / 0.3);
  }

  button[type="submit"]:active {
    transform: translateY(1px);
  }
  
  :global(.dark) button[type="submit"] {
    box-shadow: 0 2px 4px hsl(var(--category-color) / 0.3);
  }
  
  :global(.dark) button[type="submit"]:hover {
    box-shadow: 0 3px 6px hsl(var(--category-color) / 0.4);
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