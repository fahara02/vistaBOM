<!-- src/lib/components/cards/supplier.svelte -->
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
	import type { Supplier } from '@/types';
    
    // Create event dispatcher for communicating with parent components
    const dispatch = createEventDispatcher();
    
  
    export let supplier: Supplier;
    export let currentUserId: string;
    export let allowEdit: boolean = true;
    export let allowDelete: boolean = true;
    
    // Process custom fields for display
    let processedCustomFields: Record<string, unknown> = {};
    
    // Process the custom fields whenever the supplier data changes
    $: {
        if (supplier && supplier.custom_fields) {
            console.log('Processing custom fields:', supplier.custom_fields);
            
            try {
                if (typeof supplier.custom_fields === 'string') {
                    // If it's a string, try to parse it as JSON
                    try {
                        const parsed = JSON.parse(supplier.custom_fields);
                        processedCustomFields = parsed;
                        console.log('Successfully parsed custom fields from string:', processedCustomFields);
                    } catch (e) {
                        console.error('Error parsing custom fields string:', e);
                        processedCustomFields = {};
                    }
                } else if (typeof supplier.custom_fields === 'object') {
                    // Extract values from JSONB format where each field might have a nested 'value' property
                    const fields = supplier.custom_fields as Record<string, any>;
                    processedCustomFields = {};
                    
                    for (const [key, value] of Object.entries(fields)) {
                        if (value !== null && typeof value === 'object' && 'value' in value) {
                            // Extract the value from the JSONB wrapper
                            processedCustomFields[key] = value.value;
                        } else {
                            processedCustomFields[key] = value;
                        }
                    }
                    console.log('Processed object custom fields:', processedCustomFields);
                }
            } catch (e) {
                console.error('Error processing custom fields:', e);
                processedCustomFields = {};
            }
            
            console.log('Final processed custom fields:', processedCustomFields);
        } else {
            processedCustomFields = {};
        }
    }
    
    // We'll use the custom_fields directly from the supplier object
    // This ensures we're displaying exactly what's in the database

    let editMode = false;
    let edits: Partial<Supplier> = {};
    let customFieldsString = '';
    let error: string | null = null;
    let success: string | null = null;
    let abortController = new AbortController();
    let showDeleteConfirm = false;
    let isDeleting = false;
    let showConfirmation = true; // Set to true to enable confirmation dialog

    // Delete supplier function using REST API approach
    const deleteSupplier = async () => {
        // First step is just to show the confirmation dialog
        if (showConfirmation && !showDeleteConfirm) {
            console.log('Opening delete confirmation dialog for supplier:', supplier.supplier_id);
            showDeleteConfirm = true;
            return;
        }
        
        // This is the actual delete action after confirmation
        console.log('Delete confirmed for supplier:', supplier.supplier_id);
        showDeleteConfirm = false;
        
        error = null;
        isDeleting = true;
        
        try {
            console.log('Attempting to delete supplier:', supplier.supplier_id);
            
            // First abort any pending request
            if (abortController) abortController.abort();
            abortController = new AbortController();
            
            // Make DELETE request to API endpoint
            const url = `/api/supplier/${supplier.supplier_id}`;
            console.log('DELETE request to:', url);
            
            // Attempt to delete the supplier
            let response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: abortController.signal
            });
            
            // Fallback for different endpoint format if first attempt fails
            if (!response.ok && response.status === 404) {
                console.log('First endpoint not found, trying alternative...');
                
                // Try alternative endpoint format
                const altUrl = `/api/suppliers/${supplier.supplier_id}`;
                console.log('Trying alternative endpoint:', altUrl);
                
                const altResponse = await fetch(altUrl, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
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
                let errorText = 'Failed to delete supplier';
                try {
                    const errorData = await response.json();
                    errorText = errorData.message || errorText;
                } catch (e) {
                    // If we can't parse JSON, use text or status
                    try {
                        errorText = await response.text() || `Error: ${response.status}`;
                    } catch (e2) {
                        errorText = `Error: ${response.status}`;
                    }
                }
                throw new Error(errorText);
            }
            
            console.log('Supplier deleted successfully');
            success = 'Supplier deleted successfully';
            
            // Notify parent component about the deletion
            dispatch('deleted', { supplierId: supplier.supplier_id });
            
            // Refresh the page to show the updated list
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
                console.error('Delete supplier error:', e);
            }
        } finally {
            isDeleting = false;
        }
    };

    onDestroy(() => {
        abortController.abort();
    });

    const startEdit = () => {
        // Prepare to edit this supplier
        console.log('Starting edit for supplier:', supplier);
        console.log('Custom fields before edit:', supplier.custom_fields);
        
        // Ensure custom_fields is never null - use empty object if it is
        const customFields = supplier.custom_fields || {};
        console.log('Custom fields after normalization:', customFields);
        
        // Use Svelte's dispatch to send the event to the parent component
        dispatch('edit', { 
            supplier: {
                ...supplier,
                // Ensure custom fields is never null
                custom_fields: customFields,
                customFields: customFields,
                // Ensure the ID is available in both formats for maximum compatibility
                supplier_id: supplier.supplier_id,
                supplierId: supplier.supplier_id
            }
        });
        
        console.log('Dispatched edit event with supplier data');
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {};
        customFieldsString = '';
        error = null;
    };

    const saveSupplier = async () => {
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

            const response = await fetch(`/api/supplier/${supplier.supplier_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    supplier_name: edits.supplier_name,
                    supplier_description: edits.supplier_description,
                    websiteUrl: edits.website_url,
                    customFields,
                    logoUrl: edits.logo_url,
                    updatedBy: supplier.created_by
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update supplier');
            }
            
            supplier = await response.json();
            success = 'Supplier updated successfully';
            setTimeout(() => success = null, 3000);
            editMode = false;
        } catch (e:unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
            }
        }
    };
</script>

<div class="supplier-card">
    {#if error}
        <div class="alert error">{error}</div>
    {/if}
    
    {#if success}
        <div class="alert success">{success}</div>
    {/if}
    
    <!-- Delete confirmation dialog -->
    {#if showDeleteConfirm}
        <div class="delete-confirmation">
            <p class="warning">Are you sure you want to delete this supplier?</p>
            <p>This action cannot be undone.</p>
            
            <div class="confirmation-actions">
                <button class="btn-cancel" on:click={() => showDeleteConfirm = false}>
                    <X size={16} />
                    Cancel
                </button>
                <button class="btn-delete" class:loading={isDeleting} on:click={deleteSupplier} disabled={isDeleting}>
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
            </div>
        </div>
    {/if}
    
    <div class="card-content">
        <div class="header">
            <h2>{supplier.supplier_name}</h2>
            
            <!-- Display logo if available -->
            {#if supplier.logo_url}
                <img src={supplier.logo_url} alt="{supplier.supplier_name} logo" class="logo" />
            {/if}
            
            <!-- Display description if available -->
            {#if supplier.supplier_description}
                <div class="description">
                    <p>{supplier.supplier_description}</p>
                </div>
            {/if}
            
            <!-- Display website URL if available -->
            {#if supplier.website_url}
                <div class="website">
                    <a href={supplier.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe size={16} /> Visit Website
                    </a>
                </div>
            {/if}
        </div>
        
        <!-- Display custom fields if available -->
        {#if Object.keys(processedCustomFields).length > 0}
            <div class="custom-fields">
                <h3>Additional Information</h3>
                <div class="custom-fields-grid">
                    {#each Object.entries(processedCustomFields) as [fieldName, fieldValue]}
                        <div class="custom-field-item">
                            <div class="field-name">{formatFieldName(fieldName)}</div>
                            <div class="field-value">
                                {#if typeof fieldValue === 'boolean'}
                                    <span class="boolean-value {fieldValue ? 'positive' : 'negative'}">
                                        {fieldValue ? 'Yes' : 'No'}
                                    </span>
                                {:else if typeof fieldValue === 'number'}
                                    <span class="number-value">{fieldValue}</span>
                                {:else}
                                    {fieldValue}
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Display contact info if available -->
        {#if supplier.contact_info}
            <div class="contact-info">
                <h3>Contact Information</h3>
                <div class="contact-info-content">
                    {#if typeof supplier.contact_info === 'string'}
                        {#if supplier.contact_info.startsWith('{')}
                            <!-- Parse JSON string safely with standard JavaScript try/catch -->
                            {#if (() => {
                                try {
                                    return Object.entries(JSON.parse(supplier.contact_info) || {});
                                } catch (e) {
                                    console.error('Error parsing contact_info:', e);
                                    return null;
                                }
                            })()}
                                {#each (() => {
                                    try {
                                        return Object.entries(JSON.parse(supplier.contact_info) || {});
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
                                        {supplier.contact_info}
                                    </div>
                                </div>
                            {/if}
                        {:else}
                            <div class="contact-item">
                                <div class="contact-value">{supplier.contact_info}</div>
                            </div>
                        {/if}
                    {:else if typeof supplier.contact_info === 'object' && supplier.contact_info !== null}
                        {#each Object.entries(supplier.contact_info) as [key, value]}
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
        
        <!-- Display metadata -->
        <div class="meta">
            <div>
                <span class="meta-icon"><History size={14} /></span>
                Created: {new Date(supplier.created_at).toLocaleDateString()}
            </div>
            {#if supplier.updated_at && new Date(supplier.updated_at).getTime() !== new Date(supplier.created_at).getTime()}
                <div>
                    <span class="meta-icon"><FileEdit size={14} /></span>
                    Updated: {new Date(supplier.updated_at).toLocaleDateString()}
                </div>
            {/if}
        </div>
        
        <!-- Action buttons -->
        {#if allowEdit || allowDelete}
            <div class="actions">
                {#if allowEdit && currentUserId === supplier.created_by}
                    <button on:click={startEdit}>
                        <Pencil size={16} />
                        Edit
                    </button>
                {/if}
                
                {#if allowDelete && currentUserId === supplier.created_by}
                    <button class="danger" on:click={deleteSupplier}>
                        <Trash2 size={16} />
                        Delete
                    </button>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .supplier-card {
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
    }
    
    /* Add dark mode specific adjustments */
    :global([data-theme="dark"]) .supplier-card {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .card-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    h2 {
        font-size: 1.5rem;
        margin: 0;
        color: hsl(var(--card-foreground));
    }
    
    h3 {
        font-size: 1.125rem;
        margin: 0 0 1rem 0;
        color: hsl(var(--card-foreground));
        border-bottom: 1px solid hsl(var(--border));
        padding-bottom: 0.5rem;
    }
    
    .logo {
        max-width: 100px;
        max-height: 50px;
        object-fit: contain;
        align-self: flex-start;
        margin-bottom: 0.5rem;
    }
    
    .description {
        color: hsl(var(--card-foreground));
        line-height: 1.5;
    }
    
    .website a {
        color: hsl(var(--primary));
        text-decoration: none;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .website a:hover {
        text-decoration: underline;
    }
    
    .alert {
        padding: 0.75rem 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        border: 1px solid transparent;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: fadeIn 0.3s ease-out;
    }
    
    .alert::before {
        content: '';
        width: 16px;
        height: 16px;
        background-position: center;
        background-repeat: no-repeat;
        background-size: contain;
        flex-shrink: 0;
    }
    
    .error {
        background-color: hsl(var(--destructive) / 0.1);
        border-color: hsl(var(--destructive));
        color: hsl(var(--destructive));
    }
    
    .error::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='12'/%3E%3Cline x1='12' y1='16' x2='12.01' y2='16'/%3E%3C/svg%3E");
    }
    
    .success {
        background-color: hsl(var(--success) / 0.1);
        border-color: hsl(var(--success));
        color: hsl(var(--success));
    }
    
    .success::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpolyline points='22 4 12 14.01 9 11.01'/%3E%3C/svg%3E");
    }
    
    .custom-fields {
        border-top: 1px solid hsl(var(--border));
        padding-top: 1.5rem;
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
        padding: 0.875rem;
        background: hsl(var(--card));
        border-radius: 6px;
        border: 1px solid hsl(var(--border));
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        transition: background-color 0.3s, color 0.3s, border-color 0.3s, transform 0.2s, box-shadow 0.2s;
    }
    
    .custom-field-item:hover {
        border-color: hsl(var(--primary));
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.08);
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
        font-size: 0.8rem;
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        border-top: 1px solid hsl(var(--border));
        padding-top: 1rem;
        transition: color 0.3s, border-color 0.3s;
    }
    
    :global([data-theme="dark"]) .meta {
        color: hsl(var(--muted-foreground) / 0.8);
    }
    
    .meta-icon {
        display: inline-block;
        vertical-align: middle;
        margin-right: 0.25rem;
        margin-top: -2px;
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
        background-color: hsl(var(--primary-dark, var(--primary)));
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    button:active {
        transform: translateY(1px);
    }
    
    button.danger {
        background-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
    }
    
    button.danger:hover {
        background-color: hsl(var(--destructive-dark, var(--destructive)));
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    .delete-confirmation {
        background-color: hsl(var(--card));
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid hsl(var(--destructive) / 0.3);
        margin-bottom: 1.5rem;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .warning {
        font-weight: 600;
        color: hsl(var(--destructive));
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
    }

    .confirmation-actions {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1.25rem;
    }

    .loading {
        opacity: 0.7;
        cursor: wait;
        position: relative;
    }
    
    .loading::after {
        content: '';
        position: absolute;
        width: 1rem;
        height: 1rem;
        border: 2px solid hsl(var(--destructive-foreground));
        border-radius: 50%;
        border-top-color: transparent;
        right: 0.5rem;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .btn-cancel {
        background-color: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
        border: 1px solid hsl(var(--border));
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    
    .btn-cancel:hover {
        background-color: hsl(var(--secondary) / 0.9);
    }
</style>
