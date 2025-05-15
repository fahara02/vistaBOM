/**
 * Utility functions for form handling and validation
 */

/**
 * Prepares form data for validation by properly formatting JSON fields
 * @param formData The form data to prepare
 * @returns The formatted form data ready for validation
 */
export function prepareFormDataForValidation(formData: Record<string, any>): Record<string, any> {
  if (!formData) return {};

  // Make a copy to avoid modifying the original
  const result = { ...formData };

  // Handle server to client field name mapping
  // The server uses long_description while the client uses full_description
  if ('long_description' in result && !('full_description' in result)) {
    console.log('Mapping long_description to full_description', result.long_description);
    result.full_description = result.long_description;
    // Keep the original field too for consistency
    // delete result.long_description;
  }

  // Handle enum fields - convert empty strings to null for schema validation
  const enumFields = [
    'weight_unit', 
    'dimensions_unit', 
    'temperature_unit', 
    'tolerance_unit',
    'package_type',
    'package_case',
    'mounting_style',
    'termination_style'
  ];
  
  enumFields.forEach(field => {
    if (field in result && (result[field] === '' || result[field] === undefined)) {
      console.log(`Converting empty enum field ${field} to null`);
      result[field] = null;
    }
  });
  
  // Handle database constraints between related fields
  // For all paired fields, ensure they follow the pattern:
  // (value IS NULL AND unit IS NULL) OR (value IS NOT NULL AND unit IS NOT NULL)
  
  // This function handles paired field constraints following DB rules
  const enforcePairedFieldConstraint = (valueField: string, unitField: string) => {
    const hasValue = result[valueField] !== null && result[valueField] !== undefined;
    const hasUnit = result[unitField] !== null && result[unitField] !== undefined && result[unitField] !== '';
    
    if (!hasValue && hasUnit) {
      // Case 1: No value but has unit - clear the unit
      console.log(`No ${valueField} but has ${unitField}. Clearing unit for consistency`);
      result[unitField] = null;
    } else if (hasValue && !hasUnit) {
      // Case 2: Has value but no unit - clear the value
      // We clear the value rather than setting a default unit to avoid hardcoding
      console.log(`Has ${valueField} but no ${unitField}. Clearing value for consistency`);
      result[valueField] = null;
    }
  };
  
  // Apply constraint to dimensions fields
  // Special handling for dimensions as it's an object
  const hasDimensions = result.dimensions !== null && 
                       result.dimensions !== undefined && 
                       typeof result.dimensions === 'object' && 
                       Object.keys(result.dimensions).length > 0;
  
  const hasDimensionsUnit = result.dimensions_unit !== null && 
                           result.dimensions_unit !== undefined && 
                           result.dimensions_unit !== '';
                           
  if (!hasDimensions && hasDimensionsUnit) {
    console.log('No dimensions but has dimensions_unit. Clearing unit for consistency');
    result.dimensions_unit = null;
  } else if (hasDimensions && !hasDimensionsUnit) {
    console.log('Has dimensions but no dimensions_unit. Clearing dimensions for consistency');
    result.dimensions = null;
  }
  
  // Apply constraint to other paired fields
  enforcePairedFieldConstraint('weight', 'weight_unit');
  enforcePairedFieldConstraint('tolerance', 'tolerance_unit');
  
  // Special handling for temperature fields which have multiple values paired with one unit
  const hasAnyTempValue = 
    result.operating_temperature_min !== null && result.operating_temperature_min !== undefined ||
    result.operating_temperature_max !== null && result.operating_temperature_max !== undefined ||
    result.storage_temperature_min !== null && result.storage_temperature_min !== undefined ||
    result.storage_temperature_max !== null && result.storage_temperature_max !== undefined;
  
  const hasTempUnit = result.temperature_unit !== null && 
                     result.temperature_unit !== undefined &&
                     result.temperature_unit !== '';
  
  if (!hasAnyTempValue && hasTempUnit) {
    console.log('No temperature values but has temperature_unit. Clearing unit for consistency');
    result.temperature_unit = null;
  } else if (hasAnyTempValue && !hasTempUnit) {
    console.log('Has temperature values but no temperature_unit. Clearing values for consistency');
    result.operating_temperature_min = null;
    result.operating_temperature_max = null;
    result.storage_temperature_min = null;
    result.storage_temperature_max = null;
  }

  // Fields that should be strings but might be objects
  const stringFields = ['full_description', 'functional_description', 'notes', 'revision_notes', 'long_description'];
  
  // Fields that should be objects but might be strings or null
  const jsonFields = [
    'technical_specifications',
    'properties',
    'electrical_properties',
    'mechanical_properties', 
    'thermal_properties',
    'material_composition',
    'environmental_data',
  ];

  // Process string fields - ensure they're actually strings
  stringFields.forEach(field => {
    if (field in result) {
      const value = result[field];
      
      // Handle null case
      if (value === null) {
        result[field] = '';
        return;
      }
      
      // Handle object case (convert to string)
      if (typeof value === 'object') {
        try {
          if (Object.keys(value).length === 0) {
            result[field] = ''; // Empty object becomes empty string
          } else {
            result[field] = JSON.stringify(value); // Non-empty object becomes JSON string
          }
        } catch (e) {
          console.error(`Error converting ${field} to string:`, e);
          result[field] = ''; // Fallback to empty string on error
        }
      }
      
      // Force string type
      if (result[field] !== undefined) {
        result[field] = String(result[field]);
      }
    }
  });

  // Process JSON fields - ensure they're objects
  jsonFields.forEach(field => {
    if (field in result) {
      const value = result[field];
      
      // Handle null or undefined
      if (value === null || value === undefined) {
        result[field] = {};
        return;
      }
      
      // Handle string (try to parse as JSON)
      if (typeof value === 'string') {
        try {
          if (value.trim() === '') {
            result[field] = {};
          } else {
            result[field] = JSON.parse(value);
          }
        } catch (e) {
          console.error(`Error parsing ${field} from string:`, e);
          result[field] = {}; // Fallback to empty object
        }
      }
      
      // Ensure it's an object (not an array or primitive)
      if (typeof result[field] !== 'object' || Array.isArray(result[field])) {
        result[field] = { value: result[field] };
      }
    }
  });

  // Handle dimensions field specially
  if (result.dimensions) {
    if (typeof result.dimensions === 'string') {
      try {
        result.dimensions = JSON.parse(result.dimensions);
      } catch (e) {
        console.error('Error parsing dimensions:', e);
        result.dimensions = { length: null, width: null, height: null };
      }
    }
    
    // Ensure dimensions object has required properties
    if (typeof result.dimensions === 'object' && !Array.isArray(result.dimensions)) {
      // Set defaults for missing properties
      if (result.dimensions.length === undefined) result.dimensions.length = null;
      if (result.dimensions.width === undefined) result.dimensions.width = null;
      if (result.dimensions.height === undefined) result.dimensions.height = null;
    } else {
      // Reset to default if not an object
      result.dimensions = { length: null, width: null, height: null };
    }
  }

  return result;
}
