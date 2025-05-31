// src/lib/actions/dashboard/part.ts
import sql from '$lib/server/db/index';
import crypto from 'crypto';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate, type SuperValidated } from 'sveltekit-superforms/server';
import { fail, type RequestEvent, type ActionFailure } from '@sveltejs/kit';
import type {  ManufacturerPart, SupplierPart, PartRepresentation, PartAttachment, UnifiedPart, PartVersionTag, PartTag, Tag, User, PartWithCurrentVersion, PartVersion, ManufacturerPartDefinition, SupplierPartDefinition, AttachmentDefinition, RepresentationDefinition, ElectricalProperties, MechanicalProperties, ThermalProperties, EnvironmentalData, StructuredDescription } from '$lib/types/schemaTypes';
import type { UnifiedPartSchema } from '$lib/schema/unifiedPartSchema';
import { createPartSchema } from '$lib/schema/schema';
import { unifiedPartSchema } from '$lib/schema/unifiedPartSchema';
import { LifecycleStatusEnum, PartStatusEnum } from '$lib/types/enums';
import { createUnifiedPart, updateUnifiedPart, getPartWithCurrentVersion, isValidEnvironmentalData, isValidStructuredDescription } from '$lib/core/parts';

import { z } from 'zod';



/**
 * Helper function to safely parse JSON data with proper flattening of nested arrays
 * @param data String or array to parse
 * @param defaultValue Default value if parsing fails
 */
function safeParseJson<T>(data: string | unknown, defaultValue: T | any[] = []): T | any[] {
    // If it's already an array, just return it
    if (Array.isArray(data)) {
        return data;
    }
    
    // If it's not a string, return the default value
    if (typeof data !== 'string') {
        return defaultValue;
    }
    
    try {
        // Parse the JSON string
        const parsed = JSON.parse(data);
        
        // Return the parsed data
        return parsed;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return defaultValue;
    }
}

/**
 * Helper function to ensure manufacturer parts have the correct structure
 * @param parts Array of manufacturer parts from form data
 */
function normalizeManufacturerParts(parts: ManufacturerPart[]): ManufacturerPartDefinition[] {
    return parts.map(mp => ({
        manufacturer_id: mp.manufacturer_id || '',
        manufacturer_part_number: mp.manufacturer_part_number || '',
        is_recommended: false, // Default value since is_recommended doesn't exist on ManufacturerPart
        lifecycle_status: null
    }));
}

/**
 * Helper function to ensure supplier parts have the correct structure
 * @param parts Array of supplier parts from form data
 */
function normalizeSupplierParts(parts: SupplierPart[]): Array<{
    supplier_id: string;
    supplier_part_number: string;
    manufacturer_part_index: number;
    is_preferred: boolean;
    price?: number;
    unit_price?: number;
    currency?: string;
    stock_quantity?: number;
    lead_time_days?: number;
    minimum_order_quantity?: number;
    product_url?: string | null;
}> {
    return parts.map((sp, index) => ({
        supplier_id: sp.supplier_id || '',
        // Ensure supplier_part_number is always a string
        supplier_part_number: sp.supplier_part_number || '',
        lead_time_days: typeof sp.lead_time_days === 'number' ? sp.lead_time_days : undefined,
        minimum_order_quantity: typeof sp.min_order_quantity === 'number' ? sp.min_order_quantity : undefined,
        manufacturer_part_index: index, // Use the index as manufacturer_part_index
        is_preferred: false, // Default value for is_preferred
        price: undefined,
        unit_price: undefined,
        currency: undefined,
        stock_quantity: undefined,
        product_url: null
    }));
}

/**
 * Helper function to normalize part tags
 * @param tags Array of part tags from form data
 */
function normalizePartTags(tags: Tag[]): Tag[] {
    // Ensure we're handling a proper array
    if (!Array.isArray(tags)) return [];
    
    return tags.map(tag => ({
        tag_id: tag.tag_id || crypto.randomUUID(),
        tag_name: tag.tag_name || '',
        tag_description: tag.tag_description || null,
        created_by: tag.created_by || '',
        created_at: tag.created_at || new Date(),
        updated_by: tag.updated_by || '',
        updated_at: tag.updated_at || new Date(),
        deleted_by: tag.deleted_by || '',
        deleted_at: tag.deleted_at || null,
        is_deleted: tag.is_deleted === true
    }));
}

/**
 * Helper function to normalize part version tags
 * @param tags Array of part version tags from form data
 */
function normalizePartVersionTags(tags: PartVersionTag[] | PartVersionTag[][]): PartVersionTag[] {
    // Make sure we're handling a proper array
    if (!Array.isArray(tags)) return [];
    
    // Handle case where tags is actually a nested array (PartVersionTag[][]) 
    if (tags.length > 0 && Array.isArray(tags[0])) {
        // It's a nested array, we'll process the first inner array
        return normalizePartVersionTags(tags[0] as PartVersionTag[]);
    }
    
    // Now we know tags is a PartVersionTag[]
    return (tags as PartVersionTag[]).map(tag => ({
        part_version_tag_id: tag.part_version_tag_id || crypto.randomUUID(),
        part_version_id: tag.part_version_id || '',
        tag_name: tag.tag_name || '',
        tag_value: tag.tag_value || null,
        tag_category: tag.tag_category || null,
        tag_color: tag.tag_color || null,
        created_by: tag.created_by || '',
        created_at: tag.created_at || new Date()
    }));
}

/**
 * Helper function to normalize attachments
 * @param attachments Array of attachments from form data
 */
function normalizeAttachments(attachments: PartAttachment[]): Array<{
    file_url: string;
    attachment_type: string;
    attachment_index: number;
    file_name: string;
    is_primary: boolean;
    thumbnail_url?: string | null;
    description?: string | null;
    file_size?: number;
    file_type?: string;
    upload_date?: Date;
    uploaded_by?: string;
}> {
    // Ensure we're handling a proper array
    if (!Array.isArray(attachments)) return [];
    
    return attachments.map((att, index) => ({
        attachment_type: 'DOCUMENT', // Default value as it doesn't exist in PartAttachment
        attachment_index: index, // Use the array index as attachment_index
        file_name: att.file_name || '',
        file_url: att.file_path || '',
        file_size: att.file_size_bytes,
        file_type: att.file_type || '',
        description: att.description || null,
        thumbnail_url: null,
        upload_date: att.upload_date || new Date(),
        uploaded_by: att.uploaded_by || '',
        is_primary: Boolean(att.is_primary) || false
    }));
}

/**
 * Helper function to normalize representations
 * @param representations Array of representations from form data
 */
function normalizeRepresentations(representations: PartRepresentation[]): Array<{
    file_url: string;
    is_primary: boolean;
    representation_type: string;
    format?: string;
    thumbnail_url?: string;
    is_recommended?: boolean;
    file_path?: string;
    preview_url?: string;
    metadata?: any;
}> {
    // Ensure we're handling a proper array
    if (!Array.isArray(representations)) return [];
    
    return representations.map((rep, index) => ({
        representation_type: rep.representation_type || 'MODEL',
        format: rep.file_format || undefined,
        file_url: rep.file_path || '',
        file_path: rep.file_path || undefined,
        thumbnail_url: rep.thumbnail_path || undefined,
        is_primary: Boolean(rep.is_primary) || false,
        is_recommended: false,
        preview_url: undefined,
        metadata: null
    }));
}

/**
 * Process part form submission
 */
export async function partAction(event: RequestEvent): Promise<{ form: SuperValidated<UnifiedPartSchema>; success?: boolean; message?: string; part_id?: string } | ActionFailure<{ form: SuperValidated<UnifiedPartSchema> }>> {
    const { request, locals } = event;
    const user = locals.user as User | null;
    if (!user) {
        // Create a dummy form for the failure case
        const dummyForm = await superValidate(zod(unifiedPartSchema));
        return fail(401, { form: dummyForm, message: 'You must be logged in to create/edit a part' });
    }
    
    // Get the form data to determine if this is an edit operation
    const formData = await event.request.formData();
    const partId = formData.get('part_id');
    
    // More robust check for edit mode - ensure part_id is a valid non-empty string
    // that doesn't match any of our sentinel values
    const isEditMode = Boolean(partId) && 
                   typeof partId === 'string' && 
                   partId.trim().length > 0 && 
                   partId !== 'undefined' && 
                   partId !== 'null' &&
                   partId !== '';
    
    // Create a new schema for edit operations that includes part_id
    // We use a separate schema for part actions that includes part_id and fixes released_at validation
    const partActionSchema = z.object({
        ...createPartSchema._def.schema.shape, // Access the underlying schema inside ZodEffects
        part_id: z.string().optional(),
        // Fix released_at validation by using a custom preprocessor
        // Override the released_at field to be more lenient in validation
        released_at: z.union([
            z.date(),
            z.string().transform(val => {
                try {
                    return new Date(val);
                } catch {
                    return null;
                }
                return null; // Add return statement to satisfy TypeScript
            }),
            z.null(),
            z.undefined()
        ]).optional().nullable()
    });
    
    // Validate form data using the unified part schema to ensure type compatibility
    const form = await superValidate(formData, zod(unifiedPartSchema));
    
    if (!form.valid) {
        console.error('Part validation failed:', form.errors);
        // Return a properly typed error message
        return fail(400, { 
            form, 
            message: 'Form validation failed. Please check your inputs.'
        });
    }
    
    try {
        console.log('Form data after validation:', form.data);
        
        // Create a properly typed UnifiedPart object from form data
        // Use UnifiedPartSchema to ensure type compatibility with the form validation
        const unifiedPartData: UnifiedPartSchema = {
            // Core Part data
            part_id: isEditMode && partId ? partId.toString() : crypto.randomUUID(),
            creator_id: user.user_id,
            global_part_number: form.data.global_part_number || null,
            status_in_bom: form.data.status_in_bom || PartStatusEnum.CONCEPT,
            lifecycle_status: form.data.version_status || LifecycleStatusEnum.DRAFT, // Using version_status as lifecycle_status
            is_public: form.data.is_public === true,
            created_at: new Date(),
            updated_at: new Date(),
            updated_by: user.user_id,
            current_version_id: isEditMode ? partId?.toString() : undefined, // Only set for edit mode
            custom_fields: form.data.custom_fields,
            
            // PartVersion data
            part_version_id: form.data.part_version_id || crypto.randomUUID(),
            part_version: form.data.part_version || '0.1.0',
            part_name: form.data.part_name || 'Unnamed Part',
            version_status: form.data.version_status || LifecycleStatusEnum.DRAFT,
            short_description: form.data.short_description,
            // Handle long_description with proper type validation for StructuredDescription
            long_description: form.data.long_description ? 
              (typeof form.data.long_description === 'object' && form.data.long_description !== null ?
                (isValidStructuredDescription(form.data.long_description) ?
                  {
                    sections: Array.isArray(form.data.long_description.sections) 
                      ? form.data.long_description.sections.map((s: any) => ({ 
                          title: s.title || undefined,
                          content: s.content || ''
                        }))
                      : [],
                    formatted_text: form.data.long_description.formatted_text || undefined
                  } :
                  String(form.data.long_description)) :
                String(form.data.long_description)) : null,
            functional_description: form.data.functional_description,
            
            // Identifiers and categorization
            internal_part_number: form.data.internal_part_number || null,
            manufacturer_part_number: form.data.manufacturer_part_number || null,
            mpn: form.data.mpn || null,
            gtin: form.data.gtin || null,
            category_ids: form.data.category_ids || null,
            family_ids: form.data.family_ids || null,
            group_ids: form.data.group_ids || null,
            tag_ids: form.data.tag_ids || null,
            
            // Physical properties
            part_weight: typeof form.data.part_weight === 'number' ? form.data.part_weight : null,
            weight_unit: form.data.weight_unit || null,
            weight_value: typeof form.data.weight_value === 'number' ? form.data.weight_value : null,
            dimensions: form.data.dimensions && typeof form.data.dimensions === 'object' &&
              typeof form.data.dimensions.length === 'number' &&
              typeof form.data.dimensions.width === 'number' &&
              typeof form.data.dimensions.height === 'number' ? form.data.dimensions : null,
            dimensions_unit: form.data.dimensions_unit || null,
            package_type: form.data.package_type || null,
            mounting_type: form.data.mounting_type || null,
            pin_count: form.data.pin_count || null,
            
            // Electrical properties
            voltage_rating_min: typeof form.data.voltage_rating_min === 'number' ? form.data.voltage_rating_min : null,
            voltage_rating_max: typeof form.data.voltage_rating_max === 'number' ? form.data.voltage_rating_max : null,
            current_rating_min: typeof form.data.current_rating_min === 'number' ? form.data.current_rating_min : null,
            current_rating_max: typeof form.data.current_rating_max === 'number' ? form.data.current_rating_max : null,
            power_rating_max: typeof form.data.power_rating_max === 'number' ? form.data.power_rating_max : null,
            tolerance: form.data.tolerance || null,
            tolerance_unit: form.data.tolerance_unit || null,
            electrical_properties: form.data.electrical_properties && typeof form.data.electrical_properties === 'object' ?
              form.data.electrical_properties as ElectricalProperties : null,
            
            // Mechanical and thermal properties
            mechanical_properties: form.data.mechanical_properties && typeof form.data.mechanical_properties === 'object' ?
              form.data.mechanical_properties as MechanicalProperties : null,
            material_composition: form.data.material_composition || null,
            operating_temperature_min: typeof form.data.operating_temperature_min === 'number' ? form.data.operating_temperature_min : null,
            operating_temperature_max: typeof form.data.operating_temperature_max === 'number' ? form.data.operating_temperature_max : null,
            storage_temperature_min: typeof form.data.storage_temperature_min === 'number' ? form.data.storage_temperature_min : null,
            storage_temperature_max: typeof form.data.storage_temperature_max === 'number' ? form.data.storage_temperature_max : null,
            temperature_unit: form.data.temperature_unit || null,
            thermal_properties: form.data.thermal_properties && typeof form.data.thermal_properties === 'object' ?
              form.data.thermal_properties as ThermalProperties : null,
            
            // Add manufacturer and supplier details
            manufacturer_id: form.data.manufacturer_id || null,
            manufacturer_name: form.data.manufacturer_name || null,
            supplier_id: form.data.supplier_id || null,
            supplier_name: form.data.supplier_name || null,
            
            // Environmental data - ensure it follows the EnvironmentalData schema
            environmental_data: form.data.environmental_data && typeof form.data.environmental_data === 'object' ?
              (isValidEnvironmentalData(form.data.environmental_data) ? 
                form.data.environmental_data as EnvironmentalData : null) : null,
                
            // Technical data
            technical_specifications: form.data.technical_specifications || null,
            properties: form.data.properties || null,
            
            // Required arrays - ensure proper initialization to match UnifiedPart interface requirements
            manufacturer_parts: [], // Will populate below
            supplier_parts: [], // Will populate below
            attachments: [], // Will populate below
            representations: [], // Will populate below
            structure: [], // Will populate below
            compliance_info: [], // Will populate below
            
            // Required tags arrays
            part_tags: [],
            part_version_tags: [],
            
            // Alias fields - full_description is an alias for long_description using the correct StructuredDescription interface
            full_description: form.data.long_description ? 
              (typeof form.data.long_description === 'object' && form.data.long_description !== null ?
                (isValidStructuredDescription(form.data.long_description) ?
                  form.data.long_description as StructuredDescription :
                  String(form.data.long_description)) :
                String(form.data.long_description)) : null,
            
            // Validation and revision info
            revision_notes: form.data.revision_notes || null,
            released_at: form.data.released_at instanceof Date ? form.data.released_at : null
        };
       
        console.log('Created UnifiedPart data object for schema validation');
        
        // We'll now process any arrays and complex objects from the form data
        // and add them to our unifiedPartData object
        
        // Get the original form data to handle arrays and JSON fields that may not be
        // properly parsed by superforms
        const formDataEntries = form.data;
        
        // Handle category IDs (string or array)
        if (formDataEntries.category_ids) {
            let categoryIds: string[];
            const categoryIdsValue = formDataEntries.category_ids;
            
            if (typeof categoryIdsValue === 'string') {
                // Convert comma-separated string to array
                categoryIds = categoryIdsValue.split(',').map((id: string) => id.trim());
            } else if (Array.isArray(categoryIdsValue)) {
                categoryIds = categoryIdsValue as string[];
            } else {
                categoryIds = [];
            }
            
            // Update the category_ids in unifiedPartData
            unifiedPartData.category_ids = categoryIds.join(',');
        }

        // Process manufacturer parts if available
        if (formDataEntries.manufacturer_parts) {
            // Ensure we're parsing to a flat array
            const manufacturerPartsRaw = safeParseJson<ManufacturerPart[]>(formDataEntries.manufacturer_parts);
            const manufacturerParts = Array.isArray(manufacturerPartsRaw) ? manufacturerPartsRaw : [];
            // Convert to proper type with explicit non-null assertion
            unifiedPartData.manufacturer_parts = normalizeManufacturerParts(manufacturerParts);
        }

        // Process supplier parts if available
        if (formDataEntries.supplier_parts) {
            // Safely parse supplier parts array
            const supplierPartsRaw = safeParseJson<SupplierPart[]>(formDataEntries.supplier_parts);
            const supplierParts = Array.isArray(supplierPartsRaw) ? supplierPartsRaw : [];
            unifiedPartData.supplier_parts = normalizeSupplierParts(supplierParts);
        }

        // Process part tags if available
        if (formDataEntries.part_tags) {
            // Parse and flatten nested arrays if needed
            const partTagsRaw = safeParseJson<any[]>(formDataEntries.part_tags);
            let partTags: any[] = [];
            
            if (Array.isArray(partTagsRaw)) {
                if (partTagsRaw.length > 0 && Array.isArray(partTagsRaw[0])) {
                    // It's a nested array, flatten it
                    partTags = partTagsRaw[0];
                } else {
                    // It's already a flat array
                    partTags = partTagsRaw;
                }
            }
            
            unifiedPartData.part_tags = normalizePartTags(partTags);
        }
        
        // Process part version tags if available
        if (formDataEntries.part_version_tags) {
            // Parse and flatten nested arrays if needed
            const versionTagsRaw = safeParseJson<PartVersionTag[]>(formDataEntries.part_version_tags);
            
            // normalizePartVersionTags now handles both flat and nested arrays directly
            if (Array.isArray(versionTagsRaw)) {
                unifiedPartData.part_version_tags = normalizePartVersionTags(versionTagsRaw);
            } else {
                unifiedPartData.part_version_tags = [];
            }
        }
        
        // Process attachments if available
        if (formDataEntries.attachments) {
            // Parse and flatten nested arrays if needed
            const attachmentsRaw = safeParseJson<PartAttachment[]>(formDataEntries.attachments);
            let attachments: PartAttachment[] = [];
            
            if (Array.isArray(attachmentsRaw)) {
                if (attachmentsRaw.length > 0 && Array.isArray(attachmentsRaw[0])) {
                    // It's a nested array, flatten it
                    attachments = attachmentsRaw[0];
                } else {
                    // It's already a flat array
                    attachments = attachmentsRaw;
                }
            }
            
            unifiedPartData.attachments = normalizeAttachments(attachments);
        }
        
        // Process representations if available
        if (formDataEntries.representations) {
            // Parse and flatten nested arrays if needed
            const representationsRaw = safeParseJson<PartRepresentation[]>(formDataEntries.representations);
            let representations: PartRepresentation[] = [];
            
            if (Array.isArray(representationsRaw)) {
                if (representationsRaw.length > 0 && Array.isArray(representationsRaw[0])) {
                    // It's a nested array, flatten it
                    representations = representationsRaw[0];
                } else {
                    // It's already a flat array
                    representations = representationsRaw;
                }
            }
            
            unifiedPartData.representations = normalizeRepresentations(representations);
        }
        
        // Validate the unified part data against our schema
        const validationResult = unifiedPartSchema.safeParse(unifiedPartData);
        if (!validationResult.success) {
            console.error('UnifiedPart validation errors:', validationResult.error);
            return message(form, `Validation errors: ${validationResult.error.message}`, { status: 400 });
        }
        
        // Fetch existing part if in edit mode
        let existingPart: PartWithCurrentVersion | null = null;
        let existingVersion: PartVersion | null = null;
        if (isEditMode) {
            try {
                // First, verify the part exists
                const partResult = await getPartWithCurrentVersion(partId as string);
                
                if (partResult) {
                    // getPartWithCurrentVersion returns an object with part and currentVersion properties
                    existingPart = partResult.part;
                    existingVersion = partResult.currentVersion;
                    // Access property from form.data instead since part_name doesn't exist on PartWithCurrentVersion
                    console.log('Found existing part to edit:', existingPart.part_id, form.data.part_name);
                }
            } catch (err) {
                console.error('Error fetching part for edit:', err);
            }
        }

        try {
            if (isEditMode && existingPart && existingVersion) {
                // For updates, version number should increment from the current version
                // Parse current version and increment patch number
                const versionParts = existingVersion.part_version.split('.');
                const major = parseInt(versionParts[0] || '0', 10);
                const minor = parseInt(versionParts[1] || '0', 10);
                const patch = parseInt(versionParts[2] || '0', 10) + 1;
                
                unifiedPartData.part_version = `${major}.${minor}.${patch}`;
                
                // Call updateUnifiedPart with partId as the first parameter
                // We need to ensure all required fields are present and properly typed
                const partData = {
                    ...unifiedPartData,
                    part_id: existingPart.part_id, // Ensure part_id is set to the existing part ID
                    creator_id: existingPart.creator_id || user.user_id, // Preserve creator_id
                    current_version_id: existingPart.current_version_id // Preserve current_version_id
                };
                
                // Update existing part
                // Use proper type casting through unknown to handle tag type differences
                const { part, version } = await updateUnifiedPart(partId as string, partData as unknown as UnifiedPart, user.user_id);
                
                return { 
                    form,
                    success: true,
                    message: `Successfully updated part: ${form.data.part_name}`,
                    part_id: part.part_id
                };
            } else {
                // Create a new part
                // Get the final properly typed data for createUnifiedPart
                // We need to cast to UnifiedPart to satisfy the function's type requirements
                const partData = {
                    ...unifiedPartData,
                    part_id: unifiedPartData.part_id || crypto.randomUUID() // Ensure part_id is always set
                };
                
                // Properly cast to UnifiedPart through unknown first to handle tag type differences
                const { part, version } = await createUnifiedPart(partData as unknown as UnifiedPart, user.user_id);
                
                return { 
                    form,
                    success: true,
                    message: `Successfully created part: ${form.data.part_name}`,
                    part_id: part.part_id
                };
            }
        } catch (error) {
            console.error('Part operation error:', error);
            
            // Provide more detailed error message based on error type
            let errorMessage = isEditMode ? 'Failed to update part' : 'Failed to create part';
            
            if (error instanceof Error) {
                errorMessage += ': ' + error.message;
                
                // Check for specific error types we can handle more gracefully
                if (error.message.includes('duplicate')) {
                    errorMessage = 'A part with this name and version already exists';
                } else if (error.message.includes('not found')) {
                    errorMessage = 'Referenced entity not found';
                } else if (error.message.includes('validation')) {
                    errorMessage = 'Validation error: Please check all form fields';
                }
            } else {
                errorMessage += ': Unknown error';
            }
            
            // Return form with better error message for superForm to display
            return message(form, errorMessage, { status: 500 });
        }
    }
    catch(error){

        console.error('Part operation error:', error);
        let errorMessage = isEditMode ? 'Failed to update part' : 'Failed to create part';
        if (error instanceof Error){
            errorMessage += ': ' + error.message;
        }else {
            errorMessage += ': Unknown error';
        }
        return message(form, errorMessage, { status: 500 });
    }
}
