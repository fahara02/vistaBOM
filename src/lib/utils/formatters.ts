//src/lib/utils/formatters.ts

/**
 * Formats a JSON object or a valid JSON string into a pretty-printed string
 * @param input - JSON object or string to format
 * @returns Formatted JSON string
 */
export function formatJSON(input: any): string {
  try {
    // If input is a string, parse it to an object first
    const object = typeof input === 'string' ? JSON.parse(input) : input;
    // Return the prettified JSON string with 2 spaces indentation
    return JSON.stringify(object, null, 2);
  } catch (e) {
    // If parsing fails, return the original input
    return typeof input === 'string' ? input : JSON.stringify(input);
  }
}

/**
 * Checks if a string is valid JSON
 * @param jsonString - String to validate
 * @returns Boolean indicating if the string is valid JSON
 */
export function isJSONValid(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}
