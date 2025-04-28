// src/lib/server/db/types.ts
export type JsonValue = null | string | number | boolean | { [key: string]: JsonValue } | JsonValue[];

// ======================
// Enums
// ======================

export enum PartStatusEnum {
	Concept = 'concept',
	Active = 'active',
	Obsolete = 'obsolete',
	Archived = 'archived'
}

export enum ComplianceTypeEnum {
	RoHS = 'RoHS',
	REACH = 'REACH',
	ConflictMinerals = 'Conflict_Minerals',
	HalogenFree = 'Halogen_Free'
}

export enum StructuralRelationTypeEnum {
	Component = 'component',
	Alternative = 'alternative',
	Complementary = 'complementary',
	Substitute = 'substitute'
}

export enum WeightUnitEnum {
	mg = 'mg',
	g = 'g',
	kg = 'kg',
	lb = 'lb',
	oz = 'oz'
}

export enum DimensionUnitEnum {
	mm = 'mm',
	cm = 'cm',
	m = 'm',
	in = 'in',
	ft = 'ft'
}

export enum TemperatureUnitEnum {
	C = 'C',
	F = 'F',
	K = 'K'
}

export enum PackageTypeEnum {
	SMD = 'SMD',
	THT = 'THT',
	QFP = 'QFP',
	BGA = 'BGA',
	DIP = 'DIP',
	SOT23 = 'SOT-23',
	TO220 = 'TO-220',
	SOP = 'SOP',
	TSSOP = 'TSSOP',
	LQFP = 'LQFP',
	DFN = 'DFN',
	QFN = 'QFN',
	DO35 = 'DO-35',
	DO41 = 'DO-41',
	SOD = 'SOD',
	SC70 = 'SC-70',
	FCBGA = 'FCBGA'
}

export enum LifecycleStatusEnum {
	Draft = 'draft',
	InReview = 'in_review',
	Approved = 'approved',
	PreRelease = 'pre-release',
	Released = 'released',
	Production = 'production',
	OnHold = 'on_hold',
	Obsolete = 'obsolete',
	Archived = 'archived'
}

export enum MountingTypeEnum {
	SMT = 'SMT',
	THT = 'THT',
	Manual = 'Manual',
	PressFit = 'Press-fit',
	ThroughGlass = 'Through-glass'
}

// ======================
// Core Interfaces
// ======================
export interface User {
	id: string;
	username: string | null;
	email: string;
	fullName: string | null;
	passwordHash: string | null;
	googleId: string | null;
	avatarUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
	lastLoginAt: Date | null;
	isActive: boolean;
	isAdmin: boolean;
	isDeleted: boolean;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
	lastUsed: Date;
}

export interface Role {
	id: string;
	name: string;
	description?: string;
	createdAt: Date;
}

export interface UserRole {
	userId: string;
	roleId: string;
	assignedAt: Date;
	assignedBy?: string;
}

export interface Permission {
	id: string;
	name: string;
	description?: string;
}

export interface RolePermission {
	roleId: string;
	permissionId: string;
	assignedAt: Date;
	assignedBy?: string;
}

// ======================
// Category System
// ======================
export interface Category {
	id: string;
	name: string;
	parentId?: string;
	description?: string;
	path: string;
	createdBy: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
	isPublic: boolean;
	isDeleted: boolean;
	deletedAt?: Date;
	deletedBy?: string;
}

export interface CategoryClosure {
	ancestorId: string;
	descendantId: string;
	depth: number;
}

// ======================
// Part System
// ======================
export interface Part {
	id: string;
	creatorId: string;
	globalPartNumber?: string;
	status: PartStatusEnum;
	lifecycleStatus: LifecycleStatusEnum;
	isPublic: boolean;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
	currentVersionId?: string;
}

export interface PartVersion {
	id: string;
	partId: string;
	version: string;
	name: string;
	shortDescription?: string;
	longDescription?: JsonValue; // JSONB
	functionalDescription?: string;
	technicalSpecifications?: JsonValue; // JSONB
	properties?: JsonValue; // JSONB
	electricalProperties?: JsonValue; // JSONB
	mechanicalProperties?: JsonValue; // JSONB
	thermalProperties?: JsonValue; // JSONB
	weight?: number;
	weightUnit?: WeightUnitEnum;
	dimensions?: JsonValue; // JSONB
	dimensionsUnit?: DimensionUnitEnum;
	materialComposition?: JsonValue; // JSONB
	environmentalData?: JsonValue; // JSONB
	voltageRatingMax?: number;
	voltageRatingMin?: number;
	currentRatingMax?: number;
	currentRatingMin?: number;
	powerRatingMax?: number;
	tolerance?: number;
	toleranceUnit?: string;
	packageType?: PackageTypeEnum;
	pinCount?: number;
	operatingTemperatureMin?: number;
	operatingTemperatureMax?: number;
	storageTemperatureMin?: number;
	storageTemperatureMax?: number;
	temperatureUnit?: TemperatureUnitEnum;
	revisionNotes?: string;
	status: LifecycleStatusEnum;
	releasedAt?: Date;
	createdBy: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

export interface PartVersionCategory {
	partVersionId: string;
	categoryId: string;
}

export interface PartStructure {
	id: string;
	parentPartId: string;
	childPartId: string;
	relationType: StructuralRelationTypeEnum;
	quantity: number;
	notes?: string;
	createdBy: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
	validFrom: Date;
	validUntil?: Date;
}

export interface PartCompliance {
	id: string;
	partVersionId: string;
	complianceType: ComplianceTypeEnum;
	certificateUrl?: string;
	certifiedAt?: Date;
	expiresAt?: Date;
	notes?: string;
}

// ======================
// Attachments & Representations
// ======================
export interface PartAttachment {
	id: string;
	partVersionId: string;
	fileUrl: string;
	fileName: string;
	fileType?: string;
	fileSizeBytes?: number;
	checksum?: string;
	description?: string;
	attachmentType?: string;
	isPrimary: boolean;
	thumbnailUrl?: string;
	uploadedBy: string;
	uploadedAt: Date;
	updatedBy?: string;
	updatedAt: Date;
	metadata?: JsonValue; // JSONB
}

export interface PartRepresentation {
	id: string;
	partVersionId: string;
	type: string;
	format?: string;
	fileUrl?: string;
	metadata?: JsonValue; // JSONB
	isRecommended: boolean;
	createdBy?: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

// ======================
// Revision & Validation
// ======================
export interface PartRevision {
	id: string;
	partVersionId: string;
	changeDescription: string;
	changedBy: string;
	changedFields: JsonValue; // JSONB
	revisionDate: Date;
}

export interface PartValidation {
	partVersionId: string;
	validatedBy: string;
	validationDate: Date;
	testResults?: JsonValue; // JSONB
	certificationInfo?: JsonValue; // JSONB;
	isCompliant: boolean;
}

// ======================
// Manufacturer & Supplier
// ======================
export interface Manufacturer {
	id: string;
	name: string;
	description?: string;
	websiteUrl?: string;
	logoUrl?: string;
	createdBy?: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

export interface ManufacturerPart {
	id: string;
	partVersionId: string;
	manufacturerId: string;
	manufacturerPartNumber: string;
	description?: string;
	datasheetUrl?: string;
	productUrl?: string;
	isRecommended: boolean;
	createdBy?: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

export interface Supplier {
	id: string;
	name: string;
	description?: string;
	websiteUrl?: string;
	contactInfo?: JsonValue; // JSONB
	logoUrl?: string;
	createdBy?: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

export interface SupplierPart {
	id: string;
	manufacturerPartId: string;
	supplierId: string;
	supplierPartNumber?: string;
	unitPrice?: number;
	currency?: string;
	priceBreaks?: JsonValue; // JSONB
	stockQuantity?: number;
	leadTimeDays?: number;
	minimumOrderQuantity?: number;
	packagingInfo?: JsonValue; // JSONB
	productUrl?: string;
	isPreferred: boolean;
	createdBy?: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

// ======================
// Taxonomy
// ======================
export interface Tag {
	id: string;
	name: string;
	description?: string;
	createdBy?: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
	isDeleted: boolean;
	deletedAt?: Date;
	deletedBy?: string;
}

export interface PartVersionTag {
	partVersionId: string;
	tagId: string;
	assignedBy?: string;
	assignedAt: Date;
}

// ======================
// Custom Fields
// ======================
export interface CustomField {
	id: string;
	fieldName: string;
	dataType: 'text' | 'number' | 'boolean' | 'date';
	appliesTo: 'part' | 'manufacturer' | 'supplier';
}

export interface ManufacturerCustomField {
	manufacturerId: string;
	fieldId: string;
	value: JsonValue; // JSONB
}

export interface SupplierCustomField {
	supplierId: string;
	fieldId: string;
	value: JsonValue; // JSONB
}

export interface PartCustomField {
	partVersionId: string;
	fieldId: string;
	value: JsonValue; // JSONB
}

// ======================
// Project & BOM
// ======================
export interface Project {
	id: string;
	name: string;
	description?: string;
	ownerId: string;
	status: LifecycleStatusEnum;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

export interface BillOfMaterials {
	id: string;
	projectId: string;
	version: string;
	name?: string;
	description?: string;
	status: LifecycleStatusEnum;
	createdBy: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
	releasedAt?: Date;
}

export interface BOMItem {
	id: string;
	bomId: string;
	partVersionId: string;
	quantity: number;
	referenceDesignator?: string;
	mountingType?: MountingTypeEnum;
	instructions?: string;
	findNumber?: number;
	substitutePartVersionId?: string;
	createdBy: string;
	createdAt: Date;
	updatedBy?: string;
	updatedAt: Date;
}

export interface BOMItemSubstitute {
	bomItemId: string;
	substitutePartVersionId: string;
	priority: number;
	notes?: string;
	createdBy: string;
	createdAt: Date;
}


export interface DatabaseSchema {
	User: User;
	Session: Session;
	Role: Role;
	UserRole: UserRole;
	Permission: Permission;
	RolePermission: RolePermission;
	Category: Category;
	CategoryClosure: CategoryClosure;
	Part: Part;
	PartVersion: PartVersion;
	PartVersionCategory: PartVersionCategory;
	PartStructure: PartStructure;
	PartCompliance: PartCompliance;
	PartAttachment: PartAttachment;
	PartRepresentation: PartRepresentation;
	PartRevision: PartRevision;
	PartValidation: PartValidation;
	Manufacturer: Manufacturer;
	ManufacturerPart: ManufacturerPart;
	Supplier: Supplier;
	SupplierPart: SupplierPart;
	Tag: Tag;
	PartVersionTag: PartVersionTag;
	CustomField: CustomField;
	ManufacturerCustomField: ManufacturerCustomField;
	SupplierCustomField: SupplierCustomField;
	PartCustomField: PartCustomField;
	Project: Project;
	BillOfMaterials: BillOfMaterials;
	BOMItem: BOMItem;
	BOMItemSubstitute: BOMItemSubstitute;
	// Add other tables if needed, e.g., ChangeLog if implemented
}