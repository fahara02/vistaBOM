<!-- src/lib/components/manufacturer.svelte -->
<script lang="ts">
    import { onDestroy } from 'svelte';
    import type { Manufacturer } from '$lib/server/db/types';

    export let manufacturer: Manufacturer;
    export let currentUserId: string;

    let editMode = false;
    let edits: Partial<Manufacturer> = {};
    let customFieldsString = '';
    let error: string | null = null;
    let success: string | null = null;
    let abortController = new AbortController();

    onDestroy(() => {
        abortController.abort();
    });

    const startEdit = () => {
        edits = { ...manufacturer };
        customFieldsString = manufacturer.customFields ? JSON.stringify(manufacturer.customFields, null, 2) : '';
        editMode = true;
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {};
        customFieldsString = '';
        error = null;
    };

    const saveManufacturer = async () => {
        error = null;
        success = null;
        abortController = new AbortController();
        
        try {
            let customFields: unknown;
            if (customFieldsString.trim()) {
                try {
                    customFields = JSON.parse(customFieldsString);
                } catch (e) {
                    throw new Error('Invalid JSON format for custom fields');
                }
            }

            const response = await fetch(`/api/manufacturers/${manufacturer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: {
                        name: edits.name,
                        description: edits.description,
                        websiteUrl: edits.websiteUrl,
                        logoUrl: edits.logoUrl,
                        customFields
                    },
                    userId: currentUserId
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update manufacturer');
            }
            
            manufacturer = await response.json();
            success = 'Manufacturer updated successfully';
            setTimeout(() => success = null, 3000);
            editMode = false;
        } catch (e:unknown) {
            if (e.name !== 'AbortError') {
                error = e instanceof Error ? e.message : 'An unknown error occurred while updating';
            }
        }
    };

    const removeManufacturer = async () => {
        if (!confirm('Are you sure you want to delete this manufacturer?')) return;
        
        try {
            const response = await fetch(`/api/manufacturers/${manufacturer.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId }),
                signal: abortController.signal
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete manufacturer');
            }

            const event = new CustomEvent('deleted', { detail: manufacturer.id });
            dispatchEvent(event);
        } catch (e:unknown) {
            if (e.name !== 'AbortError') {
                error = e instanceof Error ? e.message : 'An unknown error occurred while deleting';
            }
        }
    };
</script>

<div class="manufacturer-card">
    {#if error}
        <div class="alert error">{error}</div>
    {/if}
    
    {#if success}
        <div class="alert success">{success}</div>
    {/if}

    {#if !editMode}
        <div class="view-mode">
            <h2>{manufacturer.name}</h2>
            {#if manufacturer.logoUrl}
                <img src={manufacturer.logoUrl} alt="{manufacturer.name} logo" class="logo" />
            {/if}
            
            <div class="details">
                {#if manufacturer.description}
                    <p class="description">{manufacturer.description}</p>
                {/if}
                
                {#if manufacturer.websiteUrl}
                    <p class="website">
                        <a href={manufacturer.websiteUrl} target="_blank" rel="noopener">
                            {manufacturer.websiteUrl}
                        </a>
                    </p>
                {/if}
                
                {#if manufacturer.customFields}
                    <div class="custom-fields">
                        <h3>Custom Fields</h3>
                        <pre>{JSON.stringify(manufacturer.customFields, null, 2)}</pre>
                    </div>
                {/if}
                                
                <div class="meta">
                    <small>Created: {manufacturer.createdAt.toLocaleDateString()}</small>
                    {#if manufacturer.updatedAt}
                        <small>Updated: {manufacturer.updatedAt.toLocaleDateString()}</small>
                    {/if}
                </div>
            </div>
            
            <div class="actions">
                <button on:click={startEdit}>Edit</button>
                <button on:click={removeManufacturer} class="danger">Delete</button>
            </div>
        </div>
    {:else}
        <div class="edit-mode">
            <h2>Edit Manufacturer</h2>
            
            <form on:submit|preventDefault={saveManufacturer}>
                <label>
                    Name*
                    <input
                        type="text"
                        bind:value={edits.name}
                        required
                        placeholder="Manufacturer name"
                    />
                </label>
                
                <label>
                    Description
                    <textarea
                        bind:value={edits.description}
                        rows="3"
                        placeholder="Detailed description..."
                    ></textarea>
                </label>
                
                <label>
                    Website URL
                    <input
                        type="url"
                        bind:value={edits.websiteUrl}
                        placeholder="https://example.com"
                    />
                </label>
                
                <label>
                    Logo URL
                    <input
                        type="url"
                        bind:value={edits.logoUrl}
                        placeholder="https://example.com/logo.png"
                    />
                </label>
                
                <label>
                    Custom Fields (JSON)
                    <textarea
                        bind:value={customFieldsString}
                        rows="6"
                        placeholder={`Example:\n{\n  "key": "value",\n  "numericField": 123\n}`}
                    ></textarea>
                </label>
                
                <div class="form-actions">
                    <button type="submit">Save Changes</button>
                    <button type="button" on:click={cancelEdit}>Cancel</button>
                </div>
            </form>
        </div>
    {/if}
</div>

<style>
    .manufacturer-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .alert {
        padding: 0.75rem;
        margin-bottom: 1rem;
        border-radius: 4px;
        font-size: 0.9em;
    }

    .error {
        background-color: #fee;
        border: 1px solid #f99;
        color: #c00;
    }

    .success {
        background-color: #efe;
        border: 1px solid #9f9;
        color: #090;
    }

    .logo {
        max-width: 200px;
        max-height: 100px;
        margin: 1rem 0;
        border-radius: 4px;
    }

    .details {
        margin: 1rem 0;
    }

    .description {
        color: #444;
        line-height: 1.6;
    }

    .website a {
        color: #06c;
        text-decoration: none;
    }

    .custom-fields {
        margin: 1.5rem 0;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 4px;
    }

    .custom-fields pre {
        white-space: pre-wrap;
        font-family: monospace;
        margin: 0;
        font-size: 0.9em;
    }

    .meta {
        margin-top: 1.5rem;
        color: #666;
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
        background: #f0f0f0;
        transition: background 0.2s;
    }

    button:hover {
        background: #e0e0e0;
    }

    .danger {
        background: #ffe6e6;
        color: #c00;
    }

    .danger:hover {
        background: #ffcccc;
    }

    form {
        display: grid;
        gap: 1.5rem;
    }

    label {
        display: block;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    input, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.9em;
    }

    textarea {
        resize: vertical;
        min-height: 100px;
    }

    .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1rem;
    }
</style>