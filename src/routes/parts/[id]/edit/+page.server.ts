// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema, partVersionEditSchema } from '@/schema/schema';
// Import types from lib/types.ts for client-side compatibility
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, PartStatusEnum, TemperatureUnitEnum, DimensionUnitEnum } from '$lib/types';
import { createPartVersion, getPartWithCurrentVersion, updatePartWithStatus } from '@/core/parts';
import { error, fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'crypto';
// Import utilities for JSON field handling
import { parsePartJsonField } from '$lib/utils/util';

export const load: PageServerLoad = async ({ params }) => {
  const { part, currentVersion } = await getPartWithCurrentVersion(params.id as string);
  if (!part) throw error(404, 'Part not found');

  // Map PartVersion to data matching schema with all properties
  // Properly cast the enum values to match the expected types
  const initialData = {
    id: currentVersion.id,
    part_id: currentVersion.partId,
    version: currentVersion.version,
    name: currentVersion.name,
    short_description: currentVersion.shortDescription ?? '',
    functional_description: currentVersion.functionalDescription ?? '',
    long_description: currentVersion.longDescription ?? null,
    status: currentVersion.status as LifecycleStatusEnum,
    partStatus: part.status as PartStatusEnum,
    
    // Electrical properties 
    voltage_rating_min: currentVersion.voltageRatingMin ?? null,
    voltage_rating_max: currentVersion.voltageRatingMax ?? null,
    current_rating_min: currentVersion.currentRatingMin ?? null,
    current_rating_max: currentVersion.currentRatingMax ?? null,
    power_rating_max: currentVersion.powerRatingMax ?? null,
    tolerance: currentVersion.tolerance ?? null,
    tolerance_unit: currentVersion.toleranceUnit ?? null,
    electrical_properties: currentVersion.electricalProperties ?? null,
    
    // Mechanical properties
    dimensions: currentVersion.dimensions ?? { length: null, width: null, height: null },
    dimensions_unit: currentVersion.dimensionsUnit as DimensionUnitEnum || null,
    weight: currentVersion.weight ?? null,
    weight_unit: currentVersion.weightUnit as WeightUnitEnum || null,
    package_type: currentVersion.packageType as PackageTypeEnum || null,
    pin_count: currentVersion.pinCount ?? null,
    mechanical_properties: currentVersion.mechanicalProperties ?? null,
    material_composition: currentVersion.materialComposition ?? null,
    
    // Thermal properties
    operating_temperature_min: currentVersion.operatingTemperatureMin ?? null,
    operating_temperature_max: currentVersion.operatingTemperatureMax ?? null,
    storage_temperature_min: currentVersion.storageTemperatureMin ?? null,
    storage_temperature_max: currentVersion.storageTemperatureMax ?? null,
    temperature_unit: currentVersion.temperatureUnit as TemperatureUnitEnum || null,
    thermal_properties: currentVersion.thermalProperties ?? null,
    
    // Other properties
    technical_specifications: currentVersion.technicalSpecifications ?? null,
    properties: currentVersion.properties ?? null,
    environmental_data: currentVersion.environmentalData ?? null,
    revision_notes: currentVersion.revisionNotes ?? '',
    
    // Metadata
    created_by: currentVersion.createdBy,
    created_at: currentVersion.createdAt,
    updated_by: currentVersion.updatedBy ?? null,
    updated_at: currentVersion.updatedAt
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

// Import the sql client directly if needed
import sql from '$lib/server/db/index';



export const actions: Actions = {
  default: async ({ request, params }) => {
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
          else if (parsedDimensions && (
              typeof parsedDimensions.length === 'number' || 
              typeof parsedDimensions.width === 'number' || 
              typeof parsedDimensions.height === 'number'
          )) {
            // Make sure all dimension values exist and are numbers (0 if null)
            if (parsedDimensions.length === null) parsedDimensions.length = 0;
            if (parsedDimensions.width === null) parsedDimensions.width = 0;
            if (parsedDimensions.height === null) parsedDimensions.height = 0;
            
            formData.set('dimensions', JSON.stringify(parsedDimensions));
            console.error('DIMENSIONS FIX: Converting mixed dimensions to all numeric:', parsedDimensions);
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
    
    const form = await superValidate(formData, zod(partVersionEditSchema));
    
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
        longDescription: form.data.long_description ? '(JSON data)' : null,
        technicalSpecifications: form.data.technical_specifications ? '(JSON data)' : null,
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
      const newVersionId = randomUUID();
      console.error('New version ID:', newVersionId);
      
      // COMPLETE APPROACH: Map the ENTIRE form data directly to the version data
      // This ensures we use ALL fields from the form submission without any manual extraction
      const versionData: any = {
        // Required system fields for database integrity
        id: newVersionId,
        partId: part.id,
        createdBy: part.creatorId,
        
        // MAP EVERYTHING from the validated form data - no cherry picking
        // This properly follows superform validation without bypassing any fields
        name: form.data.name,
        version: form.data.version,
        status: form.data.status,
        shortDescription: form.data.short_description,
        longDescription: form.data.long_description,
        functionalDescription: form.data.functional_description,
        
        // Electrical properties 
        voltageRatingMin: form.data.voltage_rating_min,
        voltageRatingMax: form.data.voltage_rating_max,
        currentRatingMin: form.data.current_rating_min, 
        currentRatingMax: form.data.current_rating_max,
        powerRatingMax: form.data.power_rating_max,
        tolerance: form.data.tolerance,
        toleranceUnit: form.data.tolerance_unit,
        electricalProperties: form.data.electrical_properties,
        
        // Mechanical properties
        // Handle dimensions to meet database constraints
        // For database insertion, dimensions must be either:
        // 1. null, or
        // 2. an object with all positive number values
        dimensions: (() => {
          console.log('DIMENSIONS DATABASE TRANSFORMATION:', { original: form.data.dimensions });
          
          // If dimensions is null, keep it null (valid for DB)
          if (form.data.dimensions === null) {
            console.log('DIMENSIONS DB: Already null, keeping as is');
            return null;
          }
          
          // If dimensions is an object with all null values
          // (valid by schema but needs to be NULL for database)
          if (form.data.dimensions && typeof form.data.dimensions === 'object') {
            const dims = form.data.dimensions as any;
            
            // Case 1: All dimension values are null - set to null for database
            // Our schema allows this but database needs NULL
            if (dims.length === null && dims.width === null && dims.height === null) {
              console.log('DIMENSIONS DB: All null values -> Converting to null for database');
              return null;
            }
            
            // Case 2: Empty object - convert to null for database
            if (Object.keys(dims).length === 0) {
              console.log('DIMENSIONS DB: Empty object -> Converting to null for database');
              return null;
            }
            
            // Case 3: If we have numeric values, they must all be positive
            if (typeof dims.length === 'number' && 
                typeof dims.width === 'number' && 
                typeof dims.height === 'number') {
              
              if (dims.length > 0 && dims.width > 0 && dims.height > 0) {
                console.log('DIMENSIONS DB: All positive numbers, valid for database');
                return dims; // Valid for database as is
              } else {
                // Not all positive - log warning and set to null
                console.log('DIMENSIONS DB WARNING: Not all values positive, setting to null');
                return null;
              }
            }
            
            // Case 4: Mixed types or missing properties - invalid for database
            console.log('DIMENSIONS DB: Invalid structure for database, setting to null');
            return null;
          }
          
          // Default: If we get here, something unexpected - set to null
          console.log('DIMENSIONS DB: Unexpected format, setting to null');
          return null;
        })(),
        dimensionsUnit: form.data.dimensions_unit,
        weight: form.data.weight,
        weightUnit: form.data.weight_unit,
        packageType: form.data.package_type,
        pinCount: form.data.pin_count,
        mechanicalProperties: form.data.mechanical_properties,
        materialComposition: form.data.material_composition,
        
        // Thermal properties
        operatingTemperatureMin: form.data.operating_temperature_min,
        operatingTemperatureMax: form.data.operating_temperature_max,
        storageTemperatureMin: form.data.storage_temperature_min,
        storageTemperatureMax: form.data.storage_temperature_max,
        temperatureUnit: form.data.temperature_unit,
        thermalProperties: form.data.thermal_properties,
        
        // Other properties
        technicalSpecifications: form.data.technical_specifications,
        properties: form.data.properties,
        environmentalData: form.data.environmental_data,
        revisionNotes: form.data.revision_notes
      };
      
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
              length: typeof versionData.dimensions.length === 'number' ? versionData.dimensions.length : 0,
              width: typeof versionData.dimensions.width === 'number' ? versionData.dimensions.width : 0,
              height: typeof versionData.dimensions.height === 'number' ? versionData.dimensions.height : 0
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
   
      const partStatus = form.data.partStatus || part.status;  
      
      // Step 1: Log full status information for debugging
      console.log('COMPLETE PART STATUS INFO:', {
        currentPartStatus: part.status,
        newPartStatus: partStatus,
        isStatusChanging: part.status !== partStatus,
        formPartStatus: form.data.partStatus
      });
      
      // Step 2: Create the new part version using validated data
      console.error('Creating new part version...');
      const newVersion = await createPartVersion(versionData);
      console.error('New version created with ID:', newVersion.id);
        
      // Step 3: Update the part record to point to this new version
      console.error('Updating part record to use new version...');
      await updatePartWithStatus(
        part.id,
        newVersionId,
        partStatus as PartStatusEnum
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
