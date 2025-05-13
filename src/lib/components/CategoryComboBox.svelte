<!-- src/lib/components/CategoryComboBox.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import Check from "lucide-svelte/icons/check";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import type { Category } from '@/types/types';
  
  // Props
  export let categories: Category[] = [];
  export let value: string | null | undefined = ""; // Selected category ID
  export let placeholder: string = "Select parent category...";
  export let name: string = "parent_id"; // Form field name
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let width: string = "w-full"; // Control the width of the component
  
  let open = false;
  
  // Function to get parent name for a category
  function getParentName(category: Category): string {
    if (!category.parentId) return '';
    const parent = categories.find(c => c.id === category.parentId);
    return parent ? parent.name : '';
  }

  // Create formatted options for the combobox with a "None" option
  $: options = [
    { value: "", label: "None (Top-level)" },
    ...categories.map(category => ({
      value: category.id,
      label: category.name,
      parentId: category.parentId,
      parentName: getParentName(category)
    }))
  ];
  
  // Display the selected category name or placeholder
  $: selectedLabel = options.find((opt) => opt.value === value)?.label ?? placeholder;
  
  // We want to refocus the trigger button when the user selects
  // an item from the list so users can continue navigating the
  // rest of the form with the keyboard.
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
    <Popover.Content class="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-y-auto dropdown-content" side="bottom" align="start" sideOffset={8}>
      <Command.Root>
        <Command.Input placeholder="Search categories..." />
        <Command.Empty>No category found.</Command.Empty>
        <Command.Group>
          {#each options as option}
            <Command.Item
              value={option.label}
              onSelect={() => {
                value = option.value;
                closeAndFocusTrigger(ids.trigger);
              }}
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
  
  <!-- Hidden input to work with standard form submission -->
  <input type="hidden" {name} bind:value {required} />
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
</style>
