// src/lib/components/forms/utils.ts
import type { JsonValue } from '$lib/types/schemaTypes';

/**
 * Validates if a string is valid JSON
 * @param jsonString - The string to validate
 * @returns True if valid JSON, false otherwise
 */
export function validateJSON(jsonString: string): boolean {
    try {
        if (!jsonString || jsonString.trim() === '') return false;
        JSON.parse(jsonString);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Format a field name for display by converting snake_case or camelCase to Title Case
 * @param fieldName - The field name to format
 * @returns Formatted field name
 */
export function formatFieldName(fieldName: string): string {
    // Handle snake_case and camelCase
    return fieldName
        .replace(/_/g, ' ')  // Convert underscores to spaces
        .replace(/([A-Z])/g, ' $1')  // Add spaces before uppercase letters
        .replace(/\s+/g, ' ')  // Remove extra spaces
        .trim()  // Trim leading/trailing spaces
        .split(' ')  // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())  // Capitalize first letter
        .join(' ');  // Join back with spaces
}

/**
 * Processes contact information from various formats into a structured object
 * @param contactInfo - The contact information to process
 * @returns A structured object with email, phone, address, and other fields
 */
export function processContactInfo(contactInfo: JsonValue | null | undefined): Record<string, unknown> {
    if (!contactInfo) {
        return {
            email: null,
            phone: null,
            address: null,
            text: null,
            other: []
        };
    }

    try {
        // If it's already an object, use it directly
        if (typeof contactInfo === 'object' && contactInfo !== null) {
            const contact = contactInfo as Record<string, unknown>;
            // Extract known fields
            const result: Record<string, unknown> = {
                email: contact.email || null,
                phone: contact.phone || null,
                address: contact.address || null,
                text: contact.text || null,
                other: []
            };

            // Process other fields
            for (const [key, value] of Object.entries(contact)) {
                if (!['email', 'phone', 'address', 'text'].includes(key) && value) {
                    (result.other as Array<{key: string, value: unknown}>).push({ key, value });
                }
            }

            return result;
        }

        // If it's a string, try to parse it as JSON
        if (typeof contactInfo === 'string') {
            try {
                const parsed = JSON.parse(contactInfo);
                return processContactInfo(parsed);
            } catch (e) {
                // If parsing fails, return as text
                return {
                    text: contactInfo,
                    email: null,
                    phone: null,
                    address: null,
                    other: []
                };
            }
        }

        // Fallback
        return {
            text: String(contactInfo),
            email: null,
            phone: null,
            address: null,
            other: []
        };
    } catch (e) {
        // If anything fails, treat as plain text
        return {
            text: String(contactInfo),
            email: null,
            phone: null,
            address: null,
            other: []
        };
    }
}

/**
 * Formats contact information for display
 * @param contactInfoJson - JSON string of contact information
 * @returns Array of formatted contact information strings
 */
export function formatContactInfoForDisplay(contactInfoJson: string): string[] {
    try {
        if (!contactInfoJson || !validateJSON(contactInfoJson)) return [];
        
        const contactInfo = JSON.parse(contactInfoJson) as Record<string, unknown>;
        const result: string[] = [];
        
        // Process flat key-value pairs
        if (typeof contactInfo === 'object' && contactInfo !== null) {
            for (const [key, value] of Object.entries(contactInfo)) {
                if (typeof value === 'string' || typeof value === 'number') {
                    // For simple key-value pairs, format as "key: value"
                    result.push(`${formatFieldName(key)}: ${value}`);
                } else if (typeof value === 'object' && value !== null) {
                    // For nested objects, format each nested property
                    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
                        if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
                            result.push(`${formatFieldName(key)} - ${formatFieldName(nestedKey)}: ${nestedValue}`);
                        }
                    }
                }
            }
        }
        
        return result;
    } catch (e) {
        return [];
    }
}

/**
 * Prepares form data for validation by handling empty strings, nulls, etc.
 * @param formData - The form data to prepare
 * @returns Prepared form data
 */
export function prepareFormDataForValidation<T extends Record<string, unknown>>(formData: T): T {
    const result = { ...formData } as T;
    
    // Handle empty strings, nulls, numbers, etc.
    Object.keys(result).forEach((key) => {
        const typedKey = key as keyof T;
        const value = result[typedKey];
        
        // Handle empty strings which should be null
        if (value === "") {
            result[typedKey] = null as unknown as T[keyof T];
        }
        
        // Handle 'null' strings which should be actual null
        if (value === "null") {
            result[typedKey] = null as unknown as T[keyof T];
        }
        
        // Convert string numbers to actual numbers where appropriate
        if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
            // Check if it's a numeric field by naming convention
            if (
                key.includes('_value') || 
                key.includes('_min') || 
                key.includes('_max') || 
                key.includes('temperature') ||
                key.includes('length') ||
                key.includes('width') ||
                key.includes('height') ||
                key.includes('weight')
            ) {
                result[typedKey] = Number(value) as unknown as T[keyof T];
            }
        }
    });
    
    return result;
}
