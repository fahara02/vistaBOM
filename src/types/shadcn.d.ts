/**
 * Type declarations for Shadcn-Svelte components
 * This fixes TypeScript errors without modifying the original components
 */

// Define ClassValue type similar to clsx/tailwind-merge
type ClassArray = ClassValue[];
type ClassValue = string | number | boolean | undefined | null | ClassArray | Record<string, boolean | undefined | null>;

// Augment the types for cmdk-sv
declare module 'cmdk-sv' {
  namespace Command {
    interface CommandProps {
      class?: ClassValue;
    }
    
    interface EmptyProps {
      class?: ClassValue;
    }
    
    interface GroupProps {
      class?: ClassValue;
    }
    
    interface InputProps {
      class?: ClassValue;
    }
    
    interface ItemProps {
      class?: ClassValue;
    }
    
    interface ListProps {
      class?: ClassValue;
    }
    
    interface SeparatorProps {
      class?: ClassValue;
    }
  }
}

// For button component
interface ButtonProps {
  class?: ClassValue;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}
