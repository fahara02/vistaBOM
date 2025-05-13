//src/lib/utils/util.ts
import type { ContactInfo } from '@/types/types';



    // Process contact info into structured data with email, phone, address and other fields
   export  function processContactInfo(info: any): { email?: string; phone?: string; address?: string; text?: string; other: {key: string; value: string}[] } {
      const result = { email: undefined, phone: undefined, address: undefined, text: undefined, other: [] } as {
          email?: string;
          phone?: string;
          address?: string;
          text?: string;
          other: {key: string; value: string}[];
      };
      
      if (!info) return result;
      
      let jsonData: Record<string, any> = {};
      
      // Handle different input formats
      if (typeof info === 'string') {
          try {
              // Try parsing as JSON
              if (info.trim().startsWith('{')) {
                  jsonData = JSON.parse(info);
              } else if (info.includes(':')) {
                  // Handle key-value format (email: value; phone: value)
                  const pairs = info.split(/[;,\n]+/);
                  
                  for (const pair of pairs) {
                      const parts = pair.split(':');
                      if (parts.length >= 2) {
                          const key = parts[0].trim().toLowerCase();
                          const value = parts.slice(1).join(':').trim();
                          
                          if (key.includes('email')) jsonData.email = value;
                          else if (key.includes('phone') || key.includes('tel')) jsonData.phone = value;
                          else if (key.includes('address')) jsonData.address = value;
                          else jsonData[key] = value;
                      }
                  }
              } else {
                  // Treat as plain text
                  result.text = info;
                  return result;
              }
          } catch (e) {
              // If JSON parsing fails, treat as plain text
              result.text = info;
              return result;
          }
      } else if (typeof info === 'object' && info !== null) {
          jsonData = info;
      }
      
      // Extract known fields
      if ('email' in jsonData && typeof jsonData.email === 'string') {
          result.email = jsonData.email;
      }
      
      if ('phone' in jsonData && typeof jsonData.phone === 'string') {
          result.phone = jsonData.phone;
      }
      
      if ('address' in jsonData && typeof jsonData.address === 'string') {
          result.address = jsonData.address;
      }
      
      // Handle additional fields
      for (const [key, value] of Object.entries(jsonData)) {
          if (!['email', 'phone', 'address'].includes(key) && typeof value === 'string') {
              result.other.push({ key, value });
          }
      }
      
      return result;
  }
  






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
 * Parses and formats part JSON fields for submission to database
 * Handles various formats (JSON strings, objects, key-value strings) and ensures
 * valid JSON objects are returned for database storage
 * 
 * @param input The JSON field content to parse (can be string, object, null, etc)
 * @param fieldName The name of the field for logging purposes (can be null for anonymous fields)
 * @returns A properly formatted object for database storage
 */
export function parsePartJsonField(input: any, fieldName: string | null = null): Record<string, any> {
  // Return empty object for null/undefined/empty inputs
  if (input === null || input === undefined || input === '') {
    return {};
  }
  
  // If already an object, return as is
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input;
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof input === 'string') {
    const cleanInput = input.trim();
    
    // If it's already a JSON string, parse it
    if (cleanInput.startsWith('{') && cleanInput.endsWith('}')) {
      try {
        return JSON.parse(cleanInput);
      } catch (e) {
        // If JSON parse fails, attempt to fix common issues
        try {
          // Try to fix unquoted keys
          const fixedJson = cleanInput
            .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Add quotes to keys
            .replace(/:\s*([a-zA-Z0-9_]+)\s*([,}])/g, ':"$1"$2'); // Add quotes to string values
          
          return JSON.parse(fixedJson);
        } catch (fixError) {
          console.log(`Failed to parse ${fieldName} JSON after fixing: ${fixError}`);
          // Fall through to key-value parsing
        }
      }
    }
    
    // Try to parse as key-value pairs (key: value; key2: value2)
    if (cleanInput.includes(':')) {
      const result: Record<string, any> = {};
      try {
        // Split by semicolons, commas, or line breaks
        const pairs = cleanInput.split(/[;,\n]+/);
        
        for (const pair of pairs) {
          // Split by colon to get key and value
          const parts = pair.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim().replace(/[^a-zA-Z0-9_]/g, '_');
            const valueStr = parts.slice(1).join(':').trim(); // Join in case value itself contained colons
            
            // Try to convert value to appropriate type (as any to avoid TS errors)
            let value: any = valueStr;
            if (valueStr.toLowerCase() === 'true') value = true;
            else if (valueStr.toLowerCase() === 'false') value = false;
            else if (!isNaN(Number(valueStr)) && valueStr !== '') value = Number(valueStr);
            
            if (key) {
              result[key] = value;
            }
          }
        }
        
        if (Object.keys(result).length > 0) {
          return result;
        }
      } catch (e) {
        console.log(`Error parsing ${fieldName} key-value pairs: ${e}`);
      }
    }
  }
  
  // Default fallback to empty object
  console.log(`Failed to parse ${fieldName}, returning empty object`);
  return {};
}

/**
 * Formats part JSON fields for display in the UI
 * Takes a field that may be JSON string or object and returns a consistently
 * formatted string for display purposes
 * 
 * @param input The JSON field content to format (can be string, object, null, etc)
 * @param fieldName The name of the field for display purposes
 * @returns Formatted string with key-value pairs for display
 */
export function formatPartJsonFieldForDisplay(input: any, fieldName: string): string {
  if (input === null || input === undefined || input === '') {
    return '';
  }
  
  let dataObj: Record<string, any>;
  
  // If it's a string, try to parse it
  if (typeof input === 'string') {
    try {
      dataObj = JSON.parse(input.trim());
    } catch (e) {
      return input; // Return as-is if parsing fails
    }
  } else if (typeof input === 'object' && !Array.isArray(input)) {
    dataObj = input;
  } else {
    return String(input); // Return stringified version for other types
  }
  
  // Format as key-value pairs
  return Object.entries(dataObj)
    .map(([key, value]) => {
      // Format key from camelCase or snake_case to Title Case
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
        .replace(/_/g, ' ')         // Replace underscores with spaces
        .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
        .trim();
      
      // Format value based on type
      let formattedValue: string;
      if (typeof value === 'object' && value !== null) {
        formattedValue = JSON.stringify(value, null, 2);
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'Yes' : 'No';
      } else {
        formattedValue = String(value);
      }
      
      return `${formattedKey}: ${formattedValue}`;
    })
    .join('; ');
}

/**
 * Formats contact information for display in the UI
 * Takes a contact info string (which may be JSON or key-value format) and
 * returns a consistently formatted string for display purposes
 * 
 * @param input The contact info string to format
 * @returns Formatted string with key-value pairs separated by semicolons
 */
export function formatContactInfoForDisplay(input: string | null | undefined | any): string {
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
      if (pairs.length > 1 && pairs.every((p: string) => p.includes(':') || p.includes('='))) {
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


export function validateJSON(jsonString: string | undefined | null): boolean {
  if (!jsonString) return true;
  try {
    JSON.parse(jsonString);
    return true;
  } catch (e) {
    return false;
  }
}
  // Format field names from camelCase to Title Case with spaces
export function formatFieldName(fieldName: string): string {
  // Add space before capital letters and capitalize the first letter
  const formatted = fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
  return formatted.trim();
}


 // Helper function to convert string/number to number or null if invalid
export function parseFloatOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}
  
  // Function to format creator/updater name
export  function formatUsername(userId: string | null | undefined): string {
    if (!userId) return 'System';
    // In a real app, you would look up the username from the user ID
    // For now, we'll just show a formatted version
    return `User ${userId.substring(0, 8)}`;
  }
   // Helper function to format values with units
   export   function formatWithUnit(value: number | null | undefined, unit: string | null | undefined, defaultText = 'Not specified'): string {
    if (value === null || value === undefined) return defaultText;
    return `${value}${unit ? ` ${unit}` : ''}`;
  }

  // Function to display JSON data in a readable format
  export  function displayJSONData(jsonData: any): { key: string, value: string }[] {
    if (!jsonData) return [];
    
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return Object.entries(data).map(([key, value]) => ({
        key: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));
    } catch (e) {
      console.error('Error parsing JSON data:', e);
      return [];
    }
  }


