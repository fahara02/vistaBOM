<!-- src/lib/components/MultiCategorySelector.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import Check from "lucide-svelte/icons/check";
  import X from "lucide-svelte/icons/x";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import type { Category } from '$lib/server/db/types';
  
  // Props
  export let categories: Category[] = [];
  export let selectedCategoryIds: string[] = []; // Selected category IDs
  export let placeholder: string = "Select categories...";
  export let name: string = "category_ids"; // Form field name
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let width: string = "w-full"; // Control the width of the component
  export let id: string = ""; // HTML id for the component (for accessibility)
  
  let open = false;
  
  // Function to get parent name for a category
  function getParentName(category: Category): string {
    if (!category.parentId) return '';
    const parent = categories.find(c => c.id === category.parentId);
    return parent ? parent.name : '';
  }

  // Create formatted options for the combobox
  $: options = categories.map(category => {
    return {
      value: category.id,
      label: category.name,
      parentId: category.parentId,
      parentName: getParentName(category)
    };
  });
  
  // Get selected category names
  $: selectedCategories = options.filter(opt => 
    selectedCategoryIds.includes(opt.value)
  );
  
  // Display selected categories or placeholder
  $: displayText = selectedCategories.length > 0 
    ? `${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'} selected` 
    : placeholder;
  
  // We want to refocus the trigger button when the user selects
  // an item from the list so users can continue navigating the form
  function closeAndFocusTrigger(triggerId: string) {
    open = false;
    tick().then(() => {
      document.getElementById(triggerId)?.focus();
    });
  }
  
  function toggleCategory(categoryId: string) {
    if (selectedCategoryIds.includes(categoryId)) {
      selectedCategoryIds = selectedCategoryIds.filter(id => id !== categoryId);
    } else {
      selectedCategoryIds = [...selectedCategoryIds, categoryId];
    }
  }
  
  function getCategoryNameById(id: string): string {
    return options.find(opt => opt.value === id)?.label || "Unknown category";
  }
</script>

<div class={width} {id} style="position: relative;">
  <Popover.Root bind:open let:ids>
    <Popover.Trigger asChild let:builder>
      <Button
        builders={[builder]}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="justify-between w-full combobox-trigger"
        disabled={disabled}
      >
        <span class="truncate">{displayText}</span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-y-auto dropdown-content" side="bottom" align="start" sideOffset={8}>
      <Command.Root>
        <Command.Input placeholder="Search categories..." />
        <Command.Empty>No categories found.</Command.Empty>
        <Command.Group>
          {#each options as option}
            <Command.Item
              value={option.label}
              onSelect={() => {
                toggleCategory(option.value);
              }}
            >
              <div class="flex items-center">
                <Check
                  class={cn(
                    "mr-2 h-4 w-4",
                    !selectedCategoryIds.includes(option.value) && "text-transparent"
                  )}
                />
                {option.label}
              </div>
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
  
  <!-- Selected categories display -->
  {#if selectedCategoryIds.length > 0}
    <div class="selected-categories">
      {#each selectedCategoryIds as categoryId}
        <div class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-700 category-tag">
          {getCategoryNameById(categoryId)}
          <button 
            type="button" 
            class="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none"
            on:click={() => toggleCategory(categoryId)}
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Hidden input with comma-separated category IDs for form submission -->
  <input 
    type="hidden" 
    {name} 
    value={selectedCategoryIds.join(',')} 
    {required} 
  />
</div>

<style>
  /* Dropdown styling */
  :global(.dropdown-content) {
    background-color: white !important;
    border: 1px solid #d1d5db !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
    z-index: 50 !important;
    max-width: calc(100vw - 20px);
    width: var(--radix-popover-trigger-width);
    max-height: 300px;
    overflow-y: auto;
  }
  
  /* Command input styling */
  :global(.dropdown-content .cmdk-input) {
    border-bottom: 1px solid #e2e8f0 !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.875rem !important;
    background-color: white !important;
  }
  
  /* Command item styling */
  :global(.dropdown-content .cmdk-item) {
    padding: 0.5rem 1rem !important;
    margin: 0 !important;
    cursor: pointer !important;
    border-radius: 0 !important;
    font-size: 0.875rem !important;
    color: #1f2937 !important;
    background-color: white !important;
  }
  
  :global(.dropdown-content .cmdk-item:hover) {
    background-color: #f3f4f6 !important;
  }
  
  :global(.dropdown-content .cmdk-item[data-selected=true]) {
    background-color: #e5e7eb !important;
  }
  
  /* Button styling */
  :global(.combobox-trigger) {
    border: 1px solid #d1d5db !important;
    background-color: white !important;
    padding: 0.5rem 0.75rem !important;
    border-radius: 0.375rem !important;
    width: 100% !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 0.875rem !important;
    color: #374151 !important;
    transition: all 0.2s !important;
  }
  
  :global(.combobox-trigger:hover) {
    border-color: #9ca3af !important;
  }
  
  :global(.combobox-trigger:focus) {
    outline: none !important;
    border-color: #2563eb !important;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
  }
  
  /* Selected categories area */
  :global(.selected-categories) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  
  /* Category tag styling */
  :global(.category-tag) {
    background-color: #eef2ff !important;
    color: #4f46e5 !important;
    border: 1px solid #e0e7ff !important;
    padding: 0.25rem 0.5rem !important;
    border-radius: 0.25rem !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.25rem !important;
    transition: all 0.15s ease !important;
    box-shadow: 0 1px 2px rgba(79, 70, 229, 0.1) !important;
  }
  
  :global(.category-tag button) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0.125rem !important;
    border-radius: 9999px !important;
    background-color: transparent !important;
    color: #4f46e5 !important;
    transition: all 0.15s ease !important;
  }
  
  :global(.category-tag button:hover) {
    background-color: rgba(79, 70, 229, 0.1) !important;
    color: #4338ca !important;
  }
</style>
