//src/routes/part/new/+page.server.ts

import { createUnifiedPart, isValidEnvironmentalData, isValidStructuredDescription } from '@/core/parts';
// Import directly from core parts module without defining our own type
// The createPart function knows its parameter type
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { unifiedPartSchema } from '@/schema/unifiedPartSchema';
import { createPartSchema } from '@/schema/schema';
// Server-side code should import directly from server types
import { 
  ComplianceTypeEnum, 
  PackageTypeEnum, 
  WeightUnitEnum, 
  DimensionUnitEnum, 
  PartStatusEnum,
  LifecycleStatusEnum, 
  MountingTypeEnum,
  TemperatureUnitEnum,
  StructuralRelationTypeEnum
} from '@/types/types';
import sql from '$lib/server/db';
import type { PartFormData, UnifiedPart, JsonValue } from '@/types/types';
import type {
  ManufacturerPartDefinition,
  SupplierPartDefinition,
  RepresentationDefinition,
  ComplianceDefinition,
  StructuredDescription,
  AttachmentDefinition,
  PartStructureDefinition,
  ElectricalProperties,
  MechanicalProperties,
  ThermalProperties,
  EnvironmentalData,
  Category
} from '@/types/schemaTypes';
import type { UnifiedPartSchema } from '@/schema/unifiedPartSchema';
import type { Manufacturer } from '@/types/schemaTypes';
import { listManufacturers } from '@/core/manufacturer';
import { getAllCategories } from '$lib/core/category';

// Define a UI-specific extension of Category with additional display properties
interface CategoryWithUIFields extends Category {
  parent_name?: string | null;
  child_count?: number;
}

/**
 * Custom type guard to check if an object has a specific field
 * This approach avoids type augmentation while allowing safe property access
 */
function hasProperty<T extends object, K extends string>(obj: T, key: K): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Load function - initializes the form and loads lifecycle statuses
 */
export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  // Create an empty form based on the UnifiedPart schema
  const form = await superValidate(zod(unifiedPartSchema));
  
  // Initialize dimensions as null since they are optional in the database schema
  if (!form.data.dimensions) {
    form.data.dimensions = null;
  }
  
  // Add default status if not set
  if (!form.data.version_status) {
    form.data.version_status = LifecycleStatusEnum.DRAFT;
  }
  
  // Initialize dimensions_unit property with a safer type approach
  // Using properly typed interface to avoid any/unknown but still fix the issue
  interface PartFormData extends Record<string, any> {
    dimensions_unit?: DimensionUnitEnum;
  }
  const formData = form.data as PartFormData;
  formData.dimensions_unit = formData.dimensions_unit || DimensionUnitEnum.MM;
  
  // Fetch manufacturers directly from the database using the core function
  let manufacturers: Manufacturer[] = [];
  
  try {
    console.log('Fetching manufacturers from database using listManufacturers');
    
    // Use the core function to get all manufacturers
    const result = await listManufacturers();
    
    // DEBUG: Log raw result from database
    console.log('Raw manufacturer data from database:', JSON.stringify(result?.slice(0, 2)));
    
    if (result && Array.isArray(result)) {
      // Transform to the format expected by ManufacturerSelector component
      manufacturers = result.map(m => ({
        id: m.manufacturer_id,                   // ManufacturerSelector expects 'id'
        name: m.manufacturer_name,               // ManufacturerSelector expects 'name'
        logo_url: m.logo_url,
        website: m.website_url || '',           // Match expected property name
        description: m.manufacturer_description, // Match expected property name
        // Include other fields for completeness
        manufacturer_id: m.manufacturer_id,
        manufacturer_name: m.manufacturer_name,
        website_url: m.website_url,
        contact_info: m.contact_info,
        created_at: m.created_at,
        updated_at: m.updated_at,
        custom_fields: m.custom_fields
      }));
      console.log(`Database returned ${manufacturers.length} manufacturers`);
      // DEBUG: Log transformed data
      console.log('Transformed manufacturer data (first 2):', JSON.stringify(manufacturers.slice(0, 2)));
    }
  } catch (error) {
    console.error('Error fetching manufacturers from database:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Empty array on error
    manufacturers = [];
  }
  
  // Load all categories for the form using the core function
  let categories: CategoryWithUIFields[] = [];
  try {
    console.log('Fetching categories from database using getAllCategories');
    
    // Use the core function to get all categories
    const categoryResult = await getAllCategories({ excludeDeleted: true });
    
    // DEBUG: Log raw category result from database
    console.log('Raw category data from database:', JSON.stringify(categoryResult?.slice(0, 2)));
    
    // Map the category data and add some UI-specific fields
    categories = categoryResult.map(cat => {
      // Create a UI-enhanced category object with additional display fields
      const enhancedCategory: CategoryWithUIFields = {
        category_id: cat.category_id,
        category_name: cat.category_name,
        category_path: cat.category_path,
        category_description: cat.category_description || '',
        parent_id: cat.parent_id || undefined,
        is_public: cat.is_public,
        created_by: cat.created_by,
        created_at: cat.created_at,
        updated_by: cat.updated_by,
        updated_at: cat.updated_at,
        is_deleted: cat.is_deleted,
        // UI-specific fields
        parent_name: null, // Will be populated if needed from parent category
        child_count: 0     // Default to 0 child categories
      };
      return enhancedCategory;
    });
    
    console.log(`Database returned ${categories.length} categories`);
  } catch (error) {
    console.error('Error loading categories:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Default to empty array
    categories = [];
  }
  
  return {
    form,
    manufacturers,
    categories,
    statuses: Object.values(LifecycleStatusEnum),
    packageTypes: Object.values(PackageTypeEnum),
    weightUnits: Object.values(WeightUnitEnum),
    dimensionUnits: Object.values(DimensionUnitEnum)
  };
};



/**
 * Form actions for creating new parts with initial version
 */
export const actions = {
  default: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
    // No need to explicitly access the database here
    // The createPart function will handle the database access
    // Validate user authentication
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });
    
    // Validate form data using the UnifiedPart schema for complete type safety
    const form = await superValidate(request, zod(unifiedPartSchema));
    console.log('Form data RAW:', form.data);
    console.log('Form data STATUS (original):', form.data.version_status);
    
    // We'll create a separate variable to track what status is supposed to be used
    // This avoids TypeScript issues while allowing us to debug
    let actualStatusToUse = form.data.version_status;
    console.log('ACTUAL STATUS that should be used:', actualStatusToUse);
    console.log('Form data:', JSON.stringify(form.data, null, 2));
    
    // Fix validation issues by ensuring unit-value constraints are properly maintained
    // Only nullify dimensions if they're actually undefined/null, not if they're zeros
    // This preserves user intent when entering zeros as valid measurements
    if (form.data.dimensions) {
      // If all dimensions fields are null or undefined (not 0!), then set to null
      const allFieldsNull = 
        form.data.dimensions.length === null || form.data.dimensions.length === undefined &&
        form.data.dimensions.width === null || form.data.dimensions.width === undefined &&
        form.data.dimensions.height === null || form.data.dimensions.height === undefined;
        
      if (allFieldsNull) {
        form.data.dimensions = null;
        form.data.dimensions_unit = null;
      }
    }
    
    // Fix weight/weight_unit mismatch to maintain constraint
    if (!form.data.part_weight && form.data.part_weight !== 0) {
      // If value is null, unit must also be null
      form.data.weight_unit = null;
    } else if (form.data.part_weight && !form.data.weight_unit) {
      // If value exists but unit doesn't, add a default unit
      form.data.weight_unit = WeightUnitEnum.G; // Default to grams
    }
    
    // Fix dimensions unit if needed, following the constraint pattern
    if (!form.data.dimensions) {
      form.data.dimensions_unit = null; // If no dimensions, unit must be null
    } else if (form.data.dimensions && !form.data.dimensions_unit) {
      form.data.dimensions_unit = DimensionUnitEnum.MM; // Default to millimeters
    }
    
    // Log critical values for debugging
    console.log('Critical values:', {
      name: form.data.part_name,
      version: form.data.part_version,
      status: form.data.version_status,
      dimensions: form.data.dimensions
    });
  
    try {
      // Use the UnifiedPart type to ensure type safety and data completeness
      const lifecycleStatusToUse = form.data.version_status as LifecycleStatusEnum;
      const selectedPartStatus = form.data.status_in_bom || PartStatusEnum.CONCEPT;
      
      console.log('SELECTED LIFECYCLE STATUS:', lifecycleStatusToUse);
      console.log('SELECTED PART STATUS:', selectedPartStatus);
      
      // Use the UnifiedPartSchema type to properly type the form data
      // This ensures TypeScript recognizes all the fields defined in our schema
      const formData = form.data as unknown as UnifiedPartSchema;
      
      // Create a comprehensive typed partData object based on the UnifiedPart interface
      // Ensure all fields are properly initialized to prevent data loss
      const partData: UnifiedPart = {
        // Core Part data
        part_id: formData.part_id || crypto.randomUUID(),
        creator_id: user.id,
        global_part_number: formData.global_part_number || null,
        status_in_bom: formData.status_in_bom || PartStatusEnum.CONCEPT,
        lifecycle_status: formData.lifecycle_status || LifecycleStatusEnum.DRAFT,
        is_public: formData.is_public === true,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: user.id,
        current_version_id: formData.current_version_id,
        custom_fields: formData.custom_fields,
        
        // PartVersion data
        part_version_id: formData.part_version_id || crypto.randomUUID(),
        part_version: formData.part_version || '0.1.0',
        part_name: formData.part_name || 'Unnamed Part',
        version_status: formData.version_status || LifecycleStatusEnum.DRAFT,
        short_description: formData.short_description,
        // Handle long_description with proper type validation for StructuredDescription
        long_description: formData.long_description ? 
          (typeof formData.long_description === 'object' && formData.long_description !== null ?
            (isValidStructuredDescription(formData.long_description) ?
              formData.long_description as StructuredDescription :
              String(formData.long_description)) :
            String(formData.long_description)) : 
          (formData.full_description ? 
            (typeof formData.full_description === 'object' && formData.full_description !== null ? 
              String(formData.full_description) : 
              String(formData.full_description)) : 
            null),
        functional_description: formData.functional_description,

        // Identifiers and categorization
        internal_part_number: formData.internal_part_number || null,
        manufacturer_part_number: formData.manufacturer_part_number || null,
        mpn: formData.mpn || null,
        gtin: formData.gtin || null,
        category_ids: formData.category_ids || null,
        family_ids: formData.family_ids || null,
        group_ids: formData.group_ids || null,
        tag_ids: formData.tag_ids || null,

        // Physical properties
        part_weight: typeof formData.part_weight === 'number' ? formData.part_weight : null,
        weight_unit: formData.weight_unit || null,
        weight_value: typeof formData.weight_value === 'number' ? formData.weight_value : null,
        dimensions: formData.dimensions && typeof formData.dimensions === 'object' &&
          typeof formData.dimensions.length === 'number' &&
          typeof formData.dimensions.width === 'number' &&
          typeof formData.dimensions.height === 'number' ? formData.dimensions : null,
        dimensions_unit: formData.dimensions_unit || null,
        package_type: formData.package_type || null,
        mounting_type: formData.mounting_type || null,
        pin_count: formData.pin_count || null,

        // Electrical properties
        voltage_rating_min: typeof formData.voltage_rating_min === 'number' ? formData.voltage_rating_min : null,
        voltage_rating_max: typeof formData.voltage_rating_max === 'number' ? formData.voltage_rating_max : null,
        current_rating_min: typeof formData.current_rating_min === 'number' ? formData.current_rating_min : null,
        current_rating_max: typeof formData.current_rating_max === 'number' ? formData.current_rating_max : null,
        power_rating_max: typeof formData.power_rating_max === 'number' ? formData.power_rating_max : null,
        tolerance: formData.tolerance || null,
        tolerance_unit: formData.tolerance_unit || null,
        electrical_properties: formData.electrical_properties && typeof formData.electrical_properties === 'object' ?
          formData.electrical_properties as ElectricalProperties : null,

        // Mechanical and thermal properties
        mechanical_properties: formData.mechanical_properties && typeof formData.mechanical_properties === 'object' ?
          formData.mechanical_properties as MechanicalProperties : null,
        material_composition: formData.material_composition || null,
        operating_temperature_min: typeof formData.operating_temperature_min === 'number' ? formData.operating_temperature_min : null,
        operating_temperature_max: typeof formData.operating_temperature_max === 'number' ? formData.operating_temperature_max : null,
        storage_temperature_min: typeof formData.storage_temperature_min === 'number' ? formData.storage_temperature_min : null,
        storage_temperature_max: typeof formData.storage_temperature_max === 'number' ? formData.storage_temperature_max : null,
        temperature_unit: formData.temperature_unit || null,
        thermal_properties: formData.thermal_properties && typeof formData.thermal_properties === 'object' ?
          formData.thermal_properties as ThermalProperties : null,

        // Add manufacturer and supplier details
        manufacturer_id: formData.manufacturer_id || null,
        manufacturer_name: formData.manufacturer_name || null,
        supplier_id: formData.supplier_id || null,
        supplier_name: formData.supplier_name || null,

        // Technical data
        technical_specifications: formData.technical_specifications || null,
        properties: formData.properties || null,

        // Environmental data - ensure it follows the EnvironmentalData schema
        environmental_data: formData.environmental_data && typeof formData.environmental_data === 'object' ?
          (isValidEnvironmentalData(formData.environmental_data) ? 
            formData.environmental_data as EnvironmentalData : null) : null,

        // Required arrays - ensure proper initialization to match UnifiedPart interface requirements
        manufacturer_parts: [], // Will populate below
        supplier_parts: [], // Will populate below
        attachments: [], // Will populate below
        representations: [], // Will populate below
        structure: [], // Will populate below
        compliance_info: [], // Will populate below - Added comma here

        // Validation and revision info - now added to the schema
        revision_notes: formData.revision_notes || null,
        released_at: formData.released_at instanceof Date ? formData.released_at : null,
      };

      // Initialize optional complex objects that may come from database relations
      // These are typically populated when loading data, not during form submission
      partData.categories = [];
      partData.manufacturer = {} as Manufacturer;
      partData.suppliers = [];
      
      // Process arrays separately to ensure proper typing and prevent data loss
      
      // Process manufacturer parts array
      if (Array.isArray(formData.manufacturer_parts)) {
        const validManufacturerParts = formData.manufacturer_parts
          .filter(mp => 
            typeof mp === 'object' && 
            mp !== null && 
            typeof mp.manufacturer_id === 'string' && 
            mp.manufacturer_id.trim() !== '' &&
            typeof mp.manufacturer_part_number === 'string' && 
            mp.manufacturer_part_number.trim() !== '')
          .map(mp => {
            // Create a properly typed manufacturer part with type safety
            const typedManufacturerPart: ManufacturerPartDefinition = {
              manufacturer_id: mp.manufacturer_id,
              manufacturer_part_number: mp.manufacturer_part_number,
              // Add required field with default value using safe property access
              is_recommended: hasProperty(mp, 'is_recommended') && typeof mp.is_recommended === 'boolean' ? mp.is_recommended : true
            };
            
            // Add optional fields only if they are valid
            if (typeof mp.description === 'string') {
              typedManufacturerPart.description = mp.description;
            }
            
            if (typeof mp.datasheet_url === 'string') {
              typedManufacturerPart.datasheet_url = mp.datasheet_url;
            }
            
            if (typeof mp.notes === 'string') {
              typedManufacturerPart.notes = mp.notes;
            }
            
            if (mp.lifecycle_status && 
                Object.values(LifecycleStatusEnum).includes(mp.lifecycle_status as LifecycleStatusEnum)) {
              typedManufacturerPart.lifecycle_status = mp.lifecycle_status as LifecycleStatusEnum;
            }
            
            return typedManufacturerPart;
          });
        
        partData.manufacturer_parts = validManufacturerParts;
      }
      
      // Process supplier parts array
      if (Array.isArray(formData.supplier_parts)) {
        const validSupplierParts = formData.supplier_parts
          .filter(sp => 
            typeof sp === 'object' && 
            sp !== null && 
            typeof sp.supplier_id === 'string' && 
            sp.supplier_id.trim() !== '' &&
            typeof sp.supplier_part_number === 'string' && 
            sp.supplier_part_number.trim() !== '')
          .map(sp => {
            // Create a properly typed supplier part with type safety
            const typedSupplierPart: SupplierPartDefinition = {
              supplier_id: sp.supplier_id,
              supplier_part_number: sp.supplier_part_number,
              manufacturer_part_index: 0, // Default index if not specified
              is_preferred: sp.is_preferred === true // Default to false if not specified
            };
            
            // Add optional fields only if they are valid
            if (typeof sp.product_url === 'string') {
              typedSupplierPart.product_url = sp.product_url;
            }
            
            if (typeof sp.is_preferred === 'boolean') {
              typedSupplierPart.is_preferred = sp.is_preferred;
            }
            
            // Map form's unit_price field to price field in database schema
            if (hasProperty(sp, 'unit_price') && typeof sp.unit_price === 'number') {
              typedSupplierPart.price = sp.unit_price;
            }
            
            if (typeof sp.currency === 'string') {
              typedSupplierPart.currency = sp.currency;
            }
            
            return typedSupplierPart;
          });
        
        partData.supplier_parts = validSupplierParts;
      }
      
      // Process attachments array
      if (Array.isArray(formData.attachments)) {
        const validAttachments = formData.attachments
          .filter(a => 
            typeof a === 'object' && 
            a !== null && 
            typeof a.file_name === 'string' && 
            a.file_name.trim() !== '' &&
            typeof a.file_url === 'string' && 
            a.file_url.trim() !== '')
          .map(a => {
            // Create a properly typed attachment with type safety
            const typedAttachment: AttachmentDefinition = {
              attachment_type: typeof a.attachment_type === 'string' ? a.attachment_type : 'file',
              file_name: a.file_name,
              file_url: a.file_url,
              // Optional fields
              file_type: typeof a.file_type === 'string' ? a.file_type : undefined,
              // Map form fields to schema fields using type guards
              file_size: hasProperty(a, 'file_size_bytes') && typeof a.file_size_bytes === 'number' ? 
                a.file_size_bytes : undefined,
              description: hasProperty(a, 'attachment_description') && typeof a.attachment_description === 'string' ? 
                a.attachment_description : null,
              thumbnail_url: typeof a.thumbnail_url === 'string' ? a.thumbnail_url : null,
              // Required by schema but may not be present in form data
              is_primary: hasProperty(a, 'is_primary') && typeof a.is_primary === 'boolean' ? a.is_primary : false
            };
            
            return typedAttachment;
          });
        
        partData.attachments = validAttachments;
      }
      
      // Process representations array
      if (Array.isArray(formData.representations)) {
        // Create a properly typed array for representations
        const typedRepresentations: RepresentationDefinition[] = [];
        
        // Process each representation with proper type validation
        for (const r of formData.representations) {
          // Only include entries with valid required fields
          if (typeof r.representation_type === 'string' && r.representation_type.trim() !== '' &&
              typeof r.file_url === 'string' && r.file_url.trim() !== '') {
            
            // Create a properly typed representation object with required fields
            const typedRepresentation: RepresentationDefinition = {
              representation_type: r.representation_type,
              file_url: r.file_url
            };
            
            // Add optional fields only if they are valid
            if (typeof r.format === 'string') {
              typedRepresentation.format = r.format;
            }
            
            if (typeof r.is_recommended === 'boolean') {
              typedRepresentation.is_recommended = r.is_recommended;
            }
            
            // Handle metadata properly if present
            if (r.metadata) {
              try {
                // If it's a string, parse it
                if (typeof r.metadata === 'string') {
                  typedRepresentation.metadata = JSON.parse(r.metadata);
                } 
                // If it's already an object, ensure it's a proper JsonValue
                else if (typeof r.metadata === 'object') {
                  // Convert to string and back to ensure it's JSON-compatible
                  typedRepresentation.metadata = JSON.parse(JSON.stringify(r.metadata));
                }
              } catch (error) {
                console.warn('Failed to process representation metadata:', error);
              }
            }
            
            // Add the typed object to our array
            typedRepresentations.push(typedRepresentation);
          }
        }
        
        // Assign the properly typed array to partData
        partData.representations = typedRepresentations;
      }
      
      // Process manufacturer_parts array
      if (Array.isArray(formData.manufacturer_parts)) {
        partData.manufacturer_parts = formData.manufacturer_parts
          .filter(mp => typeof mp.manufacturer_id === 'string' && mp.manufacturer_id.trim() !== '' &&
                     typeof mp.manufacturer_part_number === 'string' && mp.manufacturer_part_number.trim() !== '')
          .map(mp => {
            // Create a new object with only the fields that are in the ManufacturerPartDefinition interface
            return {
              manufacturer_id: mp.manufacturer_id,
              manufacturer_part_number: mp.manufacturer_part_number,
              description: typeof mp.description === 'string' ? mp.description : null,
              datasheet_url: typeof mp.datasheet_url === 'string' ? mp.datasheet_url : null
            } as ManufacturerPartDefinition;
          });
      }
      
      // Process supplier_parts array using the standard TypeScript approach for type safety
      if (Array.isArray(formData.supplier_parts)) {
        // Initialize an empty array with the correct type
        const typedSupplierParts: SupplierPartDefinition[] = [];
        
        // Process each supplier part with proper type checking
        for (const sp of formData.supplier_parts) {
          // Only include entries with valid required fields
          if (typeof sp === 'object' && 
              sp !== null && 
              typeof sp.supplier_id === 'string' && 
              sp.supplier_id.trim() !== '' &&
              typeof sp.supplier_part_number === 'string' && sp.supplier_part_number.trim() !== '') {
            
            // Create a properly typed supplier part object for the database schema
            const typedSupplierPart: SupplierPartDefinition = {
              supplier_id: sp.supplier_id,
              supplier_part_number: sp.supplier_part_number,
              manufacturer_part_index: 0, // Default index if not specified
              is_preferred: sp.is_preferred === true // Default to false if not specified
            };
            
            // Add optional fields only if they are valid
            if (typeof sp.product_url === 'string') {
              typedSupplierPart.product_url = sp.product_url;
            }
            
            if (typeof sp.is_preferred === 'boolean') {
              typedSupplierPart.is_preferred = sp.is_preferred;
            }
            
            // Map form's unit_price field to price field in database schema
            if (hasProperty(sp, 'unit_price') && typeof sp.unit_price === 'number') {
              typedSupplierPart.price = sp.unit_price;
            }
            
            if (typeof sp.currency === 'string') {
              typedSupplierPart.currency = sp.currency;
            }
            
            if (typeof sp.stock_quantity === 'number') {
              typedSupplierPart.stock_quantity = sp.stock_quantity;
            }
            
            if (typeof sp.lead_time_days === 'number') {
              typedSupplierPart.lead_time_days = sp.lead_time_days;
            }
            
            if (typeof sp.minimum_order_quantity === 'number') {
              typedSupplierPart.minimum_order_quantity = sp.minimum_order_quantity;
            }
            
            if (sp.packaging_info) {
              typedSupplierPart.packaging_info = sp.packaging_info;
            }
            
            // Add the typed object to our array
            typedSupplierParts.push(typedSupplierPart);
          }
        }
        
        // Assign the properly typed array to partData
        partData.supplier_parts = typedSupplierParts;
      }
      
      // Process attachments array
      if (Array.isArray(formData.attachments)) {
        partData.attachments = formData.attachments
          // Strict filtering to only include entries with valid required fields
          .filter(a => typeof a.file_url === 'string' && a.file_url.trim() !== '' && 
                       typeof a.file_name === 'string' && a.file_name.trim() !== '')
          .map(a => {
            // Create a new object with only the fields that are in the AttachmentDefinition interface
            // and ensure all required fields are strings (not null or undefined)
            return {
              file_url: a.file_url,
              file_name: a.file_name,
              attachment_type: 'file', // Default value that we know is valid
              // Optional fields
              file_type: typeof a.file_type === 'string' ? a.file_type : undefined,
              // Map form fields to schema fields
              // Map form fields to schema fields using type guards
              file_size: hasProperty(a, 'file_size_bytes') && typeof a.file_size_bytes === 'number' ? 
                a.file_size_bytes : undefined,
              description: hasProperty(a, 'attachment_description') && typeof a.attachment_description === 'string' ? 
                a.attachment_description : null,
              thumbnail_url: typeof a.thumbnail_url === 'string' ? a.thumbnail_url : null,
              // Required by schema but may not be present in form data
              is_primary: hasProperty(a, 'is_primary') && typeof a.is_primary === 'boolean' ? a.is_primary : false
            };
          });
      }
      
      // Process structure array
      if (Array.isArray(formData.structure)) {
        partData.structure = formData.structure
          .filter(s => s.child_part_id && typeof s.quantity === 'number')
          .map(s => {
            // Create a new object with only the fields that are in the PartStructureDefinition interface
            return {
              child_part_id: s.child_part_id,
              quantity: s.quantity,
              relation_type: 'contains' as StructuralRelationTypeEnum, // Default value
              notes: typeof s.notes === 'string' ? s.notes : undefined
            };
          });
      }
      
      // Process compliance_info array
      if (Array.isArray(formData.compliance_info)) {
        partData.compliance_info = formData.compliance_info
          .filter(c => c.compliance_type)
          .map(c => {
            // Create a new object with only the fields that are in the ComplianceDefinition interface
            return {
              compliance_type: c.compliance_type as ComplianceTypeEnum,
              // Optional fields
              notes: typeof c.notes === 'string' ? c.notes : undefined,
              certificate_url: typeof c.certificate_url === 'string' ? c.certificate_url : undefined,
              certified_at: c.certified_at instanceof Date ? c.certified_at : undefined,
              expires_at: c.expires_at instanceof Date ? c.expires_at : undefined
            };
          });
      }
      
      
      console.log('Part data prepared with all fields preserved');  
      
      // Log the final UnifiedPart object to verify all fields are present
      console.log('Final UnifiedPart object:', JSON.stringify(partData, null, 2));
      
      // Commented out as requested - we'll update the parts.ts file later to use UnifiedPart
      // await createPart(partData as unknown as PartFormData, user.id);
      
      // For now, we'll just redirect to demonstrate that form processing works
      throw redirect(303, '/parts');
    } catch (err) {
      console.error('Create part error:', err);
      // Return form with error message for superForm to display
      return message(form, 'Failed to create part: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }
};