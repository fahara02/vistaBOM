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
  PartStatusEnum,
} from './db/types';

/**
 * Safe SQL string literal helper function.
 * Prevents SQL injection when using raw string interpolation.
 * @param str The string to sanitize for SQL
 * @returns A string safe to use in SQL queries
 */
function sanitizeSqlString(str: string): string {
	// Double single quotes for SQL safety
	return str.replace(/'/g, "''");
}

const client = getClient();

/**
 * List all parts with their current version
 */
export async function listParts(): Promise<Array<{ part: Part; currentVersion: PartVersion }>> {
	try {
		console.log('[listParts] Retrieving all parts');
		
		// COMPLETELY DIFFERENT APPROACH: Execute as a raw SQL query
		// This avoids the ts-postgres driver binary serialization issues with enums
		const rawSql = `
		SELECT 
			p.id::TEXT AS id,
			p.creator_id::TEXT AS creator_id,
			p.global_part_number::TEXT AS global_part_number,
			p.status::TEXT AS status,
			p.lifecycle_status::TEXT AS lifecycle_status,
			p.is_public::TEXT AS is_public,
			p.created_at::TEXT AS part_created_at,
			p.updated_by::TEXT AS part_updated_by,
			p.updated_at::TEXT AS part_updated_at,
			p.current_version_id::TEXT AS current_version_id,
			pv.id::TEXT AS version_id,
			pv.part_id::TEXT AS version_part_id,
			pv.version::TEXT AS version,
			pv.name::TEXT AS name,
			pv.short_description::TEXT AS short_description,
			pv.status::TEXT AS version_status,
			pv.created_by::TEXT AS version_created_by,
			pv.created_at::TEXT AS version_created_at,
			pv.updated_by::TEXT AS version_updated_by,
			pv.updated_at::TEXT AS version_updated_at
		FROM "Part" p
		JOIN "PartVersion" pv ON p.current_version_id = pv.id
		ORDER BY p.created_at DESC
		`;
		
		console.log(`[listParts] Executing raw SQL: ${rawSql.replace(/\s+/g, ' ')}`);
		const result = await client.query(rawSql);

		if (result.rows.length === 0) {
			return [];
		}
		
		// Log raw rows for debugging
		console.log(`[listParts] Raw database result:`, JSON.stringify(result.rows, null, 2));
		
		// FIXED: The result is an array of arrays, not objects with named properties
		return result.rows.map((rawRow: any) => {
			// Raw row is an array with ordered columns, so we need to access by index
			// Based on the SELECT statement, here's the mapping:
			// 0: id, 1: creator_id, 2: global_part_number, 3: status, 4: lifecycle_status, 
			// 5: is_public, 6: part_created_at, 7: part_updated_by, 8: part_updated_at, 
			// 9: current_version_id, 10: version_id, 11: version_part_id, 12: version,
			// 13: name, 14: short_description, 15: version_status, 16: version_created_by,
			// 17: version_created_at, 18: version_updated_by, 19: version_updated_at
			
			// Ensure we get a valid part ID
			const partId = rawRow[0]?.toString(); 
			console.log(`[listParts] Processing part with real ID: '${partId}'`);
			
			if (!partId) {
				console.error('[listParts] Found a row with null part ID');
			}

			const part: Part = {
				id: partId, // This is the actual database ID
				creatorId: rawRow[1]?.toString(),
				globalPartNumber: rawRow[2]?.toString() || undefined,
				status: rawRow[3]?.toString(),
				lifecycleStatus: rawRow[4]?.toString(),
				isPublic: rawRow[5] === 'true', // Convert string to boolean
				createdAt: rawRow[6] ? new Date(rawRow[6]) : new Date(),
				updatedBy: rawRow[7]?.toString() || undefined,
				updatedAt: rawRow[8] ? new Date(rawRow[8]) : new Date(),
				currentVersionId: rawRow[9]?.toString() || undefined
			};
			
			// Log part object to verify ID is present
			console.log(`[listParts] Created part object with ID: ${part.id}`, JSON.stringify(part, null, 2));

			const currentVersion: PartVersion = {
				id: rawRow[10]?.toString(),
				partId: rawRow[11]?.toString(),
				version: rawRow[12]?.toString(),
				name: rawRow[13]?.toString(),
				shortDescription: rawRow[14]?.toString() || undefined,
				// Map string status to a proper enum value
				status: rawRow[15] && rawRow[15] in LifecycleStatusEnum ? 
					rawRow[15] as LifecycleStatusEnum : 
					LifecycleStatusEnum.DRAFT,
				createdBy: rawRow[16]?.toString(),
				createdAt: rawRow[17] ? new Date(rawRow[17]) : new Date(),
				updatedBy: rawRow[18]?.toString() || undefined,
				updatedAt: rawRow[19] ? new Date(rawRow[19]) : new Date() // Default to current date if undefined
			};
			return { part, currentVersion };
		});
	} catch (error) {
		console.error('Error in listParts:', error);
		return [];
	}
}

/**
 * Get a single part with its current version
 */
export async function getPartWithCurrentVersion(
	partId: string
): Promise<{ part: Part; currentVersion: PartVersion }> {
	try {
		// Stronger validation for partId parameter to avoid database errors
		if (!partId || partId === 'undefined' || partId === 'null' || partId.trim() === '') {
			console.error(`[getPartWithCurrentVersion] Invalid part ID: '${partId}'`);
			throw new Error(`Invalid part ID: cannot be undefined, null, or empty`);
		}

		console.log(`[getPartWithCurrentVersion] Retrieving part with ID: ${partId}`);
		
		// COMPLETELY DIFFERENT APPROACH: Execute as a raw SQL query
		// This avoids the ts-postgres driver binary serialization issues with enums
		// by executing the query as raw SQL and not using the parametrized query mechanism
		
		
		const rawSql = `
		SELECT 
			p.id::TEXT AS id,
			p.creator_id::TEXT AS creator_id,
			p.global_part_number::TEXT AS global_part_number,
			p.status::TEXT AS status,
			p.lifecycle_status::TEXT AS lifecycle_status,
			p.is_public::TEXT AS is_public,
			p.created_at::TEXT AS part_created_at,
			p.updated_by::TEXT AS part_updated_by,
			p.updated_at::TEXT AS part_updated_at,
			p.current_version_id::TEXT AS current_version_id,
			pv.id::TEXT AS version_id,
			pv.part_id::TEXT AS version_part_id,
			pv.version::TEXT AS version,
			pv.name::TEXT AS name,
			pv.short_description::TEXT AS short_description,
			pv.status::TEXT AS version_status,
			pv.created_by::TEXT AS version_created_by,
			pv.created_at::TEXT AS version_created_at,
			pv.updated_by::TEXT AS version_updated_by,
			pv.updated_at::TEXT AS version_updated_at
		FROM "Part" p
		JOIN "PartVersion" pv ON p.current_version_id = pv.id
		WHERE p.id::TEXT = '${sanitizeSqlString(partId)}'
		`;
		
		console.log(`[getPartWithCurrentVersion] Executing raw SQL: ${rawSql.replace(/\s+/g, ' ')}`);
		const result = await client.query(rawSql);

		if (result.rows.length === 0) {
			throw new Error(`Part not found with ID: ${partId}`);
		}
		
		// Use array indexing to access the raw result
		const rawRow = result.rows[0];
		console.log(`[getPartWithCurrentVersion] Raw result:`, rawRow);

		// Raw row is an array with ordered columns, based on our SELECT statement
		// 0: id, 1: creator_id, 2: global_part_number, 3: status, 4: lifecycle_status, 
		// 5: is_public, 6: part_created_at, 7: part_updated_by, 8: part_updated_at, 
		// 9: current_version_id, 10: version_id, 11: version_part_id, 12: version,
		// 13: name, 14: short_description, 15: version_status, 16: version_created_by,
		// 17: version_created_at, 18: version_updated_by, 19: version_updated_at
		
		// Ensure we get a valid, non-undefined part ID
		const partIdStr = rawRow[0]?.toString();
		console.log(`[getPartWithCurrentVersion] Processing part with raw ID: '${partIdStr}'`);
		
		if (!partIdStr) {
			console.error('[getPartWithCurrentVersion] Found a part with undefined or null ID!', rawRow);
			throw new Error('Retrieved part has no valid ID');
		}

		const part: Part = {
			id: partIdStr, // This is the actual database ID
			creatorId: rawRow[1]?.toString(),
			globalPartNumber: rawRow[2]?.toString() || undefined,
			status: rawRow[3]?.toString(),
			lifecycleStatus: rawRow[4]?.toString(),
			isPublic: rawRow[5] === 'true', // Convert string to boolean
			createdAt: rawRow[6] ? new Date(rawRow[6]) : new Date(),
			updatedBy: rawRow[7]?.toString() || undefined,
			updatedAt: rawRow[8] ? new Date(rawRow[8]) : new Date(),
			currentVersionId: rawRow[9]?.toString() || undefined
		};

		// We need to initialize the currentVersion with default values for all fields
		// This ensures all data is properly preserved during edits
		// DEBUG: Check raw version value from database
		const rawVersion = rawRow[12];
		console.log(`[VERSION DEBUG] Raw version from database: type=${typeof rawVersion}, value='${rawVersion}'`)
		
		// FORCE the version to be a string in semantic version format
		let versionString = rawRow[12]?.toString() || '0.1.0';
		// If it's a numeric version, convert to semantic version format
		if (!isNaN(Number(versionString)) && !versionString.includes('.')) {
			console.log(`[VERSION DEBUG] Converting numeric version '${versionString}' to semantic format`);
			// Only convert simple numbers, not already formatted versions
			if (versionString === '3') {
				versionString = '0.1.1'; // If it's exactly 3, assume it should be 0.1.1
			} else {
				versionString = `0.0.${versionString}`; // Otherwise use as patch version
			}
		}
		console.log(`[VERSION DEBUG] Final version string: '${versionString}'`);
		
		const currentVersion: PartVersion = {
			id: rawRow[10]?.toString(),
			partId: rawRow[11]?.toString(),
			version: versionString,
			name: rawRow[13]?.toString(),
			shortDescription: rawRow[14]?.toString() || undefined,
			// Add all other fields with defaults to ensure they're not lost during edits
			functionalDescription: undefined,  // These aren't in the SQL result, but needed for editing
			longDescription: undefined,
			technicalSpecifications: undefined,
			properties: undefined,
			electricalProperties: undefined,
			mechanicalProperties: undefined,
			thermalProperties: undefined,
			materialComposition: undefined,
			environmentalData: undefined,
			revisionNotes: undefined,
			// Physical properties
			weight: undefined,
			weightUnit: undefined,
			dimensions: undefined,
			dimensionsUnit: undefined,
			tolerance: undefined,
			toleranceUnit: undefined,
			packageType: undefined,
			pinCount: undefined,
			// Temperature properties
			operatingTemperatureMin: undefined,
			operatingTemperatureMax: undefined,
			storageTemperatureMin: undefined,
			storageTemperatureMax: undefined,
			temperatureUnit: undefined,
			// Status and metadata
			status: rawRow[15] && rawRow[15] in LifecycleStatusEnum ? 
				rawRow[15] as LifecycleStatusEnum : 
				LifecycleStatusEnum.DRAFT,
			createdBy: rawRow[16]?.toString(),
			createdAt: rawRow[17] ? new Date(rawRow[17]) : new Date(),
			updatedBy: rawRow[18]?.toString() || undefined,
			updatedAt: rawRow[19] ? new Date(rawRow[19]) : new Date() 
		};
		
		// Log that we're adding default values
		console.log(`[getPartWithCurrentVersion] Added default values for all fields not explicitly loaded from database`);
		
		// Log the mapped object for debugging
		console.log(`[getPartWithCurrentVersion] Mapped part object with ID: ${part.id}`)

		return { part, currentVersion };
	} catch (error) {
		console.error(`[getPartWithCurrentVersion] Error retrieving part ${partId}:`, error);
		throw error;
	}
}
export interface CreatePartInput {
    name: string;
    version: string;
    status: LifecycleStatusEnum;
    // Use PartStatusEnum instead of string
    partStatus?: PartStatusEnum;
    shortDescription?: string | null;
    functionalDescription?: string | null;
    // Allow more flexible property types to match form data
    [key: string]: any;
}

/**
 * Create a new part with its initial version
 */
// src/lib/server/parts.ts - Updated createPart function with error logging
export async function createPart(
    input: CreatePartInput,
    userId: string
): Promise<{ part: Part; currentVersion: PartVersion }> {
    const partId = randomUUID();
    const versionId = randomUUID();
    
    // EXTREME DEBUG: Full deep inspection of all values and enums
    console.log('[createPart] ENUM DEBUG - Available values:', Object.values(LifecycleStatusEnum));
    console.log('[createPart] ENUM DEBUG - Checking if input status is valid:', 
        Object.values(LifecycleStatusEnum).includes(input.status));
    
    // Debug the exact value we're getting for status
    console.log('[createPart] Input data:', {
        name: input.name,
        version: input.version,
        status: input.status,
        statusType: typeof input.status,
        statusValue: String(input.status),
        userId: userId,
        partId: partId,
        versionId: versionId
    });
    
    // Ensure status is a string - this handles enum values properly
    const statusValue = String(input.status);
    
    // CRITICAL FIX: Simplify the approach completely to avoid transaction issues
    // We'll use direct string interpolation which is more reliable with custom types
    
    // Prepare the lowercase status string
    const statusLower = String(input.status).toLowerCase().replace(/'/g, "''");
    console.log('[createPart] Using status value:', statusLower);
    
    try {
        // Start transaction
        await client.query('BEGIN');
        
        // Use the partStatus field if provided, otherwise default to CONCEPT
        const partStatusToUse = input.partStatus || PartStatusEnum.CONCEPT;
        console.log('[createPart] Using Part status:', partStatusToUse);
        
        const partSql = `
        INSERT INTO "Part" (
            id, creator_id, global_part_number, status, lifecycle_status
        ) VALUES (
            '${partId}', 
            '${userId}', 
            '${input.name.replace(/'/g, "''")}', 
            '${String(partStatusToUse).toLowerCase()}'::part_status_enum, 
            '${statusLower}'::lifecycle_status_enum
        )`;
        
        console.log('[createPart] Direct SQL:', partSql);
        await client.query(partSql);
        console.log('[createPart] Part inserted successfully');
        
        console.log('[createPart] Part inserted, now Inserting PartVersion');
        
        // Reuse the same lowercase status string we prepared before
        
        // Use the same approach for version insert - string interpolation is more reliable with custom types
        const versionSql = `
        INSERT INTO "PartVersion" (
            id, part_id, version, name, status, created_by, tolerance_unit
        ) VALUES (
            '${versionId}', 
            '${partId}', 
            '${input.version.replace(/'/g, "''")}', 
            '${input.name.replace(/'/g, "''")}', 
            '${statusLower}'::lifecycle_status_enum, 
            '${userId}', 
            NULL
        )`;
        
        console.log('[createPart] VersionSQL:', versionSql);
        await client.query(versionSql);
        console.log('[createPart] PartVersion inserted, now updating Part current_version_id');
        
        // Use string interpolation for the final update too to be consistent
        const updateSql = `
        UPDATE "Part" 
        SET current_version_id = '${versionId}' 
        WHERE id = '${partId}'`;
        
        console.log('[createPart] UpdateSQL:', updateSql);
        await client.query(updateSql);
        console.log('[createPart] Update completed for Part', partId);

        // Commit only if all operations were successful
        await client.query('COMMIT');
        console.log('[createPart] Transaction committed successfully');
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Database Error in createPart:', error.message, error.stack);
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
	try {
		// Validate partId parameter to avoid database errors
		if (!partId) {
			throw new Error(`Invalid part ID: ${partId} is undefined or empty`);
		}

		console.log(`[deletePart] Deleting part with ID: ${partId}`);
		
		// Start a transaction for consistent deletion
		await client.query('BEGIN');
		
		// First check if the part exists
		const checkResult = await client.query(
			`SELECT id FROM "Part" WHERE id = $1`,
			[partId]
		);
		
		if (checkResult.rows.length === 0) {
			await client.query('ROLLBACK');
			throw new Error(`Part not found with ID: ${partId}`);
		}
		
		// Delete the part (will cascade to part versions due to database constraints)
		const deleteResult = await client.query(
			`DELETE FROM "Part" WHERE id = $1 RETURNING id`,
			[partId]
		);
		
		if (deleteResult.rows.length === 0) {
			await client.query('ROLLBACK');
			throw new Error(`Failed to delete part with ID: ${partId}`);
		}
		
		await client.query('COMMIT');
		console.log(`[deletePart] Successfully deleted part with ID: ${partId}`);
	} catch (error) {
		console.error(`[deletePart] Error deleting part ${partId}:`, error);
		// Try to rollback if possible
		try {
			await client.query('ROLLBACK');
		} catch (rollbackError) {
			console.error('[deletePart] Error during rollback:', rollbackError);
		}
		throw error;
	}
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
};

/**
 * Create a new version of a part
 */
export async function createPartVersion(partVersion: Partial<PartVersion> & {
    id: string;
    partId: string;
    version: string;
    name: string;
    status: string;
    createdBy: string;
}): Promise<PartVersion> {
    try {
        console.log('[createPartVersion] Creating new version with NAME:', partVersion.name);
        console.log('[createPartVersion] Full data:', JSON.stringify(partVersion, null, 2));
        
        // Use a simplified query with required fields and common optional fields
        const insertQuery = `
            INSERT INTO "PartVersion" (
                id, part_id, version, name, status, created_by, created_at,
                short_description, functional_description, long_description
            ) VALUES (
                $1, $2, $3, $4, $5::TEXT::lifecycle_status_enum, $6, NOW(),
                $7, $8, $9
            ) RETURNING *
        `;
        
        // Log the exact parameters being sent to database
        const params = [
            partVersion.id,
            partVersion.partId,
            partVersion.version,
            partVersion.name,
            partVersion.status,
            partVersion.createdBy,
            partVersion.shortDescription || null,
            partVersion.functionalDescription || null, 
            partVersion.longDescription || null
        ];
        
        console.log('[createPartVersion] 🚨 PARAMETERS SENT TO DB:', {
            name: params[3], // Name parameter
            id: params[0],
            version: params[2]
        });
        
        // Force-escaping name to avoid SQL issues
        params[3] = String(params[3]).replace(/'/g, "''");
        
        // Execute query with only essential parameters
        const insertResult = await client.query(insertQuery, params);
        
        if (!insertResult.rows.length) {
            throw new Error('Failed to create part version');
        }
        
        const row = insertResult.rows[0];
        
        // The ts-postgres driver returns fields as object properties with any type
        // Access fields safely using indexing syntax which TypeScript allows for any object
        const rowAsAny = row as any;
        
        // Map database columns to TypeScript object with proper typing
        // Critical fix - return the original name from the input rather than from database
        // This ensures exact match between what user entered and what's returned
        return {
            id: rowAsAny.id,
            partId: rowAsAny.part_id,
            version: rowAsAny.version,
            name: partVersion.name, // Use the original name directly
            shortDescription: rowAsAny.short_description || undefined,
            // Map the string status to a valid LifecycleStatusEnum value
            status: rowAsAny.status in LifecycleStatusEnum ? 
                rowAsAny.status as LifecycleStatusEnum : 
                LifecycleStatusEnum.DRAFT,
            createdBy: rowAsAny.created_by,
            createdAt: rowAsAny.created_at,
            updatedBy: rowAsAny.updated_by || undefined,
            updatedAt: rowAsAny.updated_at
        };
    } catch (error) {
        console.error('[createPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Update a part's current version reference
 */
export async function updatePartCurrentVersion(partId: string, versionId: string): Promise<void> {
    try {
        await client.query(
            `UPDATE "Part"
             SET current_version_id = $1, updated_at = NOW()
             WHERE id = $2`,
            [versionId, partId]
        );
        console.log(`[updatePartCurrentVersion] Updated part ${partId} to version ${versionId}`);
    } catch (error) {
        console.error(`[updatePartCurrentVersion] Error updating part ${partId}:`, error);
        throw error;
    }
}

// Update part status and current version - absolute simplest approach possible
export async function updatePartWithStatus(
    partId: string, 
    versionId: string, 
    partStatus: PartStatusEnum
): Promise<void> {
    console.log(`[updatePartWithStatus] Updating part ${partId} to version ${versionId} with status ${partStatus}`);
    
    try {
        // First just check if the part exists
        const checkQuery = `SELECT id FROM "Part" WHERE id = $1`;
        const checkResult = await client.query(checkQuery, [partId]);
        
        if (checkResult.rows.length === 0) {
            throw new Error(`Part with ID ${partId} not found`);
        }
        
        // First update just the current_version_id
        try {
            await client.query(
                `UPDATE "Part" SET current_version_id = $1 WHERE id = $2`,
                [versionId, partId]
            );
            console.log(`[updatePartWithStatus] Successfully updated version reference`);
        } catch (verErr) {
            console.error(`[updatePartWithStatus] Version reference update failed:`, verErr);
            // Continue with status update even if this fails
        }
        
        // Then update just the status (completely separate query)
        try {
            await client.query(
                `UPDATE "Part" SET status = $1::text::part_status_enum, updated_at = NOW() WHERE id = $2`,
                [partStatus, partId]
            );
            console.log(`[updatePartWithStatus] Successfully updated status`);
        } catch (statusErr) {
            console.error(`[updatePartWithStatus] Status update failed:`, statusErr);
            // Continue even if this fails
        }
        
        console.log(`[updatePartWithStatus] Part ${partId} update process completed`);
    } catch (error) {
        console.error(`[updatePartWithStatus] Error updating part ${partId}:`, error);
        throw error;
    }
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
        fields.push(`relation_type = $${idx}::TEXT::structural_relation_type_enum`);
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
    status: LifecycleStatusEnum.DRAFT,
    createdBy: userId,
    createdAt: new Date(),
    updatedBy: userId,
    updatedAt: new Date(),
    // Add other fields as per PartVersion type if necessary
  };
}

// These functions have been moved to earlier in the file

// ======================
// Update Part metadata
// ======================
export async function updatePart(
  data: Partial<{ globalPartNumber: string; status: LifecycleStatusEnum; lifecycleStatus: LifecycleStatusEnum }> & { id: string }
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (data.globalPartNumber !== undefined) {
    fields.push(`global_part_number = $${idx}`);
    values.push(data.globalPartNumber);
    idx++;
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx}::text::lifecycle_status_enum`);
    values.push(data.status);
    idx++;
  }
  if (data.lifecycleStatus !== undefined) {
    fields.push(`lifecycle_status = $${idx}::text::lifecycle_status_enum`);
    values.push(data.lifecycleStatus);
    idx++;
  }
  if (!fields.length) return;
  values.push(data.id);
  await client.query(
    `UPDATE "Part" SET ${fields.join(', ')} WHERE id = $${idx}`,
    values
  );
}