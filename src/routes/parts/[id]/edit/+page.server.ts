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

  // Map PartVersion to snake_case data matching schema
  const initialData = {
    id: currentVersion.id,
    part_id: currentVersion.partId,
    version: currentVersion.version,
    name: currentVersion.name,
    short_description: currentVersion.shortDescription ?? null,
    status: currentVersion.status,
    created_by: currentVersion.createdBy,
    created_at: currentVersion.createdAt,
    updated_by: currentVersion.updatedBy ?? null,
    updated_at: currentVersion.updatedAt
  };
  const form = await superValidate(initialData, zod(partVersionSchema));
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
      // Assemble full PartVersion object
      const d = form.data;
      // Convert null values to undefined and stringify JSON objects
      const newVersion = {
        id: randomUUID(), 
        partId: part.id,
        version: d.version, 
        name: d.name,
        shortDescription: d.short_description || undefined,
        // Ensure all JSON fields are properly stringified
        longDescription: d.long_description ? JSON.stringify(d.long_description) : undefined,
        functionalDescription: d.functional_description || undefined,
        technicalSpecifications: d.technical_specifications ? JSON.stringify(d.technical_specifications) : undefined,
        properties: d.properties ? JSON.stringify(d.properties) : undefined,
        electricalProperties: d.electrical_properties ? JSON.stringify(d.electrical_properties) : undefined,
        mechanicalProperties: d.mechanical_properties ? JSON.stringify(d.mechanical_properties) : undefined,
        thermalProperties: d.thermal_properties ? JSON.stringify(d.thermal_properties) : undefined,
        weight: d.weight || undefined, 
        weightUnit: d.weight_unit || undefined,
        dimensions: d.dimensions ? JSON.stringify(d.dimensions) : undefined, 
        dimensionsUnit: d.dimensions_unit || undefined,
        tolerance: d.tolerance || undefined, 
        toleranceUnit: d.tolerance_unit || undefined,
        revisionNotes: d.revision_notes || undefined,
        status: d.status,
        createdBy: userId, createdAt: new Date(),
        updatedBy: userId, updatedAt: new Date()
      };
      await createPartVersion(newVersion);
      await updatePartCurrentVersion(part.id, newVersion.id);
      throw redirect(303, `/parts/${part.id}`);
    } catch {
      return fail(400, { form, error: 'Failed to update part version' });
    }
  }
};
