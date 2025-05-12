<!-- src/lib/components/CategoryTree.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Category } from '$lib/server/db/types';
  import { categoriesToTreeNodes, selectAndExpandToNode } from '$lib/utils/categoryTreeUtils';
  import CategoryTreeNode from './CategoryTreeNode.svelte';
  
  // Props
  export let categories: Category[] = [];
  export let selectedCategoryId: string | null = null;
  export let expandSelected = true;
  export let selectable = true;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    select: { categoryId: string, category: Category };
  }>();

  // Convert categories to tree nodes
  $: treeNodes = categoriesToTreeNodes(categories);
  
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

<div class="category-tree-container border rounded p-2">
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
    <div class="no-categories p-4 text-gray-500 text-center">
      No categories available
    </div>
  {/if}
</div>

<style>
  .category-tree-container {
    width: 100%;
    max-height: 500px;
    overflow-y: auto;
    background: white;
  }

  .category-tree {
    width: 100%;
  }

  .no-categories {
    font-style: italic;
  }
</style>
