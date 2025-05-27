<!-- src/lib/components/dashboard/categories-tab.svelte -->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import CategoryCard from '$lib/components/cards/category.svelte';
    import CategoryForm from '$lib/components/forms/CategoryForm.svelte';
    import GridView from '$lib/components/grid/GridView.svelte';
    import { superForm, superValidate } from 'sveltekit-superforms/client';
    import { zod } from 'sveltekit-superforms/adapters';
    import type { SuperValidated } from 'sveltekit-superforms';
    import { z } from 'zod';
 
    // Import types
    import type { Category, JsonValue } from '$lib/types/types';
    import type { GridEntity } from '$lib/types/grid';
    
    // Define a CategoryWithParent interface that extends Category with parent_name
    interface CategoryWithParent extends Category {
        parent_name?: string | undefined;
    }
    

    
    // Import the category form schema from the central schema definition
    import { categoryFormSchema } from '$lib/schema/schema';
    
    // Create type from the imported schema
    type CategoryFormSchema = z.infer<typeof categoryFormSchema>;

    // Define a type for form data with strict schema compliance and UI fields
    type CategoryFormWithUI = {
        [key: string]: unknown;
        // Schema fields with proper types
        category_id: string;
        category_name: string;
        category_description: string | null;
        parent_id: string | null;
        is_public: boolean;
        // UI display field (not in schema)
        parent_name?: string | null;
    };

    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Props
    export let categories: CategoryWithParent[] = [];
    // All categories (including public ones from other users) for parent selection
    export let allCategories: CategoryWithParent[] = [];
    export let currentUserId: string;
    export let showForm: boolean = false;
    export let editMode: boolean = false;
    
    // Track categories array changes for reactivity
    let currentCategories: CategoryWithParent[] = [];
    $: if (categories !== currentCategories) {
       
        currentCategories = categories;
    }

    // Form data - used to populate the CategoryForm component
    export let categoryForm: CategoryFormSchema = {
        category_id: '',
        category_name: '',
        category_description: null,
        parent_id: null,
        is_public: true
    };
    
    // Additional prop for parent category name (for display purposes)
    // Parent category name passed from parent component for display purposes
    // This is processed and provided to the CategoryComboBox via the mapped categories
    // Used when parent_id is available but the matching category isn't in the categories array
    export let parentCategoryName: string | null = null;
    export let categoryErrors: Record<string, string | string[]> = {};

    // Form action for submission (defined as const since it's only for reference)
    export const formAction = '?/category';
    
    // Local state
    let selectedCategory: CategoryWithParent | null = null;
    let viewMode: 'grid' | 'list' = 'grid'; // Default to grid view
    let hiddenFormElement: HTMLFormElement;
    
    // Initialize the form with SuperForm validation for the CategoryForm component
    // Create a proper instance of the validated form using the schema
    let formData;
    onMount(async () => {
        formData = await superValidate(zod(categoryFormSchema));
    });
    
    // Initialize SuperForm with proper options
    const { form } = superForm(formData || zod(categoryFormSchema), {
        resetForm: true,
        // json dataType is needed for the client-side only to handle the form submission properly
        dataType: 'json' 
    });
    
    // This ensures the form is properly validated with the Zod schema before submission
    
    // Define initial form data structure
    let categoryFormData: CategoryFormSchema = {
        category_name: '',
        category_description: null,
        parent_id: null,
        is_public: true
    };
    
    // Default values for internal form to avoid undefined errors
    const defaultFormValues: CategoryFormSchema = {
        category_id: '',
        category_name: '',
        category_description: null,
        parent_id: null,
        is_public: true
    };

    // Prepare for SuperForm state tracking
    // Track current category being edited
       
    // Local form data that will be used in the CategoryForm component
    // We ensure the parent_name is populated from categories if parent_id exists
    $: localFormData = editMode && categoryForm ? {
        ...categoryForm,
        // Ensure null instead of undefined for parent_id
        parent_id: categoryForm.parent_id || null,
        parent_name: categoryForm.parent_id ? 
            categories.find(c => c.category_id === categoryForm.parent_id)?.category_name || 
            parentCategoryName : null
    } : defaultFormValues;
    
    // Initialize form data with defaults when needed
    function resetFormData() {
        categoryForm = { ...defaultFormValues };
    }
   
    // Methods
    function cancelForm(): void {
        // Reset the form data to defaults
        categoryForm = { ...defaultFormValues };
        
        // Reset form state
        showForm = false;
        editMode = false;
        selectedCategory = null;
        
        // Notify parent component
        dispatch('refreshData');
    }
    
    // Handles category deletion from both grid view (itemId) and category card (categoryId)
    async function handleCategoryDeleted(event: CustomEvent<{itemId?: string; categoryId?: string}>): Promise<void> {
        // Get the ID from either itemId (GridView) or categoryId (CategoryCard)
        const categoryId = event.detail.itemId || event.detail.categoryId;
        if (!categoryId) return;
        
        try {
            // Use the proper REST API endpoint for category deletion
            const response = await fetch(`/category/${categoryId}`, {
                method: 'DELETE',  // Use DELETE method for REST API
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                // Try to parse error response
                let errorData: { message?: string } = {};
                try {
                    const responseText = await response.text();
                    try {
                        errorData = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('Failed to parse error as JSON:', parseError);
                    }
                } catch (textError) {
                    console.error('Failed to get response text:', textError);
                }
                
                throw new Error(errorData?.message || `Delete failed with status ${response.status}`);
            }
            
            // Successful deletion, refresh the data
            dispatch('refreshData');
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(`Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    // Initialize on component mount
    onMount(() => {
 
    });
    
    // Update the form data when a category is selected for editing
    $: if (editMode && selectedCategory) {
        
    }
    
    // Form data tracking
    $: currentFormData = categoryForm;
    $: formErrors = categoryErrors;
    
    // Debug each category to find any differences between how grid and list view access them
    $: {
     
        categories.forEach(cat => {
            if (cat.parent_id) {
                const parent = categories.find(p => p.category_id === cat.parent_id);
                
            }
        });
    }
    
    // Process categories for grid view to ensure proper display
    let gridItems: CategoryWithParent[] = [];
    $: {
        
        
        // Create properly typed grid items with all required properties
        gridItems = categories.map(cat => {
            // CRITICAL FIX: Better parent name resolution
            // Start with a strongly typed variable for the parent name
            let parentName: string | undefined = undefined;
            
            // Step 1: Check if server-provided parent_name is available
            if (cat.parent_name && typeof cat.parent_name === 'string' && cat.parent_name.length > 0) {
                parentName = cat.parent_name;
                
            }
            
            // Step 2: If parent_id exists but no parent_name, try to resolve from local categories
            else if (cat.parent_id) {
                // Find the parent category by ID
                const parent = categories.find(p => p.category_id === cat.parent_id);
                if (parent && parent.category_name) {
                    parentName = parent.category_name;

                }
                // CRITICAL: If we still don't have a parent name but have an ID, log this as an error
                else {
                    console.error(`Failed to resolve parent name for category ${cat.category_name} with parent ID ${cat.parent_id}`);
                    // Use a placeholder to avoid showing the UUID
                    parentName = 'Unknown Parent';
                }
            }
            
            // Simply ensure the parent_name field is correctly set from the database
            
            // Create a complete category object that matches the expected schema
            const categoryItem: CategoryWithParent = {
                category_id: cat.category_id,
                category_name: cat.category_name, 
                category_path: cat.category_path || '',
                parent_id: cat.parent_id || null,
                category_description: cat.category_description || null,
                is_public: typeof cat.is_public === 'boolean' ? cat.is_public : true,
                is_deleted: cat.is_deleted || false,
                created_at: cat.created_at || new Date(),
                updated_at: cat.updated_at || new Date(),
                created_by: cat.created_by || currentUserId,
                // Use the parent_name from server or find it in categories array
                parent_name: cat.parent_name || (cat.parent_id ? 
                    categories.find(p => p.category_id === cat.parent_id)?.category_name || 'Unknown Parent' : 
                    undefined)
            };
            
            // Skip debug logging
            
            return categoryItem;
        });
    }
    
    // Handle grid entity edit
    function handleGridCategoryEdit(event: CustomEvent<{ item: GridEntity }>) {
        // The item comes from GridView
        const category = event.detail.item as CategoryWithParent;
        

        
        // Ensure all required properties exist for the form
        if (!category.category_id || !category.category_name) {
            console.error('Invalid category data received from grid:', category);
            return;
        }
        
        selectedCategory = category;

        
        // Set edit mode
        editMode = true;
        
        // Find parent category name if parent_id exists
        if (category.parent_id) {
            const parentCategory = categories.find(c => c.category_id === category.parent_id);
            if (parentCategory) {
                // Store parent name separately for UI
                parentCategoryName = parentCategory.category_name;
            }
        }
        
        // Update the form data
        updateCategoryForm(category);
        
        // Show the form
        showForm = true;
    }
    
    // Handle form submission
    function handleFormSubmit(event: CustomEvent<{ success: boolean; formData: any }>) {
      
        
        if (event.detail.success) {
            const newCategory = event.detail.formData;
            
            // Reset form state
            showForm = false;
            editMode = false;
            selectedCategory = null;
            
            // Notify parent to refresh data
            dispatch('refreshData');
        }
    }
    
    // Update category form without using SuperForm directly in main component
    function updateCategoryForm(category: CategoryWithParent | null) {
        // Reset form state and refresh data if no category
        if (!category) {
            categoryFormData = { ...defaultFormValues };
            return;
        }
        
        // Update form data with selected category values
        categoryFormData = {
            category_id: category.category_id,
            category_name: category.category_name,
            category_description: category.category_description || null,
            parent_id: category.parent_id || null,
            is_public: typeof category.is_public === 'boolean' ? category.is_public : true
        };
    }
    
    // Function to submit the form
    function submitForm(): void {
        // Manually validate before submission
        if (!categoryForm.category_name || categoryForm.category_name.trim() === '') {
            alert('Category name is required');
            return;
        }
        
      
        
        // Find and submit the form
        const formElement = document.querySelector('form.category-form');
        if (formElement instanceof HTMLFormElement) {
            formElement.requestSubmit();
        }
    }
</script>

<div>  
    <div class="view-mode-toggle">
        <button 
            class:active={viewMode === 'grid'} 
            on:click={() => viewMode = 'grid'} 
            aria-label="Grid View"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-grid">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
            </svg>
        </button>
        <button 
            class:active={viewMode === 'list'} 
            on:click={() => viewMode = 'list'} 
            aria-label="List View"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-list"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="3" cy="6" r="1"></circle><circle cx="3" cy="12" r="1"></circle><circle cx="3" cy="18" r="1"></circle></svg>
        </button>
    </div>
    
   
    <div class="actions">
        <button type="button" class="enhanced-btn" on:click={() => { showForm = !showForm; editMode = false; }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            {showForm ? 'Cancel' : 'Add Category'}
        </button>
    </div>
    
    <!-- Grid or List View -->
    {#if viewMode === 'grid'}
        <GridView 
            items={gridItems} 
            entityType="category"
            currentUserId={currentUserId}
            on:edit={(e) => handleGridCategoryEdit(e)}
            on:delete={handleCategoryDeleted}
        />
    {:else}
        <!-- List View -->
        <div class="category-list">
            {#if categories.length > 0}
                {#each categories as category (category.category_id)}
                    <CategoryCard 
                        {category} 
                        on:edit={() => {
                            selectedCategory = category;
                            editMode = true;
                            categoryForm = {
                                category_id: category.category_id || '',
                                category_name: category.category_name || '',
                                category_description: category.category_description || null,
                                parent_id: category.parent_id || null,
                                is_public: typeof category.is_public === 'boolean' ? category.is_public : true
                            };
                            showForm = true;
                        }}
                        on:deleted={handleCategoryDeleted}
                    />
                {/each}
            {:else}
                <div class="empty-state">
                    <p>No categories found. Create a category to get started.</p>
                </div>
            {/if}
        </div>
    {/if}
    {#if showForm}
        <div class="form-container enhanced-form" transition:slide={{ duration: 300 }}>
            <h2 class="form-title">{editMode ? 'Edit Category' : 'Create New Category'}</h2>
            <CategoryForm 
                form={form}
                currentUserId={currentUserId}
                editMode={editMode}
                categoryId={editMode ? selectedCategory?.category_id || null : null}
                categories={allCategories}
                onComplete={() => {
                    // Reset form state and refresh data
                    showForm = false;
                    editMode = false;
                    selectedCategory = null;
                    dispatch('refreshData');
                }}
            />
        </div>
    {/if}
</div>

<style>
   
    h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        color: hsl(var(--foreground));
    }
    
    .actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1.5rem;
    }
    
    .enhanced-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .enhanced-btn:hover {
        background: hsl(var(--primary-dark));
    }
    
    .enhanced-btn svg {
        width: 1.25rem;
        height: 1.25rem;
    }
    
    .view-mode-toggle {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .view-mode-toggle button {
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        border: none;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s;
    }
    
    .view-mode-toggle button.active {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
    }
    
    .view-mode-toggle button svg {
        width: 1.25rem;
        height: 1.25rem;
    }
    
    .category-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    .empty-state {
        background-color: hsl(var(--muted) / 0.3);
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .empty-state p {
        color: hsl(var(--muted-foreground));
        margin: 0;
    }
    
    .form-container {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 1.5rem;
    }
    
    .form-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        color: hsl(var(--card-foreground));
    }
    
   
    

   
    
    @media (max-width: 768px) {
       
        
        .actions {
            flex-direction: column;
        }
    }
    
    @media (max-width: 600px) {
        .category-list {
            grid-template-columns: 1fr;
        }
    }
</style>
