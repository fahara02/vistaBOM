// ======================
// Enums
// ======================

export enum PartStatusEnum {
	CONCEPT = 'concept',
	ACTIVE = 'active',
	OBSOLETE = 'obsolete',
	ARCHIVED = 'archived'
}

export enum ComplianceTypeEnum {
	ROHS = 'RoHS',
	REACH = 'REACH',
	CONFLICT_MINERALS = 'Conflict_Minerals',
	HALOGEN_FREE = 'Halogen_Free'
}

export enum StructuralRelationTypeEnum {
	COMPONENT = 'component',
	ALTERNATIVE = 'alternative',
	COMPLEMENTARY = 'complementary',
	SUBSTITUTE = 'substitute'
}

export enum WeightUnitEnum {
	MG = 'mg',
	G = 'g',
	KG = 'kg',
	LB = 'lb',
	OZ = 'oz'
}

export enum DimensionUnitEnum {
	MM = 'mm',
	CM = 'cm',
	M = 'm',
	IN = 'in',
	FT = 'ft'
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
	DRAFT = 'draft',
	IN_REVIEW = 'in_review',
	APPROVED = 'approved',
	PRE_RELEASE = 'pre-release',
	RELEASED = 'released',
	PRODUCTION = 'production',
	ON_HOLD = 'on_hold',
	OBSOLETE = 'obsolete',
	ARCHIVED = 'archived'
}

export enum MountingTypeEnum {
	SMT = 'SMT',
	THT = 'THT',
	MANUAL = 'Manual',
	PRESS_FIT = 'Press-fit',
	THROUGH_GLASS = 'Through-glass'
}