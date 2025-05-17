// src/routes/supplier/[id]/edit/+page.server.ts
import sql from '$lib/server/db/index';
import { parseContactInfo } from '$lib/utils/util';
import { getSupplier } from '@/core/supplier';
import { fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

// Edit schema - allow more fields to be optional for updates
const supplierEditSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  website_url: z.string().url("Must be a valid URL").optional().nullable(),
  logo_url: z.string().url("Must be a valid URL").optional().nullable(),
  contact_info: z.string().optional().nullable(),
  custom_fields_json: z.string().optional().nullable(),
  // These fields are included but optional to prevent validation errors
  created_by: z.string().optional().nullable(),
  created_at: z.any().optional(),
  updated_by: z.string().optional().nullable(),
  updated_at: z.any().optional()
});

// Helper function to get custom fields for a supplier
async function getSupplierCustomFields(supplierId: string): Promise<Record<string, any>> {
  try {
    const customFieldRows = await sql`
      SELECT cf.field_name, cf.data_type, scf.custom_field_value
      FROM suppliercustomfield scf
      JOIN customfield cf ON scf.field_id = cf.custom_field_id
      WHERE scf.supplier_id = ${supplierId}
    `;
    
    const customFields: Record<string, any> = {};
    
    for (const row of customFieldRows) {
      // Convert the value based on the data type
      let typedValue = row.value;
      
      // For PostgreSQL JSONB, we need to extract the actual value
      if (typeof typedValue === 'string') {
        try {
          typedValue = JSON.parse(typedValue);
        } catch (e) {
          // If it's not valid JSON, keep it as a string
          console.warn(`Failed to parse JSON value for ${row.field_name}:`, e);
        }
      }
      
      customFields[row.field_name] = typedValue;
    }
    
    return customFields;
  } catch (error) {
    console.error('Error fetching supplier custom fields:', error);
    return {};
  }
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw redirect(302, '/login');
  }

  const supplierId = params.id;
  
  // Get the supplier details
  const supplier = await getSupplier(supplierId);
  if (!supplier) {
    throw redirect(302, '/supplier');
  }
  
  console.log('Raw supplier from DB:', supplier);
  
  // Get custom fields
  const customFields = await getSupplierCustomFields(supplierId);
  
  // Extract contact_info as a separate field instead of putting it in customFields
  let contactInfoString = '';
  if (supplier.contact_info) {
    if (typeof supplier.contact_info === 'string') {
      contactInfoString = supplier.contact_info;
    } else {
      // If it's already an object, convert it to string
      contactInfoString = JSON.stringify(supplier.contact_info);
    }
  }
  
  console.log('Custom fields:', customFields);

  // Create the form with initial data
  const formData = {
    id: supplier.supplier_id,
    name: supplier.supplier_name,
    description: supplier.supplier_description || null,
    website_url: supplier.website_url || null,
    logo_url: supplier.logo_url || null,
    contact_info: contactInfoString || null,
    custom_fields_json: Object.keys(customFields).length > 0 ? 
      JSON.stringify(customFields, null, 2) : '',
    created_by: supplier.created_by || null,
    created_at: supplier.created_at,
    updated_by: supplier.updated_by || null,
    updated_at: supplier.updated_at
  };
  console.log('Initial form data:', formData);

  const form = await superValidate(formData, zod(supplierEditSchema));
  
  return {
    supplier,
    form
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const userId = locals.user?.id;
    if (!userId) {
      throw redirect(302, '/login');
    }
    
    const supplierId = params.id;
    const form = await superValidate(request, zod(supplierEditSchema));
    
    console.log('Update action triggered for supplier ID:', supplierId);
    
    if (!form.valid) {
      console.log('Form validation failed:', form.errors);
      return fail(400, { form });
    }
    
    console.log('Processing form submission...');
    console.log('Form data received:', form.data);
    
    try {
      // Parse custom fields if provided
      let customFields = {};
      if (form.data.custom_fields_json) {
        try {
          customFields = JSON.parse(form.data.custom_fields_json);
          console.log('Successfully parsed custom fields:', customFields);
        } catch (e) {
          console.error('Error parsing custom fields JSON:', e);
          return fail(400, { 
            form, 
            message: 'Invalid JSON format for custom fields' 
          });
        }
      }
      
      // Update basic supplier information
      console.log('Updating supplier with ID:', supplierId);
      
      // Process contact info - ensure it's in the correct format
      let contactInfo = form.data.contact_info;
      
      // Ensure contactInfo is a string before processing
      if (contactInfo && typeof contactInfo === 'string') {
        // First ensure we don't have an HTML error in the input
        if (contactInfo.trim().toLowerCase().startsWith('<!doctype')) {
          console.error('HTML content detected in contact_info, clearing to prevent errors');
          contactInfo = '{}';
        } else {
          try {
            // Use our utility function to parse and standardize the contact info
            const parsedContactInfo = parseContactInfo(contactInfo);
            contactInfo = parsedContactInfo;
            console.log('Processed contact info using utility function:', contactInfo);
          } catch (e) {
            console.error('Error using parseContactInfo utility:', e);
            
            // Fall back to manual parsing
            try {
              // At this point we know contactInfo is a string due to the outer check
              const contactInfoStr = contactInfo as string;
              // First try to parse as JSON if it appears to be JSON format
              if (contactInfoStr.trim().startsWith('{') && contactInfoStr.trim().endsWith('}')) {
                try {
                  // Check if it contains unquoted values with hyphens (common issue)
                  // Example: { "mobile":0086-755-83210457,"email":"sales@lcsc.com" }
                  if (contactInfoStr.match(/"(mobile|phone)"\s*:\s*(\d+\-\d+|\d+\-\d+\-\d+)/)) {
                    // Extract the problematic fields
                    const contactObj: Record<string, string> = {};
                    
                    // Extract mobile/phone with regex
                    const phoneMatch = contactInfoStr.match(/"(mobile|phone)"\s*:\s*([\d\-]+)/);
                    if (phoneMatch && phoneMatch.length > 2) {
                      contactObj[phoneMatch[1]] = phoneMatch[2];
                    }
                    
                    // Extract email if present
                    const emailMatch = contactInfoStr.match(/"email"\s*:\s*"([^"]+)"/); 
                    if (emailMatch && emailMatch.length > 1) {
                      contactObj.email = emailMatch[1];
                    }
                    
                    contactInfo = JSON.stringify(contactObj);
                    console.log('Fixed unquoted values in JSON:', contactInfo);
                  } else {
                    // Try standard JSON parse
                    JSON.parse(contactInfoStr);
                    // If successful, keep it as is
                    console.log('Contact info is valid JSON, keeping as is');
                  }
                } catch (e) {
                  // Attempt to fix common JSON formatting issues
                  console.log('Attempting to fix malformed JSON');
                  
                  // 1. Fix missing quotes around values
                  let fixedJson = contactInfoStr.replace(/"([^"]+)"\s*:\s*([^\{\}\[\]\,"\d][^\,\}]*)(,|\})/g, '"$1": "$2"$3');
                  
                  // 2. Make sure numbers with hyphens are quoted
                  fixedJson = fixedJson.replace(/"(mobile|phone)"\s*:\s*(\d+[\-\d]+)/g, '"$1": "$2"');
                  
                  // 3. Fix line breaks and extra spaces
                  fixedJson = fixedJson.replace(/\n\s*/g, ' ').replace(/\s+,/g, ',');
                  
                  try {
                    JSON.parse(fixedJson);
                    contactInfo = fixedJson;
                    console.log('Successfully fixed JSON:', fixedJson);
                  } catch (innerE) {
                    console.error('Failed to fix JSON:', innerE);
                    // Create a new clean object instead of using broken JSON
                    const contactObj: Record<string, string> = {};
                    
                    // Extract any identifiable fields using regex
                    const emailMatch = contactInfoStr.match(/"email"\s*:\s*"?([^",}]+)"?/);
                    if (emailMatch) contactObj.email = emailMatch[1].trim();
                    
                    const phoneMatch = contactInfoStr.match(/"(phone|mobile)"\s*:\s*"?([^",}]+)"?/);
                    if (phoneMatch) contactObj[phoneMatch[1]] = phoneMatch[2].trim();
                    
                    const addressMatch = contactInfoStr.match(/"address"\s*:\s*"?([^",}]+)"?/);
                    if (addressMatch) contactObj.address = addressMatch[1].trim();
                    
                    contactInfo = JSON.stringify(contactObj);
                  }
                }
              } else if (contactInfoStr.includes(':')) {
                // Process as key-value pairs (e.g., "email: test@example.com; phone: 123-456")
                const pairs = contactInfoStr.split(/[;\n]+/);
                const contactObj: Record<string, string> = {};
                
                for (const pair of pairs) {
                  const parts = pair.split(':');
                  if (parts.length >= 2) {
                    const key = parts[0].trim().toLowerCase();
                    const value = parts.slice(1).join(':').trim();
                    
                    if (key === 'email' || key.includes('email')) contactObj.email = value;
                    else if (key === 'phone' || key.includes('phone')) contactObj.phone = value;
                    else if (key === 'mobile' || key.includes('mobile')) contactObj.mobile = value;
                    else if (key === 'address' || key.includes('address')) contactObj.address = value;
                    else if (key === 'fax' || key.includes('fax')) contactObj.fax = value;
                    else contactObj[key] = value;
                  }
                }
                
                // Convert to JSON string if we found any pairs
                if (Object.keys(contactObj).length > 0) {
                  contactInfo = JSON.stringify(contactObj);
                  console.log('Converted key-value pairs to JSON:', contactInfo);
                }
              }
            } catch (e) {
              console.error('Error in fallback contact info processing:', e);
              // If all else fails, store an empty object to prevent future errors
              contactInfo = '{}';
            }
          }
        }
      } else {
        // If there's no contact info, use an empty object
        contactInfo = '{}';
      }
      
      // Update the supplier in the database - use lowercase table name to match actual DB table
      const result = await sql`
        UPDATE supplier SET
          name = ${form.data.name},
          description = ${form.data.description || null},
          website_url = ${form.data.website_url || null},
          contact_info = ${contactInfo || null},
          logo_url = ${form.data.logo_url || null},
          updated_by = ${userId},
          updated_at = NOW()
        WHERE id = ${supplierId}
        RETURNING *
      `;
      
      console.log('Basic update successful, returned data:', result);
      
      // Handle custom fields if provided
      if (customFields && Object.keys(customFields).length > 0) {
        console.log('Processing custom fields...');
        
        try {
          // Delete existing custom fields first
          await sql`DELETE FROM suppliercustomfield WHERE supplier_id = ${supplierId}`;
          console.log('Deleted existing custom fields');

          for (const [fieldName, fieldValue] of Object.entries(customFields)) {
            // Check if this field already exists
            const existingField = await sql`
              SELECT id FROM customfield WHERE field_name = ${fieldName}
            `;
            
            let fieldId;
            if (existingField.length > 0) {
              fieldId = existingField[0].id;
              console.log(`Using existing field ID ${fieldId} for ${fieldName}`);
            } else {
              // Create a new custom field with correct data_type according to schema
              let dataType;
              if (typeof fieldValue === 'string') dataType = 'text';  // 'text' not 'string'
              else if (typeof fieldValue === 'number') dataType = 'number';
              else if (typeof fieldValue === 'boolean') dataType = 'boolean';
              else if (fieldValue instanceof Date) dataType = 'date';
              else dataType = 'text';  // Default to text for other types
              
              const newField = await sql`
                INSERT INTO customfield (field_name, data_type, applies_to)
                VALUES (${fieldName}, ${dataType}, ${'supplier'})
                RETURNING id
              `;
              fieldId = newField[0].id;
              console.log(`Created new field ID ${fieldId} for ${fieldName}`);
            }
            
            // Now add the value
            await sql`
              INSERT INTO suppliercustomfield (supplier_id, field_id, value)
              VALUES (${supplierId}, ${fieldId}, ${JSON.stringify(fieldValue)})
            `;
            console.log(`Added value ${fieldValue} for field ${fieldName}`);
          }
        } catch (error) {
          console.error('Error handling custom fields:', error);
          // Don't fail the whole update if custom fields processing fails
          // Just log the error and continue
        }
      }
      
      // Return success message
      return message(form, 'Supplier updated successfully');
    } catch (error: any) {
      console.error('Error in supplier update:', error);
      return message(form, 'Error updating supplier: ' + (error.message || 'Unknown error'), { status: 500 });
    }
  },
  
  delete: async ({ params, locals }) => {
    const userId = locals.user?.id;
    if (!userId) {
      throw redirect(302, '/login');
    }
    
    const supplierId = params.id;
    
    try {
      // Check if user has permission to delete this supplier
      const supplier = await sql`
        SELECT created_by FROM supplier WHERE id = ${supplierId}
      `;
      
      if (supplier.length === 0) {
        return fail(404, { message: 'Supplier not found' });
      }
      
      // Only allow deletion if user is the creator
      if (supplier[0].created_by !== userId) {
        return fail(403, { message: 'You do not have permission to delete this supplier' });
      }
      
      // Delete custom fields first (to avoid foreign key constraints)
      await sql`DELETE FROM suppliercustomfield WHERE supplier_id = ${supplierId}`;
      
      // Delete the supplier
      await sql`DELETE FROM supplier WHERE id = ${supplierId}`;
      
      throw redirect(303, '/supplier');
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      return fail(500, { message: 'Error deleting supplier: ' + (error.message || 'Unknown error') });
    }
  }
};
