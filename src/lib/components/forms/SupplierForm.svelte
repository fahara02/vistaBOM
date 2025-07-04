<!-- src/lib/components/forms/SupplierForm.svelte -->
<script lang="ts">
    import { validateJSON } from '$lib/utils/util';
    import { onMount, createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { supplierActionSchema } from '$lib/schema/schema';
    
    // Use the schema from the central schema.ts file
    // Define the type based on the schema for type safety
    import type { z } from 'zod';
    type SupplierFormType = z.infer<typeof supplierActionSchema> & {
        // Additional fields used in the edit form but not in the schema
        custom_fields_json?: string;
        supplierId?: string; // Alternative ID format for compatibility
    };

    // Event dispatcher for communicating with parent components
    const dispatch = createEventDispatcher<{
        submit: { success: boolean; formData: SupplierFormType };
        cancel: void;
        formUpdate: { data: SupplierFormType };
    }>();

    // Props - follow Props → Derived → Methods pattern
    export let data: Partial<SupplierFormType> = {}; // Form data passed from parent
    export let errors: Record<string, string | string[]> = {}; // Validation errors - support both string and string[] formats
    export let isEditMode: boolean = false; // Whether we're editing an existing supplier
    export let hideButtons: boolean = false; // Option to hide buttons in embedded contexts
    export let submitText: string = isEditMode ? 'Save Changes' : 'Create Supplier'; // Button text
    export const isDashboardContext: boolean = true; // Whether this form is used in the dashboard (exported as const since not used internally)
    export const isStandalone: boolean = false; // Whether this is used standalone or in dashboard (exported as const since not used internally)
    // Used in the component for setting created_by/updated_by in the action handler
    export const currentUserId: string | undefined = undefined;

    // Derived state and reactive variables
    // Initialize form data with default values
    let formData: SupplierFormType = {
        supplier_id: '',
        supplier_name: '',
        supplier_description: null,
        website_url: '',
        logo_url: '',
        custom_fields: '{}',  // Initialize with empty JSON object
        contact_info: '{}'
    };
    
    // Track if the form has been initialized
    let formInitialized = false;
    
    // Update form data when props change - use consistent field names from schema
    // FIXED: Always update when data changes, not just on first initialization
    $: if (data) {
        
        
        // Create a new object to ensure reactivity
        const newFormData = {
            supplier_id: data.supplier_id || '',
            supplierId: data.supplier_id || data.supplierId || '',
            supplier_name: data.supplier_name || '',
            supplier_description: data.supplier_description || null,
            website_url: data.website_url || '',
            logo_url: data.logo_url || '',
            // Handle both custom_fields and custom_fields_json fields
            custom_fields: typeof data.custom_fields === 'object' 
                ? JSON.stringify(data.custom_fields, null, 2) 
                : data.custom_fields || '{}',
            // Also ensure custom_fields_json is available for the action
            custom_fields_json: data.custom_fields_json || (
                typeof data.custom_fields === 'object' 
                    ? JSON.stringify(data.custom_fields) 
                    : data.custom_fields || '{}'
            ),
            contact_info: typeof data.contact_info === 'object' 
                ? JSON.stringify(data.contact_info, null, 2) 
                : data.contact_info || '{}'
        };
        
    
        
        // Update the form data
        formData = newFormData;
        formInitialized = true;
      
        
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
    let formError: string = ''; // General form error message
    let showJsonHelp: boolean = false; // Toggle for JSON help panel

    // Initialize JSON fields on mount and when data changes
    onMount(() => {
        initializeJsonFields();
    });

    // Methods
    function initializeJsonFields(): void {
        // Initialize custom fields from the data - prioritize custom_fields_json if available
        let customFieldsSource = data.custom_fields_json || data.custom_fields;
        
        // Always ensure we're working with a non-null value
        if (customFieldsSource === null || customFieldsSource === undefined) {
           
            customFieldsString = '{}';
            return;
        }
        
        try {
           
            
            if (typeof customFieldsSource === 'string') {
                // Try to parse it as JSON
                try {
                    // Only try to parse if it looks like JSON
                    if (customFieldsSource.trim().startsWith('{')) {
                        const parsed = JSON.parse(customFieldsSource);
                        customFieldsString = JSON.stringify(parsed, null, 2);
                        
                    } else if (customFieldsSource.trim() === '') {
                        // Empty string case
                        customFieldsString = '{}';
                        
                    } else {
                        // Not JSON but not empty - use empty object and log warning
                        customFieldsString = '{}';
                        console.warn('Custom fields string is not JSON format, using empty object');
                    }
                } catch (parseError) {
                    // If not valid JSON, log error and use empty object
                    console.error('Failed to parse custom fields JSON:', parseError);
                    customFieldsString = '{}';
                }
            } else if (typeof customFieldsSource === 'object') {
                // Direct object - stringify it
                customFieldsString = JSON.stringify(customFieldsSource, null, 2);
              
            } else {
                // Default to empty object for any other type
                customFieldsString = '{}';
                
            }
            customFieldsError = ''; // Clear any errors
        } catch (e) {
            customFieldsString = '{}';
            customFieldsError = 'Invalid JSON in custom fields';
            console.error('Error processing custom fields:', e);
        }

        // Initialize contact info from the data
        if (data.contact_info) {
            try {
                
                
                if (typeof data.contact_info === 'string') {
                    // First check if it's empty
                    if (data.contact_info.trim() === '') {
                        contactInfoString = '{}';
                       
                    }
                    // Try to parse it as JSON if it looks like JSON
                    else if (data.contact_info.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(data.contact_info);
                            contactInfoString = JSON.stringify(parsed, null, 2);
                           
                        } catch (parseError) {
                            console.error('Failed to parse contact info JSON:', parseError);
                            // Use as plain text if not valid JSON
                            contactInfoString = JSON.stringify({ notes: data.contact_info }, null, 2);
                            
                        }
                    }
                    // Check if it's in key-value format
                    else if (data.contact_info.includes(':') && !data.contact_info.startsWith('{')) {
                        // Looks like a key-value format, convert to JSON
                        try {
                            const lines = data.contact_info.split(/[;\n]+/);
                            const contactObj: Record<string, string> = {};
                            
                            for (const line of lines) {
                                const match = line.match(/^\s*([^:]+)\s*:\s*(.+?)\s*$/);
                                if (match) {
                                    const [, key, value] = match;
                                    contactObj[key.trim()] = value.trim();
                                }
                            }
                            
                            if (Object.keys(contactObj).length > 0) {
                                contactInfoString = JSON.stringify(contactObj, null, 2);
                                console.log('Converted key-value contact info to JSON');
                            } else {
                                // If no key-value pairs found, use as plain text
                                contactInfoString = JSON.stringify({ notes: data.contact_info }, null, 2);
                                console.log('No key-value pairs found, used as notes');
                            }
                        } catch (e) {
                            // Fallback to simple structure
                            contactInfoString = JSON.stringify({ notes: data.contact_info }, null, 2);
                            console.error('Error processing key-value format:', e);
                        }
                    } else {
                        // Use as plain text for any other string format
                        contactInfoString = JSON.stringify({ notes: data.contact_info }, null, 2);
                        console.log('Using contact info as plain text notes');
                    }
                } else if (typeof data.contact_info === 'object' && data.contact_info !== null) {
                    // Direct object - stringify it
                    contactInfoString = JSON.stringify(data.contact_info, null, 2);
                    console.log('Contact info provided as object, stringified for editing');
                } else {
                    // Default to empty object for any other type
                    contactInfoString = '{}';
                    console.log('Unknown contact info type, defaulting to empty object');
                }
                contactInfoError = ''; // Clear any errors
            } catch (e) {
                contactInfoString = '{}';
                contactInfoError = 'Error parsing contact info';
                console.error('Error parsing contact info:', e);
            }
        } else {
            contactInfoString = '{}';
            console.log('No contact info provided, using empty object');
        }
    }

    // Notify parent component of form changes
    function handleFormChange(): void {
       
        dispatch('formUpdate', { data: formData });
    }

    // Handle input change for regular form fields
    function handleInputChange(event: Event, field: string): void {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        
        // Update the form data
        if (field in formData) {
            formData = {
                ...formData,
                [field]: value
            };
        }
        
        // Clear any error for this field
        if (field in formErrors) {
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
            // Update formData with the custom fields value
            formData = {
                ...formData,
                custom_fields: value,
                custom_fields_json: value // Also update custom_fields_json for compatibility
            };
            // Don't validate immediately on each keystroke
        } else if (field === 'contact_info') {
            contactInfoString = value;
            // Update formData with the contact info value
            formData = {
                ...formData,
                contact_info: value
            };
            // Don't validate immediately on each keystroke
        }
        
        // Notify parent of form changes
        handleFormChange();
    }

    function validateContactInfo(): boolean {
        try {
            if (contactInfoString.trim() !== '' && contactInfoString.trim() !== '{}') {
                JSON.parse(contactInfoString);
            }
            contactInfoError = '';
            return true;
        } catch (e) {
            contactInfoError = 'Invalid JSON format for contact info';
            return false;
        }
    }

    function validateCustomFields(): boolean {
        try {
            if (customFieldsString.trim() !== '' && customFieldsString.trim() !== '{}') {
                JSON.parse(customFieldsString);
            }
            customFieldsError = '';
            return true;
        } catch (e) {
            customFieldsError = 'Invalid JSON format for custom fields';
            return false;
        }
    }

    function formatContactInfo(): void {
        try {
            if (contactInfoString.trim() === '' || contactInfoString.trim() === '{}') {
                contactInfoString = '{}';
                return;
            }
            
            const parsed = JSON.parse(contactInfoString);
            contactInfoString = JSON.stringify(parsed, null, 2);
            contactInfoError = '';
        } catch (e) {
            contactInfoError = 'Unable to format: Invalid JSON';
        }
    }

    function formatCustomFields(): void {
        try {
            if (customFieldsString.trim() === '' || customFieldsString.trim() === '{}') {
                customFieldsString = '{}';
                return;
            }
            
            const parsed = JSON.parse(customFieldsString);
            customFieldsString = JSON.stringify(parsed, null, 2);
            customFieldsError = '';
        } catch (e) {
            customFieldsError = 'Unable to format: Invalid JSON';
        }
    }

    // Prepare form data before submission to ensure all fields are properly included
    function prepareFormData() {
        // Ensure JSON fields are properly formatted and included
        try {
            // Update the form data with current field values
            formData = {
                ...formData,
                contact_info: contactInfoString,
                custom_fields: customFieldsString,
                custom_fields_json: customFieldsString // Ensure both versions are set
            };
            
          
            
            return true;
        } catch (e) {
            formError = `Error preparing form data: ${e instanceof Error ? e.message : 'Unknown error'}`;
            console.error('Form preparation error:', e);
            return false;
        }
    }

    // Validate and submit form data
    function validateAndSubmit() {
        if (!validateContactInfo() || !validateCustomFields()) {
            console.error('Form validation failed');
            return;
        }
        
        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }
        
        isSubmitting = true;
        formError = '';
        
        try {          
            // Prepare the form data with all current values
            if (!prepareFormData()) {
                throw new Error('Failed to prepare form data');
            }
            
           
            dispatch('submit', { success: true, formData });
        } catch (e) {
            formError = `Error submitting form: ${e instanceof Error ? e.message : 'Unknown error'}`;
            console.error('Form submission error:', e);
        } finally {
            isSubmitting = false;
        }
    }
    
    // Handle form submission
    function handleSubmit(event: Event): void {
        event.preventDefault();
        
        // Inline validation and submission to avoid reference error
        if (!validateContactInfo() || !validateCustomFields()) {
            console.error('Form validation failed');
            return;
        }
        
        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }
        
        isSubmitting = true;
        formError = '';
        
        try {          
            // Prepare the form data with all current values
            if (!prepareFormData()) {
                throw new Error('Failed to prepare form data');
            }
            
            
            dispatch('submit', { success: true, formData });
        } catch (e) {
            formError = `Error submitting form: ${e instanceof Error ? e.message : 'Unknown error'}`;
            console.error('Form submission error:', e);
        } finally {
            isSubmitting = false;
        }
    }

    // Handle cancel button
    function handleCancel(): void {
        dispatch('cancel');
    }

    // Reset form to initial state
    function resetForm(): void {
        formData = {
            supplier_id: '',
            supplier_name: '',
            supplier_description: null,
            website_url: '',
            logo_url: '',
            custom_fields: '{}',
            contact_info: '{}'
        };
        
        customFieldsString = '{}';
        contactInfoString = '{}';
        customFieldsError = '';
        contactInfoError = '';
        formErrors = {};
        
        // Notify parent of form reset
        handleFormChange();
    }
</script>

<form on:submit={handleSubmit}>
        <!-- Hidden field for supplier_id -->
        <input type="hidden" name="supplier_id" value={formData.supplier_id || ''} />
        
        <!-- Supplier Name Field -->
        <div class="form-field">
            <label for="supplier_name">Supplier Name <span class="required">*</span></label>
            <input
                type="text"
                id="supplier_name"
                name="supplier_name"
                class="enhanced-input"
                class:error={!!formErrors.supplier_name}
                placeholder="Enter supplier name"
                value={formData.supplier_name || ''}
                on:input={(e) => handleInputChange(e, 'supplier_name')}
                required
            />
            {#if formErrors.supplier_name}
                <div class="field-error">
                    {Array.isArray(formErrors.supplier_name) 
                        ? formErrors.supplier_name[0] 
                        : formErrors.supplier_name}
                </div>
            {/if}
        </div>
        
        <!-- Description Field -->
        <div class="form-field">
            <label for="supplier_description">Description</label>
            <textarea
                id="supplier_description"
                name="supplier_description"
                class="enhanced-input form-textarea"
                class:error={!!formErrors.supplier_description}
                placeholder="Enter supplier description"
                value={formData.supplier_description || ''}
                on:input={(e) => handleInputChange(e, 'supplier_description')}
            ></textarea>
            {#if formErrors.supplier_description}
                <div class="field-error">
                    {Array.isArray(formErrors.supplier_description) 
                        ? formErrors.supplier_description[0] 
                        : formErrors.supplier_description}
                </div>
            {/if}
        </div>
        
        <!-- Website URL Field -->
        <div class="form-field">
            <label for="website_url">Website URL</label>
            <input
                type="url"
                id="website_url"
                name="website_url"
                class="enhanced-input"
                class:error={!!formErrors.website_url}
                placeholder="https://example.com"
                value={formData.website_url || ''}
                on:input={(e) => handleInputChange(e, 'website_url')}
            />
            {#if formErrors.website_url}
                <div class="field-error">
                    {Array.isArray(formErrors.website_url) 
                        ? formErrors.website_url[0] 
                        : formErrors.website_url}
                </div>
            {/if}
        </div>
        
        <!-- Logo URL Field -->
        <div class="form-field">
            <label for="logo_url">Logo URL</label>
            <input
                type="url"
                id="logo_url"
                name="logo_url"
                class="enhanced-input"
                class:error={!!formErrors.logo_url}
                placeholder="https://example.com/logo.png"
                value={formData.logo_url || ''}
                on:input={(e) => handleInputChange(e, 'logo_url')}
            />
            {#if formErrors.logo_url}
                <div class="field-error">
                    {Array.isArray(formErrors.logo_url) 
                        ? formErrors.logo_url[0] 
                        : formErrors.logo_url}
                </div>
            {/if}
        </div>
        
        <!-- Contact Information Field -->
        <div class="form-field">
            <label for="contact_info">Contact Information</label>
            <div class="contact-info-tools">
                <button type="button" class="format-button" on:click={formatContactInfo}>Format JSON</button>
                <div class="json-status">
                    {#if contactInfoString.trim() !== '{}'}
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
                class:error={!!contactInfoError || !!formErrors.contact_info}
                placeholder={'{"email": "contact@example.com", "phone": "555-1234"}'}
                value={contactInfoString}
                on:input={(e) => handleTextareaChange(e, 'contact_info')}
            ></textarea>
            {#if contactInfoError}
                <div class="field-error">{contactInfoError}</div>
            {:else if formErrors.contact_info}
                <div class="field-error">
                    {Array.isArray(formErrors.contact_info) 
                        ? formErrors.contact_info[0] 
                        : formErrors.contact_info}
                </div>
            {/if}
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={() => showJsonHelp = !showJsonHelp}>
                    <span class="toggle-icon">{showJsonHelp ? '−' : '+'}</span>
                    <span class="toggle-text">Help with JSON Format</span>
                </button>
            </div>
            
            {#if showJsonHelp}
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
        
        <!-- Custom Fields -->
        <div class="form-field">
            <label for="custom_fields">Custom Fields</label>
            <div class="contact-info-tools">
                <button type="button" class="format-button" on:click={formatCustomFields}>Format JSON</button>
                <div class="json-status">
                    {#if customFieldsString.trim() !== '{}'}
                        {#if validateJSON(customFieldsString)}
                            <span class="valid-json">✓ Valid JSON</span>
                        {:else}
                            <span class="invalid-json">✗ Invalid JSON</span>
                        {/if}
                    {/if}
                </div>
            </div>
            <textarea
                id="custom_fields"
                name="custom_fields"
                class="enhanced-input form-textarea"
                class:error={!!customFieldsError || !!formErrors.custom_fields}
                placeholder={'{"founded": "2010", "employees": 100, "certified": true}'}
                value={customFieldsString}
                on:input={(e) => handleTextareaChange(e, 'custom_fields')}
            ></textarea>
            {#if customFieldsError}
                <div class="field-error">{customFieldsError}</div>
            {:else if formErrors.custom_fields}
                <div class="field-error">
                    {Array.isArray(formErrors.custom_fields) 
                        ? formErrors.custom_fields[0] 
                        : formErrors.custom_fields}
                </div>
            {/if}
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={() => showJsonHelp = !showJsonHelp}>
                    <span class="toggle-icon">{showJsonHelp ? '−' : '+'}</span>
                    <span class="toggle-text">Help with Custom Fields</span>
                </button>
            </div>
            
            {#if showJsonHelp}
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
        
        <!-- Form Buttons -->
        {#if !hideButtons}
            <div class="form-actions">
                <button 
                    type="button" 
                    class="secondary-btn" 
                    on:click={handleCancel}
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    class="primary-btn" 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Processing...' : submitText}
                </button>
            </div>
        {/if}
    </form>

<style>
    /* Form field styling */
    
    .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    label {
        font-weight: 500;
        color: hsl(var(--foreground));
        font-size: 0.875rem;
        transition: color 0.3s;
    }
    
    .enhanced-input {
        padding: 0.75rem;
        border: 1px solid hsl(var(--border));
        border-radius: 6px;
        background-color: hsl(var(--input));
        color: hsl(var(--input-foreground));
        font-size: 0.875rem;
        width: 100%;
        transition: border-color 0.3s, background-color 0.3s, color 0.3s;
    }
    
    .enhanced-input:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }
    
    .enhanced-input.error {
        border-color: hsl(var(--destructive));
    }
    
    .form-textarea {
        min-height: 100px;
        font-family: monospace;
        white-space: pre-wrap;
        resize: vertical;
    }
    
    .field-error {
        color: hsl(var(--destructive));
        font-size: 0.75rem;
        margin-top: 0.25rem;
        animation: fadeIn 0.3s ease-in-out;
    }
    
    .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        justify-content: flex-end;
    }
    
   
    
    /* Button styling is now handled by global styles */
    
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
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
</style>
