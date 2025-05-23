<!-- src/lib/components/dashboard/categories-tab.svelte -->
<script lang="ts">
    import Category from '$lib/components/cards/category.svelte';
    import type { Category as CategoryType } from '$lib/types/schemaTypes';
    import { 
        userCategories, 
        allCategories,
        showCategoryForm,
        editCategoryMode,
        currentCategoryId,
        refreshData 
    } from '$lib/components/dashboard/store';
    import CategoryForm from '$lib/components/forms/CategoryForm.svelte';
    
    // Props
    export let categories: CategoryType[] = [];
    export let allCategoriesList: CategoryType[] = [];
    export let userCategoriesList: CategoryType[] = [];
    export let currentUserId: string;
    
    // Update the stores when props change
    $: {
        allCategories.set(allCategoriesList);
        userCategories.set(userCategoriesList);
    }
    
    // Method to toggle category form visibility
    function toggleCategoryForm(): void {
        showCategoryForm.update((show: boolean) => !show);
        
        // If closing the form, reset edit mode
        if ($showCategoryForm) {
            editCategoryMode.set(false);
            currentCategoryId.set(null);
        }
    }
    
    // Method to edit category
    function editCategory(categoryId: string): void {
        editCategoryMode.set(true);
        currentCategoryId.set(categoryId);
        showCategoryForm.set(true);
    }
    
    // Method to handle category deletion
    function handleCategoryDeleted(): void {
        refreshData();
    }
</script>

<div class="tab-content">
    <h2>Categories</h2>
    
    {#if categories.length > 0}
        <div class="category-list">
            {#each categories as category (category.category_id)}
                <Category 
                    {category}
                    on:edit={() => editCategory(category.category_id)}
                    on:deleted={handleCategoryDeleted}
                />
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <p>No categories found. Create a category to get started.</p>
        </div>
    {/if}
    
    <div class="action-buttons">
        <button type="button" class="primary-btn" on:click={toggleCategoryForm}>
            {$showCategoryForm ? 'Cancel' : 'Add New Category'}
        </button>
    </div>
    
    {#if $showCategoryForm}
        <CategoryForm 
            currentUserId={currentUserId}
            editMode={$editCategoryMode}
            categoryId={$currentCategoryId}
            onComplete={() => refreshData()}
            storeRefs={{
                showCategoryForm,
                editCategoryMode,
                currentCategoryId,
                allCategories
            }}
        />
    {/if}
</div>

<style>
    .tab-content {
        padding: 2rem;
    }
    
    h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        color: hsl(var(--foreground));
    }
    
    .category-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    .empty-state {
        background-color: hsl(var(--muted) / 0.3);
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .empty-state p {
        color: hsl(var(--muted-foreground));
        margin: 0;
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .primary-btn {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .primary-btn:hover {
        background: hsl(var(--primary-dark));
    }
    
    @media (max-width: 768px) {
        .action-buttons {
            flex-direction: column;
        }
    }
    
    @media (max-width: 600px) {
        .category-list {
            grid-template-columns: 1fr;
        }
    }
</style>
