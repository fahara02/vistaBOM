<!-- src/lib/components/forms/CategoryForm.svelte -->
<script lang="ts">
    // Import SuperForm dependencies
    import { superForm, superValidate } from 'sveltekit-superforms/client';
    import { zod } from 'sveltekit-superforms/adapters';
    import { categoryFormSchema } from '$lib/schema/schema';
    import { z } from 'zod';
    import CategoryComboBox from '$lib/components/forms/CategoryComboBox.svelte';
    import { onMount, createEventDispatcher } from 'svelte';
    
    // Import types from centralized type definitions
    import type { Category } from '$lib/types/types';
    
    // Define extended Category type with parent_name field
    interface CategoryWithParent extends Category {
        parent_name?: string;
    }

    // Define the type based on the schema for type safety
    type CategoryFormType = z.infer<typeof categoryFormSchema>;

    // Props - follow Props → Derived → Methods pattern
    export let form; // The form data from the server - must be a SuperForm validated form
    export let currentUserId: string = ''; // User ID is used in form submission
    export let editMode: boolean = false;
    export let categoryId: string | null = null;
    export let onComplete = () => {
        dispatch('formComplete');
    };
    export let categories: CategoryWithParent[] = []; // Categories can be passed directly or via store
    export let hideButtons: boolean = false; // Option to hide buttons
    
    import { derived, type Readable } from 'svelte/store';
    import type { Writable } from 'svelte/store';
    
    // Define proper types for the store references
    export let storeRefs: {
        showCategoryForm?: Writable<boolean>,
        editCategoryMode?: Writable<boolean>,
        currentCategoryId?: Writable<string | null>,
        allCategories?: Readable<CategoryWithParent[]>
    } = {}; 

    // Top level store subscriptions to make Svelte happy
    $: allCategoriesStore = storeRefs.allCategories;
    $: showCategoryFormStore = storeRefs.showCategoryForm;
    $: editCategoryModeStore = storeRefs.editCategoryMode;
    $: currentCategoryIdStore = storeRefs.currentCategoryId;
    
    // Handle categories from different sources
    let categoriesArray: CategoryWithParent[] = [];
    
    // Update categoriesArray when store changes or direct categories change
    $: {
        if (allCategoriesStore) {
            // We can now use the $ syntax with the top-level store variable
            categoriesArray = $allCategoriesStore || [];
        } else {
            // Use direct categories prop if no store is provided
            categoriesArray = categories;
        }
    }
    
    // Generate parent category options that match the expected format
    $: parentOptions = categoriesArray.map(cat => ({
        category_id: cat.category_id,
        category_name: cat.category_name,
        parent_id: cat.parent_id,
        parent_name: cat.parent_name
    }));
    
    // Create event dispatcher for component communication
    const dispatch = createEventDispatcher();
    
    // Store for found category to edit
    let categoryToEdit: CategoryWithParent | null = null;
    
    // Reference to the form element for direct DOM access if needed
    let formElement: HTMLFormElement;

    // Use the categoryFormSchema for validation
    
    // Reference to store parent_id value for form submission separate from SuperForm's store
    // This is crucial as it allows us to track the value independently of SuperForm's serialization
    let parentIdValue: string | null = null;
    
    // Track parent ID changes to ensure it's available during form submission
    function updateParentId(newParentId: string | null): void {
        
        parentIdValue = newParentId;
    }
   
    
    // Get the current form data value outside of callbacks for reference
    let storedFormDataParentId: string | null = null;
    
    // Track formData changes to have a stable reference for submission
    $: if ($formData) {
        storedFormDataParentId = $formData.parent_id;
    }
    
    // Initialize the form with proper SuperForm validation using Zod schema
    const { form: formData, errors, enhance, submitting } = superForm(form, {
        validators: zod(categoryFormSchema),
        resetForm: true,
        taintedMessage: null, // No warning on navigation
        dataType: 'json', // Required for client-side only to handle the form submission with union types
        onSubmit: ({ formData, cancel }) => {
            // Add user ID for tracking who created/updated the category
            if (currentUserId) {
                formData.append('created_by', currentUserId);
            }
            
            // For edit mode, ensure category_id is included
            if (editMode && categoryId) {
                formData.append('category_id', categoryId);
            }
            
            

            // Check both tracking systems - use stored value instead of $formData to avoid store subscriptions
            const parentIdToSubmit = parentIdValue || storedFormDataParentId;
            
            
            
            
            // This bypasses SuperForm's JSON serialization and ensures the value is submitted correctly
            if (parentIdToSubmit) {
                // Force the parent_id to be a direct form field
                formData.set('parent_id', parentIdToSubmit);
              
            }
        },
        onResult: ({ result }) => {
           
            if (result.type === 'success') {
                onComplete();
            }
        }
    });
    
    // Initialize the form when component mounts
    onMount(() => {
        // Initialize form with data from categories if in edit mode
        if (editMode && categoryId) {
            const editCategory = categoriesArray.find(cat => cat.category_id === categoryId);
            if (editCategory) {
                // Set values from found category
                categoryToEdit = editCategory;
                // Get parent_id from the category
                const initialParentId = editCategory.parent_id || null;
                
                // Update form data with type-safe values that match the schema
                $formData = {
                    category_name: editCategory.category_name,
                    parent_id: initialParentId,
                    category_description: editCategory.category_description || null,
                    is_public: editCategory.is_public === undefined ? true : editCategory.is_public
                };
                
                // Initialize tracking variables
                updateParentId(initialParentId);
                
                
            }
        } else {
            // Reset form for new category with default values that match the schema
            $formData = {
                category_name: '',
                parent_id: null,
                category_description: null,
                is_public: true
            };
            
            // Initialize tracking variables
            updateParentId(null);
            
           
        }
    });
    
    // Methods
    function cancelForm() {
        // Reset form data
        $formData = {
            category_name: '',
            parent_id: null,
            category_description: null,
            is_public: true
        };
        
        // Reset stores if provided
        if (showCategoryFormStore) {
            showCategoryFormStore.set(false);
        }
        
        if (editCategoryModeStore) {
            editCategoryModeStore.set(false);
        }
        
        if (currentCategoryIdStore) {
            currentCategoryIdStore.set(null);
        }
        
        // Dispatch event for parent component
        dispatch('cancel');
    }

    // Handle category selection from the CategoryComboBox component
    function handleParentChange(event: CustomEvent<{value: string | null, label?: string, source?: string}>) {
        // Extract the selected parent ID from the event
        const selectedParentId = event.detail.value;
        
       
        
        // Validate and normalize the parent_id value
        // - Convert empty strings to null for the database
        // - Keep valid UUIDs as-is
        const validatedParentId = selectedParentId === '' ? null : selectedParentId;
        
        // CRITICAL FIX: Update all tracking systems to ensure form submission works
        // 1. Update SuperForm's data store for validation and UI consistency
        $formData.parent_id = validatedParentId;
        
        // 2. Update our separate tracking variable for form submission
        updateParentId(validatedParentId);
        
    
    }
    
    // Using standard SuperForm handling for validation and submission
    // This ensures we don't bypass any validation and follow the schema
</script>

<div class="form-container">
    {#if !hideButtons}
        <h3 class="form-title">{editMode ? 'Edit Category' : 'Add New Category'}</h3>
    {/if}
    
    <form
        method="POST"
        action="?/category"
        use:enhance
        bind:this={formElement}
    >
        <!-- No hidden input needed - we're handling parent_id via SuperForm -->
        <!-- No user ID shown in form for security reasons - it's added during submission -->
        
        <div class="form-field">
            <label for="category_name">
                Category Name <span class="required">*</span>
            </label>
            <input
                id="category_name"
                name="category_name"
                bind:value={$formData.category_name}
                class="enhanced-input"
                placeholder="Enter category name"
                required
            />
            {#if $errors.category_name}
                <div class="field-error">{$errors.category_name}</div>
            {/if}
        </div>
        
        <div class="form-field">
            <label for="category_description">Description</label>
            <textarea
                id="category_description"
                name="category_description"
                bind:value={$formData.category_description}
                placeholder="Enter category description"
                rows="3"
                class="enhanced-input form-textarea"
            ></textarea>
            {#if $errors.category_description}
                <div class="field-error">{$errors.category_description}</div>
            {/if}
        </div>
        
        <div class="form-field">
            <label for="parent_id">Parent Category</label>
            <CategoryComboBox
                name="parent_id"
                on:categorySelected={handleParentChange}
                on:change={handleParentChange}
                categories={parentOptions}
                value={$formData.parent_id || null}
                placeholder="Select a parent category (optional)"
            />
            {#if $errors.parent_id}
                <div class="field-error">{$errors.parent_id}</div>
            {/if}
        </div>
        
        <div class="form-field checkbox-field">
            <input
                type="checkbox"
                id="is_public"
                name="is_public"
                bind:checked={$formData.is_public}
                class="checkbox-input"
            />
            <label for="is_public" class="checkbox-label">
                Public Category (visible to all users)
            </label>
            {#if $errors.is_public}
                <div class="field-error">{$errors.is_public}</div>
            {/if}
        </div>
        
        <div class="form-actions">
            {#if !hideButtons}
                <button type="button" class="cancel-btn enhanced-btn" on:click={cancelForm}>Cancel</button>
            {/if}
            <button type="submit" class="submit-btn enhanced-btn" disabled={$submitting}>
                {$submitting ? 'Submitting...' : (editMode ? 'Update' : 'Create') + ' Category'}
            </button>
        </div>
    </form>
    
    <!-- Success/error message would go here -->

</div>

<style>
    .form-container {
        background-color: hsl(var(--surface-100));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .form-title {
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.25rem;
        color: hsl(var(--foreground));
        padding-bottom: 0.5rem;
        border-bottom: 1px solid hsl(var(--border));
        transition: color 0.3s, border-color 0.3s;
    }
    
    .form-field {
        margin-bottom: 1.25rem;
    }
    
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: hsl(var(--foreground));
        transition: color 0.3s;
    }
    
    .enhanced-input {
        border: 1px solid hsl(var(--input-border));
        border-radius: 6px;
        padding: 0.75rem;
        font-size: 1rem;
        width: 100%;
        background-color: hsl(var(--input));
        color: hsl(var(--input-foreground));
        transition: border-color 0.15s, background-color 0.3s, color 0.3s;
    }
    
    .enhanced-input:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }
    
    .enhanced-input::placeholder {
        color: hsl(var(--muted-foreground));
    }
    
    .form-textarea {
        resize: vertical;
        min-height: 100px;
    }
    
    .checkbox-field {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
   
    
    .field-error {
        color: hsl(var(--destructive));
        font-size: 0.875rem;
        margin-top: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: hsl(var(--destructive) / 0.2);
        border-radius: 4px;
        border: 1px solid hsl(var(--destructive));
        transition: color 0.3s, background-color 0.3s, border-color 0.3s;
    }
    
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
    }
    
    .enhanced-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 6px;
        transition: all 0.15s ease;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid transparent;
    }
    
    .cancel-btn {
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        border-color: hsl(var(--border));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .cancel-btn:hover {
        background-color: hsl(var(--muted));
        border-color: hsl(var(--muted-foreground));
    }
    
    .submit-btn {
        background-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-color: hsl(var(--primary-dark));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .submit-btn:hover {
        background-color: hsl(var(--primary-dark));
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .required {
        color: hsl(var(--destructive));
    }
    
   
</style>
