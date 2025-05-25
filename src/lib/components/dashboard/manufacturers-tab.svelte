<!-- src/lib/components/dashboard/manufacturers-tab.svelte -->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import ManufacturerCard from '$lib/components/cards/manufacturer.svelte';
    import ManufacturerForm from '$lib/components/forms/ManufacturerForm.svelte';
    import GridView from '$lib/components/grid/GridView.svelte';
    import { superForm } from 'sveltekit-superforms/client';
    import type { SuperForm, SuperValidated } from 'sveltekit-superforms';
    import { z } from 'zod';
 
    // Import types from types and formTypes
    import type { Manufacturer, JsonValue } from '$lib/types/types';
    import type { DashboardManufacturer, ManufacturerFormData } from '$lib/types/formTypes';
    import type { GridEntity } from '$lib/types/grid';
    
    // Define a type-safe schema for the manufacturer form
    const manufacturerFormSchema = z.object({
        manufacturer_id: z.string().optional().default(''),
        manufacturer_name: z.string().min(1, { message: 'Manufacturer name is required' }),
        manufacturer_description: z.string().nullable().optional(),
        website_url: z.string().nullable().optional(),
        logo_url: z.string().nullable().optional(),
        contact_info: z.string().nullable().optional(),
        custom_fields: z.string().nullable().optional(),
        custom_fields_json: z.string().nullable().optional(),
        created_by: z.string().optional(),
        updated_by: z.string().optional(),
        created_at: z.date().optional(),
        updated_at: z.date().optional()
    });
    
    // Create type from schema
    type ManufacturerFormSchema = z.infer<typeof manufacturerFormSchema>;
    
    // Accept both Manufacturer and DashboardManufacturer types
    type ManufacturerData = Manufacturer | DashboardManufacturer;
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Props
    export let manufacturers: ManufacturerData[] = [];
    export let currentUserId: string;
    export let showForm: boolean = false;
    export let editMode: boolean = false;
    
    // Track manufacturers array changes for reactivity
    let currentManufacturers: ManufacturerData[] = [];
    $: if (manufacturers !== currentManufacturers) {
        // Only update if the reference changed (reactivity trigger)
        console.log('Manufacturers list reference changed, updating local state');
        currentManufacturers = manufacturers;
    }

    // Form props - passed to ManufacturerForm component
    export let manufacturerForm: Partial<ManufacturerFormSchema> = {
        manufacturer_id: '',
        manufacturer_name: '',
        manufacturer_description: '',
        website_url: '',
        logo_url: '',
        contact_info: '{}',
        custom_fields: '{}',
        custom_fields_json: '{}',
        created_by: currentUserId,
        updated_by: currentUserId
    };
    export let manufacturerErrors: Record<string, string | string[]> = {};

    // Additional props for SuperForm integration
    export let formId: string = "manufacturer-dashboard-form-" + crypto.randomUUID().substring(0, 8);
    export let formAction: string = '?/manufacturer';
    export let superFormData: SuperValidated<ManufacturerFormSchema> | undefined = undefined;
    export let useInternalForm: boolean = false;
    
    // Local state
    let selectedManufacturer: ManufacturerData | null = null;
    let viewMode: 'grid' | 'list' = 'grid'; // Default to grid view
    let hiddenFormElement: HTMLFormElement;
    
    // Create a proper SuperForm instance only when conditions are met
    let superFormInstance: ReturnType<typeof superForm<ManufacturerFormSchema>> | undefined;
    
    // Track current form data for reactivity
    let currentFormData: Partial<ManufacturerFormSchema> = manufacturerForm;

    // Add a debug watch for manufacturer form changes
    $: console.log('ManufacturersTab received manufacturerForm prop:', manufacturerForm);

    // Default values for internal form to avoid undefined errors
    const defaultFormValues: ManufacturerFormSchema = {
        manufacturer_id: '',
        manufacturer_name: '',
        manufacturer_description: '',
        website_url: '',
        logo_url: '',
        contact_info: '{}',
        custom_fields: '{}',
        custom_fields_json: '{}',
        created_by: '',  // Will be set correctly when currentUserId is available
        updated_by: ''   // Will be set correctly when currentUserId is available
    };
    
    // Prepare for SuperForm state tracking
    let internalForm: ManufacturerFormSchema = defaultFormValues;
    let internalErrors: Record<string, string[]> = {};
       
    // Local form data that will be used in the ManufacturerForm component
    $: localFormData = editMode && manufacturerForm ? manufacturerForm : defaultFormValues;
    
    // Initialize the form
    function initializeSuperForm() {
        if (!useInternalForm) return;
        
        // Create a new blank form if no data is provided
        const initialData = {
            ...defaultFormValues,
            created_by: currentUserId,
            updated_by: currentUserId
        };
        
        superFormInstance = superForm<ManufacturerFormSchema>(superFormData || initialData, {
            id: formId,
            warnings: { duplicateId: false }, // Suppress duplicate ID warnings
            dataType: 'json',
            resetForm: true,
            validationMethod: 'submit-only',
            taintedMessage: null,
            // We'll use the default form validation
            // No custom validators needed
            onResult: ({ result }) => {
                console.log('Manufacturer form submission result:', result);
                if (result.type === 'success') {
                    // Reset form state
                    showForm = false;
                    editMode = false;
                    selectedManufacturer = null;
                    
                    // Refresh data
                    dispatch('refreshData');
                }
            }
        });
        
        // Subscribe to the form values
        const unsubscribeForm = superFormInstance.form.subscribe(value => {
            internalForm = value;
        });
        
        // Subscribe to the form errors
        const unsubscribeErrors = superFormInstance.errors.subscribe(value => {
            internalErrors = value;
        });
        
        // Clean up subscriptions when component is destroyed
        const cleanup = () => {
          unsubscribeForm && unsubscribeForm();
          unsubscribeErrors && unsubscribeErrors();
         };

       // Return cleanup function for onDestroy
       return cleanup;
    }
   
    // Methods
    function toggleForm(): void {
        showForm = !showForm;
        if (!showForm) {
            editMode = false;
            selectedManufacturer = null;
        }
        dispatch('toggleForm');
    }
    
    function handleManufacturerDeleted(): void {
        // Notify parent to refresh the data
        dispatch('refreshData');
    }
    
    // Initialize on component mount - only one onMount call needed
    onMount(() => {
        if (useInternalForm) {
            initializeSuperForm();
        }
    });
    // Re-initialize when dependencies change
    $: if (useInternalForm && (superFormData || currentUserId)) {
        initializeSuperForm();
    }
    
    // This is critical: Update the SuperForm data when a manufacturer is selected for editing
    $: if (useInternalForm && superFormInstance && editMode && selectedManufacturer) {
        console.log('Updating SuperForm data with selected manufacturer:', selectedManufacturer);
        
        // TypeScript safety: Create a non-null reference to satisfy the type checker
        const manufacturer = selectedManufacturer;
        
        // Update the SuperForm data with the selected manufacturer's data
        superFormInstance.form.update(() => {
            return {
                // Basic fields with proper type handling
                manufacturer_id: manufacturer.manufacturer_id || '',
                manufacturer_name: manufacturer.manufacturer_name || '',
                manufacturer_description: manufacturer.manufacturer_description || null,
                website_url: manufacturer.website_url || null,
                logo_url: manufacturer.logo_url || null,
                
                // Handle custom_fields with proper type safety
                custom_fields: typeof manufacturer.custom_fields === 'object'
                    ? JSON.stringify(manufacturer.custom_fields)
                    : (typeof manufacturer.custom_fields === 'string'
                        ? manufacturer.custom_fields 
                        : '{}'),
                        
                // Handle contact_info with proper type safety
                contact_info: typeof manufacturer.contact_info === 'object'
                    ? JSON.stringify(manufacturer.contact_info)
                    : (typeof manufacturer.contact_info === 'string'
                        ? manufacturer.contact_info
                        : '{}'),
                        
                // User fields
                created_by: manufacturer.created_by || currentUserId,
                updated_by: currentUserId
            };
        });
    }
    
    // Direct binding with improved reactive handling
    // We bypass currentFormData and directly use the manufacturerForm prop
    // This ensures data flows correctly without intermediate transformations
    
    
    // Handle edit mode by directly reflecting the incoming data
    $: if (editMode && manufacturerForm && manufacturerForm.manufacturer_id) {
        console.log('Edit mode active with manufacturer data:', manufacturerForm);
        // Ensure we have all required fields for ManufacturerData type based on the schema
        // The schema defines specific field requirements we need to follow
        const typedManufacturer: ManufacturerData = {
            manufacturer_id: manufacturerForm.manufacturer_id,
            manufacturer_name: manufacturerForm.manufacturer_name || '',
            // Using undefined for optional fields instead of null to match the expected type
            manufacturer_description: manufacturerForm.manufacturer_description || undefined,
            website_url: manufacturerForm.website_url || undefined,
            logo_url: manufacturerForm.logo_url || undefined,
            // JSON fields need to be properly parsed/stringified
            contact_info: typeof manufacturerForm.contact_info === 'string' 
                ? JSON.parse(manufacturerForm.contact_info || '{}') 
                : manufacturerForm.contact_info || {},
            custom_fields: typeof manufacturerForm.custom_fields === 'string'
                ? JSON.parse(manufacturerForm.custom_fields || '{}')
                : manufacturerForm.custom_fields || {},
            // Required timestamp fields
            created_at: manufacturerForm.created_at instanceof Date
                ? manufacturerForm.created_at
                : new Date(),
            updated_at: manufacturerForm.updated_at instanceof Date
                ? manufacturerForm.updated_at
                : new Date(),
            // Optional user fields
            created_by: manufacturerForm.created_by || '',
            updated_by: manufacturerForm.updated_by || ''
        };
        selectedManufacturer = typedManufacturer;
    }
        
    $: formErrors = useInternalForm && superFormInstance 
        ? internalErrors 
        : manufacturerErrors;

    // Track when component is initialized
    let formInitialized = false;
    onMount(() => {
        formInitialized = true;
    });
    
    // Handle edit event from manufacturer card
    function handleManufacturerEdit(event: CustomEvent<{ manufacturer: ManufacturerData }>): void {
        console.log('Received edit event in manufacturers-tab:', event);
        
        // Extract manufacturer data from the event
        const manufacturerData = event.detail.manufacturer;
        selectedManufacturer = manufacturerData;
        
        // Debug the incoming data
        console.log('Original manufacturer data:', JSON.stringify(manufacturerData, null, 2));
        
        // Update the form data with the selected manufacturer
        // CRITICAL: Ensure all fields are properly typed and JSON fields are correctly stringified
        manufacturerForm = {
            manufacturer_id: manufacturerData.manufacturer_id || '',
            manufacturer_name: manufacturerData.manufacturer_name || '',
            manufacturer_description: manufacturerData.manufacturer_description || null,
            website_url: manufacturerData.website_url || null,
            logo_url: manufacturerData.logo_url || null,
            
            // Ensure JSON fields are properly stringified
            contact_info: typeof manufacturerData.contact_info === 'object' 
                ? JSON.stringify(manufacturerData.contact_info) 
                : (typeof manufacturerData.contact_info === 'string'
                    ? manufacturerData.contact_info
                    : '{}'),
                    
            custom_fields: typeof manufacturerData.custom_fields === 'object'
                ? JSON.stringify(manufacturerData.custom_fields)
                : (typeof manufacturerData.custom_fields === 'string'
                    ? manufacturerData.custom_fields
                    : '{}'),
                    
            created_by: manufacturerData.created_by || currentUserId,
            updated_by: currentUserId
        };
        
        // Debug the transformed data
        console.log('Processed form data:', JSON.stringify(manufacturerForm, null, 2));
        
        // Forward the edit event to the parent component with raw manufacturer data
        dispatch('editManufacturer', { manufacturer: manufacturerData });
        
        // Update UI state
        editMode = true;
        showForm = true;
    }

    // Handle edit event from GridView component
    function handleGridManufacturerEdit(event: CustomEvent<{ item: GridEntity }>) {
        const manufacturer = event.detail.item as Manufacturer;
        selectedManufacturer = manufacturer;
        
        // Debug the incoming grid data
        console.log('Original grid manufacturer data:', JSON.stringify(manufacturer, null, 2));
        
        // Update the form data with the selected manufacturer
        // CRITICAL: Ensure all fields are properly typed and JSON fields are correctly stringified
        manufacturerForm = {
            manufacturer_id: manufacturer.manufacturer_id || '',
            manufacturer_name: manufacturer.manufacturer_name || '',
            manufacturer_description: manufacturer.manufacturer_description || null,
            website_url: manufacturer.website_url || null,
            logo_url: manufacturer.logo_url || null,
            
            // Ensure JSON fields are properly stringified
            contact_info: typeof manufacturer.contact_info === 'object' 
                ? JSON.stringify(manufacturer.contact_info) 
                : (typeof manufacturer.contact_info === 'string'
                    ? manufacturer.contact_info
                    : '{}'),
                    
            custom_fields: typeof manufacturer.custom_fields === 'object'
                ? JSON.stringify(manufacturer.custom_fields)
                : (typeof manufacturer.custom_fields === 'string'
                    ? manufacturer.custom_fields
                    : '{}'),
                    
            created_by: manufacturer.created_by || currentUserId,
            updated_by: currentUserId
        };
        
        // Debug the transformed data
        console.log('Processed grid form data:', JSON.stringify(manufacturerForm, null, 2));
        
        // Forward to the parent component using the same format as card edit
        // This ensures proper data flow within the dashboard
        dispatch('editManufacturer', { manufacturer });
        
        // Update UI state to show edit form within dashboard
        editMode = true;
        showForm = true;
    }
    
    // Handle manufacturer deleted from grid view - type-safe implementation
    async function handleManufacturerDelete(event: CustomEvent<{ itemId: string }>) {
        console.log('Delete request received for:', event.detail.itemId);
        const manufacturerId = event.detail.itemId;
        
        try {
            // Make a direct POST request to the delete endpoint
            const response = await fetch(`/manufacturer/${manufacturerId}/edit?/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'confirm': 'true'
                }).toString()
            });
            
            console.log('Delete response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            
            // Successfully deleted - update the manufacturers list
            manufacturers = manufacturers.filter(m => m.manufacturer_id !== manufacturerId);
            
            // Close any open forms if we deleted the current manufacturer
            if (selectedManufacturer && selectedManufacturer.manufacturer_id === manufacturerId) {
                showForm = false;
                editMode = false;
                selectedManufacturer = null;
            }
            
            // Notify parent components
            dispatch('manufacturerDeleted', { manufacturerId });
        } catch (error) {
            console.error('Error deleting manufacturer:', error);
        }
    }
    
    // Store form values from ManufacturerForm component
    let capturedFormValues: Partial<ManufacturerFormSchema> = {};

    // Handle form submission from ManufacturerForm
    function handleFormSubmit(event: CustomEvent<{ success: boolean; formData: any }>) {
        console.log('Form submitted:', event.detail);
        
        if (event.detail.success) {
            const newManufacturer = event.detail.formData;
            
            // If we're in edit mode, update the existing manufacturer in the list
            if (editMode && selectedManufacturer) {
                // Store a non-null reference to the manufacturer to satisfy TypeScript
                const currentManufacturer = selectedManufacturer;
                
                const index = manufacturers.findIndex(m => 
                    m.manufacturer_id === currentManufacturer.manufacturer_id
                );
                
                if (index !== -1) {
                    // Update existing manufacturer
                    manufacturers[index] = { ...manufacturers[index], ...newManufacturer };
                    // Force reactivity with array reassignment
                    manufacturers = [...manufacturers];
                    console.log('Updated manufacturer in list:', manufacturers[index]);
                }
            } else {
                // This is a new manufacturer - add to the beginning of the list
                // Generate an ID if one doesn't exist (should be generated server-side)
                if (!newManufacturer.manufacturer_id) {
                    newManufacturer.manufacturer_id = crypto.randomUUID();
                }
                
                // Add to the beginning of the list to show it first
                manufacturers = [newManufacturer, ...manufacturers];
                console.log('Added new manufacturer to list:', newManufacturer);
            }
            
            // Reset form state after successful submission
            showForm = false;
            editMode = false;
            selectedManufacturer = null;
            capturedFormValues = {};
            
            // Notify parent
            dispatch('refresh');
        }
    }

    // Function to submit the form programmatically
    function submitForm(): void {
        // Validate data before submission
        if (!capturedFormValues.manufacturer_name || capturedFormValues.manufacturer_name.trim() === '') {
            console.error('Manufacturer name is required');
            if (useInternalForm && superFormInstance && superFormInstance.errors) {
                superFormInstance.errors.update(errors => {
                    return { ...errors, manufacturer_name: ['Manufacturer name is required'] };
                });
            }
            return; // Don't proceed if name is empty
        }

        if (useInternalForm && superFormInstance) {
            // Using internal SuperForm - update the form data with captured values
            superFormInstance.form.update(currentForm => {
                // Create a complete form object with all required fields
                return {
                    // Required fields
                    manufacturer_id: capturedFormValues.manufacturer_id || '',
                    manufacturer_name: capturedFormValues.manufacturer_name || '', 
                    // Optional fields with proper null handling
                    manufacturer_description: capturedFormValues.manufacturer_description || null,
                    website_url: capturedFormValues.website_url || null,
                    logo_url: capturedFormValues.logo_url || null,
                    // Complex fields as JSON strings
                    contact_info: typeof capturedFormValues.contact_info === 'object'
                        ? JSON.stringify(capturedFormValues.contact_info || {})
                        : capturedFormValues.contact_info || '{}',
                    custom_fields: typeof capturedFormValues.custom_fields === 'object'
                        ? JSON.stringify(capturedFormValues.custom_fields || {})
                        : capturedFormValues.custom_fields || '{}',
                    // Include any custom_fields_json if available (for backward compatibility)
                    custom_fields_json: capturedFormValues.custom_fields_json || '{}',
                    // User tracking fields
                    created_by: capturedFormValues.created_by || currentUserId,
                    updated_by: currentUserId
                };
            });
            
            // Log the data being submitted
            console.log('Submitting form data through internal SuperForm instance');
            
            // Submit the form programmatically by triggering the form submission
            const formElement = document.getElementById(formId) as HTMLFormElement;
            if (formElement) {
                if (formElement.requestSubmit) {
                    formElement.requestSubmit();
                } else {
                    // Fallback for older browsers
                    const submitButton = formElement.querySelector('button[type="submit"]');
                    if (submitButton) {
                        (submitButton as HTMLButtonElement).click();
                    }
                }
            }
        } else {
            // Using parent form - dispatch event to parent component
            console.log('Dispatching submit event to parent with data:', capturedFormValues);
            dispatch('submit', { formData: capturedFormValues });
        }
    }

// Function to cancel form editing
function cancelForm(): void {
    showForm = false;
    editMode = false;
    selectedManufacturer = null;
    dispatch('cancelEdit');
}
    

</script>

<div class="tab-container">
    <h2>Your Manufacturers</h2>
    
    <!-- View mode toggle -->
    <div class="view-mode-toggle">
        <button 
            class="view-toggle-btn" 
            class:active={viewMode === 'grid'} 
            on:click={() => viewMode = 'grid'}
            aria-label="Grid view"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
        </button>
        
        <button 
            class="view-toggle-btn"
            class:active={viewMode === 'list'}
            on:click={() => viewMode = 'list'}
            aria-label="List view"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
        </button>
    </div>

    <!-- List of manufacturers -->
    {#if manufacturers && manufacturers.length > 0}
        {#if viewMode === 'grid'}
            <!-- Compact grid view with inline expansion -->
            <GridView 
                entityType="manufacturer" 
                items={currentManufacturers}
                currentUserId={currentUserId}
                on:edit={handleGridManufacturerEdit}
                on:delete={handleManufacturerDelete}
                on:refresh={handleManufacturerDeleted}
            />
        {:else}
            <!-- Traditional card view -->
            <div class="user-items-grid">
                {#each currentManufacturers as manufacturer (manufacturer.manufacturer_id)}
                    <ManufacturerCard 
                        {manufacturer} 
                        {currentUserId}
                        allowEdit={currentUserId === manufacturer.created_by} 
                        allowDelete={currentUserId === manufacturer.created_by}
                        on:edit={handleManufacturerEdit} 
                        on:deleted={handleManufacturerDeleted}
                    />
                {/each}
            </div>
        {/if}
    {:else}
        <p class="no-items">You haven't created any manufacturers yet.</p>
    {/if}
    
    <!-- Toggle form button - only show when form is not visible -->
    {#if !showForm}
        <div class="action-buttons">
            <button type="button" class="primary-btn" on:click={() => {
                // Reset form state completely when adding new manufacturer
                editMode = false;
                selectedManufacturer = null;
                
                // Force reset form data to empty values by setting manufacturerForm to default values
                const emptyForm = {
                    manufacturer_id: '',
                    manufacturer_name: '',
                    manufacturer_description: '',
                    website_url: '',
                    logo_url: '',
                    contact_info: '{}',
                    custom_fields: '{}',
                    custom_fields_json: '{}',
                    created_by: currentUserId,
                    updated_by: currentUserId
                };
                // Update the exported prop directly
                manufacturerForm = emptyForm;
                // Clear any captured form values
                capturedFormValues = {};
                
                // Show the form
                showForm = true;
            }}>
                Add New Manufacturer
            </button>
            <a href="/manufacturer" class="secondary-btn">View All Manufacturers</a>
        </div>
    {/if}
    {#if showForm}
    <div class="form-container enhanced-form" transition:slide={{ duration: 300 }}>
        <h2 class="form-title">{editMode ? 'Edit Manufacturer' : 'Create New Manufacturer'}</h2>
        
        {#if useInternalForm && superFormInstance}
            <!-- Use direct SuperForm integration when available -->
            <form method="POST" action={formAction} id={formId} use:superFormInstance.enhance>
                <ManufacturerForm 
                    data={internalForm}
                    errors={internalErrors}
                    isEditMode={editMode}
                    hideButtons={true}
                    currentUserId={currentUserId}
                    on:formUpdate={(event: CustomEvent) => {
                        if (event.detail && event.detail.data && superFormInstance) {
                            // Update the SuperForm directly with the new values
                            superFormInstance.form.update(($form) => {
                                return {...$form, ...event.detail.data};
                            });
                            
                            // Also dispatch to parent
                            dispatch('formUpdate', event.detail);
                        }
                    }}
                />
                
                <div class="form-actions">
                    <button type="button" class="secondary-btn" on:click={cancelForm}>
                        Cancel
                    </button>
                    
                    <button type="submit" class="primary-btn">
                        {editMode ? 'Save Changes' : 'Create Manufacturer'}
                    </button>
                </div>
            </form>
        {:else}
            <!-- Standard form handling without SuperForm - Direct data binding -->
            <ManufacturerForm 
                data={{...manufacturerForm}}
                errors={formErrors}
                submitText={editMode ? 'Save Changes' : 'Create Manufacturer'}
                isEditMode={editMode}
                hideButtons={false}
                currentUserId={currentUserId}
                on:submit={handleFormSubmit}
                on:cancel={cancelForm}
                on:formUpdate={(event: CustomEvent) => {
                    if (event.detail && event.detail.data) {
                        capturedFormValues = {
                            ...capturedFormValues,
                            ...event.detail.data
                        };
                    }
                    dispatch('formUpdate', event.detail);
                }}
            />
        {/if}
    </div>
{/if}
</div>

<style>
    .tab-container {
        width: 100%;
    }
    
    h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        color: hsl(var(--foreground));
    }
    
    .user-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    .no-items {
        padding: 1rem;
        background: hsl(var(--muted) / 0.3);
        border-radius: 8px;
        text-align: center;
        color: hsl(var(--muted-foreground));
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .primary-btn {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .primary-btn:hover {
        background: hsl(var(--primary-dark));
    }
    
    .view-mode-toggle {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-bottom: 1rem;
        gap: 0.5rem;
    }
    
    .view-toggle-btn {
        background: transparent;
        border: 1px solid hsl(var(--border));
        border-radius: 4px;
        padding: 0.5rem;
        cursor: pointer;
        color: hsl(var(--muted-foreground));
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .view-toggle-btn:hover {
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
    }
    
    .view-toggle-btn.active {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-color: hsl(var(--primary));
    }
    
    .secondary-btn {
        background: hsl(var(--background));
        color: hsl(var(--primary));
        border: 1px solid hsl(var(--primary));
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
    }
    
    /* Form action buttons styling */
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px; /* Following the 4px/8px grid rule */
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid hsl(var(--border));
    }
    

    
    .secondary-btn:hover {
        background: hsl(var(--primary) / 0.1);
        transform: translateY(-1px);
    }
    
    .form-container {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 10px hsl(var(--muted) / 0.2);
    }
    
    .form-title {
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
        color: hsl(var(--card-foreground));
    }
    
    @media (max-width: 768px) {
        .action-buttons {
            flex-direction: column;
        }
    }
    
    @media (max-width: 600px) {
        .user-items-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
