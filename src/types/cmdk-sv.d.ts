/**
 * Type declarations for cmdk-sv package
 */
declare module 'cmdk-sv' {
  // Define a generic component type that accepts any props
  // This approach ensures maximum flexibility for the components
  type AnyComponent = any;

  export class Command {
    static Root: AnyComponent;
    static Input: AnyComponent;
    static List: AnyComponent;
    static Empty: AnyComponent;
    static Group: AnyComponent;
    static Item: AnyComponent;
    static Separator: AnyComponent;
    static Shortcut: AnyComponent;
  }
}

// Extend Svelte's declarations to correctly handle command components
declare namespace svelteHTML {
  interface IntrinsicElements {
    'command-input': any;
    'command-list': any;
    'command-empty': any;
    'command-group': any;
    'command-item': any;
    'command-separator': any;
    'command-shortcut': any;
  }
}
