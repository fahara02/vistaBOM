/**
 * Type definitions for Svelte components
 * This helps TypeScript understand component props better
 */

// Import SvelteComponentTyped
import type { SvelteComponentTyped } from 'svelte';

// Define constructors for specific component types
// This ensures we can use them properly in type assertions
declare global {
  type ComponentConstructorTyped<Props, Events = any, Slots = any> = new (
    ...args: any[]
  ) => SvelteComponentTyped<Props, Events, Slots>;
}

// Explicitly declare the cmdk-sv Components to prevent TypeScript errors
declare module 'cmdk-sv' {
  class Root extends SvelteComponentTyped<{
    value?: string;
    class?: string;
  }> {}
  
  class Input extends SvelteComponentTyped<{
    value?: string;
    placeholder?: string;
    class?: string;
  }> {}
  
  class List extends SvelteComponentTyped<{
    class?: string;
  }> {}
  
  class Empty extends SvelteComponentTyped<{
    class?: string;
  }> {}
  
  class Group extends SvelteComponentTyped<{
    heading?: string;
    class?: string;
  }> {}
  
  class Item extends SvelteComponentTyped<{
    value?: string;
    disabled?: boolean;
    onSelect?: (value: string) => void;
    class?: string;
  }> {}
  
  class Separator extends SvelteComponentTyped<{
    class?: string;
  }> {}
  
  class Shortcut extends SvelteComponentTyped<{
    class?: string;
  }> {}
  
  export const Command: {
    Root: typeof Root;
    Input: typeof Input;
    List: typeof List;
    Empty: typeof Empty;
    Group: typeof Group;
    Item: typeof Item;
    Separator: typeof Separator;
    Shortcut: typeof Shortcut;
  };
}
