<!-- src/lib/components/cards/manufacturer.svelte -->
<script lang="ts">
    import { formatFieldName } from '$lib/utils/util';
    import { onDestroy, createEventDispatcher } from 'svelte';
    
    // Create event dispatcher for communicating with parent components
    const dispatch = createEventDispatcher();
    
    // Define the interface consistent with the dashboard's manufacturer data structure
    interface Manufacturer {
        manufacturer_id: string;
        manufacturer_name: string;
        manufacturer_description?: string | null;
        website_url?: string | null;
        contact_info?: string | null;
        logo_url?: string | null;
        custom_fields?: Record<string, unknown> | null;
        created_at: Date;
        updated_at: Date;
        created_by: string;
        updated_by?: string | null;
    }

    export let manufacturer: Manufacturer;
    export let currentUserId: string;
    export let allowEdit: boolean = true;
    export let allowDelete: boolean = true;
    
    // Process custom fields for display
    let processedCustomFields: Record<string, unknown> = {};
    
    // Process the custom fields whenever the manufacturer data changes
    $: {
        if (manufacturer && manufacturer.custom_fields) {
            console.log('Processing custom fields:', manufacturer.custom_fields);
            
            try {
                if (typeof manufacturer.custom_fields === 'string') {
                    // If it's a string, try to parse it as JSON
                    try {
                        processedCustomFields = JSON.parse(manufacturer.custom_fields);
                    } catch (e) {
                        console.error('Error parsing custom fields string:', e);
                        processedCustomFields = {};
                    }
                } else if (typeof manufacturer.custom_fields === 'object') {
                    // Extract values from JSONB format where each field might have a nested 'value' property
                    const fields = manufacturer.custom_fields as Record<string, any>;
                    processedCustomFields = {};
                    
                    for (const [key, value] of Object.entries(fields)) {
                        if (value !== null && typeof value === 'object' && 'value' in value) {
                            // Extract the value from the JSONB wrapper
                            processedCustomFields[key] = value.value;
                        } else {
                            processedCustomFields[key] = value;
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing custom fields:', e);
                processedCustomFields = {};
            }
            
            console.log('Processed custom fields:', processedCustomFields);
        } else {
            processedCustomFields = {};
        }
    }
    
    // We'll use the custom_fields directly from the manufacturer object
    // This ensures we're displaying exactly what's in the database

    let editMode = false;
    let edits: Partial<Manufacturer> = {};
    let customFieldsString = '';
    let error: string | null = null;
    let success: string | null = null;
    let abortController = new AbortController();
    let showDeleteConfirm = false;
    let isDeleting = false;
    let showConfirmation = true; // Set to true to enable confirmation dialog

    // Delete manufacturer function using REST API approach
    const deleteManufacturer = async () => {
        // First step is just to show the confirmation dialog
        if (showConfirmation && !showDeleteConfirm) {
            console.log('Opening delete confirmation dialog for manufacturer:', manufacturer.manufacturer_id);
            showDeleteConfirm = true;
            return;
        }
        
        // This is the actual delete action after confirmation
        console.log('Delete confirmed for manufacturer:', manufacturer.manufacturer_id);
        showDeleteConfirm = false;
        
        error = null;
        isDeleting = true;
        
        try {
            console.log('Attempting to delete manufacturer:', manufacturer.manufacturer_id);
            
            // First abort any pending request
            if (abortController) abortController.abort();
            abortController = new AbortController();
            
            // Use the proper REST API endpoint for manufacturer deletion
            const response = await fetch(`/api/manufacturers/${manufacturer.manufacturer_id}`, {
                method: 'DELETE',  // Use DELETE method for REST API
                credentials: 'same-origin',
                signal: abortController.signal
            });
            
            // If the API returns 404, try the alternative endpoint structure
            if (response.status === 404) {
                console.log('API endpoint not found, trying alternative endpoint');
                abortController = new AbortController();
                
                // Try the manufacturer/[id] endpoint
                const altResponse = await fetch(`/manufacturer/${manufacturer.manufacturer_id}`, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    signal: abortController.signal
                });
                
                if (altResponse.ok) {
                    console.log('Alternative endpoint successful');
                    return altResponse;
                }
            }
            
            // Log response for debugging
            console.log('Delete response status:', response.status);
            
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
            dispatch('deleted', { manufacturerId: manufacturer.manufacturer_id });
            
            success = 'Manufacturer deleted successfully';
            console.log('Manufacturer deleted successfully:', manufacturer.manufacturer_id);
            
            // Refresh the page to show the updated list
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
                console.error('Delete manufacturer error:', e);
            }
        } finally {
            isDeleting = false;
        }
    };

    onDestroy(() => {
        abortController.abort();
    });

    const startEdit = () => {
        // Prepare to edit this manufacturer
        console.log('Starting edit for manufacturer:', manufacturer);
        console.log('Custom fields before edit:', manufacturer.custom_fields);
        
        // Use Svelte's dispatch to send the event to the parent component
        dispatch('edit', { 
            manufacturer: {
                ...manufacturer,
                // Ensure the ID is available in both formats for maximum compatibility
                manufacturer_id: manufacturer.manufacturer_id,
                manufacturerId: manufacturer.manufacturer_id
            }
        });
        
        console.log('Dispatched edit event with manufacturer data');
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

            const response = await fetch(`/api/manufacturers/${manufacturer.manufacturer_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: {
                        manufacturer_name: edits.manufacturer_name,
                        manufacturer_description: edits.manufacturer_description,
                        website_url: edits.website_url,
                        logo_url: edits.logo_url,
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
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
            }
        }
    };

    const removeManufacturer = async () => {
        if (!confirm('Are you sure you want to delete this manufacturer?')) return;
        
        try {
            const response = await fetch(`/api/manufacturers/${manufacturer.manufacturer_id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId }),
                signal: abortController.signal
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete manufacturer');
            }

            const event = new CustomEvent('deleted', { detail: manufacturer.manufacturer_id });
            dispatchEvent(event);
        } catch (e:unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
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
    
    <!-- Delete confirmation dialog -->
    {#if showDeleteConfirm}
        <div class="delete-confirmation">
            <p>Are you sure you want to delete this manufacturer?</p>
            <p class="warning">This action cannot be undone.</p>
            <div class="confirmation-actions">
                <button type="button" class="btn-cancel" on:click={() => showDeleteConfirm = false}>Cancel</button>
                <button type="button" class="btn-delete" class:loading={isDeleting} disabled={isDeleting} on:click={deleteManufacturer}>
                    {#if isDeleting}
                        Deleting...
                    {:else}
                        Confirm Delete
                    {/if}
                </button>
            </div>
        </div>
    {/if}
    
    {#if !editMode}
        <div class="view-mode">
            <h2>{manufacturer.manufacturer_name}</h2>
            {#if manufacturer.logo_url}
                <img src={manufacturer.logo_url} alt="{manufacturer.manufacturer_name} logo" class="logo" />
            {/if}
            
            <div class="details">
                {#if manufacturer.manufacturer_description}
                    <p class="description">{manufacturer.manufacturer_description}</p>
                {/if}
                
                {#if manufacturer.website_url}
                    <p class="website">
                        <a href={manufacturer.website_url} target="_blank" rel="noopener">
                            {manufacturer.website_url}
                        </a>
                    </p>
                {/if}
                
           
                
                {#if processedCustomFields && Object.keys(processedCustomFields).length > 0}
                    <div class="custom-fields">
                        <h3>Additional Information</h3>
                        <div class="custom-fields-grid">
                            {#each Object.entries(processedCustomFields) as [fieldName, fieldValue]}
                                <div class="custom-field-item">
                                    <div class="field-name">{formatFieldName(fieldName)}</div>
                                    <div class="field-value">
                                        {#if typeof fieldValue === 'boolean'}
                                            <span class="boolean-value {fieldValue ? 'positive' : 'negative'}">
                                                {fieldValue ? '✓ Yes' : '✗ No'}
                                            </span>
                                        {:else if typeof fieldValue === 'number'}
                                            <span class="number-value">{fieldValue}</span>
                                        {:else if typeof fieldValue === 'string' && fieldValue.startsWith('http')}
                                            <a href={fieldValue} target="_blank" rel="noopener noreferrer">
                                                {fieldValue}
                                            </a>
                                        {:else}
                                            {fieldValue}
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                                
                <div class="meta">
                    <small>Created: {manufacturer.created_at.toLocaleDateString()}</small>
                    {#if manufacturer.updated_at}
                        <small>Updated: {manufacturer.updated_at.toLocaleDateString()}</small>
                    {/if}
                </div>
            </div>
            
            <!-- Only show edit/delete buttons if user is logged in, created this manufacturer, and allowEdit/allowDelete are true -->
            {#if currentUserId && manufacturer.created_by === currentUserId}
                <div class="actions">
                    {#if allowEdit}
                        <button on:click={startEdit} class="btn-edit">Edit</button>
                    {/if}
                    {#if allowDelete}
                        <button on:click={deleteManufacturer} class="btn-delete danger">Delete</button>
                    {/if}
                </div>
            {/if}
        </div>
    {:else}
        <div class="edit-mode">
            <h2>Edit Manufacturer</h2>
            
            <form on:submit|preventDefault={saveManufacturer}>
                <label>
                    Name*
                    <input
                        type="text"
                        bind:value={edits.manufacturer_name}
                        required
                        placeholder="Manufacturer name"
                    />
                </label>
                
                <label>
                    Description
                    <textarea
                        bind:value={edits.manufacturer_description}
                        rows="3"
                        placeholder="Detailed description..."
                    ></textarea>
                </label>
                
                <label>
                    Website URL
                    <input
                        type="url"
                        bind:value={edits.website_url}
                        placeholder="https://example.com"
                    />
                </label>
                
                <label>
                    Logo URL
                    <input
                        type="url"
                        bind:value={edits.logo_url}
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
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: hsl(var(--card));
        color: hsl(var(--card-foreground));
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }

    .alert {
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border-radius: 4px;
        font-size: 0.9em;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }

    .error {
        background: hsl(var(--destructive) / 0.2);
        border: 1px solid hsl(var(--destructive));
        color: hsl(var(--destructive));
    }

    .success {
        background: hsl(var(--success) / 0.2);
        border: 1px solid hsl(var(--success));
        color: hsl(var(--success));
    }

    .logo {
        max-width: 200px;
        max-height: 100px;
        margin: 1rem 0;
        border-radius: 4px;
        border: 1px solid hsl(var(--border));
    }

    .details {
        margin: 1rem 0;
    }

    .description {
        color: hsl(var(--foreground));
        line-height: 1.6;
    }

    .website a {
        color: hsl(var(--primary));
        text-decoration: none;
        transition: color 0.3s;
    }

    .website a:hover {
        text-decoration: underline;
    }

    .custom-fields {
        margin: 1.5rem 0;
        padding: 1.5rem;
        background: hsl(var(--surface-100));
        border-radius: 8px;
        border: 1px solid hsl(var(--border));
        transition: background-color 0.3s, border-color 0.3s;
    }
    
    .custom-fields h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: hsl(var(--foreground));
        font-size: 1.125rem;
        border-bottom: 1px solid hsl(var(--border));
        padding-bottom: 0.5rem;
    }
    
    .custom-fields-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .custom-field-item {
        display: flex;
        flex-direction: column;
        padding: 0.75rem;
        background: hsl(var(--card));
        border-radius: 6px;
        border: 1px solid hsl(var(--border));
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .field-name {
        font-weight: 600;
        color: hsl(var(--foreground));
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }
    
    .field-value {
        color: hsl(var(--foreground));
        font-size: 1rem;
        word-break: break-word;
    }
    
    .boolean-value {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .boolean-value.positive {
        background: hsl(var(--success) / 0.2);
        color: hsl(var(--success));
    }
    
    .boolean-value.negative {
        background: hsl(var(--destructive) / 0.2);
        color: hsl(var(--destructive));
    }
    
    .number-value {
        font-family: 'Courier New', monospace;
        font-weight: 600;
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
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
        transition: background-color 0.3s, color 0.3s;
        font-weight: 500;
    }

    button:hover {
        background: hsl(var(--secondary) / 0.8);
    }

    .danger {
        background: hsl(var(--destructive) / 0.1);
        color: hsl(var(--destructive));
    }

    .danger:hover {
        background: hsl(var(--destructive) / 0.2);
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

    input, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid hsl(var(--input-border));
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.9em;
        background-color: hsl(var(--input));
        color: hsl(var(--input-foreground));
        transition: border-color 0.15s, background-color 0.3s, color 0.3s, box-shadow 0.15s;
    }
    
    input:focus, textarea:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
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
    
    .delete-confirmation {
        background-color: hsl(var(--destructive) / 0.1);
        border: 1px solid hsl(var(--destructive));
        border-radius: 4px;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    
    .delete-confirmation p {
        margin: 0 0 0.5rem;
    }
    
    .delete-confirmation .warning {
        color: hsl(var(--destructive));
        font-weight: 500;
    }
    
    .confirmation-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1rem;
    }
    
    .btn-delete {
        background-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    
    .btn-delete:hover {
        background-color: hsl(var(--destructive) / 0.9);
    }
    
    .btn-delete.loading {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .btn-cancel {
        background-color: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-weight: 500;
    }
    
    .btn-cancel:hover {
        background-color: hsl(var(--muted) / 0.9);
    }
</style>