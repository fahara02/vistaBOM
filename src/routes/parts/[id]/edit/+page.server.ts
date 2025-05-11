// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema } from '$lib/server/db/schema';
import type { PartVersion } from '$lib/server/db/types';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum } from '$lib/server/db/types';
import { createPartVersion, getPartWithCurrentVersion, updatePartCurrentVersion } from '$lib/server/parts';
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
    status: currentVersion.status,
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
  const partDataTyped = {
    ...initialData,
    status: initialData.status as LifecycleStatusEnum
  };
  
  const form = await superValidate(partDataTyped, zod(partVersionSchema));
  const statuses = Object.values(LifecycleStatusEnum);
  const packageTypes = Object.values(PackageTypeEnum);
  const weightUnits = Object.values(WeightUnitEnum);
  return { form, part, statuses, packageTypes, weightUnits };
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
        // Create the new version
        const createdVersion = await createPartVersion(newVersion);
        console.log('[editPart] New version created:', createdVersion.id);
        
        // Update the part to point to the new version
        await updatePartCurrentVersion(part.id, newVersion.id);
        console.log('[editPart] Part current version updated successfully');
        
        // Redirect to part details - need to handle route structure correctly
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
