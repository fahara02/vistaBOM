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
        // First attempt normal JSON parsing
        const parsed = JSON.parse(cleanInput);
        
        // Validate JSON structure
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const validKeys: (keyof ContactInfo)[] = ['address', 'email', 'phone', 'fax', 'mobile'];
          
          // Extract valid fields and ensure proper typing
          validKeys.forEach(key => {
            if (key in parsed && (typeof parsed[key] === 'string' || typeof parsed[key] === 'number')) {
              // Convert any numbers to strings
              contact[key] = String(parsed[key]);
            }
          });
          
          if (Object.keys(contact).length > 0) {
            return JSON.stringify(contact);
          }
        }
      } catch (err) {
        // JSON parsing failed, try to fix common issues
        try {
          // Common issue: unquoted values that contain hyphens or other special chars
          // Example: { "mobile":0086-755-83210457,"email":"sales@lcsc.com" }
          
          // Pre-process the input to fix common JSON syntax issues
          let fixedInput = cleanInput;
          
          // First try a direct pattern match for the specific problem case
          const phonePattern = /"(mobile|phone)"\s*:\s*(\d+-\d+-\d+|\d+\-\d+|\d+)/g;
          const emailPattern = /"(email)"\s*:\s*"([^"]+)"/g;
          
          // Extract phone/mobile numbers
          let phoneMatch;
          while ((phoneMatch = phonePattern.exec(cleanInput)) !== null) {
            const key = phoneMatch[1];
            const value = phoneMatch[2];
            contact[key as keyof ContactInfo] = value;
          }
          
          // Extract email
          let emailMatch;
          while ((emailMatch = emailPattern.exec(cleanInput)) !== null) {
            const key = emailMatch[1];
            const value = emailMatch[2];
            contact[key as keyof ContactInfo] = value;
          }
          
          // If we already found values, return immediately
          if (Object.keys(contact).length > 0) {
            return JSON.stringify(contact);
          }
          
          // More general approach using regex for key-value pairs
          const keyValuePairs = cleanInput
            .substring(1, cleanInput.length - 1) // Remove the outer braces
            .match(/"([^"]+)"\s*:\s*([^,}]+)/g);

          if (keyValuePairs) {
            // Extract each key and value
            for (const pair of keyValuePairs) {
              const match = pair.match(/"([^"]+)"\s*:\s*(.+)/);
              if (match && match.length === 3) {
                const key = match[1].trim();
                let value = match[2].trim();
                
                // Handle quoted values
                if (value.startsWith('"') && value.endsWith('"')) {
                  value = value.substring(1, value.length - 1);
                  if (['address', 'email', 'phone', 'fax', 'mobile'].includes(key)) {
                    contact[key as keyof ContactInfo] = value;
                  }
                }
                // Handle numeric-like values (including those with hyphens)
                else if (/^(\d+[\-\d]*|\d+)$/.test(value)) {
                  if (['phone', 'mobile', 'fax'].includes(key)) {
                    contact[key as keyof ContactInfo] = value;
                  }
                }
                // Handle other unquoted values
                else if (!value.startsWith('"') && !value.endsWith('"')) {
                  if (['address', 'email', 'phone', 'fax', 'mobile'].includes(key)) {
                    contact[key as keyof ContactInfo] = value;
                  }
                }
              }
            }
            
            if (Object.keys(contact).length > 0) {
              return JSON.stringify(contact);
            }
          }
        } catch (fixError) {
          // Failed to fix JSON, continue to other formats
        }
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

/**
 * Formats contact information for display in the UI
 * Takes a contact info string (which may be JSON or key-value format) and
 * returns a consistently formatted string for display purposes
 * 
 * @param input The contact info string to format
 * @returns Formatted string with key-value pairs separated by semicolons
 */
export function formatContactInfoForDisplay(input: string | null | undefined): string {
  if (!input || input.trim() === '') {
    return '';
  }
  
  try {
    // Try to parse as JSON first
    let contactObj: Record<string, string> = {};
    const cleanInput = input.trim();
    
    if (cleanInput.startsWith('{') && cleanInput.endsWith('}')) {
      try {
        contactObj = JSON.parse(cleanInput);
      } catch (e) {
        // If JSON parsing fails, try to parse as key-value pairs
        return cleanInput; // Return as-is if JSON parsing fails
      }
    } else if (cleanInput.includes(':') || cleanInput.includes('=')) {
      // Handle as key-value pairs
      const pairs = cleanInput.split(/[;,\n]+/);
      
      // If it already looks like a formatted list, return as is
      if (pairs.length > 1 && pairs.every(p => p.includes(':') || p.includes('='))) {
        return cleanInput;
      }
      
      // Otherwise try to parse it
      const parsedJson = parseContactInfo(cleanInput);
      try {
        contactObj = JSON.parse(parsedJson);
      } catch (e) {
        return cleanInput; // Return as-is if parsing fails
      }
    } else {
      // Not JSON or key-value format, return as-is
      return cleanInput;
    }
    
    // Format the contact object into a display string
    const formattedParts: string[] = [];
    
    // Order the contact fields with most important first
    const orderedKeys = ['email', 'phone', 'mobile', 'address', 'fax'];
    
    // Add ordered keys first
    for (const key of orderedKeys) {
      if (contactObj[key]) {
        // Format key with capitalized first letter
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        formattedParts.push(`${formattedKey}: ${contactObj[key]}`);
      }
    }
    
    // Add any remaining keys not in the ordered list
    for (const key in contactObj) {
      if (!orderedKeys.includes(key) && contactObj[key]) {
        // Format key with capitalized first letter
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        formattedParts.push(`${formattedKey}: ${contactObj[key]}`);
      }
    }
    
    return formattedParts.join('; ');
  } catch (error) {
    // If anything goes wrong, return the input as-is
    console.error('Error formatting contact info:', error);
    return input || '';
  }
}