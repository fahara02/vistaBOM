<!-- src/lib/components/dashboard/suppliers-tab.svelte -->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import SupplierCard from '$lib/components/cards/supplier.svelte';
    import { SupplierForm } from '$lib/components/forms';
    import GridView from '$lib/components/grid/GridView.svelte';
    
    // Import types from types and formTypes
    import type { Supplier } from '$lib/types/types';
    import type { DashboardSupplier } from '$lib/types/formTypes';
    import type { GridEntity } from '$lib/types/grid';
    
    // Accept both Supplier and DashboardSupplier types
    type SupplierData = Supplier | DashboardSupplier;
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Props
    export let suppliers: SupplierData[] = [];
    export let currentUserId: string;
    export let showForm: boolean = false;
    export let editMode: boolean = false;
    
    // Form props - passed to SupplierForm component
    export let supplierForm: any = {};
    export let supplierErrors: Record<string, string | string[]> = {};
    
    // Local state
    let selectedSupplier: SupplierData | null = null;
    let viewMode: 'grid' | 'list' = 'grid'; // Default to grid view
   
    // Methods
    function toggleForm(): void {
        dispatch('toggleForm');
    }
    
    function handleSupplierDeleted(): void {
        // Notify parent to refresh the data
        dispatch('refreshData');
    }
    
    // Handle edit event from supplier card
    function handleSupplierEdit(event: CustomEvent<{ supplier: SupplierData }>): void {
        console.log('Received edit event in suppliers-tab:', event);
        
        // Extract supplier data from the event
        const supplierData = event.detail.supplier;
        
        // Format the supplier data for the form with required fields for supplier implementation
        const formattedSupplier = {
            ...supplierData,
            // Ensure all ID formats are available for compatibility
            supplier_id: supplierData.supplier_id,
            supplierId: supplierData.supplier_id,
            // Ensure contact_info is a string for the form
            contact_info: typeof supplierData.contact_info === 'object' 
                ? JSON.stringify(supplierData.contact_info) 
                : supplierData.contact_info || '{}',
            // Ensure custom_fields is a string for the form
            custom_fields: typeof supplierData.custom_fields === 'object'
                ? JSON.stringify(supplierData.custom_fields)
                : supplierData.custom_fields || '{}',
            // Keep custom_fields_json which is needed by the supplier implementation
            custom_fields_json: typeof supplierData.custom_fields === 'object'
                ? JSON.stringify(supplierData.custom_fields)
                : supplierData.custom_fields || '{}'
        };
        
        console.log('Formatted supplier for edit form:', formattedSupplier);
        
        // Forward the edit event to the parent component with properly formatted data
        dispatch('editSupplier', { supplier: formattedSupplier });
    }
    
    // Handle edit event from GridView component
    function handleGridSupplierEdit(event: CustomEvent<{ item: GridEntity }>) {
        selectedSupplier = event.detail.item as Supplier;
        editMode = true;
        showForm = true;
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
    {#if suppliers && suppliers.length > 0}
        {#if viewMode === 'grid'}
            <!-- Compact grid view with inline expansion -->
            <GridView 
                items={suppliers}
                entityType="supplier"
                {currentUserId}
                on:edit={handleGridSupplierEdit}
                on:refresh={handleSupplierDeleted}
            />
        {:else}
            <!-- Traditional card view -->
            <div class="user-items-grid">
                {#each suppliers as supplier (supplier.supplier_id)}
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
    
    <!-- Toggle form button -->
    <div class="action-buttons">
        <button type="button" class="primary-btn" on:click={toggleForm}>
            {showForm ? 'Cancel' : 'Add New Supplier'}
        </button>
        <a href="/supplier" class="secondary-btn">View All Suppliers</a>
    </div>
    
    <!-- Supplier form -->
    {#if showForm}
        <div class="form-container enhanced-form" transition:slide={{ duration: 300 }}>
            <h2 class="form-title">{editMode ? 'Edit Supplier' : 'Create New Supplier'}</h2>
            
            <SupplierForm 
                data={supplierForm}
                errors={supplierErrors}
                submitText={editMode ? 'Save Changes' : 'Create Supplier'}
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
