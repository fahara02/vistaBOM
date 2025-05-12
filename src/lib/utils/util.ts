//src/lib/utils/util.ts
import type { ContactInfo } from '$lib/server/db/types';

/**
 * Parses contact information from various formats and returns a JSON string
 * Supports:
 * 1. Valid JSON objects
 * 2. Key-value pairs separated by delimiters (; or , or :)
 * 3. Simple text inputs that will be mapped to fields based on delimiterMapping
 * 
 * @param input The input string to parse
 * @param delimiterMapping Array defining which contact field each part represents when using simple format
 * @returns JSON string representing ContactInfo
 */
export function parseContactInfo(
    input: string | null | undefined,
    delimiterMapping: (keyof ContactInfo)[] = ['address', 'email', 'phone']
  ): string {
    // Handle empty inputs
    if (!input || input.trim() === '') {
      return JSON.stringify({});
    }
    
    // Clean the input
    const cleanInput = input.trim();
    const contact: ContactInfo = {};
    
    // Try to parse as JSON first
    if (cleanInput.startsWith('{') && cleanInput.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanInput);
        
        // Validate JSON structure
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const validKeys: (keyof ContactInfo)[] = ['address', 'email', 'phone', 'fax'];
          
          // Extract valid fields and ensure proper typing
          validKeys.forEach(key => {
            if (key in parsed && typeof parsed[key] === 'string') {
              contact[key] = parsed[key];
            }
          });
          
          if (Object.keys(contact).length > 0) {
            return JSON.stringify(contact);
          }
        }
      } catch (err) {
        // JSON parsing failed, continue to other formats
      }
    }
    
    // Check if input contains key-value pairs (contains : or = characters)
    if (cleanInput.includes(':') || cleanInput.includes('=')) {
      // Handle key-value pairs separated by ; or , or line breaks
      const pairs = cleanInput.split(/[;,\n]+/);
      
      for (const pair of pairs) {
        // Split by : or = to get key and value
        const parts = pair.split(/[:=]/);
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const value = parts.slice(1).join(':').trim(); // Join in case value itself contained colons
          
          // Map common key variations to standard keys
          if (key.includes('addr') || key.includes('location') || key.includes('address')) {
            contact.address = value;
          } else if (key.includes('email') || key.includes('mail')) {
            contact.email = value;
          } else if (key.includes('phone') || key.includes('tel') || key.includes('mobile')) {
            contact.phone = value;
          } else if (key.includes('fax')) {
            contact.fax = value;
          }
        }
      }
      
      if (Object.keys(contact).length > 0) {
        return JSON.stringify(contact);
      }
    }
    
    // Fallback to simple delimiter-based parsing
    // Split by common delimiters
    const parts = cleanInput.split(/[;,|]+/).map(part => part.trim()).filter(Boolean);
    
    // Map parts to fields based on delimiterMapping
    parts.forEach((part, index) => {
      if (index < delimiterMapping.length) {
        const key = delimiterMapping[index];
        contact[key] = part;
      }
    });
    
    // Return whatever we found, even if empty
    return JSON.stringify(contact);
  }