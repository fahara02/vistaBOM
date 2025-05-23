<!-- src/lib/components/forms/ManufacturerForm.svelte -->
<script lang="ts">
    import { validateJSON } from '$lib/utils/util';
    import { onMount, createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { manufacturerActionSchema } from '$lib/schema/schema';
    
    // Use the schema from the central schema.ts file
    // Define the type based on the schema for type safety
    import type { z } from 'zod';
    type ManufacturerFormType = z.infer<typeof manufacturerActionSchema>;

    // Event dispatcher for communicating with parent components
    const dispatch = createEventDispatcher<{
        submit: { success: boolean; formData: ManufacturerFormType };
        cancel: void;
        formUpdate: { data: ManufacturerFormType };
    }>();

    // Props - follow Props → Derived → Methods pattern
    export let data: Partial<ManufacturerFormType> = {}; // Form data passed from parent
    export let errors: Record<string, string | string[]> = {}; // Validation errors - support both string and string[] formats
    export let isEditMode: boolean = false; // Whether we're editing an existing manufacturer
    export let hideButtons: boolean = false; // Option to hide buttons in embedded contexts
    export let submitText: string = isEditMode ? 'Save Changes' : 'Create Manufacturer'; // Button text
    export let isDashboardContext: boolean = true; // Whether this form is used in the dashboard
    export const isStandalone: boolean = false; // Whether this is used standalone or in dashboard (exported as const since not used internally)
    // Used in the component for setting created_by/updated_by in the action handler
    export const currentUserId: string | undefined = undefined;

    // Derived state and reactive variables
    // Initialize form data with default values
    let formData: ManufacturerFormType = {
        manufacturer_id: '',
        manufacturer_name: '',
        manufacturer_description: null,
        website_url: '',
        logo_url: '',
        custom_fields: '{}',  // Initialize with empty JSON object
        contact_info: '{}'
    };
    
    // Track if the form has been initialized
    let formInitialized = false;
    
    // Update form data when props change - use consistent field names from schema
    $: if (data && (!formInitialized )) {
        console.log('Initializing form with data:', data);
        // Create a new object to ensure reactivity
        const newFormData = {
            manufacturer_id: data.manufacturer_id || '',
            manufacturer_name: data.manufacturer_name || '',
            manufacturer_description: data.manufacturer_description || null,
            website_url: data.website_url || '',
            logo_url: data.logo_url || '',
            custom_fields: typeof data.custom_fields === 'object' 
                ? JSON.stringify(data.custom_fields, null, 2) 
                : data.custom_fields || '{}',
            contact_info: typeof data.contact_info === 'object' 
                ? JSON.stringify(data.contact_info, null, 2) 
                : data.contact_info || '{}'
        };
        
        console.log('Processed custom fields for form:', newFormData.custom_fields);
        
        // Update the form data
        formData = newFormData;
        formInitialized = true;
        console.log('Initialized form data:', formData);
        
        // Initialize JSON field strings
        initializeJsonFields();
    }

    // Reactively update JSON fields when data changes
    $: if (data) {
        initializeJsonFields();
    }

    let formErrors: Record<string, string | string[]> = { ...errors };
    let isSubmitting: boolean = false;
    let customFieldsString: string = '{}';
    let contactInfoString: string = '{}';
    let customFieldsError: string = '';
    let contactInfoError: string = '';
    let showJsonHelp: boolean = false; // Toggle for JSON help panel

    // Initialize JSON fields on mount and when data changes
    onMount(() => {
        initializeJsonFields();
    });

    // Methods
    function initializeJsonFields(): void {
        // Initialize custom fields from the data
        if (data.custom_fields) {
            try {
                console.log('Initializing custom fields from:', data.custom_fields);
                console.log('Type of custom_fields:', typeof data.custom_fields);
                
                if (typeof data.custom_fields === 'string') {
                    // Try to parse it as JSON first
                    try {
                        const parsed = JSON.parse(data.custom_fields);
                        console.log('Parsed custom fields from string:', parsed);
                        
                        // Process PostgreSQL JSONB format if needed
                        const processedFields: Record<string, any> = {};
                        for (const [key, value] of Object.entries(parsed)) {
                            // Check if the value is a JSONB object with a 'value' property
                            if (value !== null && typeof value === 'object' && 'value' in value) {
                                processedFields[key] = (value as any).value;
                            } else {
                                processedFields[key] = value;
                            }
                        }
                        
                        customFieldsString = JSON.stringify(processedFields, null, 2);
                        console.log('Processed custom fields string:', customFieldsString);
                    } catch (parseError) {
                        console.error('Error parsing custom fields JSON:', parseError);
                        // If it's not valid JSON, use as is
                        customFieldsString = data.custom_fields;
                    }
                } else {
                    // Handle case where it might be an object
                    // Process PostgreSQL JSONB format if needed
                    const processedFields: Record<string, any> = {};
                    for (const [key, value] of Object.entries(data.custom_fields as Record<string, any>)) {
                        // Check if the value is a JSONB object with a 'value' property
                        if (value !== null && typeof value === 'object' && 'value' in value) {
                            processedFields[key] = (value as any).value;
                        } else {
                            processedFields[key] = value;
                        }
                    }
                    
                    customFieldsString = JSON.stringify(processedFields, null, 2);
                    console.log('Processed custom fields from object:', customFieldsString);
                }
                customFieldsError = '';
            } catch (e) {
                customFieldsString = '{}';
                customFieldsError = 'Invalid JSON in custom fields';
                console.error('Error processing custom fields:', e);
            }
        } else {
            customFieldsString = '{}';
        }

        // Initialize contact info from the data
        if (data.contact_info) {
            try {
                if (typeof data.contact_info === 'string') {
                    // Try to parse it as JSON first
                    try {
                        const parsed = JSON.parse(data.contact_info);
                        contactInfoString = JSON.stringify(parsed, null, 2);
                    } catch {
                        // If it's not valid JSON, use as is or convert to JSON
                        if (data.contact_info.includes(':') && !data.contact_info.startsWith('{')) {
                            // Try to convert key-value format to JSON
                            try {
                                const pairs = data.contact_info.split(/[;\n]+/);
                                const contactObj: Record<string, string> = {};
                                
                                for (const pair of pairs) {
                                    const [key, value] = pair.split(':').map(s => s.trim());
                                    if (key && value) {
                                        contactObj[key] = value;
                                    }
                                }
                                contactInfoString = JSON.stringify(contactObj, null, 2);
                            } catch {
                                contactInfoString = JSON.stringify({ notes: data.contact_info }, null, 2);
                            }
                        } else {
                            contactInfoString = JSON.stringify({ notes: data.contact_info }, null, 2);
                        }
                    }
                } else {
                    contactInfoString = JSON.stringify(data.contact_info, null, 2);
                }
                contactInfoError = '';
            } catch (e) {
                contactInfoString = '{}';
                contactInfoError = 'Error parsing contact info';
                console.error('Error parsing contact info:', e);
            }
        } else {
            contactInfoString = '{}';
        }
    }

    // Notify parent component of form changes
    function handleFormChange(): void {
        console.log('Form data changed:', formData);
        dispatch('formUpdate', { data: formData });
    }

    // Handle input changes for regular text fields
    function handleInputChange(event: Event, field: string): void {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        
        // Update the form data
        formData = {
            ...formData,
            [field]: value
        };
        
        // Clear any errors for this field
        if (formErrors[field]) {
            formErrors = {
                ...formErrors,
                [field]: ''
            };
        }
        
        // Notify parent of form changes
        handleFormChange();
        console.log(`Field ${field} updated to:`, value);
    }

    // Handle changes for JSON textarea fields
    function handleTextareaChange(event: Event, field: string): void {
        const target = event.target as HTMLTextAreaElement;
        const value = target.value;
        
        if (field === 'custom_fields') {
            customFieldsString = value;
            // Don't validate immediately on each keystroke
        } else if (field === 'contact_info') {
            contactInfoString = value;
            // Don't validate immediately on each keystroke
        }
        
        // Notify parent of form changes
        handleFormChange();
    }

    function validateContactInfo(): boolean {
        try {
            if (contactInfoString.trim()) {
                // Check if it's already valid JSON
                try {
                    const parsed = JSON.parse(contactInfoString);
                    formData.contact_info = JSON.stringify(parsed);
                    contactInfoError = '';
                    return true;
                } catch (e) {
                    // Not valid JSON, try to convert from key-value format
                    if (contactInfoString.includes(':') && !contactInfoString.startsWith('{')) {
                        try {
                            const pairs = contactInfoString.split(/[;\n]+/);
                            const contactObj: Record<string, string> = {};
                            
                            for (const pair of pairs) {
                                const [key, value] = pair.split(':').map(s => s.trim());
                                if (key && value) {
                                    contactObj[key] = value;
                                }
                            }
                            formData.contact_info = JSON.stringify(contactObj);
                            contactInfoError = '';
                            return true;
                        } catch {
                            // If conversion fails, store as notes
                            formData.contact_info = JSON.stringify({ notes: contactInfoString });
                            contactInfoError = '';
                            return true;
                        }
                    } else {
                        // If not in key-value format, store as notes
                        formData.contact_info = JSON.stringify({ notes: contactInfoString });
                        contactInfoError = '';
                        return true;
                    }
                }
            } else {
                formData.contact_info = '';
                contactInfoError = '';
                return true;
            }
        } catch (e) {
            contactInfoError = 'Error processing contact info';
            console.error('Error processing contact info:', e);
            return false;
        }
    }

    // Validate and update custom fields JSON
    function validateCustomFields(): boolean {
        try {
            if (customFieldsString.trim()) {
                // Validate JSON format
                const parsed = JSON.parse(customFieldsString);
                
                // Log the parsed custom fields for debugging
                console.log('Parsed custom fields:', parsed);
                
                // Store the JSON string directly since the type expects a string
                formData.custom_fields = customFieldsString;
                customFieldsError = '';
                return true;
            } else {
                // If empty, set to empty string since we expect a string type
                formData.custom_fields = '';
                customFieldsError = '';
                return true;
            }
        } catch (e) {
            console.error('Invalid custom fields JSON:', e);
            customFieldsError = 'Invalid JSON format';
            return false;
        }
    }

    // Handle form submission
    function handleSubmit(): void {
        isSubmitting = true;

        // Validate JSON fields first
        const isCustomFieldsValid = validateCustomFields();
        const isContactInfoValid = validateContactInfo();

        if (!isCustomFieldsValid || !isContactInfoValid) {
            isSubmitting = false;
            return;
        }

        // Validate the entire form against the imported schema
        const result = manufacturerActionSchema.safeParse(formData);
        
        if (!result.success) {
            // Handle validation errors
            const errors = result.error.format();
            console.error('Validation errors:', errors);
            isSubmitting = false;
            return;
        }

        // Prepare the form data for submission
        const submissionData = {
            // Standard fields
            manufacturer_id: formData.manufacturer_id || '',
            manufacturer_name: formData.manufacturer_name || '',
            manufacturer_description: formData.manufacturer_description || null,
            website_url: formData.website_url || '',
            logo_url: formData.logo_url || '',
            
            // Process contact_info for storage (must be string per the interface)
            contact_info: typeof formData.contact_info === 'string' && formData.contact_info
                ? formData.contact_info 
                : JSON.stringify(formData.contact_info || {}),
                
            // Keep custom_fields as string to match the interface
            custom_fields: formData.custom_fields
        };

        console.log('Submitting manufacturer form with data:', submissionData);
        
        // Dispatch submit event with validated form data
        dispatch('submit', { success: true, formData: submissionData });
        isSubmitting = false;
    }

    // Handle form cancellation
    function handleCancel(): void {
        dispatch('cancel');
        
        // Call the onCancel callback if provided
        if (onCancel) {
            onCancel();
        }
    }

    // Format JSON for better readability
    function formatJson(field: 'custom' | 'contact'): void {
        try {
            if (field === 'custom' && customFieldsString.trim()) {
                const parsed = JSON.parse(customFieldsString);
                customFieldsString = JSON.stringify(parsed, null, 2);
                customFieldsError = '';
            } else if (field === 'contact' && contactInfoString.trim()) {
                const parsed = JSON.parse(contactInfoString);
                contactInfoString = JSON.stringify(parsed, null, 2);
                contactInfoError = '';
            }
        } catch (e) {
            if (field === 'custom') {
                customFieldsError = 'Invalid JSON format';
            } else {
                contactInfoError = 'Invalid JSON format';
            }
        }
    }

    // Toggle JSON help panel visibility
    function toggleJsonHelp(): void {
        showJsonHelp = !showJsonHelp;
    }

    // Debug function - only used in development
    function debugForm(): void {
        console.log('Form data:', formData);
        console.log('Custom fields:', customFieldsString);
        console.log('Contact info:', contactInfoString);
        console.log('Errors:', formErrors);
        console.log('Edit Mode:', isEditMode);
        alert('Form data logged to console');
    }

    // Initialize JSON fields when data changes
    $: if (data) {
        if (data.custom_fields) {
            customFieldsString = typeof data.custom_fields === 'string' ? data.custom_fields : JSON.stringify(data.custom_fields, null, 2);
        }
        if (data.contact_info) {
            contactInfoString = typeof data.contact_info === 'string' ? data.contact_info : JSON.stringify(data.contact_info, null, 2);
        }
    }
    
    // Update submitText when edit mode changes
    $: submitText = isEditMode ? 'Save Changes' : 'Create Manufacturer';

    // Optional callback functions - using in the handleCancel function
    export let onCancel: (() => void) | undefined = undefined;
</script>

<div class="manufacturer-form">
    <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
            <label for="manufacturer_name">Manufacturer Name <span class="required">*</span></label>
            <input 
                type="text" 
                id="manufacturer_name" 
                bind:value={formData.manufacturer_name} 
                class:error={formErrors.manufacturer_name}
                on:input={handleFormChange}
                required
            />
            {#if formErrors.manufacturer_name}
                <div class="error-message">{formErrors.manufacturer_name}</div>
            {/if}
        </div>
        
        <div class="form-group">
            <label for="manufacturer_description">Description</label>
            <textarea 
                id="manufacturer_description" 
                bind:value={formData.manufacturer_description} 
                class:error={formErrors.manufacturer_description}
                on:input={handleFormChange}
                rows="3"
            ></textarea>
            {#if formErrors.manufacturer_description}
                <div class="error-message">{formErrors.manufacturer_description}</div>
            {/if}
        </div>
        
        <div class="form-group">
            <label for="website_url">Website URL</label>
            <input 
                type="url" 
                id="website_url" 
                bind:value={formData.website_url} 
                class:error={formErrors.website_url}
                on:input={handleFormChange}
                placeholder="https://example.com"
            />
            {#if formErrors.website_url}
                <div class="error-message">{formErrors.website_url}</div>
            {/if}
        </div>
        
        <div class="form-group">
            <label for="logo_url">Logo URL</label>
            <input 
                type="url" 
                id="logo_url" 
                bind:value={formData.logo_url} 
                class:error={formErrors.logo_url}
                on:input={handleFormChange}
                placeholder="https://example.com/logo.png"
            />
            {#if formErrors.logo_url}
                <div class="error-message">{formErrors.logo_url}</div>
            {/if}
        </div>
        
        <div class="form-group json-field">
            <label for="contact_info">Contact Info (JSON)</label>
            <div class="contact-info-tools">
                <div>
                    {#if contactInfoError}
                        <span class="json-status invalid-json">Invalid JSON</span>
                    {:else if contactInfoString && contactInfoString !== '{}'}
                        <span class="json-status valid-json">Valid JSON</span>
                    {/if}
                </div>
                <button type="button" class="format-button" on:click={() => formatJson('contact')}>Format JSON</button>
            </div>
            <textarea 
                id="contact_info" 
                bind:value={contactInfoString} 
                class:error={contactInfoError}
                rows="5"
                placeholder="Enter contact information in JSON format or key:value pairs"
                on:input={(e) => {
                    // Update the form data on input
                    formData.contact_info = contactInfoString;
                    handleFormChange();
                }}
            ></textarea>
            {#if contactInfoError}
                <div class="error-message">{contactInfoError}</div>
            {/if}
        </div>
        
        <div class="form-group json-field">
            <label for="custom_fields">Custom Fields (JSON)</label>
            <div class="contact-info-tools">
                <div>
                    {#if customFieldsError}
                        <span class="json-status invalid-json">Invalid JSON</span>
                    {:else if customFieldsString && customFieldsString !== '{}'}
                        <span class="json-status valid-json">Valid JSON</span>
                    {/if}
                </div>
                <button type="button" class="format-button" on:click={() => formatJson('custom')}>Format JSON</button>
            </div>
            <textarea 
                id="custom_fields" 
                bind:value={customFieldsString} 
                class:error={customFieldsError}
                rows="5"
                placeholder="Enter custom fields in JSON format"
                on:input={(e) => {
                    // Update the form data on input
                    formData.custom_fields = customFieldsString;
                    handleFormChange();
                }}
            ></textarea>
            {#if customFieldsError}
                <div class="error-message">{customFieldsError}</div>
            {/if}
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={toggleJsonHelp}>
                    <span class="toggle-icon">{showJsonHelp ? '-' : '+'}</span>
                    <span class="toggle-text">JSON Help</span>
                </button>
            </div>
            
            {#if showJsonHelp}
                <div class="help-panel" transition:slide={{ duration: 300 }}>
                    <p>JSON (JavaScript Object Notation) is a format for storing and exchanging data.</p>
                    <p>Custom fields should be formatted as a JSON object with key-value pairs:</p>
                    <ul>
                        <li>Keys must be strings enclosed in double quotes</li>
                        <li>Values can be strings, numbers, boolean (true/false), null, arrays or objects</li>
                        <li>String values must be enclosed in double quotes</li>
                        <li>Arrays are enclosed in square brackets []</li>
                        <li>Objects are enclosed in curly braces &#123;&#125;</li>
                    </ul>
                    <p>Example: <code>&#123;"field1": "value1", "count": 42, "active": true&#125;</code></p>
                </div>
            {/if}
        </div>
        N
        {#if !hideButtons}
            <div class="form-actions">
                <button type="button" class="btn cancel-btn" on:click={handleCancel}>Cancel</button>
                <button type="submit" class="btn submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : submitText}
                </button>
            </div>
        {/if}
        
        {#if isDashboardContext}
            <div class="debug-tools">
                <button type="button" class="debug-button" on:click={debugForm}>Debug Form</button>
            </div>
        {/if}
    </form>
</div>

<style>
    .manufacturer-form {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        font-family: system-ui, -apple-system, sans-serif;
    }
    
    .form-group {
        margin-bottom: 1.25rem;
        display: flex;
        flex-direction: column;
    }
    
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: hsl(var(--foreground));
    }
    
    input, textarea {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid hsl(var(--border));
        border-radius: 4px;
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        font-size: 0.875rem;
        transition: border-color 0.3s, box-shadow 0.3s;
    }
    
    input:focus, textarea:focus {
        outline: none;
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
    }
    
    input.error, textarea.error {
        border-color: hsl(var(--destructive));
    }
    
    input.error:focus, textarea.error:focus {
        box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.2);
    }
    
    .error-message {
        color: hsl(var(--destructive));
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }
    
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
    }
    
    .debug-tools {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
    }
    
    .debug-button {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background-color: hsl(var(--muted));
        border: 1px solid hsl(var(--border));
        border-radius: 0.25rem;
        cursor: pointer;
        color: hsl(var(--muted-foreground));
    }
    
    .btn {
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 6px;
        transition: all 0.15s ease;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid transparent;
    }
    
    .cancel-btn {
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        border-color: hsl(var(--border));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .cancel-btn:hover {
        background-color: hsl(var(--muted));
        border-color: hsl(var(--muted-foreground));
    }
    
    .submit-btn {
        background-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-color: hsl(var(--primary-dark));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .submit-btn:hover {
        background-color: hsl(var(--primary-dark));
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .required {
        color: hsl(var(--destructive));
    }
    
    .contact-info-tools {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }
    
    .format-button {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background-color: hsl(var(--secondary));
        border: 1px solid hsl(var(--border));
        border-radius: 0.25rem;
        cursor: pointer;
        color: hsl(var(--secondary-foreground));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .format-button:hover {
        background-color: hsl(var(--secondary) / 0.8);
    }
    
    .helper-toggle {
        margin-top: 0.5rem;
        display: flex;
        justify-content: flex-start;
    }
    
    .toggle-button {
        background: none;
        border: none;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: hsl(var(--primary));
        cursor: pointer;
        padding: 0.25rem 0;
    }
    
    .toggle-icon {
        font-size: 1rem;
        width: 1rem;
        text-align: center;
        line-height: 1;
    }
    
    .toggle-text {
        font-weight: 500;
    }
    
    .help-panel {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background-color: hsl(var(--muted));
        border-radius: 4px;
        font-size: 0.875rem;
        transition: background-color 0.3s;
    }
    
    .help-panel p {
        margin-top: 0;
        margin-bottom: 0.5rem;
    }
    
    .help-panel ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }
    
    .help-panel li {
        margin-bottom: 0.25rem;
    }
    
    code {
        font-family: monospace;
        font-size: 0.85em;
        background-color: hsl(var(--muted) / 0.5);
        padding: 0.125rem 0.25rem;
        border-radius: 3px;
    }
    
    /* Error styles are used directly on inputs via class:error */
    
    .json-status {
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .valid-json {
        color: hsl(var(--success));
        background-color: hsl(var(--success) / 0.2);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
    }
    
    .invalid-json {
        color: hsl(var(--destructive));
        background-color: hsl(var(--destructive) / 0.2);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
    }
</style>
