// Working implementation
import { partVersionSchema } from '$lib/server/db/schema';
import type { PartVersion } from '$lib/server/db/types';
import { LifecycleStatusEnum, PackageTypeEnum, WeightUnitEnum, PartStatusEnum } from '$lib/server/db/types';
import { getPartWithCurrentVersion, updatePartCurrentVersion, updatePartWithStatus } from '$lib/server/parts';
import { error, fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'crypto';
import { getClient } from '$lib/server/db/index';

// Direct database access for part version creation
const client = getClient();

// Simple working version function
async function createSimplePartVersion(partVersion: {
    id: string;
    partId: string;
    version: string;
    name: string;
    status: string;
    createdBy: string;
    shortDescription?: string;
}): Promise<any> {
    try {
        const result = await client.query(`
            INSERT INTO "PartVersion" (
                id, part_id, version, name, short_description, status, created_by, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6::text::lifecycle_status_enum, $7, NOW()
            ) RETURNING *
        `, [
            partVersion.id,
            partVersion.partId,
            partVersion.version,
            partVersion.name,
            partVersion.shortDescription || null,
            partVersion.status,
            partVersion.createdBy
        ]);
        
        if (!result.rows.length) {
            throw new Error('Failed to create part version');
        }
        
        return result.rows[0];
    } catch (error) {
        console.error('[createSimplePartVersion] Error:', error);
        throw error;
    }
}

export const load: PageServerLoad = async ({ params }) => {
  const { part, currentVersion } = await getPartWithCurrentVersion(params.id as string);
  if (!part) throw error(404, 'Part not found');

  // Create form with schema
  const form = await superValidate(zod(partVersionSchema));
  
  // Set basic values in form
  form.data = {
    ...form.data,
    id: currentVersion.id,
    part_id: currentVersion.partId,
    version: currentVersion.version,
    name: currentVersion.name,
    short_description: currentVersion.shortDescription ?? '',
    functional_description: currentVersion.functionalDescription ?? '',
    long_description: currentVersion.longDescription,
    status: currentVersion.status,
    partStatus: part.status
  };
  
  const statuses = Object.values(LifecycleStatusEnum);
  const partStatuses = Object.values(PartStatusEnum);
  const packageTypes = Object.values(PackageTypeEnum);
  const weightUnits = Object.values(WeightUnitEnum);
  
  return { form, part, statuses, partStatuses, packageTypes, weightUnits };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    // Validate form submission
    const form = await superValidate(request, zod(partVersionSchema));
    if (!form.valid) return { form };

    try {
      const userId = locals.user.id;
      const { part } = await getPartWithCurrentVersion(params.id as string);
      if (!part) throw error(404, 'Part not found');
      
      // Get form data
      const d = form.data;
      
      // Create minimal new version with just the necessary fields
      const newVersion = {
        id: randomUUID(),
        partId: part.id,
        version: d.version,
        name: d.name,
        shortDescription: d.short_description,
        status: d.status,
        createdBy: userId
      };
      
      try {
        // Create the new version with minimal fields
        const createdVersion = await createSimplePartVersion(newVersion);
        
        // Update the part reference
        if (d.partStatus) {
          await updatePartWithStatus(part.id, createdVersion.id, d.partStatus);
        } else {
          await updatePartCurrentVersion(part.id, createdVersion.id);
        }
        
        // Redirect to part details
        throw redirect(303, `/parts/${part.id}`);
      } catch (error: any) {
        console.error('Error:', error);
        return fail(500, { form, error: 'Failed to update part: ' + error.message });
      }
    } catch (error) {
      return fail(400, { form, error: 'Failed to process form submission' });
    }
  }
};
