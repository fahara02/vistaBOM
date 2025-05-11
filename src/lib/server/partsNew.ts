import sql from '$lib/server/db/postgres';
import { randomUUID } from 'crypto';
import { rowToPartVersionCategory, rowToPartAttachment, rowToPartCompliance, rowToPartCustomField, 
         rowToPartVersionTag, rowToPartStructure, rowToPartRepresentation, rowToPartRevision, 
         rowToPartValidation } from '../parts/partUtils';
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
 * List all parts with their current version
 */
export async function listParts(): Promise<Array<{ part: Part; currentVersion: PartVersion }>> {
  try {
    console.log('[listParts] Retrieving all parts');
    
    const result = await sql`
      SELECT 
        p.id,
        p.creator_id,
        p.global_part_number,
        p.status,
        p.lifecycle_status,
        p.is_public,
        p.created_at as part_created_at,
        p.updated_by as part_updated_by,
        p.updated_at as part_updated_at,
        p.current_version_id,
        pv.id as version_id,
        pv.part_id as version_part_id,
        pv.version,
        pv.name,
        pv.short_description,
        pv.status as version_status,
        pv.created_by as version_created_by,
        pv.created_at as version_created_at,
        pv.updated_by as version_updated_by,
        pv.updated_at as version_updated_at
      FROM "Part" p
      JOIN "PartVersion" pv ON p.current_version_id = pv.id
      ORDER BY p.created_at DESC
    `;

    if (result.length === 0) {
      return [];
    }
    
    // Map results to expected types
    return result.map(row => {
      console.log(`[listParts] Processing part with ID: '${row.id}'`);
      
      const part: Part = {
        id: row.id,
        creatorId: row.creator_id,
        globalPartNumber: row.global_part_number || undefined,
        status: row.status, // porsager/postgres handles enums correctly
        lifecycleStatus: row.lifecycle_status,
        isPublic: row.is_public,
        createdAt: new Date(row.part_created_at),
        updatedBy: row.part_updated_by || undefined,
        updatedAt: new Date(row.part_updated_at),
        currentVersionId: row.current_version_id || undefined
      };
      
      const currentVersion: PartVersion = {
        id: row.version_id,
        partId: row.version_part_id,
        version: row.version,
        name: row.name,
        shortDescription: row.short_description || undefined,
        status: row.version_status,
        createdBy: row.version_created_by,
        createdAt: new Date(row.version_created_at),
        updatedBy: row.version_updated_by || undefined,
        updatedAt: new Date(row.version_updated_at)
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
    if (!partId || partId === 'undefined' || partId === 'null' || partId.trim() === '') {
      console.error(`[getPartWithCurrentVersion] Invalid part ID: '${partId}'`);
      throw new Error(`Invalid part ID: cannot be undefined, null, or empty`);
    }

    console.log(`[getPartWithCurrentVersion] Retrieving part with ID: ${partId}`);
    
    const result = await sql`
      SELECT 
        p.id,
        p.creator_id,
        p.global_part_number,
        p.status,
        p.lifecycle_status,
        p.is_public,
        p.created_at as part_created_at,
        p.updated_by as part_updated_by,
        p.updated_at as part_updated_at,
        p.current_version_id,
        pv.id as version_id,
        pv.part_id as version_part_id,
        pv.version,
        pv.name,
        pv.short_description,
        pv.status as version_status,
        pv.created_by as version_created_by,
        pv.created_at as version_created_at,
        pv.updated_by as version_updated_by,
        pv.updated_at as version_updated_at
      FROM "Part" p
      JOIN "PartVersion" pv ON p.current_version_id = pv.id
      WHERE p.id = ${partId}
    `;

    if (result.length === 0) {
      throw new Error(`Part not found with ID: ${partId}`);
    }
    
    const row = result[0];
    
    const part: Part = {
      id: row.id,
      creatorId: row.creator_id,
      globalPartNumber: row.global_part_number || undefined,
      status: row.status,
      lifecycleStatus: row.lifecycle_status,
      isPublic: row.is_public,
      createdAt: new Date(row.part_created_at),
      updatedBy: row.part_updated_by || undefined,
      updatedAt: new Date(row.part_updated_at),
      currentVersionId: row.current_version_id || undefined
    };
    
    const currentVersion: PartVersion = {
      id: row.version_id,
      partId: row.version_part_id,
      version: row.version,
      name: row.name,
      shortDescription: row.short_description || undefined,
      status: row.version_status,
      createdBy: row.version_created_by,
      createdAt: new Date(row.version_created_at),
      updatedBy: row.version_updated_by || undefined,
      updatedAt: new Date(row.version_updated_at)
    };
    
    return { part, currentVersion };
  } catch (error) {
    console.error(`[getPartWithCurrentVersion] Error:`, error);
    throw error;
  }
}

/**
 * Create a new part with its first version
 */
export async function createPart(
  params: {
    name: string;
    shortDescription?: string;
    createdBy: string;
    isPublic?: boolean;
    version?: string;
    status?: LifecycleStatusEnum;
    categoryIds?: string[];
  }
): Promise<{ part: Part; currentVersion: PartVersion }> {
  try {
    // Generate UUIDs for part and version
    const partId = randomUUID();
    const versionId = randomUUID();
    const version = params.version || '1.0.0';
    const status = params.status || LifecycleStatusEnum.DRAFT;
    const isPublic = params.isPublic !== undefined ? params.isPublic : true;
    
    // Begin transaction
    return await sql.begin(async (transaction) => {
      // Insert Part
      const partResult = await transaction`
        INSERT INTO "Part" (
          id, 
          creator_id, 
          status, 
          lifecycle_status, 
          is_public, 
          current_version_id
        )
        VALUES (
          ${partId}, 
          ${params.createdBy}, 
          ${PartStatusEnum.CONCEPT}, 
          ${status}, 
          ${isPublic}, 
          ${versionId}
        )
        RETURNING *
      `;
      
      if (partResult.length === 0) {
        throw new Error('Failed to create part');
      }
      
      // Insert PartVersion
      const versionResult = await transaction`
        INSERT INTO "PartVersion" (
          id,
          part_id,
          version,
          name,
          short_description,
          status,
          created_by,
          created_at,
          updated_by,
          updated_at
        )
        VALUES (
          ${versionId},
          ${partId},
          ${version},
          ${params.name},
          ${params.shortDescription || null},
          ${status},
          ${params.createdBy},
          NOW(),
          ${params.createdBy},
          NOW()
        )
        RETURNING *
      `;
      
      if (versionResult.length === 0) {
        throw new Error('Failed to create part version');
      }
      
      // Associate with categories if provided
      if (params.categoryIds && params.categoryIds.length > 0) {
        for (const categoryId of params.categoryIds) {
          await transaction`
            INSERT INTO "PartVersionCategory" (
              part_version_id, 
              category_id
            )
            VALUES (
              ${versionId}, 
              ${categoryId}
            )
          `;
        }
      }
      
      const part: Part = mapPartFromRow(partResult[0]);
      const currentVersion: PartVersion = mapPartVersionFromRow(versionResult[0]);
      
      return { part, currentVersion };
    });
  } catch (error) {
    console.error('Error in createPart:', error);
    throw error;
  }
}

/**
 * Get part categories
 */
export async function getPartCategories(partVersionId: string): Promise<PartVersionCategory[]> {
  try {
    const result = await sql`
      SELECT 
        pvc.*,
        c.name as category_name,
        c.description as category_description,
        c.path as category_path
      FROM "PartVersionCategory" pvc
      JOIN "Category" c ON pvc.category_id = c.id
      WHERE pvc.part_version_id = ${partVersionId}
    `;
    
    return result.map(row => ({
      partVersionId: row.part_version_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryDescription: row.category_description,
      categoryPath: row.category_path
    }));
  } catch (error) {
    console.error(`Error getting part categories:`, error);
    return [];
  }
}

// Helper functions for mapping rows to typed objects
function mapPartFromRow(row: any): Part {
  return {
    id: row.id,
    creatorId: row.creator_id,
    globalPartNumber: row.global_part_number || undefined,
    status: row.status,
    lifecycleStatus: row.lifecycle_status,
    isPublic: row.is_public,
    createdAt: new Date(row.created_at),
    updatedBy: row.updated_by || undefined,
    updatedAt: new Date(row.updated_at),
    currentVersionId: row.current_version_id || undefined
  };
}

function mapPartVersionFromRow(row: any): PartVersion {
  return {
    id: row.id,
    partId: row.part_id,
    version: row.version,
    name: row.name,
    shortDescription: row.short_description || undefined,
    status: row.status,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedBy: row.updated_by || undefined,
    updatedAt: new Date(row.updated_at)
  };
}
