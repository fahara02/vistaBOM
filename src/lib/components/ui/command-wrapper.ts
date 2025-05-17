/**
 * Re-export command components from cmdk-sv
 * This approach avoids TypeScript errors by using the original components directly
 */
import { Command as CommandPrimitive } from "cmdk-sv";

// Simply re-export the original Command components
// This avoids TypeScript errors with component instantiation
const Command = CommandPrimitive;

// Export as both default and named export
export { Command };
export default Command;
