/**
 * Part Compliance Management Functions
 * ===================================
 * These functions manage compliance certifications for parts (RoHS, REACH, etc.)
 */

import type { ComplianceTypeEnum } from "@/types/enums";
import { PART_ERRORS } from "./partErrors";
import sql from "@/server/db/postgres";
import { sanitizeSqlString } from "@/utils/util";
import type { PartCompliance } from "@/types/schemaTypes";



/**
 * Converts a database row to a PartCompliance object
 */
export function rowToPartCompliance(row: any): PartCompliance {
    return {
        part_compliance_id: row.part_compliance_id,
        part_version_id: row.part_version_id,
        compliance_type: row.compliance_type,
        certificate_url: row.certificate_url,
        certified_at: row.certified_at instanceof Date ? row.certified_at : 
                     (row.certified_at ? new Date(row.certified_at) : null),
        expires_at: row.expires_at instanceof Date ? row.expires_at : 
                   (row.expires_at ? new Date(row.expires_at) : null),
        notes: row.notes,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updated_at: row.updated_at instanceof Date ? row.updated_at : 
                   (row.updated_at ? new Date(row.updated_at) : null)
    };
}

/**
 * Creates a new compliance certification for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param complianceType - The type of compliance certification
 * @param certificateUrl - Optional URL to the compliance certificate
 * @param certifiedAt - Optional date when the compliance was certified
 * @param expiresAt - Optional expiration date for the certification
 * @param notes - Optional notes about the compliance
 * 
 * @returns The newly created compliance certification
 */
export async function createPartCompliance(
    partVersionId: string,
    complianceType: ComplianceTypeEnum,
    certificateUrl?: string | null,
    certifiedAt?: Date | null,
    expiresAt?: Date | null,
    notes?: string | null
): Promise<PartCompliance> {
    try {
        // Validate URL format if provided (must start with http:// or https://)
        if (certificateUrl && 
            !certificateUrl.match(/^https?:\/\//)) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Certificate URL must start with http:// or https://`);
        }

        // Validate dates (certification date must be before expiration date)
        if (certifiedAt && expiresAt && 
            certifiedAt > expiresAt) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Certification date cannot be after expiration date`);
        }

        // Check if part version exists first
        const partVersionCheck = await sql`
            SELECT part_version_id FROM "PartVersion"
            WHERE part_version_id = ${partVersionId}
        `;

        if (!partVersionCheck || partVersionCheck.length === 0) {
            throw new Error(`${PART_ERRORS.VERSION_NOT_FOUND}: Part version with ID ${partVersionId} not found`);
        }

        // Check if this compliance type already exists for this part version
        const existingCompliance = await sql`
            SELECT part_compliance_id FROM "PartCompliance"
            WHERE part_version_id = ${partVersionId}
            AND compliance_type = ${complianceType}::compliance_type_enum
        `;

        if (existingCompliance && existingCompliance.length > 0) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: This compliance type is already assigned to this part version`);
        }

        // Insert the new compliance certification
        const complianceId = crypto.randomUUID();
        const result = await sql`
            INSERT INTO "PartCompliance" (
                part_compliance_id,
                part_version_id,
                compliance_type,
                certificate_url,
                certified_at,
                expires_at,
                notes,
                created_at,
                updated_at
            ) VALUES (
                ${complianceId},
                ${partVersionId},
                ${complianceType}::compliance_type_enum,
                ${certificateUrl || null},
                ${certifiedAt || null},
                ${expiresAt || null},
                ${notes || null},
                NOW(),
                NOW()
            ) RETURNING *
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Failed to create compliance certification`);
        }

        console.log(`[createPartCompliance] ✅ Created ${complianceType} compliance for part version ${partVersionId}`);
        return rowToPartCompliance(result[0]);
    } catch (error) {
        console.error('[createPartCompliance] Error:', error);
        throw error;
    }
}

/**
 * Retrieves a specific compliance certification by ID
 * 
 * @param complianceId - The ID of the compliance certification to retrieve
 * @returns The compliance certification, if found
 */
export async function getPartComplianceById(complianceId: string): Promise<PartCompliance | null> {
    try {
        const result = await sql`
            SELECT * FROM "PartCompliance"
            WHERE part_compliance_id = ${complianceId}
        `;

        if (!result || result.length === 0) {
            return null;
        }

        return rowToPartCompliance(result[0]);
    } catch (error) {
        console.error('[getPartComplianceById] Error:', error);
        throw error;
    }
}

/**
 * Retrieves all compliance certifications for a part version
 * 
 * @param partVersionId - The ID of the part version
 * @param complianceType - Optional filter for a specific compliance type
 * @returns Array of compliance certifications
 */
export async function getPartCompliancesByPartVersion(
    partVersionId: string,
    complianceType?: ComplianceTypeEnum
): Promise<PartCompliance[]> {
    try {
        let query;
        
        if (complianceType) {
            query = sql`
                SELECT * FROM "PartCompliance"
                WHERE part_version_id = ${partVersionId}
                AND compliance_type = ${complianceType}::compliance_type_enum
                ORDER BY certified_at DESC NULLS LAST
            `;
        } else {
            query = sql`
                SELECT * FROM "PartCompliance"
                WHERE part_version_id = ${partVersionId}
                ORDER BY certified_at DESC NULLS LAST
            `;
        }

        const result = await query;
        return result.map(rowToPartCompliance);
    } catch (error) {
        console.error('[getPartCompliancesByPartVersion] Error:', error);
        throw error;
    }
}

/**
 * Updates an existing compliance certification
 * 
 * @param complianceId - The ID of the compliance certification to update
 * @param updates - Object containing the fields to update
 * @returns The updated compliance certification
 */
export async function updatePartCompliance(
    complianceId: string,
    updates: Partial<{
        certificate_url: string | null,
        certified_at: Date | null,
        expires_at: Date | null,
        notes: string | null
    }>
): Promise<PartCompliance> {
    try {
        // First check if the compliance exists
        const existingResult = await sql`
            SELECT * FROM "PartCompliance"
            WHERE part_compliance_id = ${complianceId}
        `;

        if (!existingResult || existingResult.length === 0) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Compliance certification with ID ${complianceId} not found`);
        }

        // Validate URL format if provided
        if (updates.certificate_url && 
            !updates.certificate_url.match(/^https?:\/\//)) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Certificate URL must start with http:// or https://`);
        }

        // Validate dates if both are provided
        const existing = existingResult[0];
        const certDate = 'certified_at' in updates ? updates.certified_at : existing.certified_at;
        const expDate = 'expires_at' in updates ? updates.expires_at : existing.expires_at;
        
        if (certDate && expDate && certDate > expDate) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Certification date cannot be after expiration date`);
        }

        // Build the update SQL query with dynamic fields
        // We'll use an array to collect the update fields
        const updateFields = [];
        
        // Always update the timestamp
        updateFields.push(`updated_at = NOW()`);
        
        // Add conditional fields with proper type checking
        if ('certificate_url' in updates) {
            const url = updates.certificate_url;
            updateFields.push(`certificate_url = ${url === null ? 'NULL' : `'${sanitizeSqlString(url || '')}'`}`);
        }
        
        if ('certified_at' in updates) {
            const certDate = updates.certified_at;
            updateFields.push(`certified_at = ${certDate === null ? 'NULL' : 
                certDate ? `'${certDate.toISOString()}'` : 'NULL'}`);
        }
        
        if ('expires_at' in updates) {
            const expDate = updates.expires_at;
            updateFields.push(`expires_at = ${expDate === null ? 'NULL' : 
                expDate ? `'${expDate.toISOString()}'` : 'NULL'}`);
        }
        
        if ('notes' in updates) {
            const notes = updates.notes;
            updateFields.push(`notes = ${notes === null ? 'NULL' : `'${sanitizeSqlString(notes || '')}'`}`);
        }
        
        // Construct the complete SQL query as a string, but use parameters for the WHERE clause
        // If no fields to update, throw an error
        if (updateFields.length === 0) {
            throw new Error(`${PART_ERRORS.GENERAL_ERROR}: No valid fields to update`);
        }
        
        // Construct the final SQL query string with proper parameter placement
        const updateQuery = `
            UPDATE "PartCompliance"
            SET ${updateFields.join(', ')}
            WHERE part_compliance_id = $1
            RETURNING *
        `;

        // Execute the query with proper parameter binding
        const result = await sql.unsafe(updateQuery, [complianceId]);

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Failed to update compliance certification`);
        }

        console.log(`[updatePartCompliance] ✅ Updated compliance certification ${complianceId}`);
        return rowToPartCompliance(result[0]);
    } catch (error) {
        console.error('[updatePartCompliance] Error:', error);
        throw error;
    }
}

/**
 * Deletes a compliance certification
 * 
 * @param complianceId - The ID of the compliance certification to delete
 * @returns True if the deletion was successful
 */
export async function deletePartCompliance(complianceId: string): Promise<boolean> {
    try {
        const result = await sql`
            DELETE FROM "PartCompliance"
            WHERE part_compliance_id = ${complianceId}
            RETURNING part_compliance_id
        `;

        if (!result || result.length === 0) {
            throw new Error(`${PART_ERRORS.COMPLIANCE_ERROR}: Compliance certification with ID ${complianceId} not found or already deleted`);
        }

        console.log(`[deletePartCompliance] ✅ Deleted compliance certification ${complianceId}`);
        return true;
    } catch (error) {
        console.error('[deletePartCompliance] Error:', error);
        throw error;
    }
}
