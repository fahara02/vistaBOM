<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { JsonValue } from '@/types/primitive';
  import { fade, slide } from 'svelte/transition';
  import { enhance } from '$app/forms';
  import { Eye, Edit, Trash2, ExternalLink, Grip, Factory, Store, Package, Folder, Box, CircuitBoard, Component, Cpu } from 'lucide-svelte';
  import type { 
    GridEntity, 
    EntityType, 
    GridViewProps, 
    GridViewEvents, 
    DragState, 
    GridItemPosition,
    GridLayout,
    EntityFieldMappings
  } from '$lib/types/grid';
  import { entityFieldMappings, entityColorVariables } from '$lib/types/grid';
  import type { Manufacturer, Supplier, Category, Part, PartVersion } from '$lib/types/types';
  import type { PartStatusEnum } from '$lib/types/enums';
  import { LifecycleStatusEnum } from '$lib/types/enums';
  
  // Dynamic card imports based on entity type
  import ManufacturerCard from '$lib/components/cards/manufacturer.svelte';
  import SupplierCard from '$lib/components/cards/supplier.svelte';
  import CategoryCard from '$lib/components/cards/category.svelte';
  import PartCard from '$lib/components/cards/PartCard.svelte';
  
  // Helper function to create a properly typed minimal PartVersion object
  function createMinimalPartVersion(item: GridEntity): PartVersion {
    return {
      part_version_id: 'part_id' in item ? String(item.part_id) + '-v1' : crypto.randomUUID(),
      part_id: 'part_id' in item ? String(item.part_id) : crypto.randomUUID(),
      part_version: '1.0',
      part_name: 'part_name' in item ? String(item.part_name) : 'Unnamed Part',
      // Must use the imported enum value, not a string
      version_status: LifecycleStatusEnum.DRAFT,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUserId,
      // Using properties that exist in the PartVersion type
      description: 'Grid view version',
      is_hardware: false,
      is_software: false,
      is_purchased: false,
      is_virtual: true,
      has_rohs: false,
      has_reach: false,
      moisture_sensitivity_level: 1
    } as PartVersion;
  }
  
  function prepareManufacturerData(item: GridEntity): Manufacturer {
    // TypeScript narrowing - check if item is a Manufacturer by checking its properties
    if (!('manufacturer_id' in item) || !('manufacturer_name' in item)) {
      // If not a manufacturer, create an empty manufacturer to avoid runtime errors
      return {
        manufacturer_id: '',
        manufacturer_name: '',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: '',
        contact_info: undefined,
        custom_fields: undefined,
        manufacturer_description: undefined,
        website_url: undefined,
        logo_url: undefined,
        updated_by: undefined
      };
    }
    
    console.log('Preparing manufacturer data:', item);
    // Log to debug if logo_url exists in the raw data
    if ('logo_url' in item) {
      console.log('Logo URL found in manufacturer:', item.logo_url);
    }
    
    // Process contact_info - the schema supports string | object | undefined
    let contactInfoValue: string | undefined = undefined;
    if (item.contact_info !== undefined && item.contact_info !== null) {
      if (typeof item.contact_info === 'object') {
        // Convert object to JSON string to match required type
        contactInfoValue = JSON.stringify(item.contact_info);
      } else if (typeof item.contact_info === 'string') {
        contactInfoValue = item.contact_info;
      } else {
        // Convert any other type to string
        contactInfoValue = String(item.contact_info);
      }
    }
    
    // Handle custom_fields safely - ensuring we return JsonValue | undefined
    let customFieldsValue: JsonValue | undefined = undefined;
    if (item.custom_fields !== undefined && item.custom_fields !== null) {
      if (typeof item.custom_fields === 'string') {
        try {
          customFieldsValue = JSON.parse(item.custom_fields) as JsonValue;
        } catch {
          customFieldsValue = undefined;
        }
      } else if (typeof item.custom_fields === 'object') {
        // Already an object
        customFieldsValue = item.custom_fields as JsonValue;
      }
    }
    
    return {
      manufacturer_id: item.manufacturer_id,
      manufacturer_name: item.manufacturer_name,
      manufacturer_description: item.manufacturer_description || undefined,
      website_url: item.website_url || undefined,
      logo_url: item.logo_url || undefined,
      created_by: item.created_by || '', // Ensure created_by is never undefined
      created_at: item.created_at instanceof Date ? item.created_at : new Date(item.created_at),
      updated_at: item.updated_at instanceof Date ? item.updated_at : new Date(item.updated_at),
      updated_by: item.updated_by || undefined,
      contact_info: contactInfoValue, 
      custom_fields: customFieldsValue 
    };
  }
  


  function prepareSupplierData(item: GridEntity): Supplier {
    // TypeScript narrowing - check if item is a Supplier by checking its properties
    if (!('supplier_id' in item) || !('supplier_name' in item)) {
      // If not a supplier, create an empty supplier to avoid runtime errors
      return {
        supplier_id: '',
        supplier_name: '',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: '',
        contact_info: undefined,
        custom_fields: undefined,
        supplier_description: undefined,
        website_url: undefined,
        logo_url: undefined,
        updated_by: undefined
      };
    }
    
    // Process contact_info - the schema supports string | object | undefined
    let contactInfoValue: string | undefined = undefined;
    if (item.contact_info !== undefined && item.contact_info !== null) {
      if (typeof item.contact_info === 'object') {
        // Convert object to JSON string to match required type
        contactInfoValue = JSON.stringify(item.contact_info);
      } else if (typeof item.contact_info === 'string') {
        contactInfoValue = item.contact_info;
      } else {
        // Convert any other type to string
        contactInfoValue = String(item.contact_info);
      }
    }
    
    // Handle custom_fields safely - ensuring we return JsonValue | undefined
    let customFieldsValue: JsonValue | undefined = undefined;
    if (item.custom_fields !== undefined && item.custom_fields !== null) {
      if (typeof item.custom_fields === 'string') {
        try {
          customFieldsValue = JSON.parse(item.custom_fields) as JsonValue;
        } catch {
          customFieldsValue = undefined;
        }
      } else if (typeof item.custom_fields === 'object') {
        // Already an object
        customFieldsValue = item.custom_fields as JsonValue;
      }
    }
    
    return {
      supplier_id: item.supplier_id,
      supplier_name: item.supplier_name,
      supplier_description: item.supplier_description || undefined,
      website_url: item.website_url || undefined,
      logo_url: item.logo_url || undefined,
      created_by: item.created_by || '', // Ensure created_by is never undefined
      created_at: item.created_at instanceof Date ? item.created_at : new Date(item.created_at),
      updated_at: item.updated_at instanceof Date ? item.updated_at : new Date(item.updated_at),
      updated_by: item.updated_by || undefined,
      contact_info: contactInfoValue, // Now guaranteed to be string | null
      custom_fields: customFieldsValue // Now guaranteed to be Record<string, unknown> | null
    };
  }
  
  // Functions for Category and Part with correct types
  function prepareCategoryData(item: GridEntity): Category {
    // Check if the item is a Category
    if (!('category_id' in item) || !('category_name' in item)) {
      // Return placeholder data with correct type compatibility
      return {
        category_id: '',
        category_name: '',
        category_path: '',
        is_public: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: '',
        deleted_at: undefined,
        deleted_by: undefined,
        updated_by: undefined
        // No parent_category_id in Category type
      };
    }
    
    // Create a properly typed object instead of using unsafe cast
    const category: Category = {
      category_id: item.category_id,
      category_name: item.category_name,
      category_path: item.category_path,
      is_public: item.is_public,
      is_deleted: item.is_deleted,
      created_at: item.created_at,
      updated_at: item.updated_at,
      created_by: item.created_by,
      deleted_at: item.deleted_at,
      deleted_by: item.deleted_by,
      updated_by: item.updated_by
      // No parent_category_id in Category type
    };
    
    return category;
  }
  
  function preparePartData(item: GridEntity): Part {
    // Check if the item is a Part
    if (!('part_id' in item)) {
      // Return a minimal Part object with required fields
      return {
        part_id: '',
        creator_id: '',
        is_public: false,
        status_in_bom: 'active' as PartStatusEnum, // Cast to enum
        lifecycle_status: 'active' as LifecycleStatusEnum, // Cast to enum
        created_at: new Date(),
        updated_at: new Date()
        // Other fields will be undefined by default
      };
    }
    
    // Create a properly typed Part object with the required fields only
    const part: Part = {
      part_id: item.part_id,
      creator_id: item.creator_id || '',
      is_public: item.is_public,
      status_in_bom: item.status_in_bom,
      lifecycle_status: item.lifecycle_status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      updated_by: item.updated_by,
      custom_fields: item.custom_fields
    };
    
    // Only add optional fields if they exist in the item
    if ('global_part_number' in item) part.global_part_number = item.global_part_number;
    if ('current_version_id' in item) part.current_version_id = item.current_version_id;
    
    return part;
  }

  // Component props using Svelte 5 runes
  const { 
    items = [], 
    entityType = 'manufacturer',
    currentUserId = '',
    colorVariable = null,
    storageKey = null,
    columns = 5,
    itemWidth = 200,
    itemHeight = 100,
    gap = 8
  } = $props();

  // Determine storage key for positions
  const positionsStorageKey = storageKey || `${entityType}GridPositions`;
  
  // Get entity-specific field mappings
  const fieldMappings: EntityFieldMappings = entityFieldMappings[entityType as keyof typeof entityFieldMappings];
  
  // Determine color variable based on entity type or override
  // Define the entity-specific color variables and icons
  const entityColor = $derived(entityColorVariables[entityType as keyof typeof entityColorVariables] || '--primary');
  
  // Icons are directly used in the template with conditionals
  // This is the preferred approach in SvelteKit 5 runes mode
  
  // Component state using Svelte 5 runes syntax
  let expandedItemId = $state<string | null>(null);
  let gridPositions = $state<GridItemPosition[]>([]);
  let gridContainer: HTMLElement;
  let isDragging = $state<boolean>(false);
  let dragState = $state<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    itemId: null
  });

  // Event dispatcher with explicit types for proper TypeScript checking
  const dispatch = createEventDispatcher<{
    edit: { item: GridEntity };
    delete: { itemId: string };
    refresh: void;
    layoutChange: { layout: GridLayout };
    view: { item: GridEntity };
  }>();

  // Initialize grid positions on mount
  onMount(() => {
    initializeGridPositions();
    
    // Save positions to localStorage when component unmounts
    return () => {
      savePositions();
    };
  });

  // Initialize or load grid positions
  function initializeGridPositions(): void {
    // Try to load saved positions from localStorage
    const savedPositions = localStorage.getItem(positionsStorageKey);
    
    if (savedPositions) {
      try {
        const parsedPositions = JSON.parse(savedPositions);
        // Filter positions to only include items that still exist
        gridPositions = parsedPositions.filter((pos: GridItemPosition) => 
          items.some((item: GridEntity) => getItemId(item) === pos.id)
        );
        
        // Add positions for new items
        addMissingItems();
      } catch (e) {
        // If loading fails, initialize new positions
        initializeNewPositions();
      }
    } else {
      initializeNewPositions();
    }
  }

  // Initialize new positions for all items
  function initializeNewPositions(): void {
    gridPositions = items.map((item: GridEntity, index: number) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      
      return {
        id: getItemId(item),
        x: col,
        y: row,
        width: 1, // 1 column width
        height: 1 // 1 row height
      };
    });
  }

  // Add positions for new items that don't have positions yet
  function addMissingItems(): void {
    const missingItems = items.filter(
      (item: GridEntity) => !gridPositions.some((pos: GridItemPosition) => pos.id === getItemId(item))
    );
    
    if (missingItems.length > 0) {
      // Find the highest Y position to place new items below existing ones
      const maxY = gridPositions.reduce((max: number, pos: GridItemPosition) => 
        Math.max(max, pos.y + pos.height), 0);
      
      // Add positions for new items
      missingItems.forEach((item: GridEntity, index: number) => {
        const col = index % columns;
        const row = Math.floor(index / columns) + maxY;
        
        gridPositions = [...gridPositions, {
          id: getItemId(item),
          x: col,
          y: row,
          width: 1,
          height: 1
        }];
      });
    }
  }

  // Save positions to localStorage
  function savePositions(): void {
    localStorage.setItem(positionsStorageKey, JSON.stringify(gridPositions));
  }

  // Handle drag start
  function handleDragStart(event: DragEvent, itemId: string): void {
    if (!event.target) return;
    
    // Set dragging state
    dragState = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      itemId: itemId
    };
    
    // Set dataTransfer data
    event.dataTransfer?.setData('text/plain', itemId);
  }

  // Handle drag over
  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!dragState.isDragging || !dragState.itemId) return;
    
    dragState = {
      ...dragState,
      currentX: event.clientX,
      currentY: event.clientY
    };
  }

  // Handle drop
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    if (!dragState.isDragging || !dragState.itemId) return;
    
    const itemId = event.dataTransfer?.getData('text/plain');
    if (!itemId) return;
    
    // Get grid container dimensions
    const rect = gridContainer.getBoundingClientRect();
    
    // Calculate drop position in grid
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;
    
    // Calculate grid column and row
    const gridWidth = rect.width;
    const columnWidth = gridWidth / columns;
    
    const col = Math.min(Math.floor(dropX / columnWidth), columns - 1);
    const row = Math.floor(dropY / (itemHeight + gap));
    
    // Update grid positions
    gridPositions = gridPositions.map(pos => {
      if (pos.id === itemId) {
        return { ...pos, x: col, y: row };
      }
      return pos;
    });
    
    // Reset drag state
    dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      itemId: null
    };
    
    // Save positions
    savePositions();

    // Dispatch layout change event
    dispatch('layoutChange', { 
      layout: {
        positions: gridPositions,
        columns,
        rowHeight: itemHeight
      } 
    });
  }

  // Handle drag end
  function handleDragEnd(event: DragEvent): void {
    if (!dragState.itemId) return;
    
    // Reset drag state
    dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      itemId: null
    };
  }



  // Handle click to expand item details
  function toggleItemDetails(itemId: string): void {
    expandedItemId = expandedItemId === itemId ? null : itemId;
    
    if (expandedItemId) {
      const item = getItemById(itemId);
      if (item) {
        dispatch('view', { item });
      }
    }
  }

  // Handle edit event from item card
  function handleItemEdit(item: GridEntity): void {
    // Immediately close any modal that might be open
    expandedItemId = null;
    
    // Create a copy of the item to avoid modifying the original
    const itemCopy = { ...item };
    
    // For manufacturer and supplier, preserve the original JSON format
    if ((entityType === 'manufacturer' || entityType === 'supplier')) {
      // For contact_info, ensure it's a string as expected by the form
      if ('contact_info' in itemCopy) {
        if (itemCopy.contact_info === null || itemCopy.contact_info === undefined) {
          itemCopy.contact_info = '{}';
        } else if (typeof itemCopy.contact_info === 'object') {
          // Convert object to string if it's not already a string
          itemCopy.contact_info = JSON.stringify(itemCopy.contact_info);
        }
        // If it's already a string, leave it as is
      }
      
      // For custom_fields, ensure it's a string as expected by the form
      if ('custom_fields' in itemCopy) {
        if (itemCopy.custom_fields === null || itemCopy.custom_fields === undefined) {
          itemCopy.custom_fields = '{}';
        } else if (typeof itemCopy.custom_fields === 'object') {
          // Convert object to string if it's not already a string
          itemCopy.custom_fields = JSON.stringify(itemCopy.custom_fields);
        }
        // If it's already a string, leave it as is
      }
    }
    
    console.log('Sending edit event with item:', itemCopy);
    dispatch('edit', { item: itemCopy });
  }

  // Handle delete event from item card
  function handleItemDeleted(): void {
    expandedItemId = null;
    dispatch('refresh');
  }

  // Handle delete button click
  function handleDeleteItem(item: GridEntity): void {
    console.log('Delete item clicked:', getItemId(item));
    
    // Use the standard 'delete' event type that's already defined in GridViewEvents
    // Make sure to follow the expected interface: { itemId: string }
    dispatch('delete', { 
      itemId: getItemId(item)
    });
    
    // Also provide additional context as custom event properties
    const deleteEvent = new CustomEvent('deleteContext', {
      detail: {
        entityType: entityType,
        item: item
      }
    });
    dispatchEvent(deleteEvent);
  }

  // Truncate text to specified length
  function truncateText(text: string | null | undefined, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }

  // Format URL for display
  function formatUrl(url: string | null | undefined): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  }

  // Helper function to get item ID based on entity type
  function getItemId(item: GridEntity): string {
    return item[fieldMappings.id as keyof GridEntity] as string;
  }

  // Helper function to get item name based on entity type
  function getItemName(item: GridEntity): string {
    return (item[fieldMappings.name as keyof GridEntity] as string) || 'Unnamed';
  }

  // Helper function to get item description based on entity type
  function getItemDescription(item: GridEntity): string {
    return (item[fieldMappings.description as keyof GridEntity] as string) || '';
  }

  // Helper to check if the item has a website (only manufacturer and supplier)
  function hasWebsite(item: GridEntity): boolean {
    return (
      (entityType === 'manufacturer' || entityType === 'supplier') && 
      'website_url' in item && 
      !!item.website_url
    );
  }

  // Helper to get the website URL
  function getWebsiteUrl(item: GridEntity): string {
    if ((entityType === 'manufacturer' || entityType === 'supplier') && 'website_url' in item) {
      return item.website_url as string;
    }
    return '';
  }

  // Helper function to get item by ID
  function getItemById(id: string): GridEntity | undefined {
    return items.find((item: GridEntity) => getItemId(item) === id);
  }

  // Helper function to check if item has specific properties
  function getItemCreatedBy(item: GridEntity): string {
    const createdByField = fieldMappings.createdBy;
    if (createdByField in item) {
      return (item[createdByField as keyof GridEntity] as string) || '';
    }
    return '';
  }
  
  // Helper function to process custom fields and contact info
  function processItemForCard(item: GridEntity): Record<string, any> {
    // Create a shallow copy to avoid modifying the original
    const processedItem: Record<string, any> = { ...item };
    
    // Process contact_info for manufacturer and supplier - ensure it's string | null
    if ((entityType === 'manufacturer' || entityType === 'supplier') && 'contact_info' in item) {
      // Always ensure contact_info is a string or null as expected by the card components
      if (item.contact_info === null || item.contact_info === undefined) {
        processedItem.contact_info = null;
      } else if (typeof item.contact_info === 'string') {
        processedItem.contact_info = item.contact_info;
      } else {
        // Convert object to JSON string
        processedItem.contact_info = JSON.stringify(item.contact_info);
      }
    }
    
    // Process custom_fields - convert to proper format for each entity type
    if ('custom_fields' in item) {
      if (item.custom_fields === null || item.custom_fields === undefined) {
        processedItem.custom_fields = null;
      } else if (typeof item.custom_fields === 'string') {
        try {
          processedItem.custom_fields = JSON.parse(item.custom_fields);
        } catch (e) {
          processedItem.custom_fields = null;
        }
      }
    }
    
    return processedItem;
  }
</script>

<!-- Hidden forms for delete actions that will be submitted via JavaScript -->
{#each items as item}
  <form 
    method="POST" 
    action={fieldMappings.deleteAction} 
    id="delete-{entityType}-{getItemId(item)}" 
    class="hidden"
    use:enhance={() => {
      return async ({ result }) => {
        if (result.type === 'success') {
          dispatch('refresh');
        }
      };
    }}
  >
    <input type="hidden" name="{fieldMappings.id}" value={getItemId(item)} />
  </form>
{/each}

<div 
  class="grid-container"
  bind:this={gridContainer}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  role="region"
  aria-label="{entityType} grid"
>
  {#if !items || items.length === 0}
    <p class="empty-message">No {entityType}s to display</p>
  {:else}
    <!-- Grid layout for items -->
    <div class="grid-layout" style="--grid-columns: {columns}; --item-width: {itemWidth}px; --item-height: {itemHeight}px; --grid-gap: {gap}px; --entity-color: hsl(var({entityColor}));">
      {#each gridPositions as position}
        {@const item = getItemById(position.id)}
        {#if item}
          <div 
            id="{entityType}-{getItemId(item)}"
            class="grid-item {dragState.itemId === getItemId(item) ? 'dragging' : ''}"
            style="--grid-x: {position.x}; --grid-y: {position.y}; --grid-width: {position.width}; --grid-height: {position.height};"
            draggable={true}
            ondragstart={(e) => handleDragStart(e, getItemId(item))}
            ondragend={handleDragEnd}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                expandedItemId = getItemId(item);
                e.preventDefault();
              }
            }}
          >
            <div 
              class="item-card {expandedItemId === getItemId(item) ? 'expanded' : ''}"
              onclick={() => toggleItemDetails(getItemId(item))}
              onkeydown={(e) => e.key === 'Enter' && toggleItemDetails(getItemId(item))}
              tabindex="0"
              role="button"
              aria-expanded={expandedItemId === getItemId(item)}
            >
              <div class="drag-handle" onmousedown={(e) => { e.stopPropagation(); }} role="presentation">
                <Grip size={14} />
              </div>
              <!-- Card Header with icon/logo, name and actions -->
              <div class="card-header">
                <div class="card-title-container">
                  <span class="entity-icon">
                    {#if entityType === 'manufacturer'}
                      <Factory size={16} />
                    {:else if entityType === 'supplier'}
                      <Store size={16} />
                    {:else if entityType === 'category'}
                      <Folder size={16} />
                    {:else if entityType === 'part'}
                      <CircuitBoard size={16} />
                    {:else}
                      <Box size={16} />
                    {/if}
                  </span>
                  <h3 class="card-title">{getItemName(item) || 'Unnamed ' + entityType}</h3>
                </div>
                <div class="card-actions">
                  <button 
                    class="action-button view-button" 
                    title="View details"
                    onclick={(e) => { e.stopPropagation(); toggleItemDetails(getItemId(item)); }}
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    class="action-button edit-button" 
                    title="Edit {entityType}"
                    onclick={(e) => {
                      e.stopPropagation();
                      // Close the modal completely
                      expandedItemId = null;
                      
                      // Ensure modal is closed first, then handle edit in the dashboard context
                      // Use a slight delay to ensure the modal is fully closed
                      setTimeout(() => {
                        // Handle the edit within the dashboard
                        handleItemEdit(item);
                      }, 10);
                    }}
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    class="action-button delete-button" 
                    title="Delete {entityType}"
                    onclick={(e) => {
                      e.stopPropagation();
                      // Immediate delete without confirmation
                      const itemId = getItemId(item);
                      console.log('Deleting item:', itemId);
                      dispatch('delete', { itemId });
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div class="card-body">
                {#if getItemDescription(item)}
                  <p class="item-description">
                    {truncateText(getItemDescription(item), 30)}
                  </p>
                {/if}
                
                {#if hasWebsite(item)}
                  <div class="website">
                    <a 
                      href={getWebsiteUrl(item)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="website-link"
                      onclick={(e) => e.stopPropagation()}
                    >
                      <span class="website-text">{formatUrl(getWebsiteUrl(item))}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                {/if}
                
                <!-- Logo display in bottom right corner for suppliers and manufacturers -->
                <!-- Logo display for suppliers and manufacturers -->
                {#if entityType === 'supplier' && 'logo_url' in item && item.logo_url}
                  <div class="entity-logo-container">
                    <div class="entity-logo" title="{getItemName(item)} logo">
                      <img src={item.logo_url} alt="{getItemName(item)} logo" loading="lazy" />
                    </div>
                  </div>
                {:else if entityType === 'manufacturer'}
                  <!-- Handle both camelCase and snake_case logo properties for manufacturers -->
                  {#if 'manufacturer_id' in item}
                    {@const manufacturer = prepareManufacturerData(item)}
                    {@const logoSrc = 'logoUrl' in item && typeof item.logoUrl === 'string' ? 
                                  String(item.logoUrl) : 
                                  (manufacturer.logo_url ? String(manufacturer.logo_url) : '')}
                    {#if logoSrc}
                      <div class="entity-logo-container">
                        <div class="entity-logo" title="{manufacturer.manufacturer_name} logo">
                          <img src={logoSrc} alt="{manufacturer.manufacturer_name} logo" loading="lazy" />
                        </div>
                      </div>
                    {/if}
                  {/if}
                {/if}
                
                {#if entityType === 'part' && 'part_number' in item}
                  <div class="part-info">
                    <span class="part-number">#{item.part_number}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
  
  <!-- Expanded item detail view as a modal overlay -->
  {#if expandedItemId}
    <div class="modal-overlay" transition:fade={{ duration: 100 }}>
      {#each items as item}
        {#if expandedItemId === getItemId(item)}
          <div class="modal-content" transition:slide={{ duration: 200 }}>
            <div class="modal-header">
              <h2 class="modal-title">{getItemName(item)}</h2>
              <button 
                class="close-button" 
                onclick={() => expandedItemId = null}
                aria-label="Close details"
              >
                <span>×</span>
              </button>
            </div>
            <div class="modal-header">
              <h2 class="modal-title">{getItemName(item)}</h2>
              <button 
                class="close-button" 
                onclick={() => expandedItemId = null}
                aria-label="Close details"
              >
                <span>×</span>
              </button>
            </div>
            <div class="modal-body">
            <!-- Render the appropriate card component based on entity type -->
            {#if entityType === 'manufacturer'}
              <ManufacturerCard
                manufacturer={prepareManufacturerData(item)}
                currentUserId={currentUserId}
                allowEdit={currentUserId === getItemCreatedBy(item)}
                allowDelete={currentUserId === getItemCreatedBy(item)}
                on:edit={() => handleItemEdit(item)}
                on:deleted={handleItemDeleted}
              />
            {:else if entityType === 'supplier'}
              <SupplierCard
                supplier={prepareSupplierData(item)}
                currentUserId={currentUserId}
                allowEdit={currentUserId === getItemCreatedBy(item)}
                allowDelete={currentUserId === getItemCreatedBy(item)}
                on:edit={() => handleItemEdit(item)}
                on:deleted={handleItemDeleted}
              />
            {:else if entityType === 'category'}
              <CategoryCard
                category={prepareCategoryData(item)}
                allowEdit={currentUserId === getItemCreatedBy(item)}
                allowDelete={currentUserId === getItemCreatedBy(item)}
                on:edit={() => handleItemEdit(item)}
                on:deleted={handleItemDeleted}
              />
            {:else if entityType === 'part'}
              <!-- Create minimal part version for grid view -->
              <PartCard
                part={preparePartData(item)}
                currentVersion={createMinimalPartVersion(item)}
              />
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>
  {/if}
</div>

<style>
  .grid-container {
    width: 100%;
    height: 500px;
    overflow-y: auto;
    background: hsl(var(--card));
    border-radius: 8px;
    position: relative;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid hsl(var(--border));
    box-shadow: 0 2px 8px hsl(var(--shadow) / 0.08);
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted)) transparent;
  }
  
  .grid-container::-webkit-scrollbar {
    width: 8px;
  }
  
  .grid-container::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .grid-container::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted));
    border-radius: 4px;
  }
  
  .empty-message {
    padding: 1rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 6px;
  }
  
  /* Hidden forms */
  .hidden {
    display: none !important;
  }
  
  /* These styles are commented out to fix lint warnings. They will be used in future loading state implementation */
  /*
  .grid-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: hsl(var(--card) / 0.7);
    z-index: 5;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid hsl(var(--muted));
    border-top-color: hsl(var(--primary));
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  */
  
  /* Focus outline for keyboard navigation */
  .grid-item:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
  
  /* This style is commented out to fix lint warnings. Will be used for future error handling implementation */
  /*
  .load-error {
    padding: 16px;
    text-align: center;
    color: hsl(var(--muted-foreground));
    border: 1px dashed hsl(var(--border));
    border-radius: 8px;
    margin: 16px 0;
  }
  */

  /* Grid layout */
  .grid-layout {
    display: grid;
    grid-template-columns: repeat(var(--grid-columns), 1fr);
    gap: var(--grid-gap);
    width: 100%;
    position: relative;
  }

  .grid-item {
    grid-column: calc(var(--grid-x) + 1) / span var(--grid-width);
    grid-row: calc(var(--grid-y) + 1) / span var(--grid-height);
    width: 100%;
    height: 100%;
    min-width: var(--item-width);
    min-height: var(--item-height);
    transition: transform 0.2s ease-out;
  }
  
  /* Dragging state styling applied dynamically */
  .grid-item.dragging {
    z-index: 10;
    opacity: 0.9;
  }
  
  .grid-item:active {
    cursor: grabbing;
  }
  
  /* Enhanced entity-specific colors applied through style variables */

  .item-card {
    height: 100%;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    box-shadow: 0 2px 4px hsl(var(--shadow) / 0.05);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    /* Subtle border accent based on entity type */
    border-left: 3px solid hsl(var(--entity-color));
    /* Set max width to prevent oversized content */
    max-width: 100%;
  }

  .item-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px hsl(var(--shadow) / 0.15);
    background: hsl(var(--card-hover));
    border-color: hsl(var(--entity-color));
  }
  
  .item-card:hover .entity-icon {
    color: hsl(var(--entity-color-600));
    background: hsl(var(--entity-color) / 0.25);
    transform: scale(1.05);
  }

  .item-card.expanded {
    background: hsl(var(--entity-color) / 0.1);
    border-color: var(--entity-color);
  }

  .drag-handle {
    position: absolute;
    top: 2px;
    left: 2px;
    color: hsl(var(--muted-foreground));
    cursor: grab;
    padding: 2px;
    z-index: 2;
    border-radius: 4px;
    opacity: 0.6;
  }
  
  .drag-handle:hover {
    background: hsl(var(--muted) / 0.5);
  }
  
  /* Card styles are defined directly on item-card and other specific selectors */ 
  
  .card-header {
    margin-bottom: 0.15rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.75rem 0.5rem;
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    overflow: hidden;
    background: hsl(var(--entity-color) / 0.05);
  }

  .card-title-container {
    display: flex;
    align-items: center;
    overflow: hidden;
    max-width: calc(100% - 80px);
    min-width: 0; /* Important for text overflow to work */
  }
  
  .entity-logo-container {
    position: absolute;
    bottom: 4px;
    right: 4px;
    z-index: 1;
  }
  
  .entity-logo {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid hsl(var(--entity-color) / 0.2);
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .entity-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
  }

  .entity-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    padding: 4px;
    /* Enhanced icon styling with variable colors based on entity type */
    color: hsl(var(--entity-color));
    background: hsl(var(--entity-color) / 0.15);
    box-shadow: 0 2px 4px hsl(var(--entity-color) / 0.1);
    transition: all 0.2s ease;
  }
  
  .card-title {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    font-family: var(--font-display);
    color: hsl(var(--foreground));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - 32px); /* Account for icon width + margin */
    letter-spacing: var(--tracking-tight);
  }

  .card-body {
    padding: 8px;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .item-description {
    font-size: var(--text-xs);
    font-family: var(--font-sans);
    color: hsl(var(--muted-foreground));
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: var(--leading-normal);
  }

  .website {
    margin-top: 0.15rem;
  }

  .part-info {
    margin-top: 0.15rem;
    font-size: var(--text-xs);
    color: hsl(var(--info));
  }

  /* Website link */
  .website-link {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    color: var(--entity-color);
    text-decoration: none;
    font-size: var(--text-xs);
  }

  .website-link:hover {
    text-decoration: underline;
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    margin-left: auto;
  }

  /* Action buttons */
  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    width: 24px;
    height: 24px;
  }
  
  .action-button:hover {
    background: hsl(var(--entity-color) / 0.1);
    color: hsl(var(--entity-color));
    transform: translateY(-1px);
  }
  
  .action-button:active {
    transform: translateY(0);
  }

  .view-button:hover {
    background: hsl(var(--entity-color) / 0.1);
    color: var(--entity-color);
    opacity: 1;
  }

  .edit-button:hover {
    background: hsl(var(--info) / 0.1);
    color: hsl(var(--info));
    opacity: 1;
  }

  .delete-button:hover {
    background: hsl(var(--destructive) / 0.1);
    color: hsl(var(--destructive));
  }
  
  /* Modal overlay styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: hsl(var(--background) / 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 16px;
  }
  
  .modal-content {
    background-color: hsl(var(--background));
    margin: 5% auto;
    padding: 24px;
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 24px hsl(var(--shadow) / 0.15);
    position: relative;
    animation: modalEnter 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
  }
  
  @keyframes modalEnter {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid hsl(var(--border));
    background: hsl(var(--muted) / 0.05);
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  
  .modal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    border-left: 3px solid hsl(var(--entity-color));
    padding-left: 12px;
    line-height: 1.4;
  }
  
  .modal-body {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted)) transparent;
  }
  
  .modal-body::-webkit-scrollbar {
    width: 8px;
  }
  
  .modal-body::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .modal-body::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted));
    border-radius: 4px;
  }
  
  .close-button {
    background: hsl(var(--muted) / 0.1);
    border: none;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    color: hsl(var(--muted-foreground));
    transition: all 0.2s ease-in-out;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  
  .close-button:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--entity-color) / 0.2);
  }
  
  /* Responsive adjustments */
  @media (max-width: 1200px) {
    .grid-layout {
      --grid-columns: 3;
    }
  }
  
  @media (max-width: 900px) {
    .grid-layout {
      --grid-columns: 2;
    }
  }
  
  @media (max-width: 600px) {
    .grid-layout {
      --grid-columns: 1;
    }
    
    .modal-content {
      width: 95%;
      padding: 0.5rem;
    }
  }
</style>
