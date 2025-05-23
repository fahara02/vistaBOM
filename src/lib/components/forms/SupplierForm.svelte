<!-- src/lib/components/forms/SupplierForm.svelte -->
<script lang="ts">
    // Export this component as the default export
    import { superForm } from 'sveltekit-superforms/client';
    import { supplierSchema } from '$lib/schema/schema';
    import { z } from 'zod';
    import { validateJSON, formatContactInfoForDisplay } from './utils';
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    
    // Define the type based on the schema for type safety
    type SupplierFormType = z.infer<typeof supplierSchema>;
    
    // Props - follow Props → Derived → Methods pattern
    export let form: any = undefined; // Allow passing in a form directly
    export let currentUserId: string = ''; // User ID is used in form submission
    export let editMode: boolean = false;
    export let supplierId: string | null = null;
    export let onComplete: () => void = () => {};
    export let submitting: boolean = false; // For use outside superForm
    export let hideButtons: boolean = false; // Option to hide buttons
    // If this component is used standalone (not in dashboard)
    // Converted to const as it's not currently used directly in the template
    export const isStandalone: boolean = false;
    
    // For dashboard integration, you can pass store references
    export let storeRefs: {
        showSupplierForm?: any
    } = {};
    
    // Local state
    let showContactExamples = false;
    let showCustomFieldsHelp = false;
    let contactInfoString = '{}';
    let customFieldsJson = '{}';
    let customFieldsValid = true;
    let contactInfoFormatted = false;

    // Initialize superForm or use passed form
    const { form: formStore, errors, enhance: superEnhance, submitting: superSubmitting, message } = superForm(
        // We'll initialize with form or null and update in onMount
        form !== undefined ? form : null as unknown as SupplierFormType,
        {
            dataType: 'json',
            resetForm: true,
            // Add UUID generation and JSON handling before form submission
            onSubmit: ({ formData }) => {
                // Generate a valid UUID for supplier_id if empty or missing
                const supplierIdValue = formData.get('supplier_id');
                if (!supplierIdValue || supplierIdValue === '') {
                    const uuid = crypto.randomUUID();
                    formData.set('supplier_id', uuid);
                    
                    // Also update the reactive store
                    $formStore.supplier_id = uuid;
                }
                
                // Validate the contact_info JSON
                try {
                    const contactInfo = contactInfoString.trim();
                    if (contactInfo) {
                        const parsedContact = JSON.parse(contactInfo);
                        formData.set('contact_info', JSON.stringify(parsedContact));
                    } else {
                        // FormData cannot accept null values - use empty string instead
                        // The server will handle converting empty strings to null
                        formData.set('contact_info', '');
                    }
                } catch (e) {
                    // Let the server-side validation handle the error
                }
                
                // Validate custom fields JSON
                try {
                    const customFields = customFieldsJson.trim();
                    if (customFields && customFields !== '{}') {
                        const parsedCustomFields = JSON.parse(customFields);
                        formData.set('custom_fields_json', JSON.stringify(parsedCustomFields));
                    } else {
                        // FormData cannot accept null values - use empty object string instead
                        formData.set('custom_fields_json', '{}');
                    }
                } catch (e) {
                    // Let the server-side validation handle the error
                }
            },
            onResult: ({ result }) => {
                if (result.type === 'success') {
                    // Close the form and refresh data
                    if (storeRefs.showSupplierForm) {
                        storeRefs.showSupplierForm.set(false);
                    }
                    onComplete();
                }
                // Let superForm handle the rest
                return result;
            }
        }
    );
    
    // Use the correct enhance function
    let enhance = superEnhance;
    
    // Initialize the form when component mounts
    onMount(() => {
        if (form === undefined) { // Only do this if form wasn't passed in directly
            // Import is inside onMount to prevent SSR issues
            import('$app/stores').then(({ page }) => {
                // Initialize the form with data from the page store
                const pageStore = page;
                // Use type assertion to access data property safely
                const pageData = (pageStore as unknown as { data: any }).data;
                
                if (editMode && supplierId) {
                    // Find the supplier to edit from API or page data
                    // This would be implemented based on how you store/access suppliers
                    // For now, assume pageData contains the supplier
                    const supplierToEdit = pageData?.supplier;
                    
                    if (supplierToEdit) {
                        // Initialize form with the supplier data
                        $formStore = {
                            supplier_id: supplierToEdit.supplier_id,
                            supplier_name: supplierToEdit.supplier_name,
                            supplier_description: supplierToEdit.supplier_description || '',
                            website_url: supplierToEdit.website_url || '',
                            contact_info: supplierToEdit.contact_info,
                            logo_url: supplierToEdit.logo_url || '',
                            created_by: supplierToEdit.created_by || currentUserId,
                            created_at: supplierToEdit.created_at || new Date(),
                            updated_by: currentUserId,
                            updated_at: new Date(),
                            custom_fields_json: supplierToEdit.custom_fields_json || '{}'
                        } as SupplierFormType;
                        
                        // Initialize contactInfoString from form data
                        if ($formStore.contact_info) {
                            contactInfoString = JSON.stringify($formStore.contact_info, null, 2);
                        }
                        
                        // Initialize customFieldsJson
                        if (supplierToEdit.custom_fields_json) {
                            customFieldsJson = typeof supplierToEdit.custom_fields_json === 'string' 
                                ? supplierToEdit.custom_fields_json 
                                : JSON.stringify(supplierToEdit.custom_fields_json, null, 2);
                        }
                    }
                } else if (pageData?.supplierForm) {
                    // Initialize with the default form data
                    $formStore = pageData.supplierForm.data as SupplierFormType;
                    
                    // Initialize contactInfoString from form data
                    if ($formStore.contact_info) {
                        contactInfoString = JSON.stringify($formStore.contact_info, null, 2);
                    }
                    
                    // Initialize customFieldsJson
                    if ($formStore.custom_fields_json) {
                        customFieldsJson = typeof $formStore.custom_fields_json === 'string'
                            ? $formStore.custom_fields_json
                            : JSON.stringify($formStore.custom_fields_json, null, 2);
                    }
                } else {
                    // Initialize with empty values if no form data is available
                    $formStore = {
                        supplier_id: '',
                        supplier_name: '',
                        supplier_description: '',
                        website_url: '',
                        contact_info: null,
                        logo_url: '',
                        created_by: currentUserId,
                        created_at: new Date(),
                        updated_by: currentUserId,
                        updated_at: new Date(),
                        custom_fields_json: '{}'
                    } as SupplierFormType;
                }
            });
        } else if ('subscribe' in form) {
            // If a form store was passed in, sync our local variables
            if ($formStore.contact_info) {
                contactInfoString = JSON.stringify($formStore.contact_info, null, 2);
            }
            
            if ($formStore.custom_fields_json) {
                customFieldsJson = typeof $formStore.custom_fields_json === 'string'
                    ? $formStore.custom_fields_json
                    : JSON.stringify($formStore.custom_fields_json, null, 2);
            }
        }
    });
    
    // Methods
    function cancelForm(): void {
        // Reset and close the form
        if (storeRefs.showSupplierForm) {
            storeRefs.showSupplierForm.set(false);
        }
        if (onCancel) onCancel();
    }
    
    // Function to update contact info when edited
    function updateContactInfo(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        contactInfoString = target.value;
        
        try {
            if (contactInfoString.trim()) {
                $formStore.contact_info = JSON.parse(contactInfoString);
            } else {
                $formStore.contact_info = null;
            }
        } catch (e) {
            // Invalid JSON - don't update the form data
        }
    }
    
    // Function to update and validate custom fields
    function updateCustomFields(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        customFieldsJson = target.value;
        
        try {
            if (customFieldsJson.trim()) {
                const parsedJson = JSON.parse(customFieldsJson);
                customFieldsValid = true;
                $formStore.custom_fields_json = parsedJson;
            } else {
                customFieldsValid = true;
                $formStore.custom_fields_json = {};
            }
        } catch (e) {
            customFieldsValid = false;
            // Don't update form data on invalid JSON
        }
    }
    
    // Function to prettify JSON
    function formatJson(): void {
        try {
            if (contactInfoString.trim()) {
                const parsedJson = JSON.parse(contactInfoString);
                contactInfoString = JSON.stringify(parsedJson, null, 2);
            }
        } catch (e) {
            // Invalid JSON - can't format
        }
    }
    
    // Function to format custom fields JSON
    function formatCustomFieldsJson(): void {
        try {
            if (customFieldsJson.trim() && customFieldsJson !== '{}') {
                const parsedJson = JSON.parse(customFieldsJson);
                customFieldsJson = JSON.stringify(parsedJson, null, 2);
            }
        } catch (e) {
            // Invalid JSON - can't format
        }
    }
    
    // Optional callback functions
    export let onCancel: (() => void) | undefined = undefined;
</script>

<div class="form-container">
    {#if !hideButtons}
        <h3 class="form-title">{editMode ? 'Edit Supplier' : 'Add New Supplier'}</h3>
    {/if}
    
    <form
        method="POST"
        action={editMode ? `?/editSupplier&id=${supplierId}` : '?/createSupplier'}
        use:enhance
    >
        <!-- Hidden fields -->
        {#if editMode && supplierId}
            <input type="hidden" name="supplier_id" bind:value={$formStore.supplier_id} />
        {/if}
        <!-- Include currentUserId as hidden field for form submission -->
        {#if currentUserId}
            <input type="hidden" name="created_by" value={currentUserId} />
        {/if}
        
        <div class="form-field">
            <label for="supplier_name">
                Name <span class="required">*</span>
            </label>
            <input
                id="supplier_name"
                name="supplier_name"
                bind:value={$formStore.supplier_name}
                required
                class="enhanced-input"
            />
            {#if $errors.supplier_name}
                <div class="field-error">{$errors.supplier_name}</div>
            {/if}
        </div>
        
        <div class="form-field">
            <label for="supplier_description">Description</label>
            <textarea
                id="supplier_description"
                name="supplier_description"
                bind:value={$formStore.supplier_description}
                class="enhanced-input form-textarea"
            ></textarea>
            {#if $errors.supplier_description}
                <div class="field-error">{$errors.supplier_description}</div>
            {/if}
        </div>
        
        <div class="form-row">
            <div class="form-field">
                <label for="website_url">Website URL</label>
                <input
                    id="website_url"
                    name="website_url"
                    type="url"
                    bind:value={$formStore.website_url}
                    class="enhanced-input"
                    placeholder="https://example.com"
                />
                {#if $errors.website_url}
                    <div class="field-error">{$errors.website_url}</div>
                {/if}
            </div>
            
            <div class="form-field">
                <label for="logo_url">Logo URL</label>
                <input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    bind:value={$formStore.logo_url}
                    class="enhanced-input"
                    placeholder="https://example.com/logo.png"
                />
                {#if $errors.logo_url}
                    <div class="field-error">{$errors.logo_url}</div>
                {/if}
            </div>
        </div>
        
        <div class="form-field">
            <label for="contact_info">Contact Information</label>
            <div class="contact-info-tools">
                <button type="button" class="format-button" on:click={formatJson}>Format JSON</button>
                <div class="json-status">
                    {#if contactInfoString.trim() !== ''}
                        {#if validateJSON(contactInfoString)}
                            <span class="valid-json">✓ Valid JSON</span>
                        {:else}
                            <span class="invalid-json">✗ Invalid JSON</span>
                        {/if}
                    {/if}
                </div>
            </div>
            <textarea
                id="contact_info"
                name="contact_info"
                class="enhanced-input form-textarea"
                placeholder={'{"email": "example@company.com", "phone": "123-456-7890"}'}
                bind:value={contactInfoString}
                on:input={updateContactInfo}
            ></textarea>
            {#if $errors.contact_info}
                <div class="field-error">{$errors.contact_info}</div>
            {/if}
            
            <div class="contact-info-preview">
                {#if contactInfoString && validateJSON(contactInfoString)}
                    <div class="preview-heading">Contact Information Preview:</div>
                    <div class="contact-list">
                        {#each formatContactInfoForDisplay(contactInfoString) as contactItem}
                            {#if contactItem.trim()}
                                <div class="contact-item">
                                    {#if contactItem.includes('@')}
                                        <span class="contact-icon">✉️</span>
                                    {:else if contactItem.match(/\d{3,}/)}
                                        <span class="contact-icon">📞</span>
                                    {:else}
                                        <span class="contact-icon">ℹ️</span>
                                    {/if}
                                    <span class="contact-text">{contactItem.trim()}</span>
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={() => showContactExamples = !showContactExamples}>
                    <span class="toggle-icon">{showContactExamples ? '−' : '+'}</span>
                    <span class="toggle-text">Help with Contact Information</span>
                </button>
            </div>
            
            {#if showContactExamples}
                <div class="help-panel" transition:slide={{ duration: 300 }}>
                    <p>Contact information should be provided in JSON format. Examples:</p>
                    <ul>
                        <li><code>&#123;"email": "contact@example.com", "phone": "(123) 456-7890"&#125;</code></li>
                        <li><code>&#123;"sales": "sales@example.com", "support": "support@example.com"&#125;</code></li>
                        <li><code>&#123;"main_office": &#123;"address": "123 Main St", "phone": "555-1212"&#125;&#125;</code></li>
                    </ul>
                </div>
            {/if}
        </div>
        
        <div class="form-field">
            <label for="custom_fields_json">Custom Fields</label>
            <div class="contact-info-tools">
                <button type="button" class="format-button" on:click={formatCustomFieldsJson}>Format JSON</button>
                <div class="json-status">
                    {#if customFieldsJson.trim() !== '{}'}
                        {#if validateJSON(customFieldsJson)}
                            <span class="valid-json">✓ Valid JSON</span>
                        {:else}
                            <span class="invalid-json">✗ Invalid JSON</span>
                        {/if}
                    {/if}
                </div>
            </div>
            <textarea
                id="custom_fields_json"
                name="custom_fields_json"
                class="enhanced-input form-textarea"
                placeholder={'{"key": "value"}'}
                bind:value={customFieldsJson}
                on:input={updateCustomFields}
            ></textarea>
            {#if $errors.custom_fields_json}
                <div class="field-error">{$errors.custom_fields_json}</div>
            {/if}
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={() => showCustomFieldsHelp = !showCustomFieldsHelp}>
                    <span class="toggle-icon">{showCustomFieldsHelp ? '−' : '+'}</span>
                    <span class="toggle-text">Help with Custom Fields</span>
                </button>
            </div>
            
            {#if showCustomFieldsHelp}
                <div class="help-panel" transition:slide={{ duration: 300 }}>
                    <p>Custom fields allow you to add additional attributes to this supplier.</p>
                    <ul>
                        <li>Use a valid JSON object format with key-value pairs</li>
                        <li>Values can be text, numbers, or boolean (true/false)</li>
                        <li>Example: <code>&#123;"founded": "1985", "employees": 500, "publicly_traded": true&#125;</code></li>
                    </ul>
                </div>
            {/if}
        </div>
        
        {#if !hideButtons}
            <div class="form-actions">
                <button type="button" class="cancel-btn enhanced-btn" on:click={cancelForm}>
                    Cancel
                </button>
                <button
                    type="submit"
                    class="submit-btn enhanced-btn"
                    disabled={$superSubmitting || submitting}
                >
                    {$superSubmitting || submitting ? 'Saving...' : editMode ? 'Update Supplier' : 'Create Supplier'}
                </button>
            </div>
        {/if}
    </form>
    
    {#if $message}
        <div class="form-message" class:success={$message.type === 'success'} class:error={$message.type === 'error'}>
            {$message.text}
        </div>
    {/if}
</div>
