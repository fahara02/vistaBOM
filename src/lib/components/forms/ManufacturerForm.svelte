<!-- src/lib/components/forms/ManufacturerForm.svelte -->
<script lang="ts">
    import { validateJSON, formatFieldName } from '$lib/utils/util';
    import { onMount, createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { manufacturerActionSchema } from '$lib/schema/schema';
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
        HelpCircle,
        Check,
        AlertCircle,
        ChevronDown,
        ChevronUp
    } from 'lucide-svelte';
    
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
    
  

    // // Reactively update JSON fields when data changes
    // $: if (data) {
    //     initializeJsonFields();
    // }
// Enhanced reactive data handling with proper JSON field updates
$: if (data) {
    console.log('ManufacturerForm received data prop update:', data);
    
    // Explicitly create a new object to trigger reactivity in Svelte
    formData = {
        manufacturer_id: data.manufacturer_id ?? '',
        manufacturer_name: data.manufacturer_name ?? '',
        manufacturer_description: data.manufacturer_description ?? null,
        website_url: data.website_url ?? '',
        logo_url: data.logo_url ?? '',
        custom_fields: data.custom_fields ?? '{}',
        contact_info: data.contact_info ?? '{}'
    };
    
    // Update JSON string fields explicitly for the textarea inputs
    customFieldsString = typeof data.custom_fields === 'string' 
        ? data.custom_fields 
        : JSON.stringify(data.custom_fields || {}, null, 2);
        
    contactInfoString = typeof data.contact_info === 'string'
        ? data.contact_info
        : JSON.stringify(data.contact_info || {}, null, 2);
    
    console.log('Updated customFieldsString:', customFieldsString);
    console.log('Updated contactInfoString:', contactInfoString);
    
    formInitialized = true;
}
    let formErrors: Record<string, string | string[]> = { ...errors };
    let isSubmitting: boolean = false;
    let customFieldsString: string = '{}';
    let contactInfoString: string = '{}';
    let customFieldsError: string = '';
    let contactInfoError: string = '';
    let showJsonHelp: boolean = false; // Toggle for JSON help panel
    let showContactJsonHelp: boolean = false; // Toggle for contact info JSON help panel

    // Initialize JSON fields on mount and when data changes
    onMount(() => {
        initializeJsonFields();
    });

    // Methods
    function initializeJsonFields(): void {
        console.log('DEBUGGING INIT: Current data object received:', data);
        console.log('DEBUGGING INIT: Current formData state:', formData);
        
        // Initialize custom fields from the data
        if (data.custom_fields) {
            try {
                console.log('Initializing custom fields from:', data.custom_fields);
                console.log('Type of custom_fields:', typeof data.custom_fields);
                
                if (typeof data.custom_fields === 'string') {
                    // If it's already a string, try to validate and format it
                    try {
                        // Try to parse it to validate it's proper JSON
                        const parsed = JSON.parse(data.custom_fields);
                        // Format it nicely for editing
                        customFieldsString = JSON.stringify(parsed, null, 2);
                        console.log('Formatted custom fields string:', customFieldsString);
                    } catch (parseError) {
                        console.error('Error parsing custom fields JSON:', parseError);
                        // If it's not valid JSON, use empty object to prevent form errors
                        customFieldsString = '{}';
                    }
                } else if (data.custom_fields && typeof data.custom_fields === 'object') {
                    // If it's an object, stringify it for the form
                    customFieldsString = JSON.stringify(data.custom_fields, null, 2);
                    console.log('Converted object custom fields to string:', customFieldsString);
                } else {
                    // Default to empty object
                    customFieldsString = '{}';
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
                                // If conversion fails, store as notes
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
        
        console.log(`Updating ${field} with value:`, value);
        
        if (field === 'custom_fields') {
            // First update the string value directly
            customFieldsString = value;
            
            // Then update the formData by creating a new object (important for reactivity)
            formData = {
                ...formData,
                custom_fields: value
            };
        } else if (field === 'contact_info') {
            // First update the string value directly
            contactInfoString = value;
            
            // Then update the formData by creating a new object (important for reactivity)
            formData = {
                ...formData,
                contact_info: value
            };
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
                            
                            console.log('Converted key-value pairs to object:', contactObj);
                            formData.contact_info = JSON.stringify(contactObj);
                            contactInfoError = '';
                            return true;
                        } catch (kvError) {
                            console.error('Error converting key-value format:', kvError);
                            // If conversion fails, store as notes
                            formData.contact_info = JSON.stringify({ notes: contactInfoString });
                            contactInfoError = '';
                            return true;
                        }
                    } else {
                        console.log('Using plain text as notes in contact info');
                        // If not in key-value format, store as notes
                        formData.contact_info = JSON.stringify({ notes: contactInfoString });
                        contactInfoError = '';
                        return true;
                    }
                }
            } else {
                formData.contact_info = '{}';
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
                
                // Store the properly formatted JSON string - important for consistency
                formData.custom_fields = JSON.stringify(parsed);
                customFieldsError = '';
                return true;
            } else {
                // If empty, set to empty object JSON string
                formData.custom_fields = '{}';
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
                ? (formData.contact_info.trim() === '' ? '{}' : formData.contact_info)
                : JSON.stringify(formData.contact_info || {}),
                
            // Ensure custom_fields is a properly formatted JSON string
            custom_fields: typeof formData.custom_fields === 'string' 
                ? formData.custom_fields
                : JSON.stringify(formData.custom_fields || {})
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

    // Toggle contact info JSON help panel visibility
    function toggleContactJsonHelp(): void {
        showContactJsonHelp = !showContactJsonHelp;
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

    // Update submitText when edit mode changes
    
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
                class="enhanced-input"
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
                class="enhanced-input form-textarea"
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
                class="enhanced-input"
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
                class="enhanced-input"
                class:error={formErrors.logo_url}
                on:input={handleFormChange}
                placeholder="https://example.com/logo.png"
            />
            {#if formErrors.logo_url}
                <div class="error-message">{formErrors.logo_url}</div>
            {/if}
        </div>
        
        <div class="form-group json-field">
            <label for="contact_info">Contact Info</label>
            <div class="contact-info-tools">
                <div>
                <button type="button" class="format-button" on:click={() => formatJson('contact')}>
                    <Check size={14} /> Format JSON
                </button>
                {#if contactInfoString && contactInfoString.trim() !== '{}'}
                    {#if validateJSON(contactInfoString)}
                        <div class="json-status valid-json">
                            <Check size={14} /> Valid JSON
                        </div>
                    {:else}
                        <div class="json-status invalid-json">
                            <AlertCircle size={14} /> Invalid JSON
                        </div>
                    {/if}
                {/if}
            </div>
            <textarea
                id="contact_info"
                rows="5"
                value={contactInfoString}
                on:input={(e) => handleTextareaChange(e, 'contact_info')}
                class="enhanced-input form-textarea"
                class:error={contactInfoError}
                placeholder="Enter contact information in JSON format"
            ></textarea>
            {#if contactInfoError}
                <p class="error-message">{contactInfoError}</p>
            {/if}
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={() => showContactJsonHelp = !showContactJsonHelp}>
                    {#if showContactJsonHelp}
                        <span class="toggle-icon"><ChevronUp size={16} /></span>
                        <span class="toggle-text">Hide Contact Info Help</span>
                    {:else}
                        <span class="toggle-icon"><HelpCircle size={16} /></span>
                        <span class="toggle-text">Show Contact Info Help</span>
                    {/if}
                </button>
            </div>
            
            {#if showContactJsonHelp}
                <div class="help-panel" transition:slide={{ duration: 300 }}>
                    <p><strong>Contact Information Guide</strong></p>
                    <p>You can enter contact information in two formats:</p>
                    
                    <div class="help-section">
                        <h4>1. JSON Format (Recommended)</h4>
                        <p>Example:</p>
                        <pre>{@html `<code>{
  "email": "contact@example.com",
  "phone": "+1 (555) 123-4567",
  "address": "123 Main St, City, Country",
  "contact_name": "John Doe",
  "position": "Sales Manager"
}</code>`}</pre>
                    </div>
                    
                    <div class="help-section">
                        <h4>2. Key-Value Pairs</h4>
                        <p>Example:</p>
                        <pre><code>email: contact@example.com
phone: +1 (555) 123-4567
address: 123 Main St, City, Country</code></pre>
                        <p>Each line should have a key, followed by a colon, then the value.</p>
                    </div>
                    
                    <div class="help-section">
                        <h4>Common Field Names</h4>
                        <ul class="icon-list">
                            <li><Mail size={14} /> <code>email</code> - Email address</li>
                            <li><Phone size={14} /> <code>phone</code> - Phone number</li>
                            <li><Smartphone size={14} /> <code>mobile</code> - Mobile number</li>
                            <li><MapPin size={14} /> <code>address</code> - Physical address</li>
                            <li><User size={14} /> <code>contact_name</code> - Contact person's name</li>
                            <li><Briefcase size={14} /> <code>position</code> - Job title/position</li>
                            <li><Building size={14} /> <code>department</code> - Department or division</li>
                            <li><Globe size={14} /> <code>website</code> - Additional website</li>
                            <li><Printer size={14} /> <code>fax</code> - Fax number</li>
                            <li><MessageSquare size={14} /> <code>notes</code> - Additional notes</li>
                        </ul>
                    </div>
                </div>
            {/if}
        </div>
        
        <div class="form-group json-field">
            <label for="custom_fields">Custom Fields (JSON)</label>
            <div class="contact-info-tools">
                <button type="button" class="format-button" on:click={() => formatJson('custom')}>
                    <Check size={14} /> Format JSON
                </button>
                {#if customFieldsString && customFieldsString.trim() !== '{}'}
                    {#if validateJSON(customFieldsString)}
                        <div class="json-status valid-json">
                            <Check size={14} /> Valid JSON
                        </div>
                    {:else}
                        <div class="json-status invalid-json">
                            <AlertCircle size={14} /> Invalid JSON
                        </div>
                    {/if}
                {/if}
            </div>
            <textarea 
                id="custom_fields" 
                value={customFieldsString} 
                class="enhanced-input form-textarea"
                class:error={customFieldsError}
                rows="5"
                placeholder="Enter custom fields in JSON format"
                on:input={(e) => handleTextareaChange(e, 'custom_fields')}
            ></textarea>
            {#if customFieldsError}
                <div class="error-message">{customFieldsError}</div>
            {/if}
            
            <div class="helper-toggle">
                <button type="button" class="toggle-button" on:click={toggleJsonHelp}>
                    <span class="toggle-icon">
                        {#if showJsonHelp}
                            <ChevronUp size={16} />
                        {:else}
                            <ChevronDown size={16} />
                        {/if}
                    </span>
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
        
        {#if !hideButtons}
            <div class="form-actions">
                <button type="button" class="secondary-btn" on:click={handleCancel}>Cancel</button>
                <button type="submit" class="primary-btn" disabled={isSubmitting}>
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
    
    .required {
        color: hsl(var(--destructive));
    }
    
    .contact-info-tools {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }
    
    .format-button {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        background-color: hsl(var(--secondary));
        border: 1px solid hsl(var(--border));
        border-radius: 0.25rem;
        cursor: pointer;
        color: hsl(var(--secondary-foreground));
        transition: background-color 0.3s, color 0.3s, border-color 0.3s, transform 0.1s;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
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
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .toggle-text {
        font-weight: 500;
    }
    
    .help-panel {
        margin-top: 0.75rem;
        padding: 0.75rem 1rem;
        background-color: hsl(var(--muted));
        border-radius: 4px;
        font-size: 0.875rem;
        transition: background-color 0.3s;
        border: 1px solid hsl(var(--border));
    }
    
    .help-section {
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
    
    .help-section h4 {
        font-size: 0.9rem;
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: hsl(var(--foreground));
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
    
    pre {
        background-color: hsl(var(--card));
        padding: 0.75rem;
        border-radius: 4px;
        overflow-x: auto;
        border: 1px solid hsl(var(--border));
        margin: 0.5rem 0;
    }
    
    pre code {
        background-color: transparent;
        padding: 0;
        border-radius: 0;
        font-size: 0.8rem;
        white-space: pre;
    }
    
    .icon-list {
        list-style-type: none;
        padding-left: 0.5rem;
        margin: 0.5rem 0;
    }
    
    .icon-list li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    
    /* Error styles are used directly on inputs via class:error */
    
    .json-status {
        font-size: 0.75rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .valid-json {
        color: hsl(var(--success));
        background-color: hsl(var(--success) / 0.2);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid hsl(var(--success) / 0.3);
    }
    
    .invalid-json {
        color: hsl(var(--destructive));
        background-color: hsl(var(--destructive) / 0.2);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid hsl(var(--destructive) / 0.3);
    }
</style>
