<!-- src/lib/components/CategoryComboBox.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Command } from "$lib/components/ui/command-wrapper";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { cn } from "$lib/utils.js";
  import type { Category } from '$lib/types/schemaTypes';
  import Check from "lucide-svelte/icons/check";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import { tick } from "svelte";
  import { createEventDispatcher } from 'svelte';
  
  // Props - accept categories with either value/label or category_id/category_name structure
  export let categories: Array<{
    category_id?: string;
    category_name?: string;
    value?: string;
    label?: string;
    parent_id?: string | null;
    parent_name?: string;
  }> = [];
  export let value: string | null | undefined = ""; // Selected category ID
  export let placeholder: string = "Select parent category...";
  export let name: string = "parent_id"; // Form field name
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let width: string = "w-full"; // Control the width of the component
  // Props for edit mode
  export let initialValue: string | undefined = undefined;
  export let initialLabel: string | undefined = undefined;
  
  // Create event dispatcher for communicating with parent components
  const dispatch = createEventDispatcher<{
    change: { value: string | null; label: string; source: string };
    categorySelected: { value: string | null; label: string; source: string };
  }>();
  
  let open = false;

  // Convert categories to the format needed for the combobox
  // Handle both structures: {category_id, category_name} and {value, label}
  $: options = [
    { value: "", label: "None (Top-level)" },
    ...categories.map(category => {
      // Ensure we have non-undefined string values
      const categoryValue: string = (category.category_id || category.value || "");
      const categoryLabel: string = (category.category_name || category.label || "");
      
      return {
        value: categoryValue,
        label: categoryLabel,
        parent_id: category.parent_id || null,
        // Use the parent_name directly from the API response
        parentName: category.parent_name || ''
      };
    })
  ];

  // Initialize the value if we have initialValue provided (for edit mode)
  $: if (initialValue && options.length > 0) {
    // Find the option with matching value to set it
    const foundOption = options.find(opt => opt.value === initialValue);
    if (foundOption) {
      
      value = initialValue;
    } else if (initialValue && initialLabel) {
     
      // Create options array with the initial parent at the top for better visibility
      options = [
        { value: "", label: "None (Top-level)" },
        { value: initialValue, label: initialLabel },
        ...categories.map(cat => {
          // Apply the same type safety as in the main options mapping
          const categoryValue: string = (cat.category_id || cat.value || "");
          const categoryLabel: string = (cat.category_name || cat.label || "");
          
          return {
            value: categoryValue,
            label: categoryLabel,
            parent_id: cat.parent_id || null,
            parentName: cat.parent_name || ''
          };
        })
      ];
      value = initialValue;
    }
  }

  
  // Display the selected category name or placeholder
  $: selectedLabel = options.find((opt) => opt.value === value)?.label ?? placeholder;
  

  function closeAndFocusTrigger(triggerId: string) {
    open = false;
    tick().then(() => {
      document.getElementById(triggerId)?.focus();
    });
  }
</script>

<div class={width} style="position: relative;">
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
        <span class="truncate">{selectedLabel}</span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </Popover.Trigger>
    <Popover.Content 
        class="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-y-auto dropdown-content" 
        style="background-color: hsl(var(--background)) !important; border: 1px solid hsl(var(--border)) !important; color: hsl(var(--foreground)) !important; box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;"
        side="bottom" 
        align="start" 
        sideOffset={8}>
      <Command.Root style="background-color: hsl(var(--background)) !important; color: hsl(var(--foreground)) !important;">
        <Command.Input placeholder="Search categories..." style="background-color: hsl(var(--background)) !important; color: hsl(var(--foreground)) !important; border-bottom: 1px solid hsl(var(--border)) !important;" />
        <Command.Empty style="color: hsl(var(--muted-foreground)) !important; padding: 0.5rem 1rem !important;">No category found.</Command.Empty>
        <Command.Group style="background-color: hsl(var(--background)) !important; color: hsl(var(--foreground)) !important;">
          {#each options as option}
            <Command.Item
              value={option.label}
              onSelect={(selectedValue: string) => {
                // Store the selected value
                value = option.value;
                
                const hiddenInput = document.querySelector(`input[name="${name}"]`);
                if (hiddenInput) {
                  (hiddenInput as HTMLInputElement).value = option.value;
                  
                  // Also dispatch an input event to ensure the form recognizes the change
                  hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                }
                
                // We use the Svelte event dispatcher which is more reliable than DOM events
                dispatch('categorySelected', {
                  value: option.value,
                  label: option.label,
                  source: 'CategoryComboBox'
                });
                
                // Also dispatch standard change event for backward compatibility
                dispatch('change', {
                  value: option.value,
                  label: option.label,
                  source: 'CategoryComboBox'
                });
                
             
                
                closeAndFocusTrigger(ids.trigger);
              }}
              style="background-color: hsl(var(--background)) !important; color: hsl(var(--foreground)) !important; padding: 0.5rem 1rem !important;"
            >
              <Check
                class={cn(
                  "mr-2 h-4 w-4",
                  value !== option.value && "text-transparent"
                )}
              />
              {option.label}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
  
 
  <input 
    type="hidden" 
    id="parent-id-{name}"
    {name} 
    value={value === null ? '' : value} 
    {required} 
    data-testid="category-combobox-input"
    on:input={(e) => {
    
    }}
  />
</div>

<style>
  /* Dropdown styling */
  :global(.dropdown-content) {
    background-color: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 25px -5px hsl(var(--muted) / 0.2), 0 10px 10px -5px hsl(var(--muted) / 0.1) !important;
    z-index: 50 !important;
    max-width: calc(100vw - 20px);
    width: var(--radix-popover-trigger-width);
    max-height: 300px;
    overflow-y: auto;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s !important;
    color: hsl(var(--foreground)) !important;
  }
  
  /* Dark mode specific dropdown styling */
  :global(.dark .dropdown-content) {
    box-shadow: 0 10px 25px -5px hsl(var(--muted) / 0.4), 0 10px 10px -5px hsl(var(--muted) / 0.3) !important;
  }
  
  /* Command input styling */
  :global(.dropdown-content .cmdk-input) {
    border-bottom: 1px solid hsl(var(--border)) !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.875rem !important;
    background-color: hsl(var(--input)) !important;
    color: hsl(var(--input-foreground)) !important;
    transition: background-color 0.3s, border-color 0.3s, color 0.3s !important;
  }
  
  /* Command item styling */
  :global(.dropdown-content .cmdk-item) {
    padding: 0.5rem 1rem !important;
    margin: 0 !important;
    cursor: pointer !important;
    border-radius: 0 !important;
    font-size: 0.875rem !important;
    color: hsl(var(--foreground)) !important;
    background-color: hsl(var(--background)) !important;
    transition: background-color 0.3s, color 0.3s !important;
  }
  
  :global(.dropdown-content .cmdk-item:hover) {
    background-color: hsl(var(--accent) / 0.1) !important;
  }
  
  :global(.dark .dropdown-content .cmdk-item:hover) {
    background-color: hsl(var(--accent) / 0.2) !important;
  }
  
  :global(.dropdown-content .cmdk-item[data-selected=true]) {
    background-color: hsl(var(--accent) / 0.15) !important;
  }
  
  :global(.dark .dropdown-content .cmdk-item[data-selected=true]) {
    background-color: hsl(var(--accent) / 0.3) !important;
  }
  
  /* Button styling */
  :global(.combobox-trigger) {
    border: 1px solid hsl(var(--input-border)) !important;
    background-color: hsl(var(--input)) !important;
    padding: 0.5rem 0.75rem !important;
    border-radius: 0.375rem !important;
    width: 100% !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 0.875rem !important;
    color: hsl(var(--input-foreground)) !important;
    transition: all 0.3s !important;
  }
  
  :global(.combobox-trigger:hover) {
    border-color: hsl(var(--ring) / 0.5) !important;
  }
  
  :global(.combobox-trigger:focus) {
    outline: none !important;
    border-color: hsl(var(--ring)) !important;
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2) !important;
  }
  
  /* Dark mode hover states */
  :global(.dark .combobox-trigger:hover) {
    border-color: hsl(var(--ring) / 0.7) !important;
  }
  
  :global(.dark .combobox-trigger:focus) {
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3) !important;
  }
</style>
