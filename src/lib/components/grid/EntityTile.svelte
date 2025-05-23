<!-- src/lib/components/grid/EntityTile.svelte -->
<script lang="ts">
  import { Building, Factory, Store } from 'lucide-svelte';
  
  interface EntityWithId {
    manufacturer_id?: string;
    supplier_id?: string;
    category_id?: string;
    manufacturer_name?: string;
    supplier_name?: string;
    category_name?: string;
  }

  export let entity: EntityWithId;
  export let entityType: 'supplier' | 'manufacturer' | 'category';
  export let onClick: () => void;
  export let expanded: boolean = false;
  
  // Determine the entity name and id based on type
  $: entityName = entityType === 'supplier' 
    ? entity.supplier_name 
    : entityType === 'manufacturer' 
      ? entity.manufacturer_name 
      : entity.category_name;
      
  $: entityId = entityType === 'supplier' 
    ? entity.supplier_id 
    : entityType === 'manufacturer' 
      ? entity.manufacturer_id 
      : entity.category_id;
      
  // Get the appropriate icon based on entity type
  $: IconComponent = entityType === 'supplier' 
    ? Store 
    : entityType === 'manufacturer' 
      ? Factory 
      : Building;

  // Function to handle keyboard events for accessibility
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }
</script>

<div 
  class="entity-tile" 
  class:expanded={expanded}
  on:click={onClick} 
  on:keydown={handleKeydown}
  role="button" 
  tabindex="0"
  data-entity-type={entityType}
  data-entity-id={entityId}
>
  <div class="entity-icon">
    <svelte:component this={IconComponent} size={16} />
  </div>
  <div class="entity-name">{entityName || 'Unnamed Entity'}</div>
</div>

<style>
  .entity-tile {
    background: hsl(var(--card));
    color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
    cursor: pointer;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 80px;
    max-height: 120px;
    text-align: center;
    user-select: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .entity-tile:hover {
    border-color: hsl(var(--primary));
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    background: hsl(var(--card) / 0.95);
  }
  
  .entity-tile.expanded {
    border-color: hsl(var(--primary));
    background-color: hsl(var(--primary) / 0.1);
    position: relative;
  }
  
  .entity-tile.expanded::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid hsl(var(--primary));
  }
  
  .entity-tile:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
  
  .entity-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--primary));
    background-color: hsl(var(--primary) / 0.1);
    padding: 0.5rem;
    border-radius: 50%;
    transition: background-color 0.2s ease, transform 0.2s ease;
    width: 32px;
    height: 32px;
  }
  
  .entity-tile:hover .entity-icon {
    background-color: hsl(var(--primary) / 0.15);
  }
  
  .entity-name {
    font-weight: 500;
    font-size: 0.9rem;
    color: hsl(var(--foreground));
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    max-width: 100%;
  }
</style>
