<!-- src/lib/components/dashboard/manufacturers-tab.svelte -->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
import { slide } from 'svelte/transition';
    import ManufacturerCard from '$lib/components/cards/manufacturer.svelte';
    import { ManufacturerForm } from '$lib/components/forms';
    
    // Define an interface that matches the card component's requirements
    interface ManufacturerData {
        manufacturer_id: string;
        manufacturer_name: string;
        manufacturer_description?: string | null | undefined;
        website_url?: string | null | undefined;
        contact_info?: string | null | undefined;
        logo_url?: string | null | undefined;
        custom_fields?: Record<string, unknown> | null | undefined;
        created_at: Date;
        updated_at: Date;
        created_by: string;
        updated_by?: string | null | undefined;
    }
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Props
    export let manufacturers: ManufacturerData[] = [];
    export let currentUserId: string;
    export let showForm: boolean = false;
    export let editMode: boolean = false;
    
    // Form props - passed to ManufacturerForm component
    export let manufacturerForm: any = {};
    export let manufacturerErrors: Record<string, string | string[]> = {};
    // These props are passed from the parent and used in the component's logic
    // even if not directly referenced in the template

    
    // Local state
    let selectedManufacturer: ManufacturerData | null = null;
   
    // Methods
    function toggleForm(): void {
        dispatch('toggleForm');
    }
    
    function handleManufacturerDeleted(): void {
        // Notify parent to refresh the data
        dispatch('refreshData');
    }
    
    // Handle edit event from manufacturer card
    function handleManufacturerEdit(event: CustomEvent<{ manufacturer: ManufacturerData }>): void {
        console.log('Received edit event in manufacturers-tab:', event);
        
        // Extract manufacturer data from the event
        const manufacturerData = event.detail.manufacturer;
        
        // Format the manufacturer data for the form
        const formattedManufacturer = {
            ...manufacturerData,
            // Ensure contact_info is a string for the form
            contact_info: typeof manufacturerData.contact_info === 'object' 
                ? JSON.stringify(manufacturerData.contact_info) 
                : manufacturerData.contact_info || '{}',
            // Ensure custom_fields is a string for the form
            custom_fields: typeof manufacturerData.custom_fields === 'object'
                ? JSON.stringify(manufacturerData.custom_fields)
                : manufacturerData.custom_fields || '{}'
        };
        
        // Forward the edit event to the parent component with properly formatted data
        dispatch('editManufacturer', { manufacturer: formattedManufacturer });
    }
</script>

<div class="tab-container">
    <h2>Your Manufacturers</h2>
    
    <!-- List of manufacturers -->
    {#if manufacturers && manufacturers.length > 0}
        <div class="user-items-grid">
            {#each manufacturers as manufacturer (manufacturer.manufacturer_id)}
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
    {:else}
        <p class="no-items">You haven't created any manufacturers yet.</p>
    {/if}
    
    <!-- Toggle form button -->
    <div class="action-buttons">
        <button type="button" class="primary-btn" on:click={toggleForm}>
            {showForm ? 'Cancel' : 'Add New Manufacturer'}
        </button>
        <a href="/manufacturer" class="secondary-btn">View All Manufacturers</a>
    </div>
    
    <!-- Manufacturer form -->
    {#if showForm}
        <div class="form-container enhanced-form" transition:slide={{ duration: 300 }}>
            <h2 class="form-title">{editMode ? 'Edit Manufacturer' : 'Create New Manufacturer'}</h2>
            
            <ManufacturerForm 
                data={manufacturerForm}
                errors={manufacturerErrors}
                submitText={editMode ? 'Save Changes' : 'Create Manufacturer'}
                isEditMode={editMode}
                hideButtons={false}
                currentUserId={currentUserId}
                on:submit={(event: CustomEvent) => dispatch('submit', event.detail)}
                on:cancel={() => dispatch('cancelEdit')}
                on:formUpdate={(event: CustomEvent) => dispatch('formUpdate', event.detail)}
            />
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
    
    .secondary-btn {
        background: hsl(var(--background));
        color: hsl(var(--primary));
        border: 1px solid hsl(var(--primary));
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
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
