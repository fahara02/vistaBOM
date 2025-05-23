// src/lib/actions/dashboard/supplier.ts
import { fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types/schemaTypes';
import { z } from 'zod';
import type { JsonValue } from '$lib/types/primitive';
import { 
    getSupplierById, 
    createSupplier, 
    updateSupplier,
    updateSupplierCustomFields,
    createSupplierWithCustomFields
} from '$lib/core/supplier';
import { supplierActionSchema } from '$lib/schema/schema';

// Define the type based on our action schema
type SupplierFormData = z.infer<typeof supplierActionSchema>;

// Type for custom fields to ensure proper handling
type CustomFields = Record<string, JsonValue>;

/**
 * Handles supplier creation, updating, and deletion
 */
export async function supplierAction(event: RequestEvent) {
    console.log('\n\n=================== SUPPLIER ACTION CALLED ===================');
    
    // Access the user from locals
    const user = event.locals.user as User | null;
    if (!user) {
        console.log('Authentication failed: No user in locals');
        return fail(401, { message: 'You must be logged in to manage suppliers' });
    }
    console.log('Authenticated user:', user.user_id);

    try {
        // Validate form data using SuperForm with our schema
        const form = await superValidate(event, zod(supplierActionSchema));
        
        // Detailed logging for debugging validation issues
        console.log('\nVALIDATION RESULTS:');
        console.log('Form valid:', form.valid);
        console.log('Form data:', form.data);
        console.log('Form errors:', form.errors);

        // If validation fails, check if we have the minimum required data
        if (!form.valid) {
            console.log('Validation failed:', form.errors);
            
            // Check if we have the required supplier_name
            if (form.data.supplier_name && form.data.supplier_name.trim() !== '') {
                console.log('Found valid supplier_name, proceeding with manual validation');
                
                // Ensure the name is properly trimmed
                form.data.supplier_name = form.data.supplier_name.trim();
                
                // Mark the form as valid since we have the minimum required field
                form.valid = true;
            } else {
                console.log('Required fields missing, returning validation error');
                return fail(400, { form });
            }
        }
        
        console.log('Validated form data:', form.data);
        
        // Check if the supplier exists in the database directly
        let existingSupplier = null;
        let supplierId = '';
        
        // Only try to look up the manufacturer if we have an ID to work with
        if (form.data.supplier_id && form.data.supplier_id.trim() !== '') {
            supplierId = form.data.supplier_id.trim();
            try {
                existingSupplier = await getSupplierById(supplierId);
                console.log(`Checked database for manufacturer ${supplierId}: ${existingSupplier ? 'FOUND' : 'NOT FOUND'}`);
            } catch (error) {
                console.log(`Error checking for manufacturer ${supplierId}:`, error);
                // Continue with create flow if manufacturer lookup fails
            }
        }
        
        // Only consider it an edit if the manufacturer actually exists in the database
        const isEditMode = !!existingSupplier;
        console.log(`Operation mode: ${isEditMode ? 'UPDATE' : 'CREATE'}`);
        
        if (isEditMode && existingSupplier) {
            // UPDATE MODE - we've already verified the manufacturer exists
            
            // Check if user has permission (is the creator)
            if (existingSupplier.created_by !== user.user_id) {
                console.log(`Permission denied: User ${user.user_id} attempting to edit manufacturer created by ${existingSupplier.created_by}`);
                return message(form, 'You do not have permission to edit this manufacturer', { status: 403 });
            }
            
            console.log(`Updating supplier ${supplierId}`);
            
            try {
                // Process contact info from form data
                let contactInfo = null;
                if (form.data.contact_info) {
                    if (typeof form.data.contact_info === 'string') {
                        try {
                            // Only try to parse if it looks like JSON
                            if (form.data.contact_info.trim().startsWith('{')) {
                                contactInfo = JSON.parse(form.data.contact_info);
                            } else {
                                // If not JSON, treat as plain text
                                contactInfo = { notes: form.data.contact_info };
                            }
                        } catch (e) {
                            console.error('Error parsing contact info:', e);
                            contactInfo = { notes: form.data.contact_info };
                        }
                    } else {
                        contactInfo = form.data.contact_info;
                    }
                }
                console.log('Processed contact info:', contactInfo);
                
                // Process custom fields from form data
                let customFields: CustomFields = {};
                if (form.data.custom_fields) {
                    if (typeof form.data.custom_fields === 'string') {
                        try {
                            // Only try to parse if it looks like JSON
                            if (form.data.custom_fields.trim().startsWith('{')) {
                                customFields = JSON.parse(form.data.custom_fields);
                            } else if (form.data.custom_fields.trim() === '') {
                                // Empty string should result in empty object
                                customFields = {};
                            } else {
                                // If not JSON and not empty, log the issue
                                console.error('Custom fields is not valid JSON:', form.data.custom_fields);
                                customFields = {};
                            }
                        } catch (e) {
                            console.error('Error parsing custom fields:', e);
                            customFields = {};
                        }
                    } else if (typeof form.data.custom_fields === 'object') {
                        customFields = form.data.custom_fields as CustomFields;
                    }
                }
                console.log('Processed custom fields:', customFields);
                
                // Use core functions to update the supplier
                // First update the basic supplier information using the updateSupplier function
                await updateSupplier(
                    supplierId,
                    {
                        name: form.data.supplier_name,
                        description: form.data.supplier_description || undefined,
                        websiteUrl: form.data.website_url || undefined,
                        logoUrl: form.data.logo_url || undefined,
                        contactInfo: contactInfo || undefined,
                        updatedBy: user.user_id
                    }
                );
                
                // Then update the custom fields if provided
                if (customFields && Object.keys(customFields).length > 0) {
                    try {
                        await updateSupplierCustomFields(supplierId, customFields);
                    } catch (customFieldError) {
                        console.error('Error updating custom fields:', customFieldError);
                        // Don't fail the main operation if custom fields update fails
                    }
                }
                
                return message(form, 'Supplier updated successfully');
            } catch (updateError) {
                console.error('Error updating supplier:', updateError);
                return message(form, `Error updating supplier: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`, { status: 500 });
            }
        } else {
            // CREATE MODE - creating a new supplier
            console.log('Creating new supplier with name:', form.data.supplier_name);
            
            try {
                // Process contact info for database storage
                let contactInfo = null;
                if (form.data.contact_info) {
                    if (typeof form.data.contact_info === 'string') {
                        try {
                            // Only try to parse if it looks like JSON
                            if (form.data.contact_info.trim().startsWith('{')) {
                                contactInfo = JSON.parse(form.data.contact_info);
                            } else if (form.data.contact_info.trim() === '') {
                                // Empty string should result in null
                                contactInfo = null;
                            } else {
                                // If not JSON, treat as plain text
                                contactInfo = { notes: form.data.contact_info };
                            }
                        } catch (e) {
                            console.error('Error parsing contact info:', e);
                            contactInfo = { notes: form.data.contact_info };
                        }
                    } else {
                        contactInfo = form.data.contact_info;
                    }
                }
                console.log('Processed contact info for new supplier:', contactInfo);
                
                // Process custom fields for database storage
                let customFields: CustomFields = {};
                if (form.data.custom_fields) {
                    if (typeof form.data.custom_fields === 'string') {
                        try {
                            // Only try to parse if it looks like JSON
                            if (form.data.custom_fields.trim().startsWith('{')) {
                                customFields = JSON.parse(form.data.custom_fields);
                            } else if (form.data.custom_fields.trim() === '') {
                                // Empty string should result in empty object
                                customFields = {};
                            } else {
                                // If not JSON and not empty, log the issue
                                console.error('Custom fields is not valid JSON:', form.data.custom_fields);
                                customFields = {};
                            }
                        } catch (e) {
                            console.error('Error parsing custom fields:', e);
                            customFields = {};
                        }
                    } else if (typeof form.data.custom_fields === 'object') {
                        customFields = form.data.custom_fields as CustomFields;
                    }
                }
                console.log('Processed custom fields for new supplier:', customFields);
                
                // Create a custom_fields_json string for the createSupplierWithCustomFields function
                const custom_fields_json = Object.keys(customFields).length > 0 ? 
                    JSON.stringify(customFields) : '';
                
                // Use the core function to create the supplier with custom fields in a single transaction
                await createSupplierWithCustomFields({
                    supplier_name: form.data.supplier_name,
                    supplier_description: form.data.supplier_description || undefined,
                    website_url: form.data.website_url || undefined,
                    logo_url: form.data.logo_url || undefined,
                    contact_info: contactInfo ? JSON.stringify(contactInfo) : undefined,
                    custom_fields_json,
                    created_by: user.user_id
                });
                
                return message(form, 'Supplier created successfully');
            } catch (createError) {
                console.error('Error creating supplier:', createError);
                return message(form, `Failed to createsupplier: ${createError instanceof Error ? createError.message : 'Unknown error'}`, { status: 500 });
            }
        }
    } catch (error) {
        console.error('Error processing supplier form:', error);
        return message(
            await superValidate(event, zod(supplierActionSchema)), 
            `Failed to process supplier: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { status: 500 }
        );
    }
}

