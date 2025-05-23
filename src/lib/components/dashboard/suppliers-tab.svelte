<!-- src/routes/dashboard/components/suppliers-tab.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import Supplier from '$lib/components/cards/supplier.svelte';
    import { 
        userSuppliers, 
        refreshData, 
        showSupplierForm
    } from './store';
    import type { Supplier as SupplierType } from '$lib/types/schemaTypes';
    import { SupplierForm } from '$lib/components/forms';
    // Note: In SvelteKit, components are automatically exported as default
    
    // Props
    export let suppliers: SupplierType[] = [];
    export let currentUserId: string;
    
    // Update the store when the suppliers prop changes
    $: {
        userSuppliers.set(suppliers);
    }
    
    // Method to toggle supplier form visibility
    function toggleSupplierForm(): void {
        showSupplierForm.update(show => !show);
    }
    
    // Method to handle supplier deletion
    function handleSupplierDeleted(): void {
        refreshData();
    }
</script>

<div class="tab-content">
    <h2>Your Suppliers</h2>
    
    {#if $userSuppliers.length > 0}
        <div class="user-items-grid">
            {#each $userSuppliers as supplier (supplier.supplier_id)}
                <Supplier 
                    supplier={supplier} 
                    allowEdit={true} 
                    allowDelete={true} 
                    currentUserId={currentUserId}
                    on:deleted={handleSupplierDeleted}
                />
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <p>You haven't added any suppliers yet. Create your first supplier to get started.</p>
        </div>
    {/if}
    
    <div class="action-buttons">
        <button type="button" class="primary-btn" on:click={toggleSupplierForm}>
            {$showSupplierForm ? 'Cancel' : 'Add New Supplier'}
        </button>
        <a href="/suppliers" class="secondary-btn">View All Suppliers</a>
    </div>
    
    {#if $showSupplierForm}
        <SupplierForm 
            currentUserId={currentUserId}
            onComplete={() => refreshData()}
            storeRefs={{
                showSupplierForm
            }}
        />
    {/if}
</div>

<style>
    .tab-content {
        padding: 2rem;
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
    
    .empty-state {
        background-color: hsl(var(--muted) / 0.3);
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .empty-state p {
        color: hsl(var(--muted-foreground));
        margin: 0;
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
