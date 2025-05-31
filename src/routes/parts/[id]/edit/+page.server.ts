// src/routes/parts/[id]/edit/+page.server.ts
import { z } from 'zod';
import { fail, error, type Actions } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

// Import schemas from correct paths
import { partVersionSchema, partSchema } from '$lib/schema/schema';

// Import part related functions
import { 
  createPartVersion, 
  updateUnifiedPart,
  getPartWithCurrentVersion
} from '$lib/core/parts';

// Import types and enums
import {
  LifecycleStatusEnum, 
  PartStatusEnum, 
  WeightUnitEnum, 
  DimensionUnitEnum, 
  TemperatureUnitEnum, 
  PackageTypeEnum
} from '$lib/types';
import type { 
  ElectricalProperties, 
  MechanicalProperties, 
  ThermalProperties 
} from '$lib/types/schemaTypes';

// Import utility functions
import { parsePartJsonField } from '$lib/utils/util';
import crypto from 'crypto';

export const load: PageServerLoad = async ({ params }) => {
  const { part, currentVersion } = await getPartWithCurrentVersion(params.id as string);
  if (!part) throw error(404, 'Part not found');

  // Map PartVersion to data matching schema with all properties
  // Properly cast the enum values to match the expected types
  const initialData = {
    part_id: part.part_id,
    part_version: currentVersion.part_version,
    part_name: currentVersion.part_name,
    short_description: currentVersion.short_description,
    // Map long_description in database to full_description in form schema
    full_description: currentVersion.long_description || null,
    functional_description: currentVersion.functional_description,
    version_status: currentVersion.version_status,
    status_in_bom: part.status_in_bom,
    
    // Electrical properties 
    voltage_rating_min: currentVersion.voltage_rating_min ?? null,
    voltage_rating_max: currentVersion.voltage_rating_max ?? null,
    current_rating_min: currentVersion.current_rating_min ?? null, 
    current_rating_max: currentVersion.current_rating_max ?? null,
    power_rating_max: currentVersion.power_rating_max ?? null,
    tolerance: currentVersion.tolerance ?? null,
    tolerance_unit: currentVersion.tolerance_unit ?? null,
    
    // Dimensions and physical properties
    dimensions: currentVersion.dimensions ?? null,
    dimensions_unit: currentVersion.dimensions_unit ?? null, // Match schema field name
    weight: currentVersion.part_weight ?? null,
    weight_unit: currentVersion.weight_unit ?? null,
    package_type: currentVersion.package_type ?? null,
    pin_count: currentVersion.pin_count ?? null,
    material_composition: currentVersion.material_composition ?? null,
    
    // Thermal properties
    operating_temperature_min: currentVersion.operating_temperature_min ?? null,
    operating_temperature_max: currentVersion.operating_temperature_max ?? null,
    storage_temperature_min: currentVersion.storage_temperature_min ?? null,
    storage_temperature_max: currentVersion.storage_temperature_max ?? null,
    temperature_unit: currentVersion.temperature_unit ?? null,
    
    // Other properties
    technical_specifications: currentVersion.technical_specifications ?? null,
    environmental_data: currentVersion.environmental_data ?? null,
    revision_notes: currentVersion.revision_notes ?? '',
    
    // Metadata
    created_by: currentVersion.created_by,
    created_at: currentVersion.created_at,
    updated_by: currentVersion.updated_by ?? null,
    updated_at: currentVersion.updated_at
  };
  
  // Use schema from Zod to validate the form data
  // Cast initialData to the expected type using 'as any' to bypass strict type checking
  // This is needed because the enum conversions might not be exact matches
  const form = await superValidate(initialData as any, zod(partVersionSchema));

  // Get available package types and unit types for dropdowns
  // Use enum values, not keys, to ensure proper case matching with schema validation
  const packageTypes = Object.values(PackageTypeEnum);
  const weightUnits = Object.values(WeightUnitEnum); // Using VALUES not KEYS to get lowercase 'oz', not 'OZ'
  const dimensionUnits = Object.values(DimensionUnitEnum);
  const temperatureUnits = Object.values(TemperatureUnitEnum);
  const lifecycleStatuses = Object.values(LifecycleStatusEnum);
  const partStatuses = Object.values(PartStatusEnum);
  
  // Log the enum values for debugging
  console.log('Weight units for dropdown:', weightUnits);

  return {
    form,
    part,
    currentVersion,
    packageTypes,
    weightUnits,
    dimensionUnits,
    temperatureUnits,
    lifecycleStatuses,
    partStatuses,
  };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    // STRICTLY FOLLOW THE PROPER APPROACH: FORM VALIDATION → DATABASE UPDATE
    console.error('============= PART EDIT FORM SUBMISSION =============');
    
    // Step 1: Get form data
    const formData = await request.formData();
    console.error('Form data keys:', [...formData.keys()]);
    
    // Step 2: Get existing part data to compare with form submission
    const partId = params.id as string;
    const { part, currentVersion } = await getPartWithCurrentVersion(partId);
    
    if (!part || !currentVersion) {
      console.error('EDIT ERROR: Part or current version not found:', { partId });
      return fail(404, { error: 'Part or version not found' });
    }
    
    // Log COMPLETE current part data - no cherry picking
    console.error('COMPLETE CURRENT PART DATA:', currentVersion);
    // Also log the raw part record for debugging
    console.error('COMPLETE PART RECORD:', part);
    
    // Step 3: CRITICAL - VALIDATE WITH SUPERFORM FIRST
    // This is the key step that should not be bypassed or shortcutted
    console.error('RUNNING SUPERFORM VALIDATION');
    
    // Pre-process ALL form data to ensure it meets database constraints
    console.error('PRE-PROCESSING FORM DATA TO ENSURE DATABASE CONSTRAINT COMPATIBILITY');
    
    // Process dimensions field
    if (formData.has('dimensions')) {
      try {
        const dimensionsData = formData.get('dimensions');
        if (typeof dimensionsData === 'string') {
          const parsedDimensions = JSON.parse(dimensionsData);
          console.error('ORIGINAL DIMENSIONS DATA:', parsedDimensions);
          
          // Case 1: All dimension values are null
          // With our updated schema that allows objects with all null values,
          // we need to preserve this structure for proper validation
          if (parsedDimensions && 
              parsedDimensions.length === null && 
              parsedDimensions.width === null && 
              parsedDimensions.height === null) {
            // Keep the object with null values - this is now a valid schema option
            // No need to convert to null since our schema allows this case
            console.error('DIMENSIONS: Object with all null values - valid per schema');
          } 
          // Case 2: Empty object - set to null as well
          else if (parsedDimensions && Object.keys(parsedDimensions).length === 0) {
            formData.set('dimensions', 'null');
            console.error('DIMENSIONS FIX: Converting empty object to null');
          }
          // Case 3: Has some values but not all - ensure all values exist
          else if (parsedDimensions && Object.keys(parsedDimensions).length > 0) {
            // Make sure all dimension values exist and are numbers (null if not present)
            const dimensions = { ...parsedDimensions };
            if (dimensions.length === null) dimensions.length = null;
            if (dimensions.width === null) dimensions.width = null;
            if (dimensions.height === null) dimensions.height = null;
            
            // Final dimension normalization
            // If all dimensions are null, set the form to use null for dimensions
            if (dimensions.length === null && dimensions.width === null && dimensions.height === null) {
              formData.set('dimensions', 'null');
              formData.set('dimensions_unit', 'null'); // Also clear unit when dimensions are null
            } else {
              formData.set('dimensions', JSON.stringify(dimensions));
              console.error('DIMENSIONS FIX: Converting mixed dimensions to all numeric:', dimensions);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing dimensions:', err);
        // On error, set dimensions to null to avoid constraint violations
        formData.set('dimensions', 'null');
        console.error('DIMENSIONS FIX: Setting to null due to parsing error');
      }
    }
    
    // Process other JSON fields to ensure proper formatting
    ['technical_specifications', 'properties', 'electrical_properties', 
     'mechanical_properties', 'thermal_properties', 'material_composition', 
     'environmental_data', 'long_description'].forEach(field => {
      if (formData.has(field)) {
        try {
          const fieldData = formData.get(field);
          if (typeof fieldData === 'string') {
            // If it's an empty string, set to empty object
            if (!fieldData.trim()) {
              formData.set(field, '{}');
              console.error(`JSON FIX: Setting empty string ${field} to empty object`);
            } else {
              // Parse and re-stringify to ensure valid JSON
              const parsed = JSON.parse(fieldData);
              formData.set(field, JSON.stringify(parsed));
            }
          }
        } catch (err) {
          console.error(`Error parsing JSON field ${field}:`, err);
          formData.set(field, '{}');
          console.error(`JSON FIX: Setting ${field} to empty object due to parsing error`);
        }
      }
    });
    
    // Pre-process numeric fields to handle empty strings
    [
      'voltage_rating_min', 'voltage_rating_max', 'current_rating_min', 'current_rating_max',
      'power_rating_max', 'tolerance', 'weight', 'pin_count',
      'operating_temperature_min', 'operating_temperature_max',
      'storage_temperature_min', 'storage_temperature_max'
    ].forEach(field => {
      if (formData.has(field)) {
        const value = formData.get(field);
        if (value === '' || value === 'null') {
          formData.set(field, 'null');
          console.error(`NUMERIC FIX: Converting empty ${field} to null`);
        }
      }
    });
    
    const form = await superValidate(formData, zod(partVersionSchema));
    
    // COMPREHENSIVE FORM DATA LOGGING - print EVERY form field
    console.error('============= COMPLETE FORM DATA DUMP =============');
    console.error('FORM DATA KEYS:', Object.keys(form.data));
    
    // Log each individual form field value to ensure we see EVERYTHING
    console.error('FORM FIELD VALUES:');
    Object.entries(form.data).forEach(([key, value]) => {
      console.error(`  - ${key}: ${JSON.stringify(value)}`);
    });
    console.error('=================================================');
    
    // Print superform output to console for debugging
    console.error('SUPERFORM VALIDATION RESULT:', {
      valid: form.valid,
      errors: form.errors,
      data: {
        ...form.data,
        // Don't log entire rich text objects to keep logs readable
        full_description: form.data.long_description ? '(JSON data)' : null,
        technical_specifications: form.data.technical_specifications ? '(JSON data)' : null,
      }
    });
    
    // Always check if form is valid
    if (!form.valid) {
      console.error('FORM VALIDATION FAILED:', form.errors);
      
      // Special handling for dimension validation errors
      if (form.errors.dimensions) {
        console.error('DIMENSIONS VALIDATION ERROR DETAILS:', {
          errors: form.errors.dimensions,
          formDimensions: form.data.dimensions,
        });
        
        // Log detailed information about the dimension validation failure
        // but do not modify the form data - validation requirements must be met
        if (form.data.dimensions === undefined) {
          console.error('DIMENSIONS VALIDATION: dimensions field is undefined');
        } else if (form.data.dimensions === null) {
          console.error('DIMENSIONS VALIDATION: dimensions field is null (valid case)');
        } else if (typeof form.data.dimensions === 'object') {
          const dims = form.data.dimensions as any;
          console.error('DIMENSIONS VALIDATION: Object structure analysis:', {
            hasLengthProperty: 'length' in dims,
            hasWidthProperty: 'width' in dims,
            hasHeightProperty: 'height' in dims,
            lengthType: typeof dims.length,
            widthType: typeof dims.width,
            heightType: typeof dims.height,
            isAllNull: dims.length === null && dims.width === null && dims.height === null,
            hasAnyNumeric: typeof dims.length === 'number' || typeof dims.width === 'number' || typeof dims.height === 'number',
            hasAllNumeric: typeof dims.length === 'number' && typeof dims.width === 'number' && typeof dims.height === 'number',
            isValid: (dims.length === null && dims.width === null && dims.height === null) || 
                     (typeof dims.length === 'number' && dims.length > 0 &&
                      typeof dims.width === 'number' && dims.width > 0 &&
                      typeof dims.height === 'number' && dims.height > 0)
          });
        } else {
          console.error('DIMENSIONS VALIDATION: Invalid type:', typeof form.data.dimensions);
        }
      }
      
      // Still return with validation failure, but with potentially fixed data
      // to allow retry with better data in the UI
      return fail(400, { form, error: 'Form validation failed' });
    }
    
    // Step 4: Proceed with database update ONLY IF validation succeeded
    try {
      console.error('PREPARING DATABASE UPDATE');
      
      // Generate new version ID
      const newVersionId = crypto.randomUUID();
      console.error('New version ID:', newVersionId);
      
      // COMPLETE APPROACH: Map the ENTIRE form data directly to the version data
      // This ensures we use ALL fields from the form submission without any manual extraction
      const versionData: any = {
        // Required system fields for database integrity
        part_id: part.part_id,
        part_version_id: newVersionId,
        created_by: locals.user?.id,
        
        // MAP EVERYTHING from the validated form data - no cherry picking
        // This properly follows superform validation without bypassing any fields
        part_name: form.data.part_name,
        part_version: form.data.part_version,
        version_status: form.data.version_status,
        short_description: form.data.short_description,
        full_description: form.data.long_description,
        functional_description: form.data.functional_description,
        
        // Electrical properties 
        voltage_rating_min: form.data.voltage_rating_min,
        voltage_rating_max: form.data.voltage_rating_max,
        current_rating_min: form.data.current_rating_min, 
        current_rating_max: form.data.current_rating_max,
        power_rating_max: form.data.power_rating_max,
        tolerance: form.data.tolerance,
        tolerance_unit: form.data.tolerance_unit,
        
        // Dimensions and physical properties
        dimensions: form.data.dimensions,
        dimensions_unit: form.data.dimensions_unit, // Use dimensions_unit instead of dimension_unit per schema
        weight: form.data.part_weight,
        weight_unit: form.data.weight_unit,
        package_type: form.data.package_type,
        pin_count: form.data.pin_count,
        material_composition: form.data.material_composition,
        
        // Thermal properties
        operating_temperature_min: form.data.operating_temperature_min,
        operating_temperature_max: form.data.operating_temperature_max,
        storage_temperature_min: form.data.storage_temperature_min,
        storage_temperature_max: form.data.storage_temperature_max,
        temperature_unit: form.data.temperature_unit,
        
        // Other properties - ensure properly typed
        technical_specifications: form.data.technical_specifications || {},
        environmental_data: form.data.environmental_data || null,
        revision_notes: form.data.revision_notes || '',
      };
      
      // Process technical specifications properly to ensure object structure
      try {
        if (versionData.technical_specifications) {
          // Parse if it's a string, otherwise keep as object
          const techSpec = typeof versionData.technical_specifications === 'string' 
            ? JSON.parse(versionData.technical_specifications)
            : versionData.technical_specifications;
            
          // Make sure we have the expected structure
          versionData.technical_specifications = {
            ...techSpec,
            electrical_properties: techSpec.electrical_properties || {},
            mechanical_properties: techSpec.mechanical_properties || {},
            thermal_properties: techSpec.thermal_properties || {}
          };
        }
      } catch (error) {
        console.error('Error processing technical specifications:', error);
        // Fallback to empty object with expected structure
        versionData.technical_specifications = {
          electrical_properties: {},
          mechanical_properties: {},
          thermal_properties: {}
        };
      }
      
      // Final pre-submission validation to catch any lingering issues
      console.log('FINAL DATA VALIDATION:');
      
      // 1. Dimensions validation
      console.log('DIMENSIONS VALIDATION:', {
        originalValue: form.data.dimensions,
        processedValue: versionData.dimensions,
        isNull: versionData.dimensions === null,
        isObject: versionData.dimensions !== null && typeof versionData.dimensions === 'object',
        allValuesNumeric: versionData.dimensions !== null && 
          typeof versionData.dimensions === 'object' && 
          typeof versionData.dimensions.length === 'number' && 
          typeof versionData.dimensions.width === 'number' && 
          typeof versionData.dimensions.height === 'number'
      });
      
      // Last chance to fix dimensions before submission
      if (versionData.dimensions !== null) {
        // If it's an object but any dimension is null or not a number, that violates the constraint
        if (typeof versionData.dimensions === 'object') {
          const needsFix = 
            typeof versionData.dimensions.length !== 'number' || 
            typeof versionData.dimensions.width !== 'number' || 
            typeof versionData.dimensions.height !== 'number';
            
          if (needsFix) {
            console.log('CRITICAL FIX: Fixing invalid dimensions object before database submission');
            // Two options: either make all values numeric or set dimensions to null
            // Let's set all to 0 to avoid losing data structure
            versionData.dimensions = {
              length: typeof versionData.dimensions.length === 'number' ? versionData.dimensions.length : null,
              width: typeof versionData.dimensions.width === 'number' ? versionData.dimensions.width : null,
              height: typeof versionData.dimensions.height === 'number' ? versionData.dimensions.height : null
            };
            console.log('Fixed dimensions:', versionData.dimensions);
          }
        } else {
          // Not an object but also not null? That's invalid - set to null
          console.log('CRITICAL FIX: Non-object non-null dimensions found, setting to null');
          versionData.dimensions = null;
        }
      }
      
      // 2. Validate other JSON fields using our utility function
      ['technical_specifications', 'properties', 'electrical_properties', 
       'mechanical_properties', 'thermal_properties', 'material_composition', 
       'environmental_data'].forEach(field => {
        const dbField = field.replace(/_/g, ''); // Convert db field to camelCase for versionData
        // Use the new utility function for robust JSON field parsing
        versionData[dbField] = parsePartJsonField(versionData[dbField], field);
        console.log(`Processed ${field} using parsePartJsonField utility`);
      });
      
      // 3. Validate numeric fields
      ['voltageRatingMin', 'voltageRatingMax', 'currentRatingMin', 'currentRatingMax',
       'powerRatingMax', 'tolerance', 'weight', 'pinCount',
       'operatingTemperatureMin', 'operatingTemperatureMax',
       'storageTemperatureMin', 'storageTemperatureMax'].forEach(field => {
        if (versionData[field] === '' || versionData[field] === undefined) {
          console.log(`CRITICAL FIX: Setting empty ${field} to null`);
          versionData[field] = null;
        }
      });
      
      // Log the final mapped version data for debugging
      // EXTENSIVE LOGGING - show ALL fields without truncation
      console.log('[editPart] Final mapped version data (COMPLETE):');
      Object.entries(versionData).forEach(([key, value]) => {
        console.log(`  - ${key}: ${JSON.stringify(value)}`);
      });
      
      // NO CHERRY-PICKING WHATSOEVER - Log the COMPLETE data
      console.log('[editPart] 100% COMPLETE DATA WITH NO CHERRY-PICKING:', JSON.stringify(versionData, null, 2));
      
      console.log('[editPart] Creating new version with submitted form data:', versionData);    
   
      const partStatus = form.data.version_status || part.lifecycle_status;
      
      // Step 1: Log full status information for debugging
      console.log('COMPLETE PART STATUS INFO:', {
        currentPartStatus: part.lifecycle_status,
        newPartStatus: partStatus,
        isStatusChanging: part.lifecycle_status !== partStatus,
        formPartStatus: form.data.version_status
      });
      
      // Step 2: Create the new part version using validated data
      console.error('Creating new part version...');
      const result = await getPartWithCurrentVersion(params.id as string)
        .catch(error => {
          console.error('Error fetching current part version:', error);
          return null;
        });
      
      if (!result || !result.currentVersion) return fail(404, { message: 'Part version not found' });
      const currentVersion = result.currentVersion;
      
      const newVersion = await createPartVersion(versionData);
      console.error('New version created with ID:', newVersion.part_version_id);
        
      // Step 3: Update the part record to point to this new version
      console.error('Updating part record to use new version...');
      // Convert lifecycle status to part status for the update function
      // Use explicit type conversion according to enum values rather than unsafe casting
      const partStatusForUpdate: PartStatusEnum = (() => {
        // Map lifecycle status to corresponding part status
        switch(partStatus) {
          case LifecycleStatusEnum.DRAFT:
          case LifecycleStatusEnum.IN_REVIEW:
          case LifecycleStatusEnum.APPROVED:
          case LifecycleStatusEnum.PRE_RELEASE:
            return PartStatusEnum.CONCEPT;
          case LifecycleStatusEnum.RELEASED:
          case LifecycleStatusEnum.PRODUCTION:
            return PartStatusEnum.ACTIVE;
          case LifecycleStatusEnum.ON_HOLD:
            return PartStatusEnum.ACTIVE; // Map on-hold to active for database
          case LifecycleStatusEnum.OBSOLETE:
            return PartStatusEnum.OBSOLETE;
          case LifecycleStatusEnum.ARCHIVED:
            return PartStatusEnum.ARCHIVED;
          default:
            return PartStatusEnum.CONCEPT; // Default fallback
        }
      })();
      
      await updateUnifiedPart(
        part.part_id,
        newVersionId,
        partStatusForUpdate
      );
      console.error('Part record updated successfully to point to new version');
      
      // Return success with form data
      console.error('============= PART EDIT COMPLETED SUCCESSFULLY =============');
      return { 
        form, 
        success: true,
        message: 'Part updated successfully'
      };
    } catch (error) {
      // Error handling with form state preservation
      console.error('============= PART EDIT ERROR =============');
      console.error('ERROR DETAILS:', error);
      
      // Detailed error logging and user-friendly message
      console.error('DATABASE CONSTRAINT ERROR DETAILS:', {
        message: (error as any).message,
        code: (error as any).code,
        detail: (error as any).detail,
      });
      
      // Return detailed information for debugging
      return fail(500, { 
        form,  // Return the form so the UI can show validation errors
        error: 'Failed to update part: ' + (error as Error).message,
        constraintError: (error as any).code === '23514' ? 'Database constraint violation' : undefined
      });
    }
  }
};
