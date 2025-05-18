<!-- src/lib/components/CategoryTree.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Category } from '@/types/types';
  import { categoriesToTreeNodes, selectAndExpandToNode } from '$lib/utils/categoryTreeUtils';
  import CategoryTreeNode from './CategoryTreeNode.svelte';
  import { onMount } from 'svelte';

  // Props
  export let categories: Category[] = [];
  export let selectedCategoryId: string | null = null;
  export let expandSelected = true;
  export let selectable = true;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    select: { categoryId: string, category: Category };
  }>();

  // First, filter out any deleted categories to ensure consistency
  $: activeCategories = categories.filter(cat => 
    cat && cat.is_deleted === false && cat.deleted_at === null
  );

  // Then convert active categories to tree nodes
  $: treeNodes = categoriesToTreeNodes(activeCategories);
  
  // Listen for category updates from other components
  onMount(() => {
    if (typeof window !== 'undefined') {
      const handleCategoryUpdate = (event: CustomEvent) => {
        console.log('CategoryTree: Received categoriesUpdated event');
        if (event.detail && Array.isArray(event.detail.categories)) {
          // Update with the new filtered categories
          categories = event.detail.categories;
          console.log(`CategoryTree: Updated with ${categories.length} categories`);
        }
      };
      
      // Add listener for category updates
      window.addEventListener('categoriesUpdated', handleCategoryUpdate as EventListener);
      
      // Clean up on component destroy
      return () => {
        window.removeEventListener('categoriesUpdated', handleCategoryUpdate as EventListener);
      };
    }
  });
  
  // Auto-expand to selected node
  $: if (expandSelected && selectedCategoryId) {
    treeNodes = selectAndExpandToNode(treeNodes, selectedCategoryId);
  }

  // Handle node selection
  function handleNodeSelect(event: CustomEvent) {
    if (!selectable) return;
    
    const node = event.detail;
    const category = node.data;
    
    if (category && category.id) {
      dispatch('select', { categoryId: category.id, category });
    }
  }
</script>

<div class="category-tree-container">
  {#if treeNodes.length > 0}
    <div class="category-tree">
      {#each treeNodes as node}
        <CategoryTreeNode 
          {node} 
          {selectable} 
          on:select={handleNodeSelect} 
        />
      {/each}
    </div>
  {:else}
    <div class="no-categories">
      No categories available
    </div>
  {/if}
</div>

<style>
  .category-tree-container {
    width: 100%;
    max-height: 500px;
    overflow-y: auto;
    background-color: hsl(var(--surface-100));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 0.75rem;
    box-shadow: 0 2px 4px hsl(var(--muted) / 0.2);
    transition: background-color 0.3s, border-color 0.3s, color 0.3s, box-shadow 0.3s;
  }

  .category-tree {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .no-categories {
    font-style: italic;
    padding: 1.5rem 1rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
    border-radius: 0.375rem;
    background-color: hsl(var(--surface-50) / 0.5);
    border: 1px dashed hsl(var(--border));
  }

  /* Add dark mode compatibility */
  :global(.dark) .category-tree-container {
    box-shadow: 0 4px 8px hsl(217 33% 10% / 0.5);
    background-color: hsl(var(--surface-100));
    border-color: hsl(var(--card-border));
  }
  
  :global(.dark) .no-categories {
    background-color: hsl(var(--surface-50) / 0.2);
    border-color: hsl(var(--border));
  }
</style>
