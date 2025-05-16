
import sql from '$lib/server/db';
import type { StructuralRelationTypeEnum } from '@/types/enums';
import crypto, { randomUUID } from 'crypto';


/**
 * Interface for the PartStructure table representing parent-child relationships between parts
 */
export interface PartStructure {
    part_structure_id: string;
    parent_part_id: string;
    child_part_id: string;
    relation_type: StructuralRelationTypeEnum;
    quantity: number;
    notes?: string | null;
    created_by: string;
    created_at: Date;
    updated_by?: string | null;
    updated_at: Date;
    valid_from: Date;
    valid_until?: Date | null;
}

/**
 * Converts a database row to a PartStructure object
 */
function rowToPartStructure(row: any): PartStructure {
    return {
        part_structure_id: row.part_structure_id,
        parent_part_id: row.parent_part_id,
        child_part_id: row.child_part_id,
        relation_type: row.relation_type,
        quantity: parseFloat(row.quantity),
        notes: row.notes,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        valid_from: row.valid_from,
        valid_until: row.valid_until
    };
}

/**
 * Create a new part structure relationship
 */
export async function createPartStructure(
    parentPartId: string,
    childPartId: string,
    relationType: StructuralRelationTypeEnum,
    quantity: number,
    createdBy: string,
    notes?: string | null
): Promise<PartStructure> {
    try {
        // Use porsager/postgres template literals for SQL queries
        const result = await sql`
            INSERT INTO "PartStructure" (
                parent_part_id, child_part_id, relation_type, quantity, notes, created_by, created_at
            ) VALUES (
                ${parentPartId}, ${childPartId}, ${relationType}, ${quantity}, ${notes || null}, ${createdBy}, NOW()
            ) RETURNING *
        `;
        
        if (result.length === 0) {
            throw new Error(`Failed to create part structure relationship between ${parentPartId} and ${childPartId}`);
        }
        
        // With porsager/postgres, results are direct objects
        const row = result[0];
        return rowToPartStructure(row);
    } catch (error) {
        console.error('[createPartStructure] Error:', error);
        throw error;
    }
}

/**
 * Get a part structure relationship by ID
 */
export async function getPartStructure(
    partStructureId: string
): Promise<PartStructure | null> {
    try {
        // Use template literals for SELECT operation with proper error handling
        const result = await sql`
            SELECT * FROM "PartStructure" 
            WHERE part_structure_id = ${partStructureId}
        `;
        
        console.log(`[getPartStructure] Found ${result.length} part structure relationships with ID ${partStructureId}`);
        
        // Map results using array methods directly on the result
        if (result.length > 0) {
            return rowToPartStructure(result[0]);
        } else {
            return null;
        }
    } catch (error) {
        console.error('[getPartStructure] Error:', error);
        throw error;
    }
}

/**
 * Update a part structure relationship
 */
export async function updatePartStructure(
    partStructureId: string,
    parentPartId: string,
    childPartId: string,
    relationType: StructuralRelationTypeEnum,
    quantity: number,
    updatedBy: string,
    notes?: string | null
): Promise<void> {
    try {
        // Use template literals for UPDATE operation with proper error handling
        await sql`
            UPDATE "PartStructure" 
            SET 
                parent_part_id = ${parentPartId}, 
                child_part_id = ${childPartId}, 
                relation_type = ${relationType}, 
                quantity = ${quantity}, 
                notes = ${notes || null}, 
                updated_by = ${updatedBy}, 
                updated_at = NOW()
            WHERE part_structure_id = ${partStructureId}
        `;
        
        console.log(`[updatePartStructure] Updated part structure relationship ${partStructureId}`);
    } catch (error) {
        console.error('[updatePartStructure] Error:', error);
        throw error;
    }
}

/**
 * Delete a part structure relationship
 */
export async function deletePartStructure(
    partStructureId: string
): Promise<void> {
    try {
        // Use template literals for DELETE operation with proper error handling
        await sql`
            DELETE FROM "PartStructure" 
            WHERE part_structure_id = ${partStructureId}
        `;
        
        console.log(`[deletePartStructure] Deleted part structure relationship ${partStructureId}`);
    } catch (error) {
        console.error('[deletePartStructure] Error:', error);
        throw error;
    }
}

/**
 * Get all part structure relationships for a part
 */
export async function getPartStructuresForPart(
    partId: string
): Promise<PartStructure[]> {
    try {
        // Use template literals for SELECT operation with proper error handling
        const result = await sql`
            SELECT * FROM "PartStructure" 
            WHERE parent_part_id = ${partId} OR child_part_id = ${partId}
        `;
        
        console.log(`[getPartStructuresForPart] Found ${result.length} part structure relationships for part ${partId}`);
        
        // Map results using array methods directly on the result
        return result.map(rowToPartStructure);
    } catch (error) {
        console.error('[getPartStructuresForPart] Error:', error);
        throw error;
    }
}
