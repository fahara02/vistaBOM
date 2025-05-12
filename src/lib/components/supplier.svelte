<!-- src/lib/components/supplier.svelte -->
<script lang="ts">
    import type { Supplier } from '$lib/types';
    import type { ContactInfo } from '$lib/types/contact';
    import { parseContactInfo } from '$lib/types/contact';
    import { onDestroy } from 'svelte';
    
    // Format field names from camelCase to Title Case with spaces
    function formatFieldName(fieldName: string): string {
        // Add space before capital letters and capitalize the first letter
        const formatted = fieldName
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
        return formatted.trim();
    }

    export let supplier: Supplier;
    export let currentUserId: string;

    let editMode = false;
    let edits: Partial<Supplier> = {};
    let error: string | null = null;
    let success: string | null = null;
    let contactInfoString = '';
    let abortController = new AbortController();
    
    // Process contact info into structured data with email, phone, address and other fields
    function processContactInfo(info: any): { email?: string; phone?: string; address?: string; text?: string; other: {key: string; value: string}[] } {
        const result = { email: undefined, phone: undefined, address: undefined, text: undefined, other: [] } as {
            email?: string;
            phone?: string;
            address?: string;
            text?: string;
            other: {key: string; value: string}[];
        };
        
        if (!info) return result;
        
        let jsonData: Record<string, any> = {};
        
        // Handle different input formats
        if (typeof info === 'string') {
            try {
                // Try parsing as JSON
                if (info.trim().startsWith('{')) {
                    jsonData = JSON.parse(info);
                } else if (info.includes(':')) {
                    // Handle key-value format (email: value; phone: value)
                    const pairs = info.split(/[;,\n]+/);
                    
                    for (const pair of pairs) {
                        const parts = pair.split(':');
                        if (parts.length >= 2) {
                            const key = parts[0].trim().toLowerCase();
                            const value = parts.slice(1).join(':').trim();
                            
                            if (key.includes('email')) jsonData.email = value;
                            else if (key.includes('phone') || key.includes('tel')) jsonData.phone = value;
                            else if (key.includes('address')) jsonData.address = value;
                            else jsonData[key] = value;
                        }
                    }
                } else {
                    // Treat as plain text
                    result.text = info;
                    return result;
                }
            } catch (e) {
                // If JSON parsing fails, treat as plain text
                result.text = info;
                return result;
            }
        } else if (typeof info === 'object' && info !== null) {
            jsonData = info;
        }
        
        // Extract known fields
        if ('email' in jsonData && typeof jsonData.email === 'string') {
            result.email = jsonData.email;
        }
        
        if ('phone' in jsonData && typeof jsonData.phone === 'string') {
            result.phone = jsonData.phone;
        }
        
        if ('address' in jsonData && typeof jsonData.address === 'string') {
            result.address = jsonData.address;
        }
        
        // Handle additional fields
        for (const [key, value] of Object.entries(jsonData)) {
            if (!['email', 'phone', 'address'].includes(key) && typeof value === 'string') {
                result.other.push({ key, value });
            }
        }
        
        return result;
    }
    
    // Prepare contact info for display
    const getContactInfo = (contactInfoInput: any) => {
        return processContactInfo(contactInfoInput);
    };

    onDestroy(() => {
        abortController.abort();
    });

    const startEdit = () => {
        edits = { ...supplier };
        // Get contact info data for editing
        const contactData = getContactInfo(supplier.contactInfo);
        
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
            
            <div class="content-section">
                {#if supplier.description}
                    <div class="description">
                        <h3>Description</h3>
                        <div class="description-content">{supplier.description}</div>
                    </div>
                {/if}

                {#if supplier.customFields && Object.keys(supplier.customFields).length > 0}
                    <div class="custom-fields">
                        <h3>Additional Information</h3>
                        <div class="custom-fields-grid">
                            {#each Object.entries(supplier.customFields) as [fieldName, fieldValue]}
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
                
                {#if supplier.websiteUrl}
                    <p class="website">
                        <a href={supplier.websiteUrl} target="_blank" rel="noopener">
                            {supplier.websiteUrl}
                        </a>
                    </p>
                {/if}
                
                {#if supplier.contactInfo}
                    {@const contact = getContactInfo(supplier.contactInfo)}
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

    /* Content Section Styling */
    .content-section {
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
        margin-bottom: 0.5rem;
    }
    
    .contact-icon {
        margin-right: 0.5rem;
    }
    
    .contact-label {
        font-weight: 500;
        min-width: 80px;
        margin-right: 0.5rem;
    }
    
    .contact-value {
        color: #444;
    }
    
    .contact-text {
        white-space: pre-line;
        font-style: normal;
        line-height: 1.4;
        padding: 4px 0;
    }
    
    /* Custom Fields Styling */
    .custom-fields {
        margin: 1.5rem 0;
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }
    
    .custom-fields h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #4b5563;
        font-size: 1.125rem;
        border-bottom: 1px solid #e5e7eb;
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
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    .field-name {
        font-weight: 600;
        color: #4b5563;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }
    
    .field-value {
        color: #1f2937;
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
        background-color: #d1fae5;
        color: #065f46;
    }
    
    .boolean-value.negative {
        background-color: #fee2e2;
        color: #b91c1c;
    }
    
    .number-value {
        font-family: 'Courier New', monospace;
        font-weight: 600;
        color: #1f2937;
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