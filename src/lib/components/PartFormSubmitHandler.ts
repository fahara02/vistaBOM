/**
 * Handles form submission and field transformation for the PartForm component
 */
import type { Writable } from 'svelte/store';
import { prepareFormDataForValidation } from '../utils/formUtils';

/**
 * Prepares form data before submission, ensuring all fields have the correct types
 * @param formStore The SuperForm reactive store
 * @param dimensions The current dimensions object
 * @param selectedManufacturerParts Selected manufacturer parts array
 * @param selectedCategoryIds Selected category IDs array
 */
export function prepareFormSubmission(
  formStore: Writable<Record<string, any>>,
  dimensions: any,
  selectedManufacturerParts: any[],
  selectedCategoryIds: string[]
): void {
  const $formStore = formStore as unknown as Record<string, any>;
  
  // Skip if formStore is undefined
  if (!$formStore) return;
  
  console.log('Preparing form for submission:', { formStore: $formStore });

  // Apply the validation utility to ensure all fields have correct types
  const validated = prepareFormDataForValidation($formStore);
  Object.assign($formStore, validated);
  
  // Handle dimensions specifically
  if ($formStore.dimensions) {
    $formStore.dimensions = dimensions;
  }

  // Add manufacturer parts data if any are selected
  if (selectedManufacturerParts.length > 0) {
    $formStore.manufacturer_parts = JSON.stringify(selectedManufacturerParts);
  }

  // Add category ids
  if (selectedCategoryIds.length > 0) {
    $formStore.category_ids = selectedCategoryIds.join(',');
  }
  
  console.log('Form ready for submission:', $formStore);
}
