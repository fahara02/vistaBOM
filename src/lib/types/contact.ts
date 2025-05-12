/**
 * Contact information types for suppliers, manufacturers, etc.
 */

export type ContactInfoValue = string | number | boolean;

export type ContactInfo = {
  [key: string]: ContactInfoValue | ContactInfoValue[] | Record<string, ContactInfoValue>;
};

/**
 * Parse contact information from different formats
 * @param contactInfo - Contact information in string or object format
 */
export function parseContactInfo(contactInfo: any): ContactInfo | null {
  if (!contactInfo) return null;
  
  // If it's already an object
  if (typeof contactInfo === 'object' && !Array.isArray(contactInfo)) {
    return contactInfo as ContactInfo;
  }
  
  // If it's a JSON string, try to parse it
  if (typeof contactInfo === 'string') {
    try {
      return JSON.parse(contactInfo) as ContactInfo;
    } catch (e) {
      // If not valid JSON, return as a simple object with value property
      return { value: contactInfo };
    }
  }
  
  return null;
}
