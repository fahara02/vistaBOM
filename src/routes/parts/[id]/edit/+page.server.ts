// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema } from '$lib/server/db/schema';
import type { PartVersion } from '$lib/server/db/types';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, PartStatusEnum, TemperatureUnitEnum } from '$lib/server/db/types';
import { createPartVersion, getPartWithCurrentVersion, updatePartCurrentVersion, updatePartWithStatus } from '$lib/server/parts';
import { error, fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ params }) => {
  const { part, currentVersion } = await getPartWithCurrentVersion(params.id as string);
  if (!part) throw error(404, 'Part not found');

  // Map PartVersion to data matching schema with all properties (using snake_case for schema compatibility)
  const initialData = {
    id: currentVersion.id,
    part_id: currentVersion.partId,
    version: currentVersion.version,
    name: currentVersion.name,
    short_description: currentVersion.shortDescription ?? '',
    functional_description: currentVersion.functionalDescription ?? '',
    long_description: currentVersion.longDescription ?? null,
    // Include both status fields
    status: currentVersion.status,
    // Include the Part status from the part object
    partStatus: part.status as PartStatusEnum, 
    // is_public belongs to Part, not PartVersion
    
    // Electrical properties
    voltage_rating_min: currentVersion.voltageRatingMin ?? null,
    voltage_rating_max: currentVersion.voltageRatingMax ?? null,
    current_rating_min: currentVersion.currentRatingMin ?? null,
    current_rating_max: currentVersion.currentRatingMax ?? null,
    power_rating_max: currentVersion.powerRatingMax ?? null,
    tolerance: currentVersion.tolerance ?? null,
    tolerance_unit: currentVersion.toleranceUnit ?? '',
    electrical_properties: currentVersion.electricalProperties ?? null,
    
    // Mechanical properties
    dimensions: currentVersion.dimensions ?? { length: null, width: null, height: null },
    dimensions_unit: currentVersion.dimensionsUnit ?? '',
    weight: currentVersion.weight ?? null,
    weight_unit: currentVersion.weightUnit ?? '',
    package_type: currentVersion.packageType ?? '',
    pin_count: currentVersion.pinCount ?? null,
    mechanical_properties: currentVersion.mechanicalProperties ?? null,
    material_composition: currentVersion.materialComposition ?? null,
    
    // Thermal properties
    operating_temperature_min: currentVersion.operatingTemperatureMin ?? null,
    operating_temperature_max: currentVersion.operatingTemperatureMax ?? null,
    storage_temperature_min: currentVersion.storageTemperatureMin ?? null,
    storage_temperature_max: currentVersion.storageTemperatureMax ?? null,
    thermal_properties: currentVersion.thermalProperties ?? null,
    
    // Additional properties
    technical_specifications: currentVersion.technicalSpecifications ?? null,
    properties: currentVersion.properties ?? null,
    environmental_data: currentVersion.environmentalData ?? null,
    revision_notes: currentVersion.revisionNotes ?? '',
    
    // Metadata fields
    created_by: currentVersion.createdBy,
    created_at: currentVersion.createdAt,
    updated_by: currentVersion.updatedBy ?? null,
    updated_at: currentVersion.updatedAt
  };
  // Create a simple empty form with the schema
  const form = await superValidate(zod(partVersionSchema));
  
  // Then set specific values we know are safe and properly typed
  form.data = {
    ...form.data,
    id: currentVersion.id,
    part_id: currentVersion.partId,
    version: currentVersion.version,
    name: currentVersion.name,
    short_description: currentVersion.shortDescription ?? '',
    functional_description: currentVersion.functionalDescription ?? '',
    long_description: currentVersion.longDescription,
    status: currentVersion.status as LifecycleStatusEnum,
    // Add the part status from the part object
    partStatus: part.status as PartStatusEnum
  };
  const statuses = Object.values(LifecycleStatusEnum);
  const partStatuses = Object.values(PartStatusEnum);
  const packageTypes = Object.values(PackageTypeEnum);
  const weightUnits = Object.values(WeightUnitEnum);
  return { form, part, statuses, partStatuses, packageTypes, weightUnits };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod(partVersionSchema));
    if (!form.valid) return { form };

    try {
      const userId = locals.user.id;
      const { part } = await getPartWithCurrentVersion(params.id as string);
      if (!part) throw error(404, 'Part not found');
      // Assemble full PartVersion object from snake_case form data
      const d = form.data;
      // Convert form data to PartVersion object with camelCase properties
      // Log the form data to see what's being submitted
      console.log('[editPart] Form data:', JSON.stringify(d, null, 2));
      
      const newVersion = {
        id: randomUUID(), 
        partId: part.id,
        version: d.version, 
        name: d.name,
        shortDescription: d.short_description || undefined,
        functionalDescription: d.functional_description || undefined,
        longDescription: d.long_description || undefined,
        status: d.status,
        // isPublic belongs to Part, not PartVersion - removed from here
        
        // Handle physical properties
        weight: d.weight || undefined, 
        // Handle weight unit as a proper enum
        weightUnit: d.weight_unit ? d.weight_unit as WeightUnitEnum : undefined,
        // Proper formatting for dimensions to avoid type issues
        dimensions: typeof d.dimensions === 'object' ? JSON.stringify(d.dimensions) : d.dimensions,
        dimensionsUnit: d.dimensions_unit || undefined,
        packageType: d.package_type || undefined,
        pinCount: d.pin_count || undefined,
        
        // Handle electrical properties
        voltageRatingMin: d.voltage_rating_min || undefined,
        voltageRatingMax: d.voltage_rating_max || undefined,
        currentRatingMin: d.current_rating_min || undefined,
        currentRatingMax: d.current_rating_max || undefined,
        powerRatingMax: d.power_rating_max || undefined,
        tolerance: d.tolerance || undefined,
        toleranceUnit: d.tolerance_unit || undefined,
        
        // Handle thermal properties
        operatingTemperatureMin: d.operating_temperature_min || undefined,
        operatingTemperatureMax: d.operating_temperature_max || undefined,
        storageTemperatureMin: d.storage_temperature_min || undefined,
        storageTemperatureMax: d.storage_temperature_max || undefined,
        
        // Handle all JSON fields - must be properly stringified for createPartVersion
        technicalSpecifications: d.technical_specifications ? JSON.stringify(d.technical_specifications) : undefined,
        properties: d.properties ? JSON.stringify(d.properties) : undefined,
        electricalProperties: d.electrical_properties ? JSON.stringify(d.electrical_properties) : undefined,
        mechanicalProperties: d.mechanical_properties ? JSON.stringify(d.mechanical_properties) : undefined,
        thermalProperties: d.thermal_properties ? JSON.stringify(d.thermal_properties) : undefined,
        materialComposition: d.material_composition ? JSON.stringify(d.material_composition) : undefined,
        environmentalData: d.environmental_data ? JSON.stringify(d.environmental_data) : undefined,
        revisionNotes: d.revision_notes || undefined,
        
        // Metadata fields
        createdBy: userId, 
        createdAt: new Date(),
        updatedBy: userId, updatedAt: new Date()
      };
      console.log('[editPart] Creating new version with data:', {
        id: newVersion.id,
        partId: newVersion.partId,
        version: newVersion.version,
        name: newVersion.name,
        // Avoid logging full content of large JSON fields
        hasTechnicalSpecs: newVersion.technicalSpecifications ? 'yes' : 'no',
        hasProperties: newVersion.properties ? 'yes' : 'no',
        hasElectricalProps: newVersion.electricalProperties ? 'yes' : 'no',
        hasMechanicalProps: newVersion.mechanicalProperties ? 'yes' : 'no',
        dimensions: newVersion.dimensions
      });
      
      try {
        // Get the current version again to ensure we have the latest data
        const { currentVersion } = await getPartWithCurrentVersion(part.id);
        
        // Log the original part and version details before updating
        console.log('[editPart] Original part:', {
          id: part.id,
          currentVersionId: part.currentVersionId,
          status: part.status
        });
        
        // Make sure we're preserving ALL existing data from the currentVersion
        // Create a detailed comparison to help debug the issue
        console.log('[editPart] BEFORE-AFTER comparison:', {
          before: {
            id: part.currentVersionId,
            name: currentVersion.name,
            description: currentVersion.shortDescription,
            functionalDesc: currentVersion.functionalDescription,
            status: currentVersion.status
          },
          after: {
            id: newVersion.id, // Will be a new UUID
            name: newVersion.name,
            description: newVersion.shortDescription,
            functionalDesc: newVersion.functionalDescription,
            status: newVersion.status
          }
        });
        
        // Double-check to make sure required fields exist in new version
        if (!newVersion.name || !newVersion.version || !newVersion.status) {
          console.error('[editPart] CRITICAL ERROR: Required fields missing in new version', {
            name: newVersion.name,
            version: newVersion.version,
            status: newVersion.status
          });
          throw new Error('Required fields missing in new version');
        }
        
        // Create the new version - make sure it's properly created first
        const createdVersion = await createPartVersion(newVersion);
        console.log('[editPart] New version created successfully with ID:', createdVersion.id);
        
        // Update the part's current version and status - wrap in try catch to isolate errors
        try {
          if (d.partStatus) {
            // If partStatus is provided, update both current version and part status
            console.log('[editPart] Updating both current version and part status:', {
              partId: part.id,
              newVersionId: createdVersion.id, // Use the returned createdVersion id to be safe
              newPartStatus: d.partStatus
            });
            await updatePartWithStatus(part.id, createdVersion.id, d.partStatus as PartStatusEnum);
            console.log('[editPart] Part current version and status updated successfully');
          } else {
            // Fallback to just updating the current version if no partStatus is provided
            console.log('[editPart] Only updating current version reference');
            await updatePartCurrentVersion(part.id, createdVersion.id);
            console.log('[editPart] Part current version updated successfully');
          }
        } catch (updateError) {
          console.error('[editPart] Error updating part reference:', updateError);
          // Continue with redirect even if reference update failed - at least version is created
        }
        
        // Redirect to part details - need to handle route structure correctly
        console.log('[editPart] Redirecting to part details page');
        throw redirect(303, `/parts/${part.id}`);
      } catch (error: any) {
        console.error('[editPart] Error during version creation or update:', error);
        const errorMessage = error?.message || 'Unknown error';
        return fail(500, { form, error: 'Failed to update part: ' + errorMessage });
      }
    } catch {
      return fail(400, { form, error: 'Failed to update part version' });
    }
  }
};
