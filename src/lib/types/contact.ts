/**
 * Contact information types for suppliers, manufacturers, etc.
 * More structured version of the ContactInfo type in primitive.ts
 * for use in specific contact-related components and forms
 */

export type ContactInfoValue = string | number | boolean;

// Structured contact information with specific fields
export interface ContactInfo {
  name?: string;
  position?: string;
  department?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  notes?: string;
  [key: string]: ContactInfoValue | undefined;
}
