<!-- src/lib/components/forms/CategoryForm.svelte -->
<script lang="ts">
    import { superForm } from 'sveltekit-superforms/client';
    import { categoryFormSchema } from '$lib/schema/schema';
    import { z } from 'zod';
    import CategoryComboBox from '$lib/components/forms/CategoryComboBox.svelte';
    import { onMount } from 'svelte';
    
    // Define the type based on the schema for type safety
    type CategoryFormType = z.infer<typeof categoryFormSchema>;

    // Props - follow Props → Derived → Methods pattern
    export let form: any = undefined; // Allow passing in a form directly
    export let currentUserId: string = ''; // User ID is used in form submission
    export let editMode: boolean = false;
    export let categoryId: string | null = null;
    export let onComplete: () => void = () => {};
    export let categories: any[] = []; // Categories can be passed directly or via store
    export let submitting: boolean = false; // For use outside superForm
    export let hideButtons: boolean = false; // Option to hide buttons
    export const isStandalone: boolean = false; // Whether this is used standalone or in dashboard
    
    import { derived, type Readable } from 'svelte/store';
    import type { Writable } from 'svelte/store';
    
    // Define proper types for the store references
    export let storeRefs: {
        showCategoryForm?: Writable<boolean>,
        editCategoryMode?: Writable<boolean>,
        currentCategoryId?: Writable<string | null>,
        allCategories?: Readable<any[]>
    } = {}; 

    // Top level store subscriptions to make Svelte happy
    $: allCategoriesStore = storeRefs.allCategories;
    $: showCategoryFormStore = storeRefs.showCategoryForm;
    $: editCategoryModeStore = storeRefs.editCategoryMode;
    $: currentCategoryIdStore = storeRefs.currentCategoryId;
    
    // Handle categories from different sources
    let categoriesArray: any[] = [];
    
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
    
    // Generate parent category options
    $: parentOptions = categoriesArray.map(cat => ({
        value: cat.category_id,
        label: cat.category_name
    }));
    
    // Store for found category to edit
    let categoryToEdit: any = null;

    // Initialize superForm or use passed form
    const { form: formStore, errors, enhance: superEnhance, submitting: superSubmitting, message } = superForm(
        // We'll initialize with form or null and update in onMount
        form !== undefined ? form : null as any,
        {
            dataType: 'json',
            resetForm: true,
            onResult: ({ result }) => {
                console.log('CategoryForm submission result:', result);
                if (result.type === 'success') {
                    console.log('Category submission successful, refreshing data...');
                    
                    // First trigger the refresh to get fresh data
                    onComplete();
                    
                    // Small delay before resetting UI state to ensure data has been refreshed
                    setTimeout(() => {
                        console.log('Resetting form state...');
                        
                        // Close the form and reset states
                        if (showCategoryFormStore) {
                            showCategoryFormStore.set(false);
                        }
                        
                        if (editCategoryModeStore) {
                            editCategoryModeStore.set(false);
                        }
                        
                        if (currentCategoryIdStore) {
                            currentCategoryIdStore.set(null);
                        }
                    }, 500);
                }
                // Let superForm handle the rest
                return result;
            }
        }
    );
    
    // Use the correct enhance function
    let enhance = superEnhance;
    
    // Initialize the form when component mounts
    onMount(() => {
        if (form === undefined) { // Only do this if form wasn't passed in directly
            // Import is inside onMount to prevent SSR issues
            import('$app/stores').then(({ page }) => {
                // Initialize the form with data from the page store
                const pageStore = page;
                // Use type assertion to access data property safely
                const pageData = (pageStore as unknown as { data: any }).data;
                
                if (editMode && categoryId) {
                    // Find the category to edit from the categoriesArray
                    categoryToEdit = categoriesArray.find(cat => cat.category_id === categoryId);
                    
                    if (categoryToEdit) {
                        // Initialize form with the category data
                        $formStore = {
                            category_id: categoryToEdit.category_id,
                            category_name: categoryToEdit.category_name,
                            category_description: categoryToEdit.category_description || '',
                            parent_id: categoryToEdit.parent_id || undefined,
                            is_public: categoryToEdit.is_public || false
                        } as CategoryFormType;
                    }
                } else if (pageData?.categoryForm) {
                    // Initialize with the default form data
                    $formStore = pageData.categoryForm.data as CategoryFormType;
                } else {
                    // Initialize with empty values if no form data is available
                    $formStore = {
                        category_name: '',
                        category_description: '',
                        parent_id: undefined,
                        is_public: true
                    } as CategoryFormType;
                }
            });
        }
    });
    
    // Methods
    function cancelForm() {
        // Reset and close the form
        if (showCategoryFormStore) {
            showCategoryFormStore.set(false);
        }
        
        if (editCategoryModeStore) {
            editCategoryModeStore.set(false);
        }
        
        if (currentCategoryIdStore) {
            currentCategoryIdStore.set(null);
        }
        
        onComplete();
    }
    
    function handleParentChange(event: CustomEvent) {
        $formStore.parent_id = event.detail.value;
    }
</script>

<div class="form-container">
    {#if !hideButtons}
        <h3 class="form-title">{editMode ? 'Edit Category' : 'Add New Category'}</h3>
    {/if}
    
    <form
        method="POST"
        action={editMode ? `?/editCategory&id=${categoryId}` : '?/createCategory'}
        use:enhance
    >
        <!-- Hidden fields -->
        {#if editMode && categoryId}
            <input type="hidden" name="category_id" bind:value={$formStore.category_id} />
        {/if}
        <!-- Include currentUserId as hidden field for form submission -->
        {#if currentUserId}
            <input type="hidden" name="created_by" value={currentUserId} />
        {/if}
        
        <div class="form-field">
            <label for="category_name">
                Category Name <span class="required">*</span>
            </label>
            <input
                id="category_name"
                name="category_name"
                bind:value={$formStore.category_name}
                required
                class="enhanced-input"
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
                bind:value={$formStore.category_description}
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
                categories={parentOptions}
                value={$formStore.parent_id}
                placeholder="Select a parent category (optional)"
                on:change={handleParentChange}
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
                bind:checked={$formStore.is_public}
                class="checkbox-input"
            />
            <label for="is_public" class="checkbox-label">
                Public Category (visible to all users)
            </label>
            {#if $errors.is_public}
                <div class="field-error">{$errors.is_public}</div>
            {/if}
        </div>
        
        {#if !hideButtons}
            <div class="form-actions">
                <button type="button" class="cancel-btn enhanced-btn" on:click={cancelForm}>
                    Cancel
                </button>
                <button
                    type="submit"
                    class="submit-btn enhanced-btn"
                    disabled={$superSubmitting || submitting}
                >
                    {$superSubmitting || submitting ? 'Saving...' : editMode ? 'Update Category' : 'Create Category'}
                </button>
            </div>
        {/if}
    </form>
    
    {#if $message}
        <div class="form-message" class:success={$message.type === 'success'} class:error={$message.type === 'error'}>
            {$message.text}
        </div>
    {/if}
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
    
    .checkbox-input {
        width: 1rem;
        height: 1rem;
    }
    
    .checkbox-label {
        margin-bottom: 0;
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
    
    .form-message {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 6px;
        font-size: 0.875rem;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .success {
        background-color: hsl(var(--success) / 0.2);
        color: hsl(var(--success));
        border: 1px solid hsl(var(--success));
    }
    
    .error {
        background-color: hsl(var(--destructive) / 0.2);
        color: hsl(var(--destructive));
        border: 1px solid hsl(var(--destructive));
    }
</style>
