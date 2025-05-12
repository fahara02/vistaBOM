<!-- src/lib/components/supplier.svelte -->
<script lang="ts">
    import type { Supplier } from '$lib/types';
    import { onDestroy } from 'svelte';

    export let supplier: Supplier;
    export let currentUserId: string;

    let editMode = false;
    let edits: Partial<Supplier> = {};
    let error: string | null = null;
    let success: string | null = null;
    let contactInfoString = '';
    let abortController = new AbortController();
    
    // Function to safely parse contact info - ensures we always have an object
    function parseContactInfo(info: any): Record<string, string> {
        if (!info) return {};
        
        // If it's already an object, return it
        if (typeof info === 'object' && info !== null) return info;
        
        // If it's a string, try to parse it
        if (typeof info === 'string') {
            try {
                return JSON.parse(info);
            } catch (e: unknown) {
                console.error('Failed to parse contact info:', e instanceof Error ? e.message : e);
                return {};
            }
        }
        
        return {};
    }

    onDestroy(() => {
        abortController.abort();
    });

    const startEdit = () => {
        edits = { ...supplier };
        // Parse contact info if needed and stringify with formatting for editing
        const parsedContactInfo = parseContactInfo(supplier.contactInfo);
        contactInfoString = Object.keys(parsedContactInfo).length > 0 ? 
            JSON.stringify(parsedContactInfo, null, 2) : '';
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

            const response = await fetch(`/api/suppliers/${supplier.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: edits.name,
                    description: edits.description,
                    websiteUrl: edits.websiteUrl,
                    contactInfo,
                    logoUrl: edits.logoUrl,
                    userId: currentUserId
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

    const removeSupplier = async () => {
        if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;
        
        try {
            const response = await fetch(`/api/suppliers/${supplier.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: currentUserId }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete supplier');
            }

            success = 'Supplier deleted successfully';
            setTimeout(() => success = null, 3000);
            // Emit event or handle removal in parent component
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                error = e.message;
            } else if (e && typeof e === 'object' && 'name' in e && e.name !== 'AbortError') {
                error = String(e);
            } else if (e !== 'AbortError') {
                error = 'An unknown error occurred while deleting';
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

    {#if !editMode}
        <div class="view-mode">
            <h2>{supplier.name}</h2>
            {#if supplier.logoUrl}
                <img src={supplier.logoUrl} alt="{supplier.name} logo" class="logo" />
            {/if}
            
            <div class="details">
                {#if supplier.description}
                    <p class="description">{supplier.description}</p>
                {/if}
                
                {#if supplier.websiteUrl}
                    <p class="website">
                        <a href={supplier.websiteUrl} target="_blank" rel="noopener">
                            {supplier.websiteUrl}
                        </a>
                    </p>
                {/if}
                
                {#if supplier.contactInfo}
                    {@const contactInfo = parseContactInfo(supplier.contactInfo)}
                    {#if Object.keys(contactInfo).length > 0}
                        <div class="contact-info">
                            <h3>Contact Information</h3>
                            <div class="contact-details">
                                {#if contactInfo.email}
                                    <div class="contact-item">
                                        <span class="contact-icon">📧</span>
                                        <span class="contact-label">Email:</span>
                                        <a href="mailto:{contactInfo.email}" class="contact-value">{contactInfo.email}</a>
                                    </div>
                                {/if}
                                {#if contactInfo.phone}
                                    <div class="contact-item">
                                        <span class="contact-icon">📞</span>
                                        <span class="contact-label">Phone:</span>
                                        <a href="tel:{contactInfo.phone}" class="contact-value">{contactInfo.phone}</a>
                                    </div>
                                {/if}
                                {#if contactInfo.address}
                                    <div class="contact-item">
                                        <span class="contact-icon">🏢</span>
                                        <span class="contact-label">Address:</span>
                                        <span class="contact-value">{contactInfo.address}</span>
                                    </div>
                                {/if}
                                {#each Object.entries(contactInfo).filter(([key]) => !['email', 'phone', 'address'].includes(key)) as [key, value]}
                                    <div class="contact-item">
                                        <span class="contact-icon">ℹ️</span>
                                        <span class="contact-label">{key}:</span>
                                        <span class="contact-value">{value}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}
                
                <div class="meta">
                    <small>Created: {supplier.createdAt.toLocaleDateString()}</small>
                    {#if supplier.updatedAt}
                        <small>Updated: {supplier.updatedAt.toLocaleDateString()}</small>
                    {/if}
                </div>
            </div>
            
            <div class="actions">
                <button on:click={startEdit}>Edit</button>
                <button on:click={removeSupplier} class="danger">Delete</button>
            </div>
        </div>
    {:else}
        <div class="edit-mode">
            <h2>Edit Supplier</h2>
            
            <form on:submit|preventDefault={saveSupplier}>
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
                    <textarea bind:value={edits.description}
                        rows="3"></textarea>
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

    .contact-info {
        margin-top: 15px;
        padding: 12px;
        background-color: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #4285f4;
    }
    
    .contact-info h3 {
        margin-top: 0;
        margin-bottom: 12px;
        color: #333;
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
    }
    
    .contact-icon {
        margin-right: 8px;
        font-size: 1.1em;
        min-width: 24px;
    }
    
    .contact-label {
        font-weight: 600;
        color: #555;
        margin-right: 8px;
        min-width: 70px;
    }
    
    .contact-value {
        color: #333;
    }
    
    /* Links within contact values */
    :global(.contact-value a) {
        color: #4285f4;
        text-decoration: none;
    }
    
    :global(.contact-value a:hover) {
        text-decoration: underline;
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

    textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        resize: vertical;
        min-height: 100px;
    }
    
    .contact-info-help {
        margin-top: 5px;
        font-size: 0.85em;
        color: #555;
        background-color: #f8f9fa;
        padding: 8px;
        border-radius: 4px;
        border-left: 3px solid #ccc;
    }

    input, textarea {
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