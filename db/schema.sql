
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "ltree"; 

CREATE TYPE part_status_enum AS ENUM ('concept', 'active', 'obsolete', 'archived');
CREATE TYPE compliance_type_enum AS ENUM ('RoHS', 'REACH', 'Conflict_Minerals', 'Halogen_Free');
CREATE TYPE structural_relation_type_enum AS ENUM('component', 'alternative', 'complementary', 'substitute');
CREATE TYPE weight_unit_enum AS ENUM ('mg', 'g', 'kg', 'lb', 'oz');
CREATE TYPE dimension_unit_enum AS ENUM ('mm', 'cm', 'm', 'in', 'ft');
CREATE TYPE temperature_unit_enum AS ENUM ('C', 'F', 'K');
CREATE TYPE package_type_enum AS ENUM (
    'SMD', 'THT', 'QFP', 'BGA', 'DIP', 'SOT-23', 'TO-220',
    'SOP', 'TSSOP', 'LQFP', 'DFN', 'QFN', 'DO-35', 'DO-41',
    'SOD', 'SC-70', 'FCBGA'
);
CREATE TYPE lifecycle_status_enum AS ENUM (
    'draft', 'in_review', 'approved', 'pre-release', 'released', 
    'production', 'on_hold', 'obsolete', 'archived'
);
CREATE TYPE mounting_type_enum AS ENUM ('SMT', 'THT', 'Manual', 'Press-fit', 'Through-glass');

CREATE SEQUENCE IF NOT EXISTS part_global_num_seq;
CREATE TABLE IF NOT EXISTS "User" (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  avatar_url TEXT CHECK (avatar_url ~ '^https?://'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "Session"(
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Role"(
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT UNIQUE NOT NULL CHECK (role_name <> ''),
    role_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Linking users to roles
CREATE TABLE IF NOT EXISTS "UserRole" (
    user_id UUID NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES "Role"(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    assigned_by UUID REFERENCES "User"(user_id), -- Who assigned the role
    PRIMARY KEY (user_id, role_id)
);

-- Permissions table (future expansion)
CREATE TABLE IF NOT EXISTS "Permission" (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name TEXT UNIQUE NOT NULL CHECK (permission_name <> ''), -- e.g., 'part:create', 'bom:read', 'category:manage'
    permission_description TEXT
);

-- Linking roles to permissions (future expansion)
CREATE TABLE IF NOT EXISTS "RolePermission" (
    role_id UUID NOT NULL REFERENCES "Role"(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES "Permission"(permission_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    assigned_by UUID REFERENCES "User"(user_id),
    PRIMARY KEY (role_id, permission_id)
);
-- ###########################
-- Category Hierarchy
-- ###########################
CREATE TABLE IF NOT EXISTS "Category" (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name TEXT NOT NULL CHECK (category_name <> ''),
    parent_id UUID REFERENCES "Category"(category_id) ON DELETE RESTRICT,
    category_description TEXT,
    category_path LTREE,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES "User"(user_id),
    -- Standard UNIQUE constraint doesn't handle NULL values properly for parent_id
    -- Using two separate constraints to cover both cases
    CONSTRAINT unique_category_with_parent UNIQUE (parent_id, category_name),
    CONSTRAINT unique_root_category UNIQUE (category_name) WHERE parent_id IS NULL,
    CONSTRAINT chk_category_self_parent CHECK (category_id <> parent_id)
);

-- Closure table for hierarchical queries
CREATE TABLE IF NOT EXISTS "CategoryClosure" (
    ancestor_id UUID NOT NULL REFERENCES "Category"(category_id),
    descendant_id UUID NOT NULL REFERENCES "Category"(category_id),
    depth INTEGER NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id)
);


CREATE TABLE IF NOT EXISTS "Part" (
    part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES "User"(user_id),
    global_part_number TEXT UNIQUE,
    status_in_bom part_status_enum DEFAULT 'concept',
    lifecycle_status lifecycle_status_enum DEFAULT 'draft',
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    current_version_id UUID UNIQUE
);

CREATE TABLE IF NOT EXISTS "PartVersion" (
    part_version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE CASCADE,
    part_version TEXT NOT NULL CHECK (part_version<> ''),
    part_name TEXT NOT NULL CHECK (part_name <> ''),
    short_description TEXT,
    long_description JSONB,
    functional_description TEXT,
    technical_specifications JSONB,
    properties JSONB,
    electrical_properties JSONB,
    mechanical_properties JSONB,
    thermal_properties JSONB,
    part_weight NUMERIC CHECK (part_weight >= 0),
    weight_unit weight_unit_enum,
    dimensions JSONB CHECK (dimensions ?& array['length', 'width', 'height']),
    dimensions_unit dimension_unit_enum,
    material_composition JSONB,
    environmental_data JSONB,
    voltage_rating_max NUMERIC,
    voltage_rating_min NUMERIC,
    current_rating_max NUMERIC,
    current_rating_min NUMERIC,
    power_rating_max NUMERIC CHECK (power_rating_max >= 0),
    tolerance NUMERIC CHECK (tolerance >= 0),
    tolerance_unit TEXT,
    package_type package_type_enum,
    mounting_type mounting_type_enum,
    pin_count INTEGER CHECK (pin_count >= 0),
    operating_temperature_min NUMERIC,
    operating_temperature_max NUMERIC,
    storage_temperature_min NUMERIC,
    storage_temperature_max NUMERIC,
    temperature_unit temperature_unit_enum,
    revision_notes TEXT,
    version_status lifecycle_status_enum DEFAULT 'draft' NOT NULL,
    released_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CHECK (voltage_rating_max >= voltage_rating_min),
    CHECK (current_rating_max >= current_rating_min),
    CHECK (operating_temperature_max >= operating_temperature_min),
    CHECK (storage_temperature_max >= storage_temperature_min),
    CHECK ((part_weight IS NULL AND weight_unit IS NULL) OR (part_weight IS NOT NULL AND weight_unit IS NOT NULL)),
    CHECK ((dimensions IS NULL AND dimensions_unit IS NULL) OR (dimensions IS NOT NULL AND dimensions_unit IS NOT NULL)),
    CHECK ((tolerance IS NULL AND tolerance_unit IS NULL) OR (tolerance IS NOT NULL AND tolerance_unit IS NOT NULL)),
    UNIQUE (part_id, part_version)
);


-- ###########################
-- Relationship Tables
-- ###########################


-- Linking Part Versions to Categories
-- A specific version might belong to multiple categories
CREATE TABLE IF NOT EXISTS "PartVersionCategory" (
    part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES "Category"(category_id) ON DELETE RESTRICT, -- Prevent deleting category if a part version is linked
    PRIMARY KEY (part_version_id, category_id)
);


-- Defines structural relationships between parts in the library (e.g., sub-assemblies)
-- This is NOT the BOM structure, but rather compositional structure of parts themselves
CREATE TABLE IF NOT EXISTS "PartStructure" (
    part_structure_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_part_id UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE RESTRICT,
    child_part_id UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE RESTRICT,
    relation_type structural_relation_type_enum DEFAULT 'component' NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    UNIQUE (parent_part_id, child_part_id, relation_type),
    CONSTRAINT chk_partstructure_self_reference CHECK (parent_part_id <> child_part_id)
);
CREATE TABLE IF NOT EXISTS "PartCompliance" (
  part_compliance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE CASCADE,
  compliance_type compliance_type_enum NOT NULL,
  certificate_url TEXT CHECK (certificate_url ~* '^https?://'), -- Added CHECK constraint
  certified_at DATE,
  expires_at DATE,
  notes TEXT
);
-- ###########################
-- Attachment & Representation Tables
-- ###########################
-- Attachments related to a specific part version (datasheets, 3D models, footprints, images)
CREATE TABLE IF NOT EXISTS "PartAttachment" (
    part_attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE CASCADE,
    file_url TEXT NOT NULL CHECK (file_url ~* '^https?://'),
    file_name TEXT NOT NULL CHECK (file_name <> ''),
    file_type TEXT,
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    attachment_checksum TEXT,
    attachment_description TEXT,
    attachment_type TEXT,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    thumbnail_url TEXT CHECK (thumbnail_url ~* '^https?://'),
    uploaded_by UUID NOT NULL REFERENCES "User"(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB
);
-- Ensure only one primary attachment per part version
CREATE UNIQUE INDEX idx_partattachment_primary 
ON "PartAttachment" (part_version_id) 
WHERE is_primary = TRUE;

-- Could potentially store 3D model, footprint, or schematic symbol information
-- Linking this directly to PartVersion allows different versions to have different visual/layout data

CREATE TABLE IF NOT EXISTS "PartRepresentation" (
    part_representation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE CASCADE,
    representation_type TEXT NOT NULL CHECK (representation_type IN ('3D Model', 'Footprint', 'Schematic Symbol', 'Simulation Model')),
    format TEXT,
    file_url TEXT CHECK (file_url ~* '^https?://'),
    metadata JSONB,
    is_recommended BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (part_version_id, representation_type, format)
);

-- Revision Tracking
CREATE TABLE IF NOT EXISTS "PartRevision" (
  part_revision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id),
  change_description TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES "User"(user_id),
  changed_fields JSONB NOT NULL,
  revision_date TIMESTAMPTZ DEFAULT NOW()
);

-- Validation Table
CREATE TABLE IF NOT EXISTS "PartValidation" (
  part_version_id UUID PRIMARY KEY REFERENCES "PartVersion"(part_version_id),
  validated_by UUID NOT NULL REFERENCES "User"(user_id),
  validation_date TIMESTAMPTZ DEFAULT NOW(),
  test_results JSONB,
  certification_info JSONB,
  is_compliant BOOLEAN DEFAULT FALSE
);

-- ###########################
-- Metadata Tables
-- ###########################

CREATE TABLE IF NOT EXISTS "Manufacturer" (
    manufacturer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_name TEXT NOT NULL UNIQUE CHECK (manufacturer_name <> ''),
    manufacturer_description TEXT,
    website_url TEXT CHECK (website_url ~* '^https?://'),
    contact_info JSONB,
    logo_url TEXT CHECK (logo_url ~* '^https?://'),
    created_by UUID REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Links a PartVersion to a Manufacturer and their specific part number
-- A single PartVersion can be made by multiple manufacturers
CREATE TABLE IF NOT EXISTS "ManufacturerPart" (
    manufacturer_part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE CASCADE,
    manufacturer_id UUID NOT NULL REFERENCES "Manufacturer"(manufacturer_id),
    manufacturer_part_number TEXT NOT NULL CHECK (manufacturer_part_number <> ''),
    manufacturer_part_description TEXT,
    datasheet_url TEXT CHECK (datasheet_url ~* '^https?://'),
    product_url TEXT CHECK (product_url ~* '^https?://'),
    is_recommended BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (manufacturer_id, manufacturer_part_number),
    UNIQUE (part_version_id, manufacturer_id) 
);

-- Represents a company that sells parts
CREATE TABLE IF NOT EXISTS "Supplier" (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name TEXT NOT NULL UNIQUE CHECK (supplier_name <> ''),
    supplier_description TEXT,
    website_url TEXT CHECK (website_url ~* '^https?://'),
    contact_info JSONB,
    logo_url TEXT CHECK (logo_url ~* '^https?://'),
    created_by UUID REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Links a ManufacturerPart (a specific MPN) to a Supplier and their stock/pricing info
-- A single ManufacturerPart can be available from multiple suppliers
CREATE TABLE IF NOT EXISTS "SupplierPart" (
    supplier_part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_part_id UUID NOT NULL REFERENCES "ManufacturerPart"(manufacturer_part_id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES "Supplier"(supplier_id),
    supplier_part_number TEXT CHECK (supplier_part_number <> ''),
    unit_price NUMERIC CHECK (unit_price >= 0),
    currency TEXT DEFAULT 'USD',
    price_breaks JSONB,
    stock_quantity INTEGER CHECK (stock_quantity >= 0),
    lead_time_days INTEGER CHECK (lead_time_days >= 0),
    minimum_order_quantity INTEGER CHECK (minimum_order_quantity >= 1),
    packaging_info JSONB,
    product_url TEXT CHECK (product_url ~* '^https?://'),
    is_preferred BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (supplier_id, supplier_part_number)
);



-- ###########################
-- Taxonomy Tables
-- ###########################

-- Tags for flexible grouping and searching (e.g., 'RoHS', 'High Power', 'USB-C')
CREATE TABLE IF NOT EXISTS "Tag" (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_name TEXT NOT NULL UNIQUE CHECK (tag_name <> ''),
    tag_description TEXT,
    created_by UUID REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Soft delete for tags
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES "User"(user_id)
);

-- Linking Part Versions to Tags
CREATE TABLE IF NOT EXISTS "PartVersionTag" (
    part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES "Tag"(tag_id) ON DELETE RESTRICT, -- Prevent deleting tag if parts are linked
    assigned_by UUID REFERENCES "User"(user_id),
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (part_version_id, tag_id)
);

-- PartFamily represents a logical collection of related parts that belong to the same family
CREATE TABLE IF NOT EXISTS "PartFamily" (
    part_family_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name TEXT NOT NULL UNIQUE CHECK (family_name <> ''),
    family_description TEXT,
    family_code TEXT,
    family_image_url TEXT CHECK (family_image_url ~* '^https?://'),
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- PartGroup represents a collection of parts that are grouped together for a specific purpose
CREATE TABLE IF NOT EXISTS "PartGroup" (
    part_group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_name TEXT NOT NULL UNIQUE CHECK (group_name <> ''),
    group_description TEXT,
    group_code TEXT,
    group_type TEXT, -- e.g., 'project', 'functional', 'logical', etc.
    group_image_url TEXT CHECK (group_image_url ~* '^https?://'),
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Linking Parts to Families
CREATE TABLE IF NOT EXISTS "PartFamilyLink" (
    part_family_link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES "PartFamily"(part_family_id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT,
    UNIQUE (part_id, family_id)
);

-- Linking Parts to Groups
CREATE TABLE IF NOT EXISTS "PartGroupLink" (
    part_group_link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES "Part"(part_id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES "PartGroup"(part_group_id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    position_index INTEGER, -- Used for ordered parts within a group
    notes TEXT,
    UNIQUE (part_id, group_id)
);







-- ###########################
-- Custom Fields
-- ###########################
-- Custom Properties Table
CREATE TABLE IF NOT EXISTS "CustomField" (
  custom_field_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT NOT NULL UNIQUE,
  data_type TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'boolean', 'date')),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('part', 'manufacturer', 'supplier'))
);


CREATE TABLE IF NOT EXISTS "ManufacturerCustomField" (
  manufacturer_id UUID NOT NULL REFERENCES "Manufacturer"(manufacturer_id),
  field_id UUID NOT NULL REFERENCES "CustomField"(custom_field_id),
  custom_field_value JSONB NOT NULL,
  PRIMARY KEY (manufacturer_id, field_id)
);

CREATE TABLE IF NOT EXISTS "SupplierCustomField" (
  supplier_id UUID NOT NULL REFERENCES "Supplier"(supplier_id),
  field_id UUID NOT NULL REFERENCES "CustomField"(custom_field_id),
  custom_field_value JSONB NOT NULL,
  PRIMARY KEY (supplier_id, field_id)
);

CREATE TABLE IF NOT EXISTS "PartCustomField" (
  part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id),
  field_id UUID NOT NULL REFERENCES "CustomField"(custom_field_id),
  custom_field_value JSONB NOT NULL,
  PRIMARY KEY (part_version_id, field_id)
);



-- ###########################
-- Project & BOM System
-- ###########################

-- Projects table
CREATE TABLE IF NOT EXISTS "Project" (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    project_description TEXT,
    owner_id UUID NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    project_status lifecycle_status_enum DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Represents a specific version or revision of a Bill of Materials for a project
CREATE TABLE IF NOT EXISTS "BillOfMaterials" (
    bom_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES "Project"(project_id) ON DELETE CASCADE, -- If project is deleted, BOMs go too
    bom_version TEXT NOT NULL CHECK (bom_version <> ''), -- Version of the BOM itself (e.g., "A", "1.0", "Prototype")
    bom_name TEXT, -- Optional name for the BOM version (e.g., "Production BOM Rev A")
    bom_description TEXT,
    bom_status lifecycle_status_enum NOT NULL DEFAULT 'draft', -- Status of this specific BOM version
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES "User"(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    released_at TIMESTAMPTZ, -- When this BOM version was released

    -- Ensure unique BOM version for a project
    UNIQUE (project_id, bom_version)
);

CREATE TABLE IF NOT EXISTS "BOMItem" (
  bom_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
  bom_id UUID NOT NULL REFERENCES "BillOfMaterials"(bom_id) ON DELETE CASCADE,
  part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  reference_designator TEXT,
  mounting_type mounting_type_enum,
  instructions TEXT,
  find_number INTEGER,
  substitute_part_version_id UUID REFERENCES "PartVersion"(part_version_id),
  created_by UUID NOT NULL REFERENCES "User"(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES "User"(user_id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  
);

-- Ensure substitute part is different from the main part
ALTER TABLE "BOMItem" 
ADD CONSTRAINT chk_substitute_diff 
CHECK (substitute_part_version_id IS NULL OR substitute_part_version_id != part_version_id);

-- Allow same part to appear multiple times with different reference designators
CREATE UNIQUE INDEX idx_bomitem_unique_reference_designator 
ON "BOMItem" (bom_id, reference_designator) 
WHERE reference_designator IS NOT NULL;

-- Defines approved substitute parts for a specific BOM Item position
CREATE TABLE IF NOT EXISTS "BOMItemSubstitute" (
    bom_item_id UUID NOT NULL REFERENCES "BOMItem"(bom_item_id) ON DELETE CASCADE,
    substitute_part_version_id UUID NOT NULL REFERENCES "PartVersion"(part_version_id) ON DELETE RESTRICT,
    substitute_priority INTEGER DEFAULT 10 NOT NULL CHECK (substitute_priority >= 1),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES "User"(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (bom_item_id, substitute_part_version_id)
);

-- ###########################
-- Change History / Audit Trail (Future Expansion - can be implemented with triggers or application logic)
-- ###########################

-- Example table structure for tracking changes
-- CREATE TABLE ChangeLog (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     table_name TEXT NOT NULL,
--     record_id UUID NOT NULL, -- ID of the record that was changed
--     operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
--     old_data JSONB, -- The record data before the change
--     new_data JSONB, -- The record data after the change (for INSERT, only new_data)
--     changed_by UUID REFERENCES "User"(user_id),
--     changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );

-- ###########################
-- Triggers & Indexes
-- ###########################

CREATE OR REPLACE FUNCTION set_global_part_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.global_part_number := 'PART-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('part_global_num_seq')::text, 6, '0');
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_part_global_number
BEFORE INSERT ON "Part"
FOR EACH ROW EXECUTE FUNCTION set_global_part_number();

CREATE OR REPLACE FUNCTION check_current_version_part_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_version_id IS NOT NULL THEN
        IF (SELECT part_id FROM "PartVersion" WHERE part_version_id = NEW.current_version_id) != NEW.part_id THEN
            RAISE EXCEPTION 'current_version_id must belong to the same Part';
        END IF;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_part_current_version_check
BEFORE INSERT OR UPDATE ON "Part"
FOR EACH ROW EXECUTE FUNCTION check_current_version_part_id();

-- ###########################
-- Part Family and Group Tables
-- ###########################


CREATE OR REPLACE FUNCTION update_category_closure_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "CategoryClosure" (ancestor_id, descendant_id, depth)
    SELECT ancestor_id, NEW.category_id, depth + 1 FROM "CategoryClosure"
    WHERE descendant_id = NEW.parent_id
    UNION ALL
    SELECT NEW.category_id, NEW.category_id, 0;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_closure_insert
AFTER INSERT ON "Category"
FOR EACH ROW EXECUTE FUNCTION update_category_closure_on_insert();

CREATE OR REPLACE FUNCTION update_category_closure_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "CategoryClosure" WHERE descendant_id = OLD.category_id OR ancestor_id = OLD.category_id;
    RETURN OLD;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_closure_delete
BEFORE DELETE ON "Category"
FOR EACH ROW EXECUTE FUNCTION update_category_closure_on_delete();


-- Indexes

CREATE INDEX IF NOT EXISTS idx_category_path ON "Category" USING GIST (category_path);
CREATE INDEX IF NOT EXISTS idx_categoryclosure_ancestor ON "CategoryClosure" (ancestor_id);
CREATE INDEX IF NOT EXISTS idx_categoryclosure_descendant ON "CategoryClosure" (descendant_id);
CREATE INDEX IF NOT EXISTS idx_part_creator ON "Part" (creator_id);
CREATE INDEX IF NOT EXISTS idx_part_global_number ON "Part" (global_part_number);
CREATE INDEX IF NOT EXISTS idx_partversion_part ON "PartVersion" (part_id);
CREATE INDEX IF NOT EXISTS idx_partattachment_partversion ON "PartAttachment" (part_version_id);
CREATE INDEX IF NOT EXISTS idx_partrepresentation_partversion ON "PartRepresentation" (part_version_id);
CREATE INDEX IF NOT EXISTS idx_manufacturerpart_manufacturer ON "ManufacturerPart" (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_supplierpart_supplier ON "SupplierPart" (supplier_id);
CREATE INDEX IF NOT EXISTS idx_userrole_role ON "UserRole" (role_id);
CREATE INDEX IF NOT EXISTS idx_rolepermission_permission ON "RolePermission" (permission_id);
CREATE INDEX IF NOT EXISTS idx_bomitem_bom ON "BOMItem" (bom_id);
CREATE INDEX IF NOT EXISTS idx_bomitem_part_version ON "BOMItem" (part_version_id); 

CREATE INDEX IF NOT EXISTS idx_bomitemsubstitute_bom_item ON "BOMItemSubstitute" (bom_item_id);
CREATE INDEX IF NOT EXISTS idx_bomitemsubstitute_part_version ON "BOMItemSubstitute" (substitute_part_version_id);

CREATE INDEX IF NOT EXISTS idx_partrepresentation_part_version ON "PartRepresentation" (part_version_id);
CREATE INDEX IF NOT EXISTS idx_partrepresentation_type ON "PartRepresentation" (representation_type);

CREATE INDEX IF NOT EXISTS idx_partversion_properties ON "PartVersion" USING GIN (properties);
CREATE INDEX IF NOT EXISTS idx_partversion_electrical_properties ON "PartVersion" USING GIN (electrical_properties); -- Keep separate if structure/queries differ
CREATE INDEX IF NOT EXISTS idx_partversion_search ON "PartVersion" USING GIN (
    to_tsvector('english',
        COALESCE(part_name, '') || ' ' ||
        COALESCE(short_description, '') || ' ' ||
        COALESCE(long_description::text, '') || ' ' ||
        COALESCE(functional_description, '')
    )
);

-- Indexes for faster hierarchical queries
CREATE INDEX IF NOT EXISTS idx_category_closure_ancestor ON "CategoryClosure"(ancestor_id);
CREATE INDEX IF NOT EXISTS idx_category_closure_descendant ON "CategoryClosure"(descendant_id);
CREATE INDEX IF NOT EXISTS idx_category_parent_id ON "Category"(parent_id); -- Indexing the parent_id directly is also useful

-- Indexes for relationships and lookups
CREATE INDEX IF NOT EXISTS idx_part_creator ON "Part"(creator_id);
CREATE INDEX IF NOT EXISTS idx_part_current_version ON "Part"(current_version_id); -- For quickly finding Parts by their current version
CREATE INDEX IF NOT EXISTS idx_partversion_part ON "PartVersion"(part_id);
CREATE INDEX IF NOT EXISTS idx_partversion_created_by ON "PartVersion"(created_by);
CREATE INDEX IF NOT EXISTS idx_partversion_status ON "PartVersion"(version_status); -- Index status for filtering

CREATE INDEX IF NOT EXISTS idx_manufacturer_contact_info ON "Manufacturer" USING GIN (contact_info);
CREATE INDEX IF NOT EXISTS idx_manufacturerpart_manufacturer ON "ManufacturerPart"(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_manufacturerpart_part_version ON "ManufacturerPart"(part_version_id); -- Link from version to MPN

CREATE INDEX IF NOT EXISTS idx_supplierpart_supplier ON "SupplierPart"(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplierpart_manufacturer_part ON "SupplierPart"(manufacturer_part_id); -- Link from supplier item to MPN

CREATE INDEX IF NOT EXISTS idx_partstructure_parent ON "PartStructure"(parent_part_id);
CREATE INDEX IF NOT EXISTS idx_partstructure_child ON "PartStructure"(child_part_id);

CREATE INDEX IF NOT EXISTS idx_partversioncategory_part_version ON "PartVersionCategory"(part_version_id);
CREATE INDEX IF NOT EXISTS idx_partversioncategory_category ON "PartVersionCategory"(category_id);
CREATE INDEX IF NOT EXISTS idx_partattachment_part_version ON "PartAttachment"(part_version_id);
CREATE INDEX IF NOT EXISTS idx_partattachment_uploaded_by ON "PartAttachment"(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_partversiontag_part_version ON "PartVersionTag"(part_version_id);
CREATE INDEX IF NOT EXISTS idx_partversiontag_tag ON "PartVersionTag"(tag_id);
CREATE INDEX IF NOT EXISTS idx_project_owner ON "Project"(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_status ON "Project"(project_status);
CREATE INDEX IF NOT EXISTS idx_billofmaterials_project ON "BillOfMaterials"(project_id);
CREATE INDEX IF NOT EXISTS idx_billofmaterials_status ON "BillOfMaterials"(bom_status);

CREATE INDEX IF NOT EXISTS idx_bomitem_bom ON "BOMItem"(bom_id);
CREATE INDEX IF NOT EXISTS idx_bomitem_part_version ON "BOMItem"(part_version_id); 

CREATE INDEX IF NOT EXISTS idx_bomitemsubstitute_bom_item ON "BOMItemSubstitute"(bom_item_id);
CREATE INDEX IF NOT EXISTS idx_bomitemsubstitute_part_version ON "BOMItemSubstitute"(substitute_part_version_id);

CREATE INDEX IF NOT EXISTS idx_partrepresentation_part_version ON "PartRepresentation"(part_version_id);
CREATE INDEX IF NOT EXISTS idx_partrepresentation_type ON "PartRepresentation"(representation_type);

-- Indexes for Part Family and Group tables
CREATE INDEX IF NOT EXISTS idx_partfamily_created_by ON "PartFamily"(created_by);
CREATE INDEX IF NOT EXISTS idx_partfamily_is_active ON "PartFamily"(is_active);
CREATE INDEX IF NOT EXISTS idx_partfamily_name ON "PartFamily"(family_name);
CREATE INDEX IF NOT EXISTS idx_partfamily_id ON "PartFamily"(part_family_id);

CREATE INDEX IF NOT EXISTS idx_partgroup_created_by ON "PartGroup"(created_by);
CREATE INDEX IF NOT EXISTS idx_partgroup_is_active ON "PartGroup"(is_active);
CREATE INDEX IF NOT EXISTS idx_partgroup_type ON "PartGroup"(group_type);
CREATE INDEX IF NOT EXISTS idx_partgroup_name ON "PartGroup"(group_name);
CREATE INDEX IF NOT EXISTS idx_partgroup_id ON "PartGroup"(part_group_id);

CREATE INDEX IF NOT EXISTS idx_partfamilylink_id ON "PartFamilyLink"(part_family_link_id);
CREATE INDEX IF NOT EXISTS idx_partfamilylink_part ON "PartFamilyLink"(part_id);
CREATE INDEX IF NOT EXISTS idx_partfamilylink_family ON "PartFamilyLink"(family_id);

CREATE INDEX IF NOT EXISTS idx_partgrouplink_id ON "PartGroupLink"(part_group_link_id);
CREATE INDEX IF NOT EXISTS idx_partgrouplink_part ON "PartGroupLink"(part_id);
CREATE INDEX IF NOT EXISTS idx_partgrouplink_group ON "PartGroupLink"(group_id);
CREATE INDEX IF NOT EXISTS idx_partgrouplink_position ON "PartGroupLink"(position_index);
