<!-- src/lib/components/dashboard/suppliers-tab.svelte -->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';

 
    import { slide } from 'svelte/transition';
    import SupplierCard from '$lib/components/cards/supplier.svelte';
    import { SupplierForm } from '$lib/components/forms';
    import GridView from '$lib/components/grid/GridView.svelte';
    import { superForm } from 'sveltekit-superforms/client';
    import type { SuperForm, SuperValidated } from 'sveltekit-superforms';
    import { z } from 'zod';
    
    // Import types from types and formTypes
    import type { Supplier, JsonValue } from '$lib/types/types';
    import type { DashboardSupplier, SupplierFormData } from '$lib/types/formTypes';
    import type { GridEntity } from '$lib/types/grid';
    
    // Define a type-safe schema for the supplier form
    const supplierFormSchema = z.object({
        supplier_id: z.string().optional().default(''),
        supplier_name: z.string().min(1, { message: 'Supplier name is required' }),
        supplier_description: z.string().nullable().optional(),
        website_url: z.string().nullable().optional(),
        logo_url: z.string().nullable().optional(),
        // Important: we must use string type for JSON fields, not null
        contact_info: z.string().optional().default('{}'),
        custom_fields: z.string().optional().default('{}'),
        custom_fields_json: z.string().optional().default('{}'),
        created_by: z.string().optional(),
        updated_by: z.string().optional(),
        created_at: z.date().optional(),
        updated_at: z.date().optional()
    });
    
    // Create type from schema
    type SupplierFormSchema = z.infer<typeof supplierFormSchema>;
    
    // Accept both Supplier and DashboardSupplier types
    type SupplierData = Supplier | DashboardSupplier;
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Props
    export let suppliers: SupplierData[] = [];
    export let currentUserId: string;
    export let showForm: boolean = false;
    export let editMode: boolean = false;
    
    // Track suppliers array changes for reactivity
    let currentSuppliers: SupplierData[] = [];
    $: if (suppliers !== currentSuppliers) {
        // Only update if the reference changed (reactivity trigger)
        console.log('Suppliers list reference changed, updating local state');
        currentSuppliers = suppliers;
    }

    // Form props - passed to SupplierForm component
    export let supplierForm: Partial<SupplierFormSchema> = {
        supplier_id: '',
        supplier_name: '',
        supplier_description: '',
        website_url: '',
        logo_url: '',
        contact_info: '{}',
        custom_fields: '{}',
        custom_fields_json: '{}',
        created_by: currentUserId,
        updated_by: currentUserId
    };
    export let supplierErrors: Record<string, string | string[]> = {};

    // Additional props for SuperForm integration
    export let formId: string = 'supplier-dashboard-form-' + crypto.randomUUID().substring(0, 8);
    export let formAction: string = '?/supplier';
    export let superFormData: SuperValidated<SupplierFormSchema> | undefined = undefined;
    export let useInternalForm: boolean = false;
    
    // Local state
    let selectedSupplier: SupplierData | null = null;
    let viewMode: 'grid' | 'list' = 'grid'; // Default to grid view
    let hiddenFormElement: HTMLFormElement;
    
    // Create a proper SuperForm instance only when conditions are met
    let superFormInstance: ReturnType<typeof superForm<SupplierFormSchema>> | undefined;

    // Default values for internal form to avoid undefined errors
    const defaultFormValues: SupplierFormSchema = {
        supplier_id: '',
        supplier_name: '',
        supplier_description: '',
        website_url: '',
        logo_url: '',
        contact_info: '{}',
        custom_fields: '{}',
        custom_fields_json: '{}',
        created_by: '',  // Will be set correctly when currentUserId is available
        updated_by: ''   // Will be set correctly when currentUserId is available
    };
    
    // Prepare for SuperForm state tracking
    let internalForm: SupplierFormSchema = defaultFormValues;
    let internalErrors: Record<string, string[]> = {};
       
    // Local form data that will be used in the SupplierForm component
    $: localFormData = editMode && supplierForm ? supplierForm : defaultFormValues;
    
    // Initialize the form
    function initializeSuperForm() {
        if (!useInternalForm) return;
        
        // Create a new blank form if no data is provided
        const initialData = {
            ...defaultFormValues,
            created_by: currentUserId,
            updated_by: currentUserId
        };
        
        superFormInstance = superForm<SupplierFormSchema>(superFormData || initialData, {
            id: formId,
            warnings: { duplicateId: false }, // Suppress duplicate ID warnings
            dataType: 'json',
            resetForm: true,
            validationMethod: 'submit-only',
            taintedMessage: null,
            // We'll use the default form validation
            // No custom validators needed
            onResult: ({ result }) => {
                console.log('Supplier form submission result:', result);
                if (result.type === 'success') {
                    // Reset form state
                    showForm = false;
                    editMode = false;
                    selectedSupplier = null;
                    
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
            selectedSupplier = null;
        }
        dispatch('toggleForm');
    }
    
    function handleSupplierDeleted(): void {
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
    
    // This is critical: Update the SuperForm data when a supplier is selected for editing
    $: if (useInternalForm && superFormInstance && editMode && selectedSupplier) {
        console.log('Updating SuperForm data with selected supplier:', selectedSupplier);
        
        // TypeScript safety: Create a non-null reference to satisfy the type checker
        const supplier = selectedSupplier;
        
        // Update the SuperForm data with the selected supplier's data
        superFormInstance.form.update(() => {
            return {
                // Basic fields with proper type handling
                supplier_id: supplier.supplier_id || '',
                supplier_name: supplier.supplier_name || '',
                supplier_description: supplier.supplier_description || null,
                website_url: supplier.website_url || null,
                logo_url: supplier.logo_url || null,
                
                // Handle custom_fields with proper type safety
                custom_fields: typeof supplier.custom_fields === 'object'
                    ? JSON.stringify(supplier.custom_fields)
                    : (typeof supplier.custom_fields === 'string'
                        ? supplier.custom_fields 
                        : '{}'),
                        
                // Handle contact_info with proper type safety
                contact_info: typeof supplier.contact_info === 'object'
                    ? JSON.stringify(supplier.contact_info)
                    : (typeof supplier.contact_info === 'string'
                        ? supplier.contact_info
                        : '{}'),
                        
                // Add custom_fields_json for backward compatibility
                custom_fields_json: typeof supplier.custom_fields === 'object'
                    ? JSON.stringify(supplier.custom_fields)
                    : (typeof supplier.custom_fields === 'string'
                        ? supplier.custom_fields
                        : '{}'),
                        
                // User fields
                created_by: supplier.created_by || currentUserId,
                updated_by: currentUserId
            };
        });
    }
    
    // Derived values from internal or external form
    $: currentFormData = useInternalForm && superFormInstance 
        ? internalForm 
        : supplierForm;
        
    $: formErrors = useInternalForm && superFormInstance 
        ? internalErrors 
        : supplierErrors;

    // Track when component is initialized
    let formInitialized = false;
    onMount(() => {
        formInitialized = true;
    });
    
    // Handle edit event from supplier card
    function handleSupplierEdit(event: CustomEvent<{ supplier: SupplierData }>): void {
        console.log('Received edit event in suppliers-tab:', event);
        
        // Extract supplier data from the event
        const supplierData = event.detail.supplier;
        
        // Forward the edit event to the parent component with raw supplier data
        dispatch('editSupplier', { supplier: supplierData });
        
        // Update UI state
        editMode = true;
        showForm = true;
    }

    // Handle edit event from GridView component
    function handleGridSupplierEdit(event: CustomEvent<{ item: GridEntity }>) {
        const supplier = event.detail.item as Supplier;
        selectedSupplier = supplier;
        
        // Forward to the parent component using the same format as card edit
        // This ensures proper data flow within the dashboard
        dispatch('editSupplier', { supplier });
        
        // Simply update UI state to show edit form within dashboard
        editMode = true;
        showForm = true;
    }
    
    // Handle supplier deleted from grid view - type-safe implementation
    async function handleSupplierDelete(event: CustomEvent<{ itemId: string }>) {
        console.log('Delete request received for:', event.detail.itemId);
        const supplierId = event.detail.itemId;
        
        try {
            // Make a direct POST request to the delete endpoint
            const response = await fetch(`/supplier/${supplierId}/edit?/delete`, {
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
            
            // Successfully deleted - update the suppliers list
            suppliers = suppliers.filter(s => s.supplier_id !== supplierId);
            
            // Close any open forms if we deleted the current supplier
            if (selectedSupplier && selectedSupplier.supplier_id === supplierId) {
                showForm = false;
                editMode = false;
                selectedSupplier = null;
            }
            
            // Notify parent components
            dispatch('supplierDeleted', { supplierId });
        } catch (error) {
            console.error('Error deleting supplier:', error);
        }
    }
    
    // Store form values from SupplierForm component
    let capturedFormValues: Partial<SupplierFormSchema> = {};

    // Handle form submission from supplierForm
    function handleFormSubmit(event: CustomEvent<{ success: boolean; formData: any }>) {
        console.log('Form submitted:', event.detail);
        
        if (event.detail.success) {
            const newSupplier = event.detail.formData;
            
            // If we're in edit mode, update the existing supplier in the list
            if (editMode && selectedSupplier) {
                // Store a non-null reference to the supplier to satisfy TypeScript
                const currentSupplier = selectedSupplier;
                
                const index = suppliers.findIndex(m => 
                    m.supplier_id === currentSupplier.supplier_id
                );
                
                if (index !== -1) {
                    // Update existing supplier
                    suppliers[index] = { ...suppliers[index], ...newSupplier };
                    // Force reactivity with array reassignment
                    suppliers = [...suppliers];
                    console.log('Updated supplier in list:', suppliers[index]);
                }
            } else {
                // This is a new supplier - add to the beginning of the list
                // Generate an ID if one doesn't exist (should be generated server-side)
                if (!newSupplier.supplier_id) {
                    newSupplier.supplier_id = crypto.randomUUID();
                }
                
                // Add to the beginning of the list to show it first
                suppliers = [newSupplier, ...suppliers];
                console.log('Added new supplier to list:', newSupplier);
            }
            
            // Reset form state after successful submission
            showForm = false;
            editMode = false;
            selectedSupplier = null;
            capturedFormValues = {};
            
            // Notify parent
            dispatch('refresh');
        }
    }

    // Function to submit the form programmatically
    function submitForm(): void {
        // Validate data before submission
        if (!capturedFormValues.supplier_name || capturedFormValues.supplier_name.trim() === '') {
            console.error('Supplier name is required');
            if (useInternalForm && superFormInstance && superFormInstance.errors) {
                superFormInstance.errors.update(errors => {
                    return { ...errors, supplier_name: ['Supplier name is required'] };
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
                    supplier_id: capturedFormValues.supplier_id || '',
                    supplier_name: capturedFormValues.supplier_name || '', 
                    // Optional fields with proper null handling
                    supplier_description: capturedFormValues.supplier_description || null,
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
    selectedSupplier = null;
    dispatch('cancelEdit');
}
  
</script>

<div class="tab-container">
    <h2>Your Suppliers</h2>
    
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

    <!-- List of suppliers -->
    {#if !showForm}
        {#if suppliers && suppliers.length > 0}
            {#if viewMode === 'grid'}
                <!-- Compact grid view with inline expansion -->
                <GridView 
                    entityType="supplier" 
                    items={currentSuppliers}
                    currentUserId={currentUserId}
                    on:edit={handleGridSupplierEdit}
                    on:delete={handleSupplierDelete}
                    on:refresh={handleSupplierDeleted}
                />
            {:else}
                <!-- Traditional card view -->
                <div class="user-items-grid">
                    {#each currentSuppliers as supplier (supplier.supplier_id)}
                        <SupplierCard 
                            {supplier} 
                            {currentUserId}
                            allowEdit={currentUserId === supplier.created_by} 
                            allowDelete={currentUserId === supplier.created_by}
                            on:edit={handleSupplierEdit} 
                            on:deleted={handleSupplierDeleted}
                        />
                    {/each}
                </div>
            {/if}
        {:else}
            <p class="no-items">You haven't created any suppliers yet.</p>
        {/if}
        
        <!-- Toggle form button - only show when form is not visible -->
        <div class="action-buttons">
            <button type="button" class="primary-btn" on:click={() => {
                // Reset form state completely when adding new supplier
                editMode = false;
                selectedSupplier = null;
                
                // Force reset form data to empty values by setting supplierForm to default values
                const emptyForm = {
                    supplier_id: '',
                    supplier_name: '',
                    supplier_description: '',
                    website_url: '',
                    logo_url: '',
                    contact_info: '{}',
                    custom_fields: '{}',
                    custom_fields_json: '{}',
                    created_by: currentUserId,
                    updated_by: currentUserId
                };
                // Update the exported prop directly
                supplierForm = emptyForm;
                // Clear any captured form values
                capturedFormValues = {};
                
                // Show the form
                showForm = true;
            }}>
                Add New Supplier
            </button>
            <a href="/supplier" class="secondary-btn">View All Suppliers</a>
        </div>
    {:else}
        <div class="form-container enhanced-form" transition:slide={{ duration: 300 }}>
            <h2 class="form-title">{editMode ? 'Edit Supplier' : 'Create New Supplier'}</h2>
            
            {#if useInternalForm && superFormInstance}
                <!-- Use direct SuperForm integration when available -->
                <form method="POST" action={formAction} id={formId} use:superFormInstance.enhance>
                    <SupplierForm 
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
                            {editMode ? 'Save Changes' : 'Create Supplier'}
                        </button>
                    </div>
                </form>
            {:else}
                <!-- Standard form handling without SuperForm -->
                <SupplierForm 
                    data={currentFormData}
                    errors={formErrors}
                    submitText={editMode ? 'Save Changes' : 'Create Supplier'}
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
    

    
    .view-mode-toggle {
        display: flex;
        align-items: center;
        justify-content: flex-end;
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
    
    .secondary-btn {
        background: transparent;
        color: hsl(var(--primary));
        border: 1px solid hsl(var(--primary));
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .secondary-btn:hover {
        background: hsl(var(--primary) / 0.1);
    }
    
    /* Form styling */
    .form-container {
        background: hsl(var(--card));
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 10px hsl(var(--muted) / 0.2);
    }
    
    .enhanced-form {
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
    }
    
    .form-title {
        margin-top: 0;
        margin-bottom: 1.5rem;
        color: hsl(var(--foreground));
        font-size: 1.5rem;
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
    /* CSS for form is now handled by the SupplierForm component */
    
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
