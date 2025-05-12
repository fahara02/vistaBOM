<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Collapsible from '$lib/components/ui/collapsible';
  import { ChevronRight, ChevronDown, Folder } from 'lucide-svelte';
  import type { TreeNode } from '$lib/utils/categoryTreeUtils';
  
  export let node: TreeNode;
  export let level: number = 0;
  export let selectable: boolean = true;
  
  const dispatch = createEventDispatcher<{
    select: TreeNode;
  }>();
  
  let expanded = !!node.expanded;
  
  function toggleExpand() {
    expanded = !expanded;
    node.expanded = expanded;
  }
  
  function handleSelect() {
    if (!selectable) return;
    dispatch('select', node);
  }
  
  const paddingLeft = `${level * 1.5}rem`;
</script>

<div class="category-tree-node">
  <Collapsible.Root bind:open={expanded}>
    <div 
      class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer {node.selected ? 'bg-gray-200' : ''}"
      style="padding-left: {paddingLeft};"
      on:click={handleSelect}
    >
      {#if node.hasChildren}
        <button class="mr-1 p-1" on:click|stopPropagation={toggleExpand}>
          {#if expanded}
            <ChevronDown class="h-4 w-4" />
          {:else}
            <ChevronRight class="h-4 w-4" />
          {/if}
        </button>
      {:else}
        <span class="w-6"></span>
      {/if}
      
      <Folder class="h-4 w-4 mr-2 text-blue-500" />
      <span>{node.title}</span>
    </div>
    
    {#if node.hasChildren}
      <Collapsible.Content>
        <div class="category-tree-children">
          {#each node.children || [] as childNode}
            <svelte:self 
              node={childNode} 
              level={level + 1}
              {selectable}
              on:select
            />
          {/each}
        </div>
      </Collapsible.Content>
    {/if}
  </Collapsible.Root>
</div>

<style>
  .category-tree-node {
    width: 100%;
  }
</style>
