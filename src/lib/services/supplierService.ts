/**
 * Supplier Service
 * 
 * This service provides a bridge between SvelteKit actions and the core supplier module.
 * It focuses on adapting form data to the formats expected by core functions and handling
 * SvelteKit-specific concerns without duplicating core business logic.
 */
import { fail, type ActionFailure } from '@sveltejs/kit';
import { message, type SuperValidated } from 'sveltekit-superforms';
import type { JsonValue } from '$lib/types/primitive';
import type { Supplier } from '$lib/types/schemaTypes';
import { 
    getSupplierById, 
    updateSupplier,
    updateSupplierCustomFields,
    deleteSupplier
} from '$lib/core/supplier';
import { supplierActionSchema } from '$lib/schema/schema';
import { z } from 'zod';

// Type definitions for cleaner code
type SupplierForm = z.infer<typeof supplierActionSchema>;

/**
 * Convert form data to format expected by updateSupplier core function
 */
export function prepareUpdateParams(form: SuperValidated<SupplierForm>, userId: string) {
    return {
        name: form.data.supplier_name,
        description: form.data.supplier_description || undefined,
        websiteUrl: form.data.website_url || undefined,
        logoUrl: form.data.logo_url || undefined,
        contactInfo: parseJsonField(form.data.contact_info),
        updatedBy: userId
    };
}

/**
 * Safely parse a JSON string field from form data
 */
export function parseJsonField(jsonStr: string | null | undefined): Record<string, JsonValue> | undefined {
    if (!jsonStr) return undefined;
    
    try {
        if (typeof jsonStr === 'string' && jsonStr.trim()) {
            // Handle common case of HTML content errors
            if (jsonStr.trim().toLowerCase().startsWith('<!doctype')) {
                return undefined;
            }
            
            return JSON.parse(jsonStr);
        }
    } catch (e) {
        console.error('Invalid JSON format:', e);
    }
    
    return undefined;
}

/**
 * Handle supplier update with proper error handling for SvelteKit actions
 */
export async function handleSupplierUpdate(
    form: SuperValidated<SupplierForm>,
    supplierId: string,
    userId: string,
    isAdmin: boolean
): Promise<ActionFailure<{ form: SuperValidated<SupplierForm>; message?: string }> | { form: SuperValidated<SupplierForm>; message?: string }> {
    try {
        // 1. Verify permissions
        const supplier = await getSupplierById(supplierId);
        if (!supplier) {
            return fail(404, { form, message: 'Supplier not found' });
        }
        
        if (supplier.created_by !== userId && !isAdmin) {
            return fail(403, { form, message: 'You do not have permission to edit this supplier' });
        }
        
        // 2. Prepare update parameters
        const updateParams = prepareUpdateParams(form, userId);
        
        // 3. Update supplier using core function
        await updateSupplier(supplierId, updateParams);
        
        // 4. Handle custom fields if provided
        const customFields = parseJsonField(form.data.custom_fields);
        if (customFields && Object.keys(customFields).length > 0) {
            try {
                await updateSupplierCustomFields(supplierId, customFields);
            } catch (error) {
                return message(form, 'Supplier updated but custom fields update failed', { status: 500 });
            }
        }
        
        return message(form, 'Supplier updated successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error in supplier update:', error);
        return message(form, errorMessage, { status: 500 });
    }
}

/**
 * Handle supplier deletion with proper error handling for SvelteKit actions
 */
export async function handleSupplierDelete(
    supplierId: string,
    userId: string,
    isAdmin: boolean
): Promise<ActionFailure<{ message: string }> | null> {
    try {
        // 1. Verify permissions
        const supplier = await getSupplierById(supplierId);
        if (!supplier) {
            return fail(404, { message: 'Supplier not found' });
        }
        
        if (supplier.created_by !== userId && !isAdmin) {
            return fail(403, { message: 'You do not have permission to delete this supplier' });
        }
        
        // 2. Delete supplier using core function
        await deleteSupplier(supplierId);
        return null; // Success, no failure
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return fail(500, { 
            message: `Error deleting supplier: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
    }
}
