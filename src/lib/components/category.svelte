<!-- src/lib/components/category.svelte -->
<script lang="ts">
    import type { Category } from '@/types/types';
    import { onDestroy } from 'svelte';
    import CategoryComboBox from './CategoryComboBox.svelte';

    export let category: any;
    export const currentUserId: string = ''; // Changed to const as it's not being used directly in the template
    export let allCategories: Category[] = [];

    let editMode = false;
    let edits: any = {};
    let error: string | null = null;
    let success: string | null = null;
    let abortController = new AbortController();
    
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
                allCategories = data.filter((cat: Category) => cat.category_id !== category.id);
            }
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    };

    const startEdit = async () => {
        edits = { 
            name: category.name,
            description: category.description || '',
            parent_id: category.parent_id || '',
            is_public: Boolean(category.is_public)
        };
        await loadCategories(); // Load categories for the ComboBox
        editMode = true;
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {};
        error = null;
    };

    const saveCategory = async () => {
        error = null;
        success = null;
        abortController = new AbortController();
        
        try {
            const formData = new FormData();
            formData.append('name', edits.name);
            formData.append('description', edits.description || '');
            formData.append('parent_id', edits.parent_id || '');
            
            // Handle checkbox field
            if (edits.is_public) {
                formData.append('is_public', 'on');
            }

            const response = await fetch(`/catagory/${category.id}/edit`, {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error('Failed to update category');
            }
            
            // Update the local category data with the edits
            category.name = edits.name;
            category.description = edits.description;
            category.parent_id = edits.parent_id;
            category.is_public = edits.is_public;
            
            success = 'Category updated successfully';
            setTimeout(() => success = null, 3000);
            editMode = false;
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
            }
        }
    };

    const removeCategory = async () => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        
        try {
            const response = await fetch(`/catagory/${category.id}/delete`, {
                method: 'POST',
                signal: abortController.signal
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete category');
            }

            const event = new CustomEvent('deleted', { detail: category.id });
            dispatchEvent(event);
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
            }
        }
    };
</script>

<div class="category-card">
    {#if error}
        <div class="alert error">{error}</div>
    {/if}
    
    {#if success}
        <div class="alert success">{success}</div>
    {/if}
    
    {#if !editMode}
        <div class="view-mode">
            <h2>{category.name}</h2>
            
            <div class="details">
                {#if category.description}
                    <p class="description">{category.description}</p>
                {/if}
                
                <div class="category-meta">
                    {#if category.parent_id}
                        <p class="parent">Parent Category: {category.parent_name || category.parent_id}</p>
                    {/if}
                    <p class="public-status">Public: {category.is_public ? 'Yes' : 'No'}</p>
                </div>
                
                <div class="meta">
                    <small>Created: {new Date(category.created_at).toLocaleDateString()}</small>
                    {#if category.updated_at}
                        <small>Updated: {new Date(category.updated_at).toLocaleDateString()}</small>
                    {/if}
                </div>
            </div>
            
            <div class="actions">
                <button on:click={startEdit}>Edit</button>
                <button on:click={removeCategory} class="danger">Delete</button>
            </div>
        </div>
    {:else}
        <div class="edit-mode">
            <h2>Edit Category</h2>
            
            <form on:submit|preventDefault={saveCategory}>
                <div class="form-group">
                    <label for="name">Category Name*</label>
                    <input 
                        type="text" 
                        id="name" 
                        bind:value={edits.name} 
                        required 
                    />
                </div>
                
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea 
                        id="description" 
                        bind:value={edits.description}
                        rows="4"
                    ></textarea>
                </div>
                
                <div class="form-group">
                    <label for="parent_id">Parent Category</label>
                    <CategoryComboBox
                        categories={allCategories}
                        bind:value={edits.parent_id}
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

    .alert {
        padding: 0.75rem;
        margin-bottom: 1rem;
        border-radius: 4px;
        font-size: 0.9em;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
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
