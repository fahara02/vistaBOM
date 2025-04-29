//src/lib/utils/util.ts
import type { ContactInfo } from '$lib/server/db/types';

/**
 * Parses contact information from either JSON or semicolon-separated values and returns a JSON string
 * @param input The input string to parse
 * @param delimiterMapping Array defining which contact field each semicolon-separated part represents
 * @returns JSON string representing ContactInfo
 * @throws Error if input format is invalid
 */
export function parseContactInfo(
    input: string,
    delimiterMapping: (keyof ContactInfo)[] = ['address', 'email', 'phone']
  ): string {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(input);
      
      // Validate JSON structure
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Invalid JSON structure');
      }

      const contact: ContactInfo = {};
      const validKeys: (keyof ContactInfo)[] = ['address', 'email', 'phone', 'fax'];
      
      // Extract valid fields
      validKeys.forEach(key => {
        if (typeof parsed[key] === 'string') {
          contact[key] = parsed[key];
        }
      });

      if (Object.keys(contact).length > 0) {
        return JSON.stringify(contact);
      }
      throw new Error('No valid contact fields in JSON');
    } catch (jsonError) {
      // Fall through to semicolon parsing if JSON parsing failed
    }

    // Try semicolon-separated parsing
    const parts = input.split(';').map(part => part.trim());
    const contact: ContactInfo = {};

    for (let i = 0; i < parts.length; i++) {
      const field = delimiterMapping[i];
      const value = parts[i];
      
      if (field && value) {
        contact[field] = value;
      }
    }

    // Validate we found at least one contact field
    if (Object.keys(contact).length === 0) {
      throw new Error(`Invalid contact format. Please use JSON or semicolon-separated values.
  Example JSON: {"address": "123 Main St", "email": "john@example.com"}
  Example semicolon: 123 Main St;john@example.com;555-1234`);
    }

    return JSON.stringify(contact);
  }