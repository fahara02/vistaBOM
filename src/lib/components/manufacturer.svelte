<!-- src/lib/components/manufacturer.svelte -->
<script lang="ts">
    import type { Manufacturer } from '$lib/server/db/types';
    import { updateManufacturer, deleteManufacturer } from '$lib/server/manufacturer';
    import type { Client } from 'ts-postgres';

    export let manufacturer: Manufacturer;
    export let client: Client;
    export let currentUserId: string;

    let editMode = false;
    let edits: Partial<Manufacturer> = {};
    let error: string | null = null;
    let success: string | null = null;

    const startEdit = () => {
        edits = { ...manufacturer };
        editMode = true;
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {};
        error = null;
    };

    const saveManufacturer = async () => {
        error = null;
        success = null;
        
        try {
            const updated = await updateManufacturer(
                client,
                manufacturer.id,
                {
                    name: edits.name,
                    description: edits.description,
                    websiteUrl: edits.websiteUrl,
                    logoUrl: edits.logoUrl
                },
                currentUserId
            );

            manufacturer = updated;
            success = 'Manufacturer updated successfully';
            setTimeout(() => success = null, 3000);
            editMode = false;
        } catch (e) {
            error = e instanceof Error ? e.message : 'An unknown error occurred while updating';
        }
    };

    const removeManufacturer = async () => {
        if (!confirm('Are you sure you want to delete this manufacturer?')) return;
        
        try {
            await deleteManufacturer(client, manufacturer.id);
            success = 'Manufacturer deleted successfully';
            setTimeout(() => success = null, 3000);
            // Emit event or handle removal in parent
        } catch (e) {
            error = e instanceof Error ? e.message : 'An unknown error occurred while deleting';
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
                    <p>{manufacturer.description}</p>
                {/if}
                
                {#if manufacturer.websiteUrl}
                    <p>
                        <a href={manufacturer.websiteUrl} target="_blank" rel="noopener">
                            {manufacturer.websiteUrl}
                        </a>
                    </p>
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
                    />
                </label>
                
                <label>
                    Description
                    <textarea>  bind:value={edits.description} </textarea>
                       
                   
                </label>
                
                <label>
                    Website URL
                    <input
                        type="url"
                        bind:value={edits.websiteUrl}
                    />
                </label>
                
                <label>
                    Logo URL
                    <input
                        type="url"
                        bind:value={edits.logoUrl}
                    />
                </label>
                
                <div class="form-actions">
                    <button type="submit">Save</button>
                    <button type="button" on:click={cancelEdit}>Cancel</button>
                </div>
            </form>
        </div>
    {/if}
</div>

<style>
    .manufacturer-card {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
    }

    .alert {
        padding: 0.5rem;
        margin-bottom: 1rem;
        border-radius: 4px;
    }

    .error {
        background-color: #ffe6e6;
        color: #cc0000;
    }

    .success {
        background-color: #e6ffe6;
        color: #006600;
    }

    .logo {
        max-width: 200px;
        max-height: 100px;
        margin: 0.5rem 0;
    }

    .meta {
        margin-top: 1rem;
        color: #666;
    }

    .actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.5rem;
    }

    .danger {
        background-color: #ffcccc;
    }

    form {
        display: grid;
        gap: 1rem;
    }

    label {
        display: block;
    }

    input, textarea {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.25rem;
    }

    .form-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }
</style>