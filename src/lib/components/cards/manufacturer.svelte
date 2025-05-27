<!-- src/lib/components/cards/manufacturer.svelte -->
<script lang="ts">
    import { formatFieldName } from '$lib/utils/util';
    import { onDestroy, createEventDispatcher } from 'svelte';
    import { 
        Mail, 
        Phone, 
        MapPin, 
        User, 
        Building, 
        Globe, 
        Smartphone, 
        AtSign, 
        Printer,
        MessageSquare,
        Briefcase,
        Pencil,
        Trash2,
        X,
        History,
        FileEdit
    } from 'lucide-svelte';
	import type { Manufacturer } from '@/types';
    
    // Create event dispatcher for communicating with parent components
    const dispatch = createEventDispatcher();
    


    export let manufacturer: Manufacturer;
    export let currentUserId: string;
    export let allowEdit: boolean = true;
    export let allowDelete: boolean = true;
    
    // Process custom fields for display
    let processedCustomFields: Record<string, unknown> = {};
    
    // Process the custom fields whenever the manufacturer data changes
    $: {
        if (manufacturer && manufacturer.custom_fields) {
           
            
            try {
                if (typeof manufacturer.custom_fields === 'string') {
                    // If it's a string, try to parse it as JSON
                    try {
                        const parsed = JSON.parse(manufacturer.custom_fields);
                        processedCustomFields = parsed;
                       
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
            
            
        } else {
            processedCustomFields = {};
        }
    }
    
    // We'll use the custom_fields directly from the manufacturer object
    // This ensures we're displaying exactly what's in the database

    let editMode = false;
    let edits: Partial<Manufacturer> = {};
    let customFieldsString = '';
    let contactInfoString = '';
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
           
            showDeleteConfirm = true;
            return;
        }
        
        // This is the actual delete action after confirmation
       
        
        error = null;
        isDeleting = true;
        
        try {
         
            
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
               
                abortController = new AbortController();
                
                // Try the manufacturer/[id] endpoint
                const altResponse = await fetch(`/manufacturer/${manufacturer.manufacturer_id}`, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    signal: abortController.signal
                });
                
                if (altResponse.ok) {
                  
                    return altResponse;
                }
            }
            
            
            
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
        
        
        // Use Svelte's dispatch to send the event to the parent component
        dispatch('edit', { 
            manufacturer: {
                ...manufacturer,
                // Ensure the ID is available in both formats for maximum compatibility
                manufacturer_id: manufacturer.manufacturer_id,
                manufacturerId: manufacturer.manufacturer_id
            }
        });
        
        
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {};
        customFieldsString = '';
        contactInfoString = '';
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

            let contactInfo: unknown;
            if (contactInfoString.trim()) {
                try {
                    contactInfo = JSON.parse(contactInfoString);
                } catch (e) {
                    throw new Error('Invalid JSON format for contact info');
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
                        custom_fields: customFields,
                        contact_info: contactInfo
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
                <button type="button" class="btn-cancel" on:click={() => showDeleteConfirm = false}>
                    <X size={16} />
                    Cancel
                </button>
                <button type="button" class="btn-delete" class:loading={isDeleting} disabled={isDeleting} on:click={deleteManufacturer}>
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
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
                            <Globe size={16} /> {manufacturer.website_url}
                        </a>
                    </p>
                {/if}

                <!-- Display contact info if available -->
                {#if manufacturer.contact_info}
                    <div class="contact-info">
                        <h3>Contact Information</h3>
                        <div class="contact-info-content">
                            {#if typeof manufacturer.contact_info === 'string'}
                                {#if manufacturer.contact_info.startsWith('{')}
                                    <!-- Parse JSON string safely with standard JavaScript try/catch -->
                                    {#if (() => {
                                        try {
                                            return Object.entries(JSON.parse(manufacturer.contact_info) || {});
                                        } catch (e) {
                                            console.error('Error parsing contact_info:', e);
                                            return null;
                                        }
                                    })()}
                                        {#each (() => {
                                            try {
                                                return Object.entries(JSON.parse(manufacturer.contact_info) || {});
                                            } catch (e) {
                                                return [];
                                            }
                                        })() as [key, value]}
                                            <div class="contact-item">
                                                <div class="contact-label">{formatFieldName(key)}</div>
                                                <div class="contact-value">
                                                    <span class="contact-icon">
                                                        {#if key.toLowerCase().includes('email')}
                                                            <Mail size={16} />
                                                        {:else if key.toLowerCase().includes('phone')}
                                                            <Phone size={16} />
                                                        {:else if key.toLowerCase().includes('address')}
                                                            <MapPin size={16} />
                                                        {:else if key.toLowerCase().includes('name')}
                                                            <User size={16} />
                                                        {:else if key.toLowerCase().includes('company')}
                                                            <Building size={16} />
                                                        {:else if key.toLowerCase().includes('website')}
                                                            <Globe size={16} />
                                                        {:else if key.toLowerCase().includes('mobile')}
                                                            <Smartphone size={16} />
                                                        {:else if key.toLowerCase().includes('fax')}
                                                            <Printer size={16} />
                                                        {:else if key.toLowerCase().includes('title') || key.toLowerCase().includes('position')}
                                                            <Briefcase size={16} />
                                                        {:else}
                                                            <AtSign size={16} />
                                                        {/if}
                                                    </span>
                                                    {value}
                                                </div>
                                            </div>
                                        {/each}
                                    {:else}
                                        <div class="contact-item">
                                            <div class="contact-value">
                                                <span class="contact-icon">
                                                    <MessageSquare size={16} />
                                                </span>
                                                {manufacturer.contact_info}
                                            </div>
                                        </div>
                                    {/if}
                                {:else}
                                    <div class="contact-item">
                                        <div class="contact-value">
                                            <span class="contact-icon">
                                                <MessageSquare size={16} />
                                            </span>
                                            {manufacturer.contact_info}
                                        </div>
                                    </div>
                                {/if}
                            {:else if typeof manufacturer.contact_info === 'object' && manufacturer.contact_info !== null}
                                {#each Object.entries(manufacturer.contact_info) as [key, value]}
                                    <div class="contact-item">
                                        <div class="contact-label">{formatFieldName(key)}</div>
                                        <div class="contact-value">
                                            <span class="contact-icon">
                                                {#if key.toLowerCase().includes('email')}
                                                    <Mail size={16} />
                                                {:else if key.toLowerCase().includes('phone')}
                                                    <Phone size={16} />
                                                {:else if key.toLowerCase().includes('address')}
                                                    <MapPin size={16} />
                                                {:else if key.toLowerCase().includes('name')}
                                                    <User size={16} />
                                                {:else if key.toLowerCase().includes('company')}
                                                    <Building size={16} />
                                                {:else if key.toLowerCase().includes('website')}
                                                    <Globe size={16} />
                                                {:else if key.toLowerCase().includes('mobile')}
                                                    <Smartphone size={16} />
                                                {:else if key.toLowerCase().includes('fax')}
                                                    <Printer size={16} />
                                                {:else if key.toLowerCase().includes('title') || key.toLowerCase().includes('position')}
                                                    <Briefcase size={16} />
                                                {:else}
                                                    <AtSign size={16} />
                                                {/if}
                                            </span>
                                            {value}
                                        </div>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
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
                    <div>
                        <span class="meta-icon"><History size={14} /></span>
                        Created: {manufacturer.created_at instanceof Date ? manufacturer.created_at.toLocaleDateString() : 'Unknown date'}
                    </div>
                    {#if manufacturer.updated_at}
                        <div>
                            <span class="meta-icon"><FileEdit size={14} /></span>
                            Updated: {manufacturer.updated_at instanceof Date ? manufacturer.updated_at.toLocaleDateString() : 'Unknown date'}
                        </div>
                    {/if}
                </div>
            </div>
            
            <!-- Only show edit/delete buttons if user is logged in, created this manufacturer, and allowEdit/allowDelete are true -->
            {#if currentUserId && manufacturer.created_by === currentUserId}
                <div class="actions">
                    {#if allowEdit}
                        <button on:click={startEdit} class="btn-edit">
                            <Pencil size={16} />
                            Edit
                        </button>
                    {/if}
                    {#if allowDelete}
                        <button on:click={deleteManufacturer} class="btn-delete danger">
                            <Trash2 size={16} />
                            Delete
                        </button>
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
                
                <label>
                    Contact Information (JSON)
                    <textarea
                        bind:value={contactInfoString}
                        rows="6"
                        placeholder={`Example:\n{\n  "email": "contact@example.com",\n  "phone": "+1 (555) 123-4567",\n  "address": "123 Main St, City, Country"\n}`}
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
        background-color: hsl(var(--card));
        border-radius: 8px;
        border: 1px solid hsl(var(--border));
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        width: 100%;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s, box-shadow 0.3s;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin: 1rem 0;
        color: hsl(var(--card-foreground));
    }
    
    /* Add dark mode specific adjustments */
    :global([data-theme="dark"]) .manufacturer-card {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .description {
        color: hsl(var(--foreground));
        line-height: 1.6;
    }

    .website a {
        color: hsl(var(--primary));
        text-decoration: none;
        transition: color 0.3s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .website a:hover {
        text-decoration: underline;
    }

    .custom-fields {
        border-top: 1px solid hsl(var(--border));
        padding-top: 1.5rem;
        transition: background-color 0.3s, border-color 0.3s;
        margin-top: 1.5rem;
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
    
    :global([data-theme="dark"]) .boolean-value.positive {
        background: hsl(var(--success) / 0.15);
        color: hsl(var(--success) / 0.9);
    }
    
    .boolean-value.negative {
        background: hsl(var(--destructive) / 0.2);
        color: hsl(var(--destructive));
    }
    
    :global([data-theme="dark"]) .boolean-value.negative {
        background: hsl(var(--destructive) / 0.15);
        color: hsl(var(--destructive) / 0.9);
    }
    
    .number-value {
        font-family: 'Courier New', monospace;
        font-weight: 600;
        color: hsl(var(--foreground));
    }

    .contact-info {
        border-top: 1px solid hsl(var(--border));
        padding-top: 1.5rem;
        margin-top: 1.5rem;
    }
    
    .contact-info h3 {
        font-size: 1.125rem;
        margin-top: 0;
        margin-bottom: 1rem;
        color: hsl(var(--foreground));
        border-bottom: 1px solid hsl(var(--border));
        padding-bottom: 0.5rem;
    }
    
    .contact-info-content {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .contact-item {
        padding: 0.875rem;
        background: hsl(var(--card));
        border-radius: 6px;
        border: 1px solid hsl(var(--border));
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
    }
    
    .contact-item:hover {
        border-color: hsl(var(--primary));
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    }
    
    .contact-label {
        font-weight: 600;
        color: hsl(var(--foreground));
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }
    
    .contact-value {
        color: hsl(var(--foreground));
        word-break: break-word;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .contact-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: hsl(var(--primary));
        flex-shrink: 0;
        background-color: hsl(var(--primary) / 0.1);
        padding: 0.375rem;
        border-radius: 4px;
        transition: background-color 0.2s ease, color 0.2s ease;
    }
    
    .contact-item:hover .contact-icon {
        background-color: hsl(var(--primary) / 0.15);
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