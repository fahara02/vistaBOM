// src/lib/actions/dashboard/part.ts
import sql from '$lib/server/db/index';
import { fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types/schemaTypes';
import { createPartSchema } from '$lib/schema/schema';
import { createPart, getPartWithCurrentVersion } from '$lib/core/parts';
import { z } from 'zod';

/**
 * Helper function to handle all optional fields consistently
 */
function processOptionalField<T>(value: T): null | T {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return null;
    }
    
    // Handle 'null' string value that may come from form data
    if (typeof value === 'string' && value === 'null') {
        return null;
    }
    
    return value;
}

/**
 * Handles part creation and update
 */
export async function partAction(event: RequestEvent) {
    const user = event.locals.user as User | null;
    if (!user) {
        return fail(401, { message: 'You must be logged in to create/edit a part' });
    }
    
    // Get the form data to determine if this is an edit operation
    const formData = await event.request.formData();
    const partId = formData.get('part_id');
    const isEditMode = Boolean(partId);
    
    // Create a new schema for edit operations that includes part_id
    // We use a separate schema for part actions that includes part_id
    const partActionSchema = z.object({
        ...createPartSchema._def.schema.shape, // Access the underlying schema inside ZodEffects
        part_id: z.string().optional()
        // Add any other fields needed for editing
    });
    
    // Validate form data
    const form = await superValidate(formData, zod(partActionSchema));
    
    if (!form.valid) {
        console.error('Part validation failed:', form.errors);
        return message(form, 'Form validation failed. Please check your inputs.', { status: 400 });
    }
    
    try {
        // Copy form data to a new object to be used with createPart
        // Use type assertion to avoid TypeScript errors from field mismatches
        const partData = { ...form.data } as any;
        
        // Clean up optional fields to ensure they are properly handled
        // Since we're using 'any' type, TypeScript won't complain about property access
        if ('description' in partData) partData.description = processOptionalField(partData.description);
        if ('remarks' in partData) partData.remarks = processOptionalField(partData.remarks);
        if ('datasheet_url' in partData) partData.datasheet_url = processOptionalField(partData.datasheet_url);
        if ('image_url' in partData) partData.image_url = processOptionalField(partData.image_url);
        if ('lifecycle_status' in partData) partData.lifecycle_status = processOptionalField(partData.lifecycle_status);
        if ('status_in_bom' in partData) partData.status_in_bom = processOptionalField(partData.status_in_bom);
        if ('reference_designs' in partData) partData.reference_designs = processOptionalField(partData.reference_designs);
        
        // Get original form data to handle arrays and JSON fields
        const formData2 = Object.fromEntries(formData.entries());
        
        // Handle category IDs (string or array)
        if (formData2.category_ids) {
            let categoryIds: string[];
            const categoryIdsValue = formData2.category_ids;
            
            if (typeof categoryIdsValue === 'string') {
                // Convert comma-separated string to array
                categoryIds = categoryIdsValue.split(',').map((id: string) => id.trim());
            } else if (Array.isArray(categoryIdsValue)) {
                categoryIds = categoryIdsValue as string[];
            } else {
                categoryIds = [];
            }
            
            // Convert array to comma-separated string to match the expected type
            partData.category_ids = categoryIds.join(',');
        }

        // Handle manufacturer part associations (string or array)
        if (formData2.manufacturer_parts) {
            let manufacturerParts: any[];
            const mfrPartsValue = formData2.manufacturer_parts;
            
            if (typeof mfrPartsValue === 'string') {
                try {
                    // Try to parse as JSON string
                    manufacturerParts = JSON.parse(mfrPartsValue);
                } catch (e) {
                    manufacturerParts = [];
                }
            } else if (Array.isArray(mfrPartsValue)) {
                manufacturerParts = mfrPartsValue;
            } else {
                manufacturerParts = [];
            }
            
            // Override the manufacturer_parts array
            partData.manufacturer_parts = manufacturerParts;
        }

        // Fetch existing part data if in edit mode
        let existingPart: any = null;
        let existingVersion: any = null;
        
        if (isEditMode && partId) {
            try {
                // Fetch the current part and version data
                const partResult = await getPartWithCurrentVersion(partId as string);
                
                if (partResult) {
                    // getPartWithCurrentVersion returns an object with part and currentVersion properties
                    existingPart = partResult.part;
                    existingVersion = partResult.currentVersion;
                    console.log('Found existing part to edit:', existingPart.part_id, existingPart.part_name);
                }
            } catch (err) {
                console.error('Error fetching part for edit:', err);
            }
        }
        
        let result;

        if (isEditMode && existingPart && existingVersion) {
            // Update existing part by creating a new version
            // First, include the part ID in the data for the update
            // Add part_id as a non-schema property for internal tracking
            partData.part_id = existingPart.part_id;
            
            // For updates, version number should increment from the current version
            // Parse current version and increment patch number
            const versionParts = existingVersion.part_version.split('.');
            const major = parseInt(versionParts[0] || '0', 10);
            const minor = parseInt(versionParts[1] || '0', 10);
            const patch = parseInt(versionParts[2] || '0', 10) + 1;
            partData.part_version = `${major}.${minor}.${patch}`;
            
            // We'll use createPart but it will recognize the existing ID and update instead
            // We need to convert the data to match what createPart expects
            result = await createPart(partData as any, user.user_id);
            console.log('Part updated successfully with new version:', result);
            
            return message(form, `Part updated successfully to version ${partData.part_version}`);
        } else {
            // Create a new part
            // We need to convert the data to match what createPart expects
            result = await createPart(partData as any, user.user_id);
            console.log('Part created successfully:', result);
            
            return message(form, 'Part created successfully');
        }
    } catch (err) {
        console.error('Part operation error:', err);
        
        // Provide more detailed error message based on error type
        let errorMessage = isEditMode ? 'Failed to update part' : 'Failed to create part';
        
        if (err instanceof Error) {
            errorMessage += ': ' + err.message;
            
            // Check for specific error types we can handle more gracefully
            if (err.message.includes('duplicate')) {
                errorMessage = 'A part with this name and version already exists';
            } else if (err.message.includes('not found')) {
                errorMessage = 'Referenced entity not found';
            } else if (err.message.includes('validation')) {
                errorMessage = 'Validation error: Please check all form fields';
            }
        } else {
            errorMessage += ': Unknown error';
        }
        
        // Return form with better error message for superForm to display
        return message(form, errorMessage, { status: 500 });
    }
}
