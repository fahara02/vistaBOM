/// <reference types="svelte" />
/// <reference types="vite/client" />

// Declare Svelte component file extensions
declare module '*.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType;
  export default component;
}
