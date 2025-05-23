<!-- src/lib/components/supplier.svelte -->
<script lang="ts">
    import type { Supplier } from '$lib/types/schemaTypes';
    import { formatFieldName, processContactInfo } from '$lib/utils/util';
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import * as Dialog from '$lib/components/ui/dialog';
    
    const dispatch = createEventDispatcher<{
        deleted: { supplierId: string };
    }>();

    export let supplier: Supplier & { parent_name?: string };
    export let allowEdit = true;
    export let allowDelete = true;
    export let showConfirmation = true;
    export let currentUserId: string | undefined = undefined;

    // Derived values - follow the Props → Derived → Methods pattern
    // Determine if current user is the owner of this supplier to enable certain features
    $: isOwner = currentUserId && supplier.created_by === currentUserId;
    $: canEdit = allowEdit && (isOwner || false);

    let editMode = false;
    let edits: Partial<Supplier> = {};
    let error: string | null = null;
    let success: string | null = null;
    let contactInfoString = '';
    let abortController = new AbortController();
    let showDeleteDialog = false;
    
    // Prepare contact info for display
    const getContactInfo = (contactInfoInput: any) => {
        return processContactInfo(contactInfoInput);
    };

    onDestroy(() => {
        abortController.abort();
    });

    const startEdit = () => {
        // Check is handled by the UI, but add extra safety check
        if (!allowEdit) {
            error = 'You do not have permission to edit this supplier';
            return;
        }
        
        edits = { ...supplier };
        // Get contact info data for editing
        const contactData = getContactInfo(supplier.contact_info);
        
        // Format it as JSON for the edit form
        const contactObject: Record<string, string> = {};
        if (contactData.email) contactObject.email = contactData.email;
        if (contactData.phone) contactObject.phone = contactData.phone;
        if (contactData.address) contactObject.address = contactData.address;
        if (contactData.text) contactObject.text = contactData.text;
        contactData.other.forEach(item => {
            contactObject[item.key] = item.value;
        });
        
        contactInfoString = Object.keys(contactObject).length > 0 ? 
            JSON.stringify(contactObject, null, 2) : '';
        editMode = true;
    };

    const cancelEdit = () => {
        editMode = false;
        edits = {};
        contactInfoString = '';
        error = null;
    };

    const saveSupplier = async () => {
        error = null;
        success = null;
        abortController = new AbortController();
        
        try {
            let contactInfo: unknown;
            if (contactInfoString.trim()) {
                try {
                    contactInfo = JSON.parse(contactInfoString);
                } catch (e) {
                    throw new Error('Invalid JSON format for contact information');
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
                    contactInfo,
                    logoUrl: edits.logo_url,
                    updatedBy: supplier.created_by
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update supplier');
            }

            const updated = await response.json();
            supplier = updated;
            success = 'Supplier updated successfully';
            setTimeout(() => success = null, 3000);
            editMode = false;
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
            } else if (e && typeof e === 'object' && 'name' in e && e.name !== 'AbortError') {
                error = String(e);
            } else if (e !== 'AbortError') {
                error = 'An unknown error occurred while updating';
            }
        }
    };

    const deleteSupplier = async () => {
        try {
            error = null;
            showDeleteDialog = false;
            
            // Create a FormData object for the delete operation
            const formData = new FormData();
            formData.append('action', 'delete_supplier');
            formData.append('supplier_id', supplier.supplier_id.toString());
            
            // Send the delete request to the dashboard endpoint
            const response = await fetch('/dashboard?/supplier', {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });
            
            if (!response.ok) {
                let errorMessage = `Failed to delete supplier (status: ${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            console.log('Supplier deleted successfully:', supplier.supplier_id);
            
            // Dispatch event for parent component to handle
            dispatch('deleted', { supplierId: supplier.supplier_id });
            
            success = 'Supplier deleted successfully';
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
                console.error('Delete supplier error:', e);
            }
        }
    };
    
    // Form submission enhancement
    const handleSubmit: SubmitFunction = ({ cancel }) => {
        error = null;
        return async ({ result }) => {
            if (result.type === 'error') {
                error = result.error.message;
            } else if (result.type === 'success') {
                editMode = false;
                success = 'Supplier updated successfully';
            }
        };
    };
</script>

<!-- Delete confirmation dialog -->
{#if showConfirmation}
<Dialog.Root bind:open={showDeleteDialog}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Delete Supplier</Dialog.Title>
            <Dialog.Description>
                Are you sure you want to delete supplier "{supplier.supplier_name}"? This action cannot be undone.
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <button class="btn-secondary" on:click={() => showDeleteDialog = false}>Cancel</button>
            <button class="btn-delete" on:click={deleteSupplier}>
                Delete
            </button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
{/if}

<div class="supplier-card">
    {#if error}
        <div class="alert error">{error}</div>
    {/if}
    
    {#if success}
        <div class="alert success">{success}</div>
    {/if}

    {#if !editMode}
        <div class="view-mode">
            <h2>{supplier.supplier_name}</h2>
            {#if supplier.logo_url}
                <img src={supplier.logo_url} alt="{supplier.supplier_name} logo" class="logo" />
            {/if}
            
            <div class="content-section">
                {#if supplier.supplier_description}
                    <div class="description">
                        <h3>Description</h3>
                        <div class="description-content">{supplier.supplier_description}</div>
                    </div>
                {/if}

                {#if supplier.custom_fields && Object.keys(supplier.custom_fields).length > 0}
                    <div class="custom-fields">
                        <h3>Additional Information</h3>
                        <div class="custom-fields-grid">
                            {#each Object.entries(supplier.custom_fields) as [fieldName, fieldValue]}
                                <div class="custom-field-item">
                                    <div class="field-name">{formatFieldName(fieldName)}</div>
                                    <div class="field-value">
                                        {#if typeof fieldValue === 'boolean'}
                                            <span class="boolean-value {fieldValue ? 'positive' : 'negative'}">
                                                {fieldValue ? 'Yes' : 'No'}
                                            </span>
                                        {:else if typeof fieldValue === 'number'}
                                            <span class="number-value">{fieldValue}</span>
                                        {:else if typeof fieldValue === 'string' && (fieldValue.startsWith('http://') || fieldValue.startsWith('https://'))}
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
                
                {#if supplier.website_url}
                    <p class="website">
                        <a href={supplier.website_url} target="_blank" rel="noopener">
                            {supplier.website_url}
                        </a>
                    </p>
                {/if}
                
                {#if supplier.contact_info}
                    {@const contact = getContactInfo(supplier.contact_info)}
                    <div class="contact-info">
                        <h3>Contact Information</h3>
                        <div class="contact-details">
                            {#if contact.email}
                                <div class="contact-item">
                                    <span class="contact-icon">📧</span>
                                    <span class="contact-label">Email:</span>
                                    <a href="mailto:{contact.email}" class="contact-value">{contact.email}</a>
                                </div>
                            {/if}
                            {#if contact.phone}
                                <div class="contact-item">
                                    <span class="contact-icon">📞</span>
                                    <span class="contact-label">Phone:</span>
                                    <a href="tel:{contact.phone}" class="contact-value">{contact.phone}</a>
                                </div>
                            {/if}
                            {#if contact.address}
                                <div class="contact-item">
                                    <span class="contact-icon">🏢</span>
                                    <span class="contact-label">Address:</span>
                                    <span class="contact-value">{contact.address}</span>
                                </div>
                            {/if}
                            {#if contact.text}
                                <div class="contact-item">
                                    <span class="contact-icon">📝</span>
                                    <span class="contact-value contact-text">{contact.text}</span>
                                </div>
                            {/if}
                            {#if contact.other.length > 0}
                                {#each contact.other as field}
                                    <div class="contact-item">
                                        <span class="contact-icon">ℹ️</span>
                                        <span class="contact-label">{formatFieldName(field.key)}:</span>
                                        <span class="contact-value">{field.value}</span>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/if}
                
                <div class="meta">
                    <small>Created: {supplier.created_at instanceof Date ? supplier.created_at.toLocaleDateString() : new Date(supplier.created_at).toLocaleDateString()}</small>
                    {#if supplier.updated_at}
                        <small>Updated: {supplier.updated_at instanceof Date ? supplier.updated_at.toLocaleDateString() : new Date(supplier.updated_at).toLocaleDateString()}</small>
                    {/if}
                </div>
            </div>
            
            <!-- Action buttons for edit/delete with original permission logic restored -->
            {#if allowEdit || allowDelete}
                <div class="actions">
                    {#if allowEdit}
                        <button class="btn-secondary" on:click={startEdit}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit
                        </button>
                    {/if}
                    {#if allowDelete}
                        {#if showConfirmation}
                            <button class="btn-delete" on:click={() => showDeleteDialog = true}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Delete
                            </button>
                        {:else}
                            <button class="btn-delete" on:click={deleteSupplier}>Delete</button>
                        {/if}
                    {/if}
                </div>
            {/if}
        </div>
    {:else}
        <div class="edit-mode">
            <h2>Edit Supplier</h2>
            
            <form method="POST" on:submit|preventDefault={saveSupplier}>
                <label>
                    Name*
                    <input
                        type="text"
                        bind:value={edits.supplier_name}
                        required
                    />
                </label>
                
                <label>
                    Description
                    <textarea bind:value={edits.supplier_description}
                        rows="3"></textarea>
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
                    Contact Information
                    <textarea bind:value={contactInfoString}
                        rows="6"
                        placeholder={`Example JSON format:\n{\n  "email": "contact@example.com",\n  "phone": "+1 234 567 890",\n  "address": "123 Main St"\n}`} ></textarea>
                    <div class="contact-info-help">
                        <p>Enter contact information as JSON with fields like email, phone, and address. 
                        Each field will be displayed with appropriate formatting.</p>
                    </div>
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
    .supplier-card {
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

    /* Content Section Styling */
    .content-section {
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

    .contact-info {
        margin-top: 15px;
        padding: 12px;
        background-color: hsl(var(--surface-100));
        border-radius: 6px;
        border-left: 4px solid hsl(var(--primary));
        transition: background-color 0.3s, border-color 0.3s;
    }
    
    .contact-info h3 {
        margin-top: 0;
        color: hsl(var(--foreground));
        font-size: 1.1em;
    }
    
    .contact-details {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .contact-item {
        display: flex;
        align-items: baseline;
        margin-bottom: 0.5rem;
    }
    
    .contact-icon {
        margin-right: 0.5rem;
        color: hsl(var(--primary));
    }
    
    .contact-label {
        font-weight: 500;
        min-width: 80px;
        margin-right: 0.5rem;
        color: hsl(var(--foreground));
    }
    
    .contact-value {
        color: hsl(var(--foreground));
    }
    
    .contact-text {
        white-space: pre-line;
        font-style: normal;
        line-height: 1.4;
        padding: 4px 0;
        color: hsl(var(--foreground));
    }
    
    /* Custom Fields Styling */
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
        font-weight: 500;
        margin-bottom: 0.25rem;
        color: hsl(var(--foreground));
        font-size: 0.9rem;
    }
    
    .field-value {
        color: hsl(var(--foreground));
        word-break: break-word;
        line-height: 1.4;
    }
    
    /* Boolean field styles */
    .boolean-value {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    .positive {
        background-color: hsl(var(--success) / 0.15);
        color: hsl(var(--success));
    }
    
    .negative {
        background-color: hsl(var(--destructive) / 0.15);
        color: hsl(var(--destructive));
    }
    
    /* Number field styles */
    .number-value {
        font-family: monospace;
        color: hsl(var(--foreground));
    }
    
    /* Meta information */
    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 2rem;
        font-size: 0.8rem;
        opacity: 0.8;
        color: hsl(var(--muted-foreground));
    }
    
    /* Form Styling */
    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-weight: 500;
        color: hsl(var(--foreground));
    }
    
    input, textarea {
        padding: 0.75rem;
        border: 1px solid hsl(var(--input-border));
        border-radius: 4px;
        background: hsl(var(--input));
        color: hsl(var(--input-foreground));
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    input:focus, textarea:focus {
        outline: none;
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
    }
    
    .contact-info-help {
        font-size: 0.85rem;
        margin-top: 0.25rem;
        color: hsl(var(--muted-foreground));
    }
    
    .form-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
    }
    
    .actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.75rem;
    }
    
    /* Button Styling */
    button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: background-color 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s;
    }
    
    button:hover {
        opacity: 0.9;
    }
    
    button:active {
        transform: translateY(1px);
    }
    
    button svg {
        height: 16px;
        width: 16px;
    }
    
    button[type="submit"] {
        background-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
    }
    
    button[type="button"] {
        background-color: transparent;
        color: hsl(var(--foreground));
        border: 1px solid hsl(var(--border));
    }
    
    .btn-secondary {
        background-color: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
        border: none;
    }
    
    .btn-delete {
        background-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
        border: none;
    }
</style>