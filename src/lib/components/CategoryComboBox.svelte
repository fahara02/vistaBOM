<!-- src/lib/components/CategoryComboBox.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import Check from "lucide-svelte/icons/check";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import type { Category } from '$lib/server/db/types';
  
  // Props
  export let categories: Category[] = [];
  export let value: string | null | undefined = ""; // Selected category ID
  export let placeholder: string = "Select parent category...";
  export let name: string = "parent_id"; // Form field name
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let width: string = "w-full"; // Control the width of the component
  
  let open = false;
  
  // Create formatted options for the combobox with a "None" option
  $: options = [
    { value: "", label: "None (Top-level)" },
    ...categories.map(category => ({
      value: category.id,
      label: category.name
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

<div class={width}>
  <Popover.Root bind:open let:ids>
    <Popover.Trigger asChild let:builder>
      <Button
        builders={[builder]}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="justify-between {width}"
        disabled={disabled}
      >
        <span class="truncate">{selectedLabel}</span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </Popover.Trigger>
    <Popover.Content class={width + " p-0"}>
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
  /* Additional custom styling can be added here */
</style>
