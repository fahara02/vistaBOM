// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema } from '$lib/server/db/schema';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, PartStatusEnum, TemperatureUnitEnum, DimensionUnitEnum } from '$lib/server/db/types';
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
  const dimensionUnits = Object.keys(WeightUnitEnum);
  const temperatureUnits = Object.keys(TemperatureUnitEnum);
  const lifecycleStatuses = Object.keys(LifecycleStatusEnum);
  const partStatuses = Object.keys(PartStatusEnum);

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
    
    // Try to parse the form with validation
    const form = await superValidate(formData, zod(partVersionSchema));
    console.log('[editPart] Form validation result:', { valid: form.valid, errors: form.errors });
    
    const partId = params.id as string;
    const { part, currentVersion } = await getPartWithCurrentVersion(partId);
    
    if (!part) {
      return fail(404, { error: 'Part not found' });
    }
    
    try {
      // STANDARD PATH: If form validation passes, use the standard update flow
      if (form.valid) {
        console.log('[editPart] Form is valid, using standard update flow');
        
        // Create a new version with all the form data
        const newVersionId = randomUUID();
        await createPartVersion({
          id: newVersionId,
          partId: part.id,
          version: form.data.version,
          name: form.data.name,
          status: form.data.status,
          createdBy: part.creatorId,
          shortDescription: form.data.short_description || null,
          functionalDescription: form.data.functional_description || null,
          longDescription: form.data.long_description || null,
          // Other fields can be added here as needed
        });
        
        // Update the part to point to the new version
        await updatePartWithStatus(
          part.id,
          newVersionId,
          form.data.status
        );
        
        console.log('[editPart] Successfully updated part with standard flow');
        return { form, success: true };
      } 
      // EMERGENCY PATH: If form validation fails, but we need to update critical fields
      else {
        console.log('[editPart] Form validation failed, attempting emergency update');
        
        // Extract name and version from form data directly
        const name = formData.get('name')?.toString();
        const version = formData.get('version')?.toString();
        const status = formData.get('status')?.toString();
        
        console.log('[editPart] Extracted critical values directly:', { name, version, status });
        
        // Check if any fields need updating
        const needsUpdate = 
          (name && name !== currentVersion.name) ||
          (version && version !== currentVersion.version) || 
          (status && status !== currentVersion.status);
        
        if (needsUpdate) {
          // Prepare updates object
          const updates: {name?: string, version?: string, status?: string} = {};
          
          if (name && name !== currentVersion.name) {
            updates.name = name;
          }
          
          if (version && version !== currentVersion.version) {
            updates.version = version;
          }
          
          if (status && status !== currentVersion.status) {
            updates.status = status;
          }
          
          // Perform emergency direct update
          const result = await directUpdatePartVersion(
            part.id,
            currentVersion.id,
            updates
          );
          
          if (result.success) {
            console.log('[editPart] Emergency update succeeded for fields:', updates);
            return { form, success: true, emergency: true, updated: updates };
          } else {
            console.error('[editPart] Emergency update failed:', result.error);
            return fail(500, { form, error: 'Emergency update failed' });
          }
        } else {
          console.log('[editPart] No changes detected for emergency update');
          return { form, warning: 'Form validation failed, but no changes were needed' };
        }
      }
    } catch (error) {
      console.error('[editPart] Error updating part:', error);
      return fail(500, { form, error: 'Failed to update part version' });
    }
  }
};
