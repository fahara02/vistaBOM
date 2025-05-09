// src/lib/parts/partUtils.ts
import type { 
  PartAttachment, 
  PartCompliance, 
  PartCustomField, 
  PartRepresentation, 
  PartRevision, 
  PartStructure, 
  PartValidation, 
  PartVersion, 
  PartVersionCategory, 
  PartVersionTag 
} from '../server/db/types';

export const isVersionEditable = (version: PartVersion): boolean => {
	return version.status === 'draft' || version.status === 'in_review';
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
	  id: raw.id,
	  partVersionId: raw.part_version_id,
	  fileUrl: raw.file_url,
	  fileName: raw.file_name,
	  fileType: raw.file_type ?? undefined,
	  fileSizeBytes: raw.file_size_bytes ?? undefined,
	  checksum: raw.checksum ?? undefined,
	  description: raw.description ?? undefined,
	  attachmentType: raw.attachment_type ?? undefined,
	  isPrimary: raw.is_primary,
	  thumbnailUrl: raw.thumbnail_url ?? undefined,
	  uploadedBy: raw.uploaded_by,
	  uploadedAt: raw.uploaded_at,
	  updatedBy: raw.updated_by ?? undefined,
	  updatedAt: raw.updated_at,
	  metadata: raw.metadata ?? undefined
	};
}

export function rowToPartRepresentation(raw: any): PartRepresentation {
	return {
	  id: raw.id,
	  partVersionId: raw.part_version_id,
	  type: raw.type,
	  format: raw.format ?? undefined,
	  fileUrl: raw.file_url ?? undefined,
	  metadata: raw.metadata ?? undefined,
	  isRecommended: raw.is_recommended,
	  createdBy: raw.created_by ?? undefined,
	  createdAt: raw.created_at,
	  updatedBy: raw.updated_by ?? undefined,
	  updatedAt: raw.updated_at
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

export function rowToPartCustomField(raw: any): PartCustomField {
	return {
	  partVersionId: raw.part_version_id,
	  fieldId: raw.field_id,
	  value: raw.value
	};
}
