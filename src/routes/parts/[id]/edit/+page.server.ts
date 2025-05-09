// src/routes/parts/[id]/edit/+page.server.ts
import { partVersionSchema } from '$lib/server/db/schema';
import type { PartVersion } from '$lib/server/db/types';
import { LifecycleStatusEnum, PackageTypeEnum } from '$lib/server/db/types';
import { createNewVersion, createPartVersion, getPartWithCurrentVersion, isVersionEditable, updatePartCurrentVersion, updatePartVersion } from '$lib/server/parts';
import { error, fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';

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
  return { form, part, statuses, packageTypes };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod(partVersionSchema));
    if (!form.valid) return { form };

    try {
      const userID = locals.user.id;
      const { part, currentVersion } = await getPartWithCurrentVersion(params.id as string);

      if (!part) throw error(404, 'Part not found');
      if (!isVersionEditable(currentVersion)) {
        const newVersion = createNewVersion(currentVersion, userID);
        await createPartVersion(newVersion);
        await updatePartCurrentVersion(part.id, newVersion.id);
      }

      // Map snake_case form.data back to PartVersion
      const d = form.data;
      const updateData: Partial<PartVersion> & { id: string } = {
        id: d.id,
        partId: d.part_id,
        version: d.version,
        name: d.name,
        shortDescription: d.short_description ?? undefined,
        status: d.status,
        createdBy: d.created_by,
        updatedAt: d.updated_at
      };
      await updatePartVersion(updateData);
      redirect(303, `/parts/${params.id}`);
    } catch {
      return fail(400, { form, error: 'Failed to update part' });
    }
  }
};
