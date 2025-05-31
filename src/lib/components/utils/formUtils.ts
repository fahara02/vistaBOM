/**
 * Utility functions for form data preparation and validation
 */

/**
 * Prepares form data for validation by ensuring all fields have the correct types
 * and formatting data according to schema requirements
 * 
 * @param formData The raw form data to prepare
 * @returns The prepared form data ready for validation
 */
export function prepareFormDataForValidation(formData: Record<string, any>): Record<string, any> {
  const preparedData = { ...formData };
  
  // Convert string numbers to actual numbers
  for (const [key, value] of Object.entries(preparedData)) {
    // Handle numeric fields
    if (typeof value === 'string' && !isNaN(Number(value)) && key.includes('_value') || 
        key.includes('_quantity') || key.includes('_amount') || 
        key === 'weight' || key === 'part_weight' || 
        key.includes('_size') || key.includes('_bytes')) {
      preparedData[key] = Number(value);
    }
    
    // Handle boolean fields
    if (value === 'true' || value === 'false') {
      preparedData[key] = value === 'true';
    }
  }
  
  // Handle dimensions object if it exists
  if (preparedData.dimensions && typeof preparedData.dimensions === 'object') {
    for (const [dimKey, dimValue] of Object.entries(preparedData.dimensions)) {
      if (typeof dimValue === 'string' && !isNaN(Number(dimValue))) {
        preparedData.dimensions[dimKey] = Number(dimValue);
      }
    }
  }
  
  return preparedData;
}
