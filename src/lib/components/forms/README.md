# VistaBOM Form Component Structure

## Overview

This directory contains the standardized form components used throughout the VistaBOM application. All form components follow a consistent pattern to ensure maintainability, reusability, and proper TypeScript typing.

## Key Design Principles

1. **Single Source of Truth**: All form schemas are defined in `$lib/schema/schema.ts` and types come from `$lib/types`
2. **Strict TypeScript**: No use of `any`/`unknown` types - all components use proper type definitions
3. **Consistent Structure**: All forms follow the Props → Derived → Methods pattern
4. **Dark Mode Support**: All forms use CSS variables for seamless light/dark mode transitions
5. **SuperForm Integration**: All forms use sveltekit-superforms for validation and submission
6. **Zod Validation**: All forms use Zod schemas for strict validation

## Form Components

### Core Entity Forms

- **CategoryForm.svelte**: Form for creating and editing categories
- **ManufacturerForm.svelte**: Form for creating and editing manufacturers
- **SupplierForm.svelte**: Form for creating and editing suppliers
- **PartForm.svelte**: Form for creating and editing parts
- **ProjectForm.svelte**: Form for creating and editing projects

### Supporting Components

- **CategoryComboBox.svelte**: Select component for choosing parent categories
- **ManufacturerSelector.svelte**: Component for selecting manufacturers
- **MultiCategorySelector.svelte**: Component for selecting multiple categories

## Common Form Props

All form components accept these standard props:

```typescript
// Standard form props
export let form: any = undefined; // The form object (SuperForm or direct data)
export let currentUserId: string = ''; // Current user ID for authorization
export let editMode: boolean = false; // Whether form is in create or edit mode
export let [entity]Id: string | null = null; // ID of entity being edited
export let onComplete: () => void = () => {}; // Callback when form submission completes
export let submitting: boolean = false; // Whether the form is submitting (outside SuperForm)
export let hideButtons: boolean = false; // Option to hide submit/cancel buttons
export let isStandalone: boolean = false; // Whether used standalone vs. in dashboard

// Dashboard integration props (optional)
export let storeRefs: {
    show[Entity]Form?: any,
    edit[Entity]Mode?: any,
    // Other store references needed
} = {};
```

## Form Usage Examples

### Basic Usage

```svelte
<script>
  import { CategoryForm } from '$lib/components/forms';
  import { superForm } from 'sveltekit-superforms/client';

  const { form, enhance } = superForm(data.form);
</script>

<CategoryForm {form} {enhance} currentUserId={user.id} />
```

### Dashboard Usage

```svelte
<script>
  import { CategoryForm } from '$lib/components/forms';
  import { showCategoryForm, editCategoryMode, currentCategoryId } from '../store';
</script>

{#if $showCategoryForm}
  <CategoryForm 
    currentUserId={currentUserId}
    editMode={$editCategoryMode}
    categoryId={$currentCategoryId}
    onComplete={() => refreshData()}
    storeRefs={{
      showCategoryForm,
      editCategoryMode,
      currentCategoryId
    }}
  />
{/if}
```

## Form Structure Pattern

All forms follow this general structure:

1. **Imports and Type Definitions**: Import necessary dependencies and define types
2. **Props Definition**: Define all input props with defaults
3. **Reactive Derived Values**: Calculate derived values from props
4. **Form Initialization**: Initialize form with superForm
5. **Methods**: Implement form-specific methods (cancel, submit, etc.)
6. **Template**: Render the form with consistent styling
7. **Styles**: Apply standardized styling with dark mode support

## Migration Notes

These form components are consolidated from previous locations:
- Original dashboard form components (`src/routes/dashboard/components/forms/*`)
- Original component library forms (`src/lib/components/*Form.svelte`)
- Inline form elements in dashboard tab components

When updating dashboard components to use these forms:
1. Update import paths to `$lib/components/forms/[FormName].svelte`
2. Update prop usage to match the new component interface
3. Pass dashboard-specific store references via the `storeRefs` prop
