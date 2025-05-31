// src/lib/parts/partUtils.ts
import type { 
  PartAttachment,
  PartRepresentation, 
  PartVersion,
} from '../types/schemaTypes';

// Use CustomField from schema types since PartCustomField isn't directly available
import type { CustomField } from '../types/schemaTypes';

// Define internal interfaces for the utility functions
interface PartVersionCategory {
  partVersionId: string;
  categoryId: string;
}

interface PartStructure {
  id: string;
  parentPartId: string;
  childPartId: string;
  relationType: string;
  quantity: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
  validFrom: Date;
  validUntil?: Date;
}

interface PartCompliance {
  id: string;
  partVersionId: string;
  complianceType: string;
  certificateUrl?: string;
  certifiedAt?: Date;
  expiresAt?: Date;
  notes?: string;
}

interface PartRevision {
  id: string;
  partVersionId: string;
  changeDescription: string;
  changedBy: string;
  changedFields: any;
  revisionDate: Date;
}

interface PartValidation {
  partVersionId: string;
  validatedBy: string;
  validationDate: Date;
  testResults?: any;
  certificationInfo?: any;
  isCompliant: boolean;
}

interface PartVersionTag {
  partVersionId: string;
  tagId: string;
  assignedBy?: string;
  assignedAt: Date;
}

export const isVersionEditable = (version: PartVersion): boolean => {
	return version.version_status === 'draft' || version.version_status === 'in_review';
};

export function rowToPartVersionCategory(raw: any): PartVersionCategory {
	return {
	  partVersionId: raw.part_version_id,
	  categoryId: raw.category_id
	};
}

export function rowToPartStructure(raw: any): PartStructure {
	return {
	  id: raw.id,
	  parentPartId: raw.parent_part_id,
	  childPartId: raw.child_part_id,
	  relationType: raw.relation_type,
	  quantity: raw.quantity,
	  notes: raw.notes ?? undefined,
	  createdBy: raw.created_by,
	  createdAt: raw.created_at,
	  updatedBy: raw.updated_by ?? undefined,
	  updatedAt: raw.updated_at,
	  validFrom: raw.valid_from,
	  validUntil: raw.valid_until ?? undefined
	};
}

export function rowToPartCompliance(raw: any): PartCompliance {
	return {
	  id: raw.id,
	  partVersionId: raw.part_version_id,
	  complianceType: raw.compliance_type,
	  certificateUrl: raw.certificate_url ?? undefined,
	  certifiedAt: raw.certified_at ?? undefined,
	  expiresAt: raw.expires_at ?? undefined,
	  notes: raw.notes ?? undefined
	};
}

export function rowToPartAttachment(raw: any): PartAttachment {
	return {
	  part_attachment_id: raw.id || raw.part_attachment_id,
	  part_version_id: raw.part_version_id,
	  file_name: raw.file_name,
	  file_type: raw.file_type ?? undefined,
	  file_path: raw.file_path || raw.file_url || '',
	  file_size_bytes: raw.file_size_bytes ?? 0,
	  description: raw.description ?? undefined,
	  is_primary: raw.is_primary || false,
	  upload_date: raw.upload_date || raw.uploaded_at || new Date(),
	  uploaded_by: raw.uploaded_by || ''
	  // Properties removed that aren't in the PartAttachment interface:
	  // - thumbnail_path
	  // - updated_at
	};
}

export function rowToPartRepresentation(raw: any): PartRepresentation {
	return {
	  part_representation_id: raw.id || raw.part_representation_id,
	  part_version_id: raw.part_version_id,
	  representation_type: raw.type || raw.representation_type,
	  file_name: raw.file_name || '',
	  file_format: raw.file_format || raw.format || '',
	  file_path: raw.file_path || raw.file_url || '',
	  file_size_bytes: raw.file_size_bytes || 0,
	  resolution: raw.resolution ?? null,
	  thumbnail_path: raw.thumbnail_path ?? null,
	  created_at: raw.created_at || new Date(),
	  created_by: raw.created_by || '',
	  is_primary: raw.is_primary || raw.is_recommended || false
	  // Note: All properties now match PartRepresentation interface in schemaTypes.ts
	};
}

export function rowToPartRevision(raw: any): PartRevision {
	return {
	  id: raw.id,
	  partVersionId: raw.part_version_id,
	  changeDescription: raw.change_description,
	  changedBy: raw.changed_by,
	  changedFields: raw.changed_fields,
	  revisionDate: raw.revision_date
	};
}

export function rowToPartValidation(raw: any): PartValidation {
	return {
	  partVersionId: raw.part_version_id,
	  validatedBy: raw.validated_by,
	  validationDate: raw.validation_date,
	  testResults: raw.test_results ?? undefined,
	  certificationInfo: raw.certification_info ?? undefined,
	  isCompliant: raw.is_compliant
	};
}

export function rowToPartVersionTag(raw: any): PartVersionTag {
	return {
	  partVersionId: raw.part_version_id,
	  tagId: raw.tag_id,
	  assignedBy: raw.assigned_by ?? undefined,
	  assignedAt: raw.assigned_at
	};
}

// Map database row to custom field data structure
// Using proper property names from the schema
export function rowToPartCustomField(raw: any): any {
	return {
	  custom_field_id: raw.custom_field_id || raw.field_id,
	  field_name: raw.field_name || 'unknown',
	  data_type: raw.data_type || 'text',
	  applies_to: raw.applies_to || 'part',
	  // Add any other required fields
	  // Store the original values in a metadata object to preserve them
	  metadata: {
	    part_version_id: raw.part_version_id,
	    field_id: raw.field_id,
	    value: raw.value
	  }
	};
}
