<!-- src/lib/components/cards/category.svelte -->
<script lang="ts">
    import type { Category } from '$lib/types/schemaTypes';
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import * as Dialog from '$lib/components/ui/dialog';
    import CategoryComboBox from '$lib/components/forms/CategoryComboBox.svelte';

    const dispatch = createEventDispatcher<{
        deleted: { categoryId: string };
        edit: { category: Category & { parent_name?: string } };
    }>();

    export let category: Category & { parent_name?: string }; // Add parent_name as an optional property
    export let allowEdit = true;
    export let allowDelete = true;
    export let showConfirmation = true;

    let editMode = false;
    let edits: {
        category_name: string;
        category_description: string;
        parent_id: string;
        is_public: boolean;
    } = {
        category_name: '',
        category_description: '',
        parent_id: '',
        is_public: false
    };
    let showDeleteConfirm = false;
    let isDeleting = false;
    let formErrors: { message?: string } = {};
    let isSaving = false;
    let error: string | null = null;
    let success: string | null = null;
    let abortController = new AbortController();
    let allCategories: (Category & { parent_name?: string })[] = [];
    
    onDestroy(() => {
        abortController.abort();
    });
    
    // Format field names from camelCase to Title Case with spaces
    function formatFieldName(fieldName: string): string {
        // Add space before capital letters and capitalize the first letter
        const formatted = fieldName
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
        return formatted.trim();
    }

    onDestroy(() => {
        abortController.abort();
    });

    // Load all categories for parent selection when edit mode starts
    const loadCategories = async () => {
        if (allCategories.length > 0) return; // Already loaded
        
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                allCategories = data.filter((cat: Category) => cat.category_id !== category.category_id);
            }
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    };

    // Track if the edit event was handled by a parent component
    let editHandledByParent = false;
    
    const startEdit = async () => {
       
        
        // Create a promise to track if the event was handled
        const eventPromise = new Promise<boolean>((resolve) => {
            // Set a timeout to detect if no parent component handles the event
            const timeoutId = setTimeout(() => resolve(false), 100);
            
            // Use a one-time listener to detect if the event was handled
            const handleEditResponse = () => {
                clearTimeout(timeoutId);
                editHandledByParent = true;
                resolve(true);
                // Remove the one-time listener
                window.removeEventListener('category:edit:handled', handleEditResponse);
            };
            window.addEventListener('category:edit:handled', handleEditResponse, { once: true });
        });
        
        // Dispatch the edit event
        dispatch('edit', { category: category });
        
        // Wait to see if event was handled
        const wasHandled = await eventPromise;
        
        // Only proceed with local editing if not handled by parent
        if (!wasHandled) {
            // If we're in a standalone context, we'll set up local editing
            edits = { 
                category_name: category.category_name,
                category_description: category.category_description || '',
                parent_id: category.parent_id || '',
                is_public: Boolean(category.is_public)
            };
            await loadCategories(); // Load categories for the ComboBox
            editMode = true;
        }
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {
            category_name: '',
            category_description: '',
            parent_id: '',
            is_public: false
        };
        error = null;
    };

    const saveCategory = async () => {
        error = null;
        success = null;
        isSaving = true;
        abortController = new AbortController();
        
        try {
            // Use FormData for submission (SvelteKit form actions require FormData)
            const formData = new FormData();
            formData.append('category_name', edits.category_name);
            formData.append('category_description', edits.category_description || '');
            formData.append('parent_id', edits.parent_id || '');
            formData.append('categoryId', category.category_id); // Add ID for edit mode
            
            // Handle checkbox field
            if (edits.is_public) {
                formData.append('is_public', 'true');
            } else {
                formData.append('is_public', 'false');
            }

            // Post to the dashboard named action instead of direct URL
            const response = await fetch(`/dashboard?/category`, {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });

            if (!response.ok) {
                // Try to parse error response
                let errorData: { message?: string } = { message: '' };
                try {
                    const jsonData = await response.json();
                    errorData = jsonData as { message?: string };
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                }
                
                throw new Error(errorData.message || `Failed to update category (status: ${response.status})`);
            }
            
            // Get the updated category data from the response if available
            try {
                const updatedData = await response.json();
                if (updatedData?.category) {
                    // Use the returned data to update the local object
                    Object.assign(category, updatedData.category);
                } else {
                    // Fallback to manual update if the response doesn't include category data
                    category.category_name = edits.category_name;
                    category.category_description = edits.category_description;
                    category.parent_id = edits.parent_id;
                    category.is_public = edits.is_public;
                }
            } catch (parseError) {
                // If response parsing fails, fall back to manual update
                category.category_name = edits.category_name;
                category.category_description = edits.category_description;
                category.parent_id = edits.parent_id;
                category.is_public = edits.is_public;
            }
            
            success = 'Category updated successfully';
            setTimeout(() => success = null, 3000);
            editMode = false;
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
                console.error('Update category error:', e);
            }
        } finally {
            isSaving = false;
        }
    };


    
    onDestroy(() => {
        if (abortController) abortController.abort();
    });
    
    const removeCategory = async () => {
        // First step is just to show the confirmation dialog
        if (showConfirmation && !showDeleteConfirm) {
            console.log('Opening delete confirmation dialog for category:', category.category_id);
            showDeleteConfirm = true;
            return;
        }
        
       
        showDeleteConfirm = false;
        
        error = null;
        isDeleting = true;
        
        try {
            console.log('Attempting to delete category:', category.category_id);
            
            // First abort any pending request
            if (abortController) abortController.abort();
            abortController = new AbortController();
            
            // Use the proper REST API endpoint for category deletion
            const response = await fetch(`/category/${category.category_id}`, {
                method: 'DELETE',  // Use DELETE method for REST API
                credentials: 'same-origin',
                signal: abortController.signal
            });
            
           
            if (!response.ok) {
                // Try to parse error response
                let errorData: { message?: string } = {};
                try {
                    const responseText = await response.text();
                    console.log('Error response text:', responseText);
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
            
            // Use proper Svelte event dispatching
            dispatch('deleted', { categoryId: category.category_id });
            
            success = 'Category deleted successfully';
          
            
            // Need to trigger a refresh - both CategoryItem and we need this
            window.location.reload();
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
                console.error('Delete category error:', e);
            }
        } finally {
            isDeleting = false;
        }
    };
</script>

<div class="category-card {isDeleting ? 'deleting' : ''} {isSaving ? 'saving' : ''}">
    <!-- No form needed for the direct fetch approach -->
    <Dialog.Root bind:open={showDeleteConfirm}>
        <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content>
                <Dialog.Header>
                    <Dialog.Title>Confirm Deletion</Dialog.Title>
                    <Dialog.Description>
                        Are you sure you want to delete the category '{category.category_name}'?
                        This action cannot be undone.
                    </Dialog.Description>
                </Dialog.Header>
                <div class="flex justify-end gap-2 p-4">
                    <button 
                        type="button" 
                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100" 
                        on:click={() => showDeleteConfirm = false}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600" 
                        on:click={removeCategory}
                    >
                        Delete
                    </button>
                </div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>

    {#if error}
        <div class="alert error">{error}</div>
    {/if}
    
    {#if success}
        <div class="alert success">{success}</div>
    {/if}
    
    {#if !editMode}
        <div class="view-mode">
            <h2>{category.category_name}</h2>
            
            <div class="details">
                {#if category.category_description}
                    <p class="description">{category.category_description}</p>
                {/if}
                
                <div class="category-meta">
                    <!-- Always show parent name when available, regardless of parent_id -->
                    {#if category.parent_name}
                        <p class="parent"><strong>Parent:</strong> {category.parent_name}</p>
                    {/if}
                    <p class="public-status"><strong>Public:</strong> {category.is_public ? 'Yes' : 'No'}</p>
                </div>
            </div>
            
            <div class="actions">
                {#if allowEdit}
                    <button on:click={startEdit} disabled={isDeleting || isSaving}>
                        {#if isSaving}
                            <span class="loading-spinner"></span>
                        {:else}
                            Edit
                        {/if}
                    </button>
                {/if}
                {#if allowDelete}
                    <button on:click={removeCategory} class="danger" disabled={isDeleting || isSaving}>
                        {#if isDeleting}
                            <span class="loading-spinner"></span>
                        {:else}
                            Delete
                        {/if}
                    </button>
                {/if}
            </div>
        </div>
    {:else}
        <div class="edit-mode">
            <!-- Use standard form with submit handler since the API expects FormData -->
            <form 
                action="?/category" 
                method="POST" 
                use:enhance={(() => {
                    isSaving = true;
                    return ({ update, result }) => {
                        if (result.type === 'error') {
                            error = result.error?.message || 'Failed to save category';
                        } else if (result.type === 'success') {
                            success = 'Category updated successfully';
                            editMode = false;
                            setTimeout(() => success = null, 3000);
                        }
                        isSaving = false;
                    };
                }) as SubmitFunction}
            >
                <input type="hidden" name="categoryId" value={category?.category_id ?? ''} />
                
                <div class="form-group">
                    <label for="category_name">Category Name*</label>
                    <input
                        id="category_name"
                        name="category_name"
                        type="text"
                        bind:value={edits.category_name}
                        required
                    />
                </div>
                
                <div class="form-group">
                    <label for="category_description">Description</label>
                    <textarea 
                        id="category_description" 
                        name="category_description"
                        bind:value={edits.category_description}
                        rows="4"
                    ></textarea>
                </div>
                
                <!-- Only one parent category selector -->
                <div class="form-group">
                    <label for="parent_id">Parent Category</label>
                    <CategoryComboBox
                        categories={allCategories}
                        bind:value={edits.parent_id}
                        initialValue={category?.parent_id ?? ''}
                        initialLabel={category?.parent_name ?? ''}
                        name="parent_id"
                        placeholder="Search or select parent category..."
                        width="w-full"
                    />
                    <small class="help-text">Search by typing to find categories</small>
                </div>
                
                <div class="form-group checkbox">
                    <label for="is_public">
                        <input 
                            type="checkbox" 
                            id="is_public" 
                            name="is_public"
                            bind:checked={edits.is_public} 
                        />
                        <span>Make category public</span>
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="submit">Save Changes</button>
                    <button type="button" on:click={cancelEdit}>Cancel</button>
                </div>
            </form>
        </div>
    {/if}
</div>

<style>
    .category-card {
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: hsl(var(--card));
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        color: hsl(var(--card-foreground));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    /* Enhanced styling for parent category info */
    .parent {
        color: hsl(var(--primary));
        font-weight: 500;
        margin-bottom: 8px;
        padding: 4px 0;
        border-left: 3px solid hsl(var(--primary));
        padding-left: 8px;
    }

    .alert {
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
    }

    .category-card.deleting,
    .category-card.saving {
        opacity: 0.7;
        position: relative;
    }

    .category-card.deleting::before,
    .category-card.saving::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: hsl(var(--background) / 0.25);
        z-index: 1;
        border-radius: 8px;
    }

    .loading-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid hsl(var(--muted-foreground) / 0.3);
        border-top-color: hsl(var(--primary));
        border-radius: 50%;
        animation: spin 1s linear infinite;
        position: relative;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .error {
        background-color: hsl(var(--destructive) / 0.2);
        border: 1px solid hsl(var(--destructive));
        color: hsl(var(--destructive));
    }

    .success {
        background-color: hsl(var(--success) / 0.2);
        border: 1px solid hsl(var(--success));
        color: hsl(var(--success));
    }

    .details {
        margin: 1rem 0;
    }

    .description {
        color: hsl(var(--card-foreground));
        line-height: 1.6;
    }

    .category-meta {
        margin: 1rem 0;
        padding: 0.75rem;
        background: hsl(var(--surface-100));
        border-radius: 6px;
        border: 1px solid hsl(var(--border));
        transition: background-color 0.3s, border-color 0.3s;
    }

    .parent, .public-status {
        margin: 0.25rem 0;
        color: hsl(var(--foreground));
    }

    .meta {
        margin-top: 1.5rem;
        color: hsl(var(--muted-foreground));
        font-size: 0.85em;
        display: flex;
        gap: 1rem;
    }

    .actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.75rem;
    }

    button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        transition: background-color 0.2s, color 0.2s;
    }

    button:hover {
        background: hsl(var(--muted-foreground) / 0.2);
    }

    .danger {
        background: hsl(var(--destructive) / 0.2);
        color: hsl(var(--destructive));
    }

    .danger:hover {
        background: hsl(var(--destructive) / 0.3);
    }

    form {
        display: grid;
        gap: 1.5rem;
    }

    label {
        display: block;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: hsl(var(--foreground));
    }

    input:not([type="checkbox"]), textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid hsl(var(--input-border));
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.9em;
        background-color: hsl(var(--input));
        color: hsl(var(--input-foreground));
        transition: border-color 0.15s, background-color 0.3s, color 0.3s;
    }

    textarea {
        resize: vertical;
        min-height: 100px;
    }

    .checkbox {
        display: flex;
        align-items: center;
    }

    .checkbox label {
        display: flex;
        align-items: center;
        cursor: pointer;
    }

    .checkbox input {
        width: auto;
        margin-right: 0.5rem;
    }

    .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1rem;
    }

    .form-actions button[type="submit"] {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
    }

    .form-actions button[type="submit"]:hover {
        background: hsl(var(--primary-dark));
    }

    .help-text {
        display: block;
        margin-top: 0.25rem;
        color: hsl(var(--muted-foreground));
        font-size: 0.8em;
    }

    input:not([type="checkbox"]):focus, textarea:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }
</style>
