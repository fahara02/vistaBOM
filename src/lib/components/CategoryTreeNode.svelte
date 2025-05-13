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
      class="tree-node-item {node.selected ? 'selected' : ''}"
      style="padding-left: {paddingLeft};"
      on:click={handleSelect}
      on:keydown={(e) => e.key === 'Enter' && handleSelect()}
      tabindex="0"
      role="treeitem"
      aria-selected={node.selected}
      aria-expanded={node.hasChildren ? expanded : undefined}
    >
      {#if node.hasChildren}
        <button class="expand-toggle" on:click|stopPropagation={toggleExpand}>
          <div class="icon-wrapper">
            {#if expanded}
              <ChevronDown size={16} stroke="currentColor" />
            {:else}
              <ChevronRight size={16} stroke="currentColor" />
            {/if}
          </div>
        </button>
      {:else}
        <span class="placeholder-icon"></span>
      {/if}
      
      <div class="icon-wrapper folder">
        <Folder size={16} stroke="currentColor" />
      </div>
      <span class="category-title">{node.title}</span>
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

  .tree-node-item {
    display: flex;
    align-items: center;
    padding: 0.625rem 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 2px;
    color: hsl(var(--foreground));
    background-color: transparent;
    border: 1px solid transparent;
    font-size: 0.9375rem;
  }

  .tree-node-item:hover {
    background-color: hsl(var(--surface-200) / 0.8);
    border-color: hsl(var(--border));
  }

  .tree-node-item.selected {
    background-color: hsl(var(--category-color) / 0.1);
    border-color: hsl(var(--category-color) / 0.3);
    font-weight: 500;
  }

  .tree-node-item:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 1px;
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: hsl(var(--muted-foreground));
  }

  .icon-wrapper.folder {
    margin-right: 0.5rem;
    color: hsl(var(--category-color));
  }

  .expand-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.25rem;
    padding: 0.125rem;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
  }

  .expand-toggle:hover {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .placeholder-icon {
    width: 24px;
    margin-right: 0.25rem;
  }

  .category-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }

  /* Dark mode specific adjustments */
  :global(.dark) .tree-node-item:hover {
    background-color: hsl(var(--surface-200) / 0.5);
    border-color: hsl(var(--border));
  }

  :global(.dark) .tree-node-item.selected {
    background-color: hsl(var(--category-color) / 0.15);
    border-color: hsl(var(--category-color) / 0.3);
  }

  :global(.dark) .expand-toggle:hover {
    background-color: hsl(var(--muted) / 0.7);
  }
  
  :global(.dark) .icon-wrapper.folder {
    color: hsl(var(--category-color) / 0.9);
  }
</style>
