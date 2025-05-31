<!-- src/lib/components/ManufacturerSelector.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import { Plus, Edit, Trash } from "lucide-svelte";
  import Check from "lucide-svelte/icons/check";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  
  // Import types from our component types file which builds on schemaTypes
  import type { ManufacturerDisplay, ManufacturerPartInput } from '$lib/types/componentTypes';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props with proper types from our component types
  export let manufacturers: ManufacturerDisplay[] = [];
  export let selectedManufacturerParts: ManufacturerPartInput[] = [];
  export let disabled: boolean = false;
  export let width: string = "w-full";
  
  // Debug manufacturers to see if they're being passed correctly
  $: console.log('ManufacturerSelector received manufacturers:', manufacturers);
  
  // Internal state
  let open = false;
  let currentManufacturerId: string = "";
  let editingIndex: number = -1; // -1 means we're adding a new manufacturer part
  let currentPart: ManufacturerPartInput = createEmptyManufacturerPart();
  let showForm = false;
  
  // Ensure we have valid manufacturer data
  $: {
    if (manufacturers.length === 0) {
      console.warn('ManufacturerSelector has no manufacturers available!');
    } else {
      console.log(`ManufacturerSelector has ${manufacturers.length} manufacturers available`);
    }
  }

  // Create a new empty manufacturer part object
  function createEmptyManufacturerPart(): ManufacturerPartInput {
    return {
      manufacturer_id: "",
      manufacturer_part_number: "",
      description: "",
      datasheet_url: "",
      product_url: "",
      is_recommended: false
    };
  }
  
  // Handle adding or updating a manufacturer part
  function handleSubmitPart() {
    if (!currentPart.manufacturer_id || !currentPart.manufacturer_part_number) {
      alert("Manufacturer and part number are required");
      return;
    }
    
    // We don't need to set manufacturer_name on the part object anymore
    // It's derived from the manufacturer data when needed for display
    
    if (editingIndex >= 0) {
      // Update existing manufacturer part
      selectedManufacturerParts[editingIndex] = { ...currentPart };
      selectedManufacturerParts = [...selectedManufacturerParts]; // Trigger reactivity
    } else {
      // Add new manufacturer part
      selectedManufacturerParts = [...selectedManufacturerParts, { ...currentPart }];
    }
    
    // Notify parent of the change
    dispatch('change', selectedManufacturerParts);
    
    // Reset form
    resetForm();
  }
  
  // Edit an existing manufacturer part
  function editManufacturerPart(index: number) {
    editingIndex = index;
    currentPart = { ...selectedManufacturerParts[index] };
    showForm = true;
  }
  
  // Remove a manufacturer part
  function removeManufacturerPart(index: number) {
    selectedManufacturerParts = selectedManufacturerParts.filter((_, i) => i !== index);
  }
  
  // Reset the form
  function resetForm() {
    currentPart = createEmptyManufacturerPart();
    editingIndex = -1;
    showForm = false;
  }
  
  // Function to get the manufacturer name by ID
  function getManufacturerName(id: string): string {
    const manufacturer = manufacturers.find(m => m.id === id);
    if (!manufacturer) {
      console.warn(`Manufacturer with ID ${id} not found in`, manufacturers);
      return "Unknown Manufacturer";
    }
    return manufacturer.name;
  }
  
  // Close popover and focus trigger with improved behavior
  function closeAndFocusTrigger(triggerId: string) {
    // Explicitly set the open state to false
    open = false;
    
    // Wait for Svelte to update the DOM
    tick().then(() => {
      // Focus the trigger element if it exists
      const triggerElement = document.getElementById(triggerId);
      if (triggerElement) {
        triggerElement.focus();
        console.log('Focused trigger element');
      } else {
        console.warn('Could not find trigger element with ID:', triggerId);
      }
    });
  }
</script>

<div class="manufacturer-selector {width}">
  <h3 class="form-section-title">Manufacturer Part Numbers</h3>
  
  <!-- List of selected manufacturer parts -->
  {#if selectedManufacturerParts.length > 0}
    <div class="parts-table-container">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each selectedManufacturerParts as mfgPart, index}
            <tr>
              <td class="px-4 py-2 whitespace-nowrap">
                {getManufacturerName(mfgPart.manufacturer_id)}
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                {mfgPart.manufacturer_part_number}
              </td>
              <td class="px-4 py-2">
                {#if mfgPart.description}
                  {mfgPart.description.length > 60 ? `${mfgPart.description.substring(0, 60)}...` : mfgPart.description}
                {/if}
              </td>
              <td class="px-4 py-2 whitespace-nowrap text-center">
                {mfgPart.is_recommended ? 'Yes' : 'No'}
              </td>
              <td class="px-4 py-2 whitespace-nowrap text-right">
                <button
                  type="button"
                  class="table-action-btn edit-btn"
                  title="Edit"
                  on:click={() => editManufacturerPart(index)}
                >
                  <Edit class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="table-action-btn delete-btn"
                  title="Remove"
                  on:click={() => removeManufacturerPart(index)}
                >
                  <Trash class="h-4 w-4" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-gray-500 mb-4">No manufacturer parts added yet.</p>
  {/if}
  
  <!-- Add button or form -->
  {#if !showForm}
    <button 
      type="button"
      class="enhanced-btn add-part-btn"
      on:click={() => showForm = true}
      disabled={disabled}
    >
      <Plus class="h-4 w-4" />
      <span>Add Manufacturer Part Number</span>
    </button>
  {:else}
    <div class="part-form-container">
      <h4 class="part-form-title">{editingIndex >= 0 ? 'Edit' : 'Add'} Manufacturer Part Number</h4>
      
      <!-- Manufacturer selector -->
      <div class="form-field">
        <label for="manufacturer_id" class="form-label">Manufacturer<span class="required">*</span></label>
        <div>
          <Popover.Root bind:open let:ids>
            <Popover.Trigger asChild let:builder>
              <Button
                builders={[builder]}
                variant="outline"
                role="combobox"
                aria-expanded={open}
                class="w-full justify-between combobox-trigger"
                disabled={disabled}
              >
                <span class="truncate">
                  {currentPart.manufacturer_id ? getManufacturerName(currentPart.manufacturer_id) : "Select manufacturer..."}
                </span>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </Popover.Trigger>
            <Popover.Content class="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-y-auto dropdown-content" side="bottom" align="start" sideOffset={8}>
              <Command.Root>
                <Command.Input class="manufacturer-search-input" />
                <Command.Empty>
                  {manufacturers.length === 0 ? 'No manufacturers available. Please create manufacturers first.' : 'No manufacturer found.'}
                </Command.Empty>
                <Command.Group>
                  {#if manufacturers.length === 0}
                    <Command.Item class="text-red-500">
                      No manufacturers available
                    </Command.Item>
                  {:else}
                    {#each manufacturers as manufacturer}
                      <Command.Item
                        on:click={() => {
                          currentPart.manufacturer_id = manufacturer.id;
                          open = false;
                          console.log('Selected manufacturer:', manufacturer.name, 'with ID:', manufacturer.id);
                          // Trigger reactivity by reassigning the object
                          currentPart = {...currentPart};
                        }}
                      >
                        <div class="flex items-center w-full">
                          <Check
                            class="mr-2 h-4 w-4 {currentPart.manufacturer_id !== manufacturer.id ? 'opacity-0' : ''}"
                          />
                          <span>{manufacturer.name}</span>
                        </div>
                      </Command.Item>
                    {/each}
                  {/if}
                </Command.Group>
              </Command.Root>
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>
      
      <!-- Part Number -->
      <div class="form-field">
        <label for="manufacturer_part_number" class="form-label">Part Number<span class="required">*</span></label>
        <input 
          type="text" 
          id="manufacturer_part_number" 
          bind:value={currentPart.manufacturer_part_number}
          class="enhanced-input"
          required
        />
      </div>
      
      <!-- Description -->
      <div class="form-field">
        <label for="description" class="form-label">Description</label>
        <input 
          type="text" 
          id="description" 
          bind:value={currentPart.description}
          class="enhanced-input"
          placeholder="Brief description of the part"
        />
      </div>
      
      <!-- Datasheet URL -->
      <div class="form-field">
        <label for="datasheet_url" class="form-label">Datasheet URL</label>
        <div class="input-with-icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <input 
            type="url" 
            id="datasheet_url" 
            bind:value={currentPart.datasheet_url}
            class="enhanced-input with-icon"
            placeholder="https://example.com/datasheet.pdf"
          />
        </div>
      </div>
      
      <!-- Product URL -->
      <div class="form-field">
        <label for="product_url" class="form-label">Product URL</label>
        <div class="input-with-icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <input 
            type="url" 
            id="product_url" 
            bind:value={currentPart.product_url}
            class="enhanced-input with-icon"
            placeholder="https://example.com/product"
          />
        </div>
      </div>
      
      <!-- Is Recommended -->
      <div class="form-field">
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="is_recommended" 
            bind:checked={currentPart.is_recommended}
            class="enhanced-checkbox"
          />
          <label for="is_recommended" class="checkbox-label">Recommended Manufacturer</label>
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button 
          type="button" 
          class="enhanced-btn cancel-btn"
          on:click={resetForm}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Cancel</span>
        </button>
        <button 
          type="button" 
          class="enhanced-btn submit-btn"
          on:click={handleSubmitPart}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
          <span>{editingIndex >= 0 ? 'Update' : 'Add'} Part Number</span>
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Hidden input with serialized manufacturer parts data for form submission -->
  <input 
    type="hidden" 
    name="manufacturer_parts" 
    value={JSON.stringify(selectedManufacturerParts.map(part => ({
      manufacturerId: part.manufacturer_id,
      partNumber: part.manufacturer_part_number,
      description: part.description || '',
      datasheetUrl: part.datasheet_url || '',
      productUrl: part.product_url || '',
      isRecommended: part.is_recommended
    })))} 
  />
</div>

<style>
  /* Core component styling */
  .manufacturer-selector {
    margin-bottom: 1.5rem;
  }

  /* Form section styling */
  .form-section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  /* Table styling */
  .parts-table-container {
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  /* Form styling */
  .part-form-container {
    background-color: #f9fafb;
    padding: 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    margin-top: 1.25rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  }

  .part-form-title {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1.25rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .form-field {
    margin-bottom: 1rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.375rem;
    display: block;
  }

  .required {
    color: #ef4444;
    margin-left: 0.25rem;
  }

  .enhanced-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: white;
    font-size: 0.875rem;
    color: #1f2937;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .enhanced-input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }

  .enhanced-input::placeholder {
    color: #9ca3af;
  }

  .enhanced-input.with-icon {
    padding-left: 2.5rem;
  }

  .input-with-icon {
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    pointer-events: none;
  }

  /* Button styling */
  .enhanced-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    gap: 0.5rem;
    border: 1px solid transparent;
  }

  .submit-btn {
    background-color: #10b981;
    color: white;
    border-color: #059669;
  }

  .submit-btn:hover {
    background-color: #059669;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .cancel-btn {
    background-color: white;
    color: #4b5563;
    border-color: #d1d5db;
  }

  .cancel-btn:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
  }

  .add-part-btn {
    background-color: #4f46e5;
    color: white;
    border-color: #4338ca;
    margin-bottom: 0.5rem;
  }

  .add-part-btn:hover {
    background-color: #4338ca;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .table-action-btn {
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .edit-btn {
    color: #4f46e5;
  }

  .edit-btn:hover {
    background-color: rgba(79, 70, 229, 0.1);
  }

  .delete-btn {
    color: #ef4444;
  }

  .delete-btn:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }

  /* Checkbox styling */
  .checkbox-container {
    display: flex;
    align-items: center;
  }

  .enhanced-checkbox {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1.5px solid #6b7280;
    appearance: none;
    background-color: white;
    margin: 0;
    cursor: pointer;
    margin-right: 0.5rem;
    position: relative;
    transition: all 0.15s ease;
  }

  .enhanced-checkbox:checked {
    background-color: #4f46e5;
    border-color: #4f46e5;
  }

  .enhanced-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .enhanced-checkbox:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }

  .checkbox-label {
    font-size: 0.875rem;
    color: #4b5563;
    user-select: none;
    cursor: pointer;
  }

  /* Dropdown styling */
  :global(.dropdown-content) {
    background-color: white !important;
    border: 1px solid #d1d5db !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
    z-index: 50 !important;
  }
  
  /* Command input styling */
  :global(.dropdown-content .cmdk-input) {
    border-bottom: 1px solid #e5e7eb !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.875rem !important;
    background-color: white !important;
    color: #111827 !important;
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
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
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
