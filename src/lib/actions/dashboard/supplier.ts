// src/lib/actions/dashboard/supplier.ts
import sql from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { Supplier, User } from '$lib/types/schemaTypes';
import type { JsonValue } from '$lib/types/primitive';

// Import core functions for supplier operations
import { createSupplier, getSupplier, updateSupplier } from '$lib/core/supplier';

import { supplierSchema } from '$lib/schema/schema';
import crypto from 'crypto';

/**
 * Handles supplier creation and updating
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
        const form = await superValidate(event, zod(supplierSchema));
        console.log('\nVALIDATION RESULTS:');
        console.log('Form valid:', form.valid);
        console.log('Form data:', form.data);
        console.log('Form errors:', form.errors);
        if (!form.valid) {
            console.log('Validation failed:', form.errors);
            return fail(400, { form });
        }
        
        console.log('Validated form data:', form.data);
        
        // Check if the supplier exists in the database directly
        let existingSupplier = null;
        let supplierId = '';
        
        // Only try to look up the supplier if we have an ID to work with
        if (form.data.supplier_id && form.data.supplier_id.trim() !== '') {
            supplierId = form.data.supplier_id.trim();
            try {
                existingSupplier = await getSupplier(supplierId);
                console.log(`Checked database for supplier ${supplierId}: ${existingSupplier ? 'FOUND' : 'NOT FOUND'}`);
            } catch (error) {
                console.log(`Error checking for supplier ${supplierId}:`, error);
                // Continue with create flow if supplier lookup fails
            }
        }
        
        // Only consider it an edit if the supplier actually exists in the database
        const isEditMode = !!existingSupplier;
        console.log(`Operation mode: ${isEditMode ? 'UPDATE' : 'CREATE'}`);
        
        if (isEditMode && existingSupplier) {
            // UPDATE MODE - we've already verified the supplier exists
            
            // Check if user has permission (is the creator)
            if (existingSupplier.created_by !== user.user_id) {
                console.log(`Permission denied: User ${user.user_id} attempting to edit supplier created by ${existingSupplier.created_by}`);
                return message(form, 'You do not have permission to edit this supplier', { status: 403 });
            }
            
            console.log(`Updating supplier ${supplierId}`);
            
            try {
                // Process contact info from form data
                let contactInfo = null;
                if (form.data.contact_info) {
                    if (typeof form.data.contact_info === 'string') {
                        try {
                            contactInfo = JSON.parse(form.data.contact_info);
                        } catch (e) {
                            contactInfo = { notes: form.data.contact_info };
                        }
                    } else {
                        contactInfo = form.data.contact_info;
                    }
                }
                
                // Process custom fields from form data
                let customFields = null;
                if (form.data.custom_fields) {
                    if (typeof form.data.custom_fields === 'string') {
                        try {
                            customFields = JSON.parse(form.data.custom_fields);
                        } catch (e) {
                            customFields = {};
                        }
                    } else {
                        customFields = form.data.custom_fields;
                    }
                }
                
                // Update the supplier in the database
                const result = await sql`
                    UPDATE "Supplier" SET
                        supplier_name = ${form.data.supplier_name},
                        supplier_description = ${form.data.supplier_description || null},
                        website_url = ${form.data.website_url || null},
                        contact_info = ${contactInfo ? sql.json(contactInfo) : null},
                        logo_url = ${form.data.logo_url || null},
                        updated_by = ${user.user_id},
                        updated_at = ${new Date().toISOString()}
                    WHERE supplier_id = ${supplierId}
                    RETURNING *
                `;
                
                if (result.length > 0) {
                    // Handle custom fields if any are provided
                    if (customFields && Object.keys(customFields).length > 0) {
                        try {
                            // First delete existing custom fields
                            await sql`DELETE FROM "SupplierCustomField" WHERE supplier_id = ${supplierId}`;
                            
                            // Then add new custom fields
                            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                                if (fieldValue === null || fieldValue === undefined) continue;
                                
                                // Determine data type
                                let dataType = 'text';
                                if (typeof fieldValue === 'number') dataType = 'number';
                                else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                                else if (fieldValue instanceof Date) dataType = 'date';
                                
                                // Convert value to string
                                let stringValue;
                                if (typeof fieldValue === 'object' && fieldValue !== null) {
                                    stringValue = JSON.stringify(fieldValue);
                                } else {
                                    stringValue = String(fieldValue);
                                }
                                
                                await sql`
                                    INSERT INTO "SupplierCustomField" (
                                        supplier_id,
                                        field_name,
                                        field_value,
                                        data_type,
                                        applies_to,
                                        created_by
                                    )
                                    VALUES (
                                        ${supplierId},
                                        ${fieldName},
                                        ${stringValue},
                                        ${dataType},
                                        'supplier',
                                        ${user.user_id}
                                    )
                                `;
                            }
                        } catch (customFieldError) {
                            console.error('Error updating custom fields:', customFieldError);
                        }
                    }
                    
                    return message(form, 'Supplier updated successfully');
                } else {
                    return message(form, 'Failed to update supplier: No rows affected', { status: 500 });
                }
            } catch (error) {
                console.error('Error updating supplier:', error);
                return message(form, `Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
            }
        } else {
            // CREATE MODE
            // Generate a new UUID for the supplier ID
            const newSupplierId = crypto.randomUUID();
            console.log(`Creating new supplier with ID: ${newSupplierId} (original ID ${form.data.supplier_id ? 'not found in database' : 'not provided'})`);
            
            try {
                // Process contact info from form data
                let contactInfo = null;
                if (form.data.contact_info) {
                    if (typeof form.data.contact_info === 'string') {
                        try {
                            contactInfo = JSON.parse(form.data.contact_info);
                        } catch (e) {
                            contactInfo = { notes: form.data.contact_info };
                        }
                    } else {
                        contactInfo = form.data.contact_info;
                    }
                }
                
                // Process custom fields from form data
                let customFields = null;
                if (form.data.custom_fields) {
                    if (typeof form.data.custom_fields === 'string') {
                        try {
                            customFields = JSON.parse(form.data.custom_fields);
                        } catch (e) {
                            customFields = {};
                        }
                    } else {
                        customFields = form.data.custom_fields;
                    }
                }
                
                // First create the supplier
                const result = await sql`
                    INSERT INTO "Supplier" (
                        supplier_id, 
                        supplier_name, 
                        supplier_description, 
                        website_url, 
                        contact_info, 
                        logo_url, 
                        created_by, 
                        created_at, 
                        updated_at, 
                        updated_by
                    ) VALUES (
                        ${newSupplierId},
                        ${form.data.supplier_name},
                        ${form.data.supplier_description || null},
                        ${form.data.website_url || null},
                        ${contactInfo ? sql.json(contactInfo) : null},
                        ${form.data.logo_url || null},
                        ${user.user_id},
                        ${new Date().toISOString()},
                        ${new Date().toISOString()},
                        ${user.user_id}
                    )
                    RETURNING *
                `;
                
                if (result.length > 0) {
                    // Handle custom fields if any are provided
                    if (customFields && Object.keys(customFields).length > 0) {
                        try {
                            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                                if (fieldValue === null || fieldValue === undefined) continue;
                                
                                // Determine data type
                                let dataType = 'text';
                                if (typeof fieldValue === 'number') dataType = 'number';
                                else if (typeof fieldValue === 'boolean') dataType = 'boolean';
                                else if (fieldValue instanceof Date) dataType = 'date';
                                
                                // Convert value to string
                                let stringValue;
                                if (typeof fieldValue === 'object' && fieldValue !== null) {
                                    stringValue = JSON.stringify(fieldValue);
                                } else {
                                    stringValue = String(fieldValue);
                                }
                                
                                await sql`
                                    INSERT INTO "SupplierCustomField" (
                                        supplier_id,
                                        field_name,
                                        field_value,
                                        data_type,
                                        applies_to,
                                        created_by
                                    )
                                    VALUES (
                                        ${newSupplierId},
                                        ${fieldName},
                                        ${stringValue},
                                        ${dataType},
                                        'supplier',
                                        ${user.user_id}
                                    )
                                `;
                            }
                        } catch (customFieldError) {
                            console.error('Error creating custom fields:', customFieldError);
                        }
                    }
                    
                    return message(form, 'Supplier created successfully');
                } else {
                    return message(form, 'Failed to create supplier: No rows returned', { status: 500 });
                }
            } catch (error) {
                console.error('Error creating supplier:', error);
                return message(form, `Failed to create supplier: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
            }
        }
    
    } catch (error) {
        console.error('Error processing supplier form:', error);
        return message(
            await superValidate(event, zod(supplierSchema)), 
            `Failed to save supplier: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { status: 500 }
        );
    }
}
