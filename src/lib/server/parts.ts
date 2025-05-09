// src/lib/server/parts.ts
import { getClient } from './db/index';
import { randomUUID } from 'crypto';
import { rowToPartVersionCategory,rowToPartAttachment,rowToPartCompliance,rowToPartCustomField,rowToPartVersionTag, rowToPartStructure, rowToPartRepresentation, rowToPartRevision, rowToPartValidation} from '../parts/partUtils';
import type {
  Part,
  PartVersion,
  PartVersionCategory,
  PartStructure,
  PartCompliance,
  PartAttachment,
  PartRepresentation,
  PartRevision,
  PartValidation,
  PartVersionTag,
  PartCustomField
} from './db/types';
import {
  LifecycleStatusEnum,
  ComplianceTypeEnum,
  StructuralRelationTypeEnum,

} from './db/types';

const client = getClient();

/**
 * List all parts with their current version
 */
export async function listParts(): Promise<Array<{ part: Part; currentVersion: PartVersion }>> {
	const result = await client.query(
		`
    SELECT
      p.id AS id,
      p.creator_id AS creatorId,
      p.global_part_number AS globalPartNumber,
      p.status AS status,
      p.lifecycle_status AS lifecycleStatus,
      p.is_public AS isPublic,
      p.created_at AS partCreatedAt,
      p.updated_by AS partUpdatedBy,
      p.updated_at AS partUpdatedAt,
      p.current_version_id AS currentVersionId,
      pv.id AS versionId,
      pv.part_id AS versionPartId,
      pv.version AS version,
      pv.name AS name,
      pv.short_description AS shortDescription,
      pv.status AS versionStatus,
      pv.created_by AS versionCreatedBy,
      pv.created_at AS versionCreatedAt,
      pv.updated_by AS versionUpdatedBy,
      pv.updated_at AS versionUpdatedAt
    FROM "Part" p
    JOIN "PartVersion" pv ON p.current_version_id = pv.id
    ORDER BY p.created_at DESC
    `
	);
	return result.rows.map((row: any) => {
		const part: Part = {
			id: row.id,
			creatorId: row.creatorId,
			globalPartNumber: row.globalPartNumber ?? undefined,
			status: row.status,
			lifecycleStatus: row.lifecycleStatus,
			isPublic: row.isPublic,
			createdAt: row.partCreatedAt,
			updatedBy: row.partUpdatedBy ?? undefined,
			updatedAt: row.partUpdatedAt,
			currentVersionId: row.currentVersionId ?? undefined
		};
		const currentVersion: PartVersion = {
			id: row.versionId,
			partId: row.versionPartId,
			version: row.version,
			name: row.name,
			shortDescription: row.shortDescription ?? undefined,
			status: row.versionStatus,
			createdBy: row.versionCreatedBy,
			createdAt: row.versionCreatedAt,
			updatedBy: row.versionUpdatedBy ?? undefined,
			updatedAt: row.versionUpdatedAt
		};
		return { part, currentVersion };
	});
}

/**
 * Get a single part with its current version
 */
export async function getPartWithCurrentVersion(
	partId: string
): Promise<{ part: Part; currentVersion: PartVersion }> {
	const result = await client.query(
		`
    SELECT
      p.id AS id,
      p.creator_id AS creatorId,
      p.global_part_number AS globalPartNumber,
      p.status AS status,
      p.lifecycle_status AS lifecycleStatus,
      p.is_public AS isPublic,
      p.created_at AS partCreatedAt,
      p.updated_by AS partUpdatedBy,
      p.updated_at AS partUpdatedAt,
      p.current_version_id AS currentVersionId,
      pv.id AS versionId,
      pv.part_id AS versionPartId,
      pv.version AS version,
      pv.name AS name,
      pv.short_description AS shortDescription,
      pv.status AS versionStatus,
      pv.created_by AS versionCreatedBy,
      pv.created_at AS versionCreatedAt,
      pv.updated_by AS versionUpdatedBy,
      pv.updated_at AS versionUpdatedAt
    FROM "Part" p
    JOIN "PartVersion" pv ON p.current_version_id = pv.id
    WHERE p.id = $1
    `,
		[partId]
	);
	if (!result.rows.length) {
		throw new Error('Part not found');
	}
	const row: any = result.rows[0];
	const part: Part = {
		id: row.id,
		creatorId: row.creatorId,
		globalPartNumber: row.globalPartNumber ?? undefined,
		status: row.status,
		lifecycleStatus: row.lifecycleStatus,
		isPublic: row.isPublic,
		createdAt: row.partCreatedAt,
		updatedBy: row.partUpdatedBy ?? undefined,
		updatedAt: row.partUpdatedAt,
		currentVersionId: row.currentVersionId ?? undefined
	};
	const currentVersion: PartVersion = {
		id: row.versionId,
		partId: row.versionPartId,
		version: row.version,
		name: row.name,
		shortDescription: row.shortDescription ?? undefined,
		status: row.versionStatus,
		createdBy: row.versionCreatedBy,
		createdAt: row.versionCreatedAt,
		updatedBy: row.versionUpdatedBy ?? undefined,
		updatedAt: row.versionUpdatedAt
	};
	return { part, currentVersion };
}

/**
 * Create a new part with its initial version
 */
// src/lib/server/parts.ts - Updated createPart function with error logging
export async function createPart(
    input: { name: string; version: string; status: LifecycleStatusEnum },
    userId: string
): Promise<{ part: Part; currentVersion: PartVersion }> {
    const partId = randomUUID();
    const versionId = randomUUID();
    
    await client.query('BEGIN');
    
    try {
        // Create part
        await client.query(
            `INSERT INTO "Part" (id, creator_id, status) 
             VALUES ($1, $2, 'concept')`,
            [partId, userId]
        );

        // Create version with all required fields
        await client.query(
            `INSERT INTO "PartVersion" (
                id, part_id, version, name, status, created_by, tolerance_unit
             ) VALUES ($1, $2, $3, $4, $5::text::lifecycle_status_enum, $6, NULL)`,
            [versionId, partId, input.version, input.name, input.status, userId]
        );

        // Update current version
        await client.query(
            `UPDATE "Part" 
             SET current_version_id = $1 
             WHERE id = $2`,
            [versionId, partId]
        );

        await client.query('COMMIT');
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Database Error:', error.message); // Log detailed error
        throw error;
    }

    return getPartWithCurrentVersion(partId);
}

/**
 * Update a part version (select fields)
 */
export async function updatePartVersion(
	data: Partial<PartVersion> & { id: string }
): Promise<void> {
	const fields: string[] = [];
	const values: any[] = [];
	let idx = 1;
	if (data.name !== undefined) {
		fields.push(`name = $${idx}`);
		values.push(data.name);
		idx++;
	}
	if (data.version !== undefined) {
		fields.push(`version = $${idx}`);
		values.push(data.version);
		idx++;
	}
	if (data.status !== undefined) {
		fields.push(`status = $${idx}::text::lifecycle_status_enum`);
		values.push(data.status);
		idx++;
	}
	if (!fields.length) return;
	values.push(data.id);
	await client.query(`UPDATE "PartVersion" SET ${fields.join(', ')} WHERE id = $${idx}`, values);
}

/**
 * Delete a part (cascades to versions)
 */
export async function deletePart(partId: string): Promise<void> {
	await client.query(`DELETE FROM "Part" WHERE id = $1`, [partId]);
}

// ======================
// Part Version Category
// ======================
export async function addCategoryToPartVersion(partVersionId: string, categoryId: string): Promise<PartVersionCategory> {
    const result = await client.query(
        `INSERT INTO "PartVersionCategory" (part_version_id, category_id)
         VALUES ($1, $2) RETURNING *`,
        [partVersionId, categoryId]
    );
    const row = result.rows[0];
    return rowToPartVersionCategory(row);
}

export async function removeCategoryFromPartVersion(partVersionId: string, categoryId: string): Promise<void> {
    await client.query(
        `DELETE FROM "PartVersionCategory" 
         WHERE part_version_id = $1 AND category_id = $2`,
        [partVersionId, categoryId]
    );
}

export async function getCategoriesForPartVersion(partVersionId: string): Promise<PartVersionCategory[]> {
    const result = await client.query(
        `SELECT * FROM "PartVersionCategory" 
         WHERE part_version_id = $1`,
        [partVersionId]
    );
 
    return result.rows.map(rowToPartVersionCategory);
}

// ======================
// Part Structure
// ======================
export async function createPartStructure(
    input: {
        parentPartId: string;
        childPartId: string;
        relationType: StructuralRelationTypeEnum;
        quantity: number;
        notes?: string;
    },
    userId: string
): Promise<PartStructure> {
    const id = randomUUID();
    const result = await client.query(
        `INSERT INTO "PartStructure" 
         (id, parent_part_id, child_part_id, relation_type, quantity, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, input.parentPartId, input.childPartId, input.relationType, input.quantity, input.notes, userId]
    );
    const row = result.rows[0];
    return rowToPartStructure(row);
}

export async function updatePartStructure(
    id: string,
    updates: Partial<PartStructure>
): Promise<PartStructure> {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.relationType !== undefined) {
        fields.push(`relation_type = $${idx}`);
        values.push(updates.relationType);
        idx++;
    }
    if (updates.quantity !== undefined) {
        fields.push(`quantity = $${idx}`);
        values.push(updates.quantity);
        idx++;
    }
    if (updates.notes !== undefined) {
        fields.push(`notes = $${idx}`);
        values.push(updates.notes);
        idx++;
    }

    values.push(id);
    const result = await client.query(
        `UPDATE "PartStructure" 
         SET ${fields.join(', ')} 
         WHERE id = $${idx} RETURNING *`,
        values
    );
    return rowToPartStructure(result.rows[0]);
}

export async function deletePartStructure(id: string): Promise<void> {
    await client.query(`DELETE FROM "PartStructure" WHERE id = $1`, [id]);
}

export async function getPartStructure(id: string): Promise<PartStructure> {
    const result = await client.query(`SELECT * FROM "PartStructure" WHERE id = $1`, [id]);
    if (!result.rows.length) throw new Error('Part structure not found');
   return rowToPartStructure(result.rows[0]);
}

// ======================
// Part Compliance
// ======================
export async function createCompliance(
    input: {
        partVersionId: string;
        complianceType: ComplianceTypeEnum;
        certificateUrl?: string;
        certifiedAt?: Date;
        expiresAt?: Date;
        notes?: string;
    }
): Promise<PartCompliance> {
    const id = randomUUID();
    const result = await client.query(
        `INSERT INTO "PartCompliance" 
         (id, part_version_id, compliance_type, certificate_url, certified_at, expires_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, input.partVersionId, input.complianceType, input.certificateUrl, input.certifiedAt, input.expiresAt, input.notes]
    );
    return rowToPartCompliance(result.rows[0]);
}

export async function updateCompliance(
    id: string,
    updates: Partial<PartCompliance>
): Promise<PartCompliance> {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.complianceType !== undefined) {
        fields.push(`compliance_type = $${idx}`);
        values.push(updates.complianceType);
        idx++;
    }
    if (updates.certificateUrl !== undefined) {
        fields.push(`certificate_url = $${idx}`);
        values.push(updates.certificateUrl);
        idx++;
    }
    if (updates.certifiedAt !== undefined) {
        fields.push(`certified_at = $${idx}`);
        values.push(updates.certifiedAt);
        idx++;
    }
    if (updates.expiresAt !== undefined) {
        fields.push(`expires_at = $${idx}`);
        values.push(updates.expiresAt);
        idx++;
    }
    if (updates.notes !== undefined) {
        fields.push(`notes = $${idx}`);
        values.push(updates.notes);
        idx++;
    }

    values.push(id);
    const result = await client.query(
        `UPDATE "PartCompliance" 
         SET ${fields.join(', ')} 
         WHERE id = $${idx} RETURNING *`,
        values
    );
    return rowToPartCompliance(result.rows[0]);
}

export async function deleteCompliance(id: string): Promise<void> {
    await client.query(`DELETE FROM "PartCompliance" WHERE id = $1`, [id]);
}

export async function getComplianceForPartVersion(partVersionId: string): Promise<PartCompliance[]> {
    const result = await client.query(
        `SELECT * FROM "PartCompliance" 
         WHERE part_version_id = $1`,
        [partVersionId]
    );
    return result.rows.map(rowToPartCompliance);
}

// ======================
// Part Attachments
// ======================
export async function addAttachment(
    input: {
        partVersionId: string;
        fileUrl: string;
        fileName: string;
        fileType?: string;
        fileSizeBytes?: number;
        checksum?: string;
        description?: string;
        attachmentType?: string;
        isPrimary?: boolean;
        thumbnailUrl?: string;
    },
    userId: string
): Promise<PartAttachment> {
    const id = randomUUID();
    
    if (input.isPrimary) {
        await client.query('BEGIN');
        // Remove existing primary
        await client.query(
            `UPDATE "PartAttachment" 
             SET is_primary = FALSE 
             WHERE part_version_id = $1`,
            [input.partVersionId]
        );
    }

    const result = await client.query(
        `INSERT INTO "PartAttachment" 
         (id, part_version_id, file_url, file_name, file_type, file_size_bytes, 
          checksum, description, attachment_type, is_primary, thumbnail_url, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
            id,
            input.partVersionId,
            input.fileUrl,
            input.fileName,
            input.fileType,
            input.fileSizeBytes,
            input.checksum,
            input.description,
            input.attachmentType,
            input.isPrimary || false,
            input.thumbnailUrl,
            userId
        ]
    );

    if (input.isPrimary) await client.query('COMMIT');
    return rowToPartAttachment(result.rows[0]);
}

export async function updateAttachment(
    id: string,
    updates: Partial<PartAttachment>
): Promise<PartAttachment> {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.description !== undefined) {
        fields.push(`description = $${idx}`);
        values.push(updates.description);
        idx++;
    }
    if (updates.attachmentType !== undefined) {
        fields.push(`attachment_type = $${idx}`);
        values.push(updates.attachmentType);
        idx++;
    }
    if (updates.isPrimary !== undefined) {
        if (updates.isPrimary) {
            await client.query('BEGIN');
            // Remove existing primary
            await client.query(
                `UPDATE "PartAttachment" 
                 SET is_primary = FALSE 
                 WHERE part_version_id = (SELECT part_version_id FROM "PartAttachment" WHERE id = $1)`,
                [id]
            );
        }
        fields.push(`is_primary = $${idx}`);
        values.push(updates.isPrimary);
        idx++;
    }

    values.push(id);
    const result = await client.query(
        `UPDATE "PartAttachment" 
         SET ${fields.join(', ')} 
         WHERE id = $${idx} RETURNING *`,
        values
    );

    if (updates.isPrimary) await client.query('COMMIT');
    return rowToPartAttachment(result.rows[0]);
}

export async function deleteAttachment(id: string): Promise<void> {
    await client.query(`DELETE FROM "PartAttachment" WHERE id = $1`, [id]);
}

export async function getAttachmentsForPartVersion(partVersionId: string): Promise<PartAttachment[]> {
    const result = await client.query(
        `SELECT * FROM "PartAttachment" 
         WHERE part_version_id = $1 
         ORDER BY is_primary DESC, uploaded_at DESC`,
        [partVersionId]
    );
    return result.rows.map(rowToPartAttachment);
}

// ======================
// Part Representations
// ======================
export async function createRepresentation(
    input: {
        partVersionId: string;
        type: string;
        format?: string;
        fileUrl?: string;
        metadata?: any;
        isRecommended?: boolean;
    },
    userId?: string
): Promise<PartRepresentation> {
    const id = randomUUID();
    const result = await client.query(
        `INSERT INTO "PartRepresentation" 
         (id, part_version_id, type, format, file_url, metadata, is_recommended, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
            id,
            input.partVersionId,
            input.type,
            input.format,
            input.fileUrl,
            input.metadata,
            input.isRecommended || false,
            userId
        ]
    );
    return rowToPartRepresentation(result.rows[0]);
}

export async function updateRepresentation(
    id: string,
    updates: Partial<PartRepresentation>
): Promise<PartRepresentation> {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.format !== undefined) {
        fields.push(`format = $${idx}`);
        values.push(updates.format);
        idx++;
    }
    if (updates.fileUrl !== undefined) {
        fields.push(`file_url = $${idx}`);
        values.push(updates.fileUrl);
        idx++;
    }
    if (updates.metadata !== undefined) {
        fields.push(`metadata = $${idx}`);
        values.push(updates.metadata);
        idx++;
    }
    if (updates.isRecommended !== undefined) {
        fields.push(`is_recommended = $${idx}`);
        values.push(updates.isRecommended);
        idx++;
    }

    values.push(id);
    const result = await client.query(
        `UPDATE "PartRepresentation" 
         SET ${fields.join(', ')} 
         WHERE id = $${idx} RETURNING *`,
        values
    );
    return rowToPartRepresentation(result.rows[0]);
}

export async function deleteRepresentation(id: string): Promise<void> {
    await client.query(`DELETE FROM "PartRepresentation" WHERE id = $1`, [id]);
}

export async function getRepresentationsForPartVersion(partVersionId: string): Promise<PartRepresentation[]> {
    const result = await client.query(
        `SELECT * FROM "PartRepresentation" 
         WHERE part_version_id = $1 
         ORDER BY is_recommended DESC, created_at DESC`,
        [partVersionId]
    );
    return result.rows.map(rowToPartRepresentation);
}

// ======================
// Part Revisions
// ======================
export async function createRevision(
    input: {
        partVersionId: string;
        changeDescription: string;
        changedFields: any;
    },
    userId: string
): Promise<PartRevision> {
    const id = randomUUID();
    const result = await client.query(
        `INSERT INTO "PartRevision" 
         (id, part_version_id, change_description, changed_by, changed_fields)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, input.partVersionId, input.changeDescription, userId, input.changedFields]
    );
    return rowToPartRevision(result.rows[0]);
}

export async function getRevisionsForPartVersion(partVersionId: string): Promise<PartRevision[]> {
    const result = await client.query(
        `SELECT * FROM "PartRevision" 
         WHERE part_version_id = $1 
         ORDER BY revision_date DESC`,
        [partVersionId]
    );
    return result.rows.map(rowToPartRevision);
}

// ======================
// Part Validation
// ======================
export async function createValidation(
    partVersionId: string,
    userId: string,
    input: {
        testResults?: any;
        certificationInfo?: any;
        isCompliant?: boolean;
    }
): Promise<PartValidation> {
    const result = await client.query(
        `INSERT INTO "PartValidation" 
         (part_version_id, validated_by, test_results, certification_info, is_compliant)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
            partVersionId,
            userId,
            input.testResults,
            input.certificationInfo,
            input.isCompliant || false
        ]
    );
    const row = result.rows[0];
    return rowToPartValidation(row);    
}

export async function updateValidation(
    partVersionId: string,
    updates: Partial<PartValidation>
): Promise<PartValidation> {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.testResults !== undefined) {
        fields.push(`test_results = $${idx}`);
        values.push(updates.testResults);
        idx++;
    }
    if (updates.certificationInfo !== undefined) {
        fields.push(`certification_info = $${idx}`);
        values.push(updates.certificationInfo);
        idx++;
    }
    if (updates.isCompliant !== undefined) {
        fields.push(`is_compliant = $${idx}`);
        values.push(updates.isCompliant);
        idx++;
    }

    values.push(partVersionId);
    const result = await client.query(
        `UPDATE "PartValidation" 
         SET ${fields.join(', ')} 
         WHERE part_version_id = $${idx} RETURNING *`,
        values
    );
    return rowToPartValidation(result.rows[0]);
}

export async function getValidationForPartVersion(partVersionId: string): Promise<PartValidation | null> {
    const result = await client.query(
        `SELECT * FROM "PartValidation" 
         WHERE part_version_id = $1`,
        [partVersionId]
    );
    const row = result.rows[0];
    return row ? rowToPartValidation(row) : null;
}

// ======================
// Part Version Tags
// ======================
export async function addTagToPartVersion(partVersionId: string, tagId: string, userId?: string): Promise<PartVersionTag> {
    const result = await client.query(
        `INSERT INTO "PartVersionTag" (part_version_id, tag_id, assigned_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [partVersionId, tagId, userId]
    );
    return rowToPartVersionTag(result.rows[0]);
}

export async function removeTagFromPartVersion(partVersionId: string, tagId: string): Promise<void> {
    await client.query(
        `DELETE FROM "PartVersionTag" 
         WHERE part_version_id = $1 AND tag_id = $2`,
        [partVersionId, tagId]
    );
}

export async function getTagsForPartVersion(partVersionId: string): Promise<PartVersionTag[]> {
    const result = await client.query(
        `SELECT * FROM "PartVersionTag" 
         WHERE part_version_id = $1`,
        [partVersionId]
    );
    return (result.rows as any[]).map((row: any) => ({
        partVersionId: row.part_version_id,
        tagId: row.tag_id,
        assignedAt: row.assigned_at
    }));
}

// ======================
// Part Custom Fields
// ======================
export async function setCustomField(
    partVersionId: string,
    fieldId: string,
    value: any
): Promise<PartCustomField> {
    const result = await client.query(
        `INSERT INTO "PartCustomField" (part_version_id, field_id, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (part_version_id, field_id) 
         DO UPDATE SET value = EXCLUDED.value
         RETURNING *`,
        [partVersionId, fieldId, value]
    );
    const row = result.rows[0];
    return rowToPartCustomField(row);
}

export async function deleteCustomField(partVersionId: string, fieldId: string): Promise<void> {
    await client.query(
        `DELETE FROM "PartCustomField" 
         WHERE part_version_id = $1 AND field_id = $2`,
        [partVersionId, fieldId]
    );
}

export async function getCustomFieldsForPartVersion(partVersionId: string): Promise<PartCustomField[]> {
    const result = await client.query(
        `SELECT * FROM "PartCustomField" 
         WHERE part_version_id = $1`,
        [partVersionId]
    );
    return (result.rows as any[]).map((row: any) => ({
        partVersionId: row.part_version_id,
        fieldId: row.field_id,
        value: row.value
    }));
}

/**
 * Check if a part version is editable based on its status.
 */
export function isVersionEditable(version: PartVersion): boolean {
  return version.status !== 'released'; // Assuming 'released' status makes it non-editable; adjust as needed.
}

/**
 * Create a new part version object based on an existing version.
 */
export function createNewVersion(baseVersion: PartVersion, userId: string): PartVersion {
  return {
    id: randomUUID(),
    partId: baseVersion.partId,
    version: (parseInt(baseVersion.version) + 1).toString(), // Simplistic increment; may need refinement.
    name: baseVersion.name,
    shortDescription: baseVersion.shortDescription,
    status: LifecycleStatusEnum.Draft,
    createdBy: userId,
    createdAt: new Date(),
    updatedBy: userId,
    updatedAt: new Date(),
    // Add other fields as per PartVersion type if necessary
  };
}

/**
 * Create a new part version in the database.
 */
export async function createPartVersion(newVersion: PartVersion): Promise<PartVersion> {
  await client.query(
    `INSERT INTO "PartVersion" (id, part_id, version, name, short_description, status, created_by, created_at, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8)`, // Using created_by and updated_by as same for simplicity
    [newVersion.id, newVersion.partId, newVersion.version, newVersion.name, newVersion.shortDescription, newVersion.status, newVersion.createdBy, newVersion.createdAt]
  );
  return newVersion; // Return the created version; may need to fetch from DB for full data.
}

/**
 * Update the current version ID of a part.
 */
export async function updatePartCurrentVersion(partId: string, versionId: string): Promise<void> {
  await client.query(
    `UPDATE "Part" SET current_version_id = $1 WHERE id = $2`,
    [versionId, partId]
  );
}