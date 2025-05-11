/**
 * Utility functions for the application
 */

/**
 * Format a date to a readable string
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Not specified';
  
  // Options for formatting the date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Format a number with unit
 * @param value Number to format
 * @param unit Unit to append
 * @param defaultText Text to display if value is undefined or null
 * @returns Formatted string with value and unit
 */
export function formatWithUnit(
  value: number | null | undefined, 
  unit: string | null | undefined, 
  defaultText = 'Not specified'
): string {
  if (value === null || value === undefined) return defaultText;
  return `${value}${unit ? ` ${unit}` : ''}`;
}

/**
 * Format JSON data for display
 * @param json JSON data to format
 * @returns Formatted JSON string
 */
export function formatJson(json: any): string {
  if (!json) return 'Not specified';
  return JSON.stringify(json, null, 2);
}
