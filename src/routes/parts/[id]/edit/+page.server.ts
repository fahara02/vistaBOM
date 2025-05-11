// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema, partVersionEditSchema } from '$lib/server/db/schema';
// Import types from lib/types.ts for client-side compatibility
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, PartStatusEnum, TemperatureUnitEnum, DimensionUnitEnum } from '$lib/types';
import { createPartVersion, getPartWithCurrentVersion, updatePartWithStatus } from '$lib/server/parts';
import { error, fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'crypto';

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
  const packageTypes = Object.keys(PackageTypeEnum);
  const weightUnits = Object.keys(WeightUnitEnum);
  const dimensionUnits = Object.values(DimensionUnitEnum); 
  const temperatureUnits = Object.keys(TemperatureUnitEnum);
  const lifecycleStatuses = Object.values(LifecycleStatusEnum);
  const partStatuses = Object.values(PartStatusEnum);

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

// Direct database functions
import { getClient } from '$lib/server/db';
const dbClient = getClient();

/**
 * Emergency direct database update when form validation fails but critical fields need updating
 * Uses a multiple separate updates approach to avoid concurrency issues
 */
async function directUpdatePartVersion(partId: string, versionId: string, updates: {
  name?: string;
  version?: string;
  status?: string;
}) {
  console.log('[directUpdatePartVersion] Starting direct update with:', updates);
  
  try {
    // First check if the part version exists at all
    const checkQuery = `SELECT id FROM "PartVersion" WHERE id = $1`;
    const checkResult = await dbClient.query(checkQuery, [versionId]);
    
    if (checkResult.rows.length === 0) {
      return { success: false, error: 'Part version not found' };
    }
    
    // Process each field as an independent update to minimize conflicts
    let updateSuccesses = 0;
    let updateAttempts = 0;
    let lastResult = null;
    
    // Update name if provided
    if (updates.name) {
      updateAttempts++;
      try {
        const nameUpdateQuery = `
          WITH updated AS (
            UPDATE "PartVersion" 
            SET name = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, version, status
          )
          SELECT * FROM updated
        `;
        
        const nameResult = await dbClient.query(nameUpdateQuery, [updates.name, versionId]);
        if (nameResult.rows.length > 0) {
          console.log('[directUpdatePartVersion] Name updated successfully');
          lastResult = nameResult.rows[0];
          updateSuccesses++;
        }
      } catch (nameError) {
        console.warn('[directUpdatePartVersion] Name update failed:', nameError);
      }
    }
    
    // Update version if provided
    if (updates.version) {
      updateAttempts++;
      try {
        const versionUpdateQuery = `
          WITH updated AS (
            UPDATE "PartVersion" 
            SET version = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, version, status
          )
          SELECT * FROM updated
        `;
        
        const versionResult = await dbClient.query(versionUpdateQuery, [updates.version, versionId]);
        if (versionResult.rows.length > 0) {
          console.log('[directUpdatePartVersion] Version number updated successfully');
          lastResult = versionResult.rows[0];
          updateSuccesses++;
        }
      } catch (versionError) {
        console.warn('[directUpdatePartVersion] Version number update failed:', versionError);
      }
    }
    
    // Update status if provided
    if (updates.status) {
      updateAttempts++;
      try {
        const statusUpdateQuery = `
          WITH updated AS (
            UPDATE "PartVersion" 
            SET status = $1::text::lifecycle_status_enum, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, version, status
          )
          SELECT * FROM updated
        `;
        
        const statusResult = await dbClient.query(statusUpdateQuery, [updates.status, versionId]);
        if (statusResult.rows.length > 0) {
          console.log('[directUpdatePartVersion] Status updated successfully');
          lastResult = statusResult.rows[0];
          updateSuccesses++;
          
          // Also try to update Part lifecycle status separately
          try {
            await dbClient.query(
              `UPDATE "Part" SET lifecycle_status = $1::text::lifecycle_status_enum WHERE id = $2`,
              [updates.status, partId]
            );
            console.log('[directUpdatePartVersion] Part lifecycle status also updated');
          } catch (partError) {
            console.warn('[directUpdatePartVersion] Part status update failed:', partError);
            // Continue anyway - this is not critical
          }
        }
      } catch (statusError) {
        console.warn('[directUpdatePartVersion] Status update failed:', statusError);
      }
    }
    
    if (updateAttempts === 0) {
      return { success: true, message: 'No updates were needed' };
    }
    
    if (updateSuccesses > 0) {
      return { 
        success: true, 
        message: `${updateSuccesses} of ${updateAttempts} updates succeeded`, 
        updatedVersion: lastResult 
      };
    }
    
    return { 
      success: false, 
      error: `All ${updateAttempts} updates failed` 
    };
  } catch (error) {
    console.error('[directUpdatePartVersion] Error:', error);
    return { success: false, error };
  }
}

export const actions: Actions = {
  default: async ({ request, params }) => {
    console.log('[editPart] Form submission received');
    const formData = await request.formData();
    
    // Use the edit schema that makes required fields optional
    // This allows updating just a single field without validation errors
    const form = await superValidate(formData, zod(partVersionEditSchema));
    console.log('[editPart] Form validation result:', { valid: form.valid, errors: form.errors });
    
    // Log the validated form data
    console.log('[editPart] FORM DATA:', JSON.stringify(form.data, null, 2));
    
    const partId = params.id as string;
    const { part, currentVersion } = await getPartWithCurrentVersion(partId);
    
    if (!part) {
      return fail(404, { error: 'Part not found' });
    }
    
    try {
      // Create a new version with EXACTLY what was submitted in the form
      const newVersionId = randomUUID();
      
      // Take ALL form data and map field names to database column names
      // Do not filter or limit which fields can be updated
      const versionData: any = {
        id: newVersionId,
        partId: part.id,
        createdBy: part.creatorId,
      };
      
      // Log ALL incoming form data for debugging
      console.log('[editPart] COMPLETE FORM DATA:', JSON.stringify(form.data, null, 2));
      
      // Map ALL form fields to their database equivalents without any filtering
      // This allows updating ANY combination of fields
      if ('name' in form.data) {
        versionData.name = form.data.name;
        console.log('[editPart] FIELD MAPPED: name =', form.data.name);
      }
      if ('version' in form.data) {
        versionData.version = form.data.version;
        console.log('[editPart] FIELD MAPPED: version =', form.data.version);
      }
      if ('status' in form.data) {
        versionData.status = form.data.status;
        console.log('[editPart] FIELD MAPPED: status =', form.data.status);
      }
      if ('short_description' in form.data) {
        versionData.shortDescription = form.data.short_description;
        console.log('[editPart] FIELD MAPPED: shortDescription =', form.data.short_description);
      }
      if ('functional_description' in form.data) {
        versionData.functionalDescription = form.data.functional_description;
        console.log('[editPart] FIELD MAPPED: functionalDescription =', form.data.functional_description);
      }
      if ('long_description' in form.data) {
        versionData.longDescription = form.data.long_description;
        console.log('[editPart] FIELD MAPPED: longDescription =', form.data.long_description);
      }
      
      // Electrical properties
      if ('voltage_rating_min' in form.data) {
        versionData.voltageRatingMin = form.data.voltage_rating_min;
        console.log('[editPart] FIELD MAPPED: voltageRatingMin =', form.data.voltage_rating_min);
      }
      if ('voltage_rating_max' in form.data) {
        versionData.voltageRatingMax = form.data.voltage_rating_max;
        console.log('[editPart] FIELD MAPPED: voltageRatingMax =', form.data.voltage_rating_max);
      }
      if ('current_rating_min' in form.data) {
        versionData.currentRatingMin = form.data.current_rating_min;
        console.log('[editPart] FIELD MAPPED: currentRatingMin =', form.data.current_rating_min);
      }
      if ('current_rating_max' in form.data) {
        versionData.currentRatingMax = form.data.current_rating_max;
        console.log('[editPart] FIELD MAPPED: currentRatingMax =', form.data.current_rating_max);
      }
      if ('power_rating_max' in form.data) {
        versionData.powerRatingMax = form.data.power_rating_max;
        console.log('[editPart] FIELD MAPPED: powerRatingMax =', form.data.power_rating_max);
      }
      if ('tolerance' in form.data) {
        versionData.tolerance = form.data.tolerance;
        console.log('[editPart] FIELD MAPPED: tolerance =', form.data.tolerance);
      }
      if ('tolerance_unit' in form.data) {
        versionData.toleranceUnit = form.data.tolerance_unit;
        console.log('[editPart] FIELD MAPPED: toleranceUnit =', form.data.tolerance_unit);
      }
      if ('electrical_properties' in form.data) {
        versionData.electricalProperties = form.data.electrical_properties;
        console.log('[editPart] FIELD MAPPED: electricalProperties =', form.data.electrical_properties);
      }
      
      // Mechanical properties
      if ('dimensions' in form.data) {
        versionData.dimensions = form.data.dimensions;
        console.log('[editPart] FIELD MAPPED: dimensions =', form.data.dimensions);
      }
      if ('dimensions_unit' in form.data) {
        versionData.dimensionsUnit = form.data.dimensions_unit;
        console.log('[editPart] FIELD MAPPED: dimensionsUnit =', form.data.dimensions_unit);
      }
      if ('weight' in form.data) {
        versionData.weight = form.data.weight;
        console.log('[editPart] FIELD MAPPED: weight =', form.data.weight);
      }
      if ('weight_unit' in form.data) {
        versionData.weightUnit = form.data.weight_unit;
        console.log('[editPart] FIELD MAPPED: weightUnit =', form.data.weight_unit);
      }
      if ('package_type' in form.data) {
        versionData.packageType = form.data.package_type;
        console.log('[editPart] FIELD MAPPED: packageType =', form.data.package_type);
      }
      if ('pin_count' in form.data) {
        versionData.pinCount = form.data.pin_count;
        console.log('[editPart] FIELD MAPPED: pinCount =', form.data.pin_count);
      }
      if ('mechanical_properties' in form.data) {
        versionData.mechanicalProperties = form.data.mechanical_properties;
        console.log('[editPart] FIELD MAPPED: mechanicalProperties =', form.data.mechanical_properties);
      }
      if ('material_composition' in form.data) {
        versionData.materialComposition = form.data.material_composition;
        console.log('[editPart] FIELD MAPPED: materialComposition =', form.data.material_composition);
      }
      
      // Thermal properties
      if ('operating_temperature_min' in form.data) {
        versionData.operatingTemperatureMin = form.data.operating_temperature_min;
        console.log('[editPart] FIELD MAPPED: operatingTemperatureMin =', form.data.operating_temperature_min);
      }
      if ('operating_temperature_max' in form.data) {
        versionData.operatingTemperatureMax = form.data.operating_temperature_max;
        console.log('[editPart] FIELD MAPPED: operatingTemperatureMax =', form.data.operating_temperature_max);
      }
      if ('storage_temperature_min' in form.data) {
        versionData.storageTemperatureMin = form.data.storage_temperature_min;
        console.log('[editPart] FIELD MAPPED: storageTemperatureMin =', form.data.storage_temperature_min);
      }
      if ('storage_temperature_max' in form.data) {
        versionData.storageTemperatureMax = form.data.storage_temperature_max;
        console.log('[editPart] FIELD MAPPED: storageTemperatureMax =', form.data.storage_temperature_max);
      }
      if ('temperature_unit' in form.data) {
        versionData.temperatureUnit = form.data.temperature_unit;
        console.log('[editPart] FIELD MAPPED: temperatureUnit =', form.data.temperature_unit);
      }
      if ('thermal_properties' in form.data) {
        versionData.thermalProperties = form.data.thermal_properties;
        console.log('[editPart] FIELD MAPPED: thermalProperties =', form.data.thermal_properties);
      }
      
      // Other properties
      if ('technical_specifications' in form.data) {
        versionData.technicalSpecifications = form.data.technical_specifications;
        console.log('[editPart] FIELD MAPPED: technicalSpecifications =', form.data.technical_specifications);
      }
      if ('properties' in form.data) {
        versionData.properties = form.data.properties;
        console.log('[editPart] FIELD MAPPED: properties =', form.data.properties);
      }
      if ('environmental_data' in form.data) {
        versionData.environmentalData = form.data.environmental_data;
        console.log('[editPart] FIELD MAPPED: environmentalData =', form.data.environmental_data);
      }
      if ('revision_notes' in form.data) {
        versionData.revisionNotes = form.data.revision_notes;
        console.log('[editPart] FIELD MAPPED: revisionNotes =', form.data.revision_notes);
      }
      
      console.log('[editPart] Creating new version with submitted form data:', versionData);
      
      // Create a new version with ONLY the fields that were actually in the form submission
      await createPartVersion(versionData);
      
      // Update the part to point to the new version
      // The form contains TWO different statuses:
      // 1. form.data.status = version lifecycle status (LifecycleStatusEnum)
      // 2. form.data.partStatus = part status (PartStatusEnum)
      
      // Get the part status from form or use current part status as fallback
      const partStatus = form.data.partStatus || part.status;
      
      // Update the part with new version ID and part status
      await updatePartWithStatus(
        part.id,
        newVersionId,
        partStatus as PartStatusEnum // This is the correct type expected by the function
      );
      
      console.log('[editPart] Successfully updated part');
      return { form, success: true };
    } catch (error) {
      console.error('[editPart] Error updating part:', error);
      return fail(500, { form, error: 'Failed to update part version' });
    }
  }
};
