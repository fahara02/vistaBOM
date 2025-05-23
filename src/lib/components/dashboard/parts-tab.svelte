<!-- src/routes/dashboard/components/parts-tab.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { userParts, refreshData, showPartForm } from './store';
    import type { Part } from '$lib/types/schemaTypes';
    import { PartForm } from '$lib/components/forms';
    import type { Writable } from 'svelte/store';
    
    // Props
    export let parts: Part[] = [];
    export let currentUserId: string;
    
    // Update the store when the parts prop changes
    $: {
        userParts.set(parts);
    }
    
    // Methods
    function togglePartForm(): void {
        showPartForm.update((show: boolean) => !show);
    }
    
    function handlePartDeleted(): void {
        refreshData();
    }
</script>

<div class="tab-content">
    <h2>Your Parts</h2>
    
    {#if $userParts.length > 0}
        <div class="user-items-grid">
            {#each $userParts as part (part.part_id)}
                <div class="entity-card">
                    <h3>{(part as any).name || part.global_part_number || 'Unnamed Part'}</h3>
                    <p class="entity-description">
                        {(part as any).description || 'No description available'}
                    </p>
                    <div class="entity-meta">
                        <span class="entity-status">{part.lifecycle_status || 'Draft'}</span>
                        <span class="entity-date">
                            Created: {new Date(part.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="entity-actions">
                        <a href="/parts/{part.part_id}" class="action-link">View Details</a>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <p>You haven't added any parts yet. Create your first part to get started.</p>
        </div>
    {/if}
    
    <div class="action-buttons">
        <button type="button" class="primary-btn" on:click={togglePartForm}>
            {$showPartForm ? 'Cancel' : 'Add New Part'}
        </button>
        <a href="/parts" class="secondary-btn">View All Parts</a>
    </div>
    
    {#if $showPartForm}
        <div class="form-container">
            <PartForm 
                currentUserId={currentUserId}
                onComplete={() => refreshData()}
                storeRefs={{
                    showPartForm: showPartForm as Writable<boolean>
                }}
            />
        </div>
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
    
    .entity-card {
        background-color: hsl(var(--card));
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        padding: 1.25rem;
        border: 1px solid hsl(var(--border));
        transition: box-shadow 0.3s, transform 0.2s, border-color 0.3s;
    }
    
    .entity-card:hover {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
        border-color: hsl(var(--primary) / 0.3);
    }
    
    .entity-card h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1.25rem;
        color: hsl(var(--foreground));
    }
    
    .entity-description {
        margin: 0 0 1rem 0;
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .entity-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        font-size: 0.85rem;
    }
    
    .entity-status {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        background-color: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        text-transform: capitalize;
    }
    
    .entity-date {
        color: hsl(var(--muted-foreground));
    }
    
    .entity-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.75rem;
    }
    
    .action-link {
        color: hsl(var(--primary));
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 0.4rem 0.75rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    
    .action-link:hover {
        background-color: hsl(var(--primary) / 0.1);
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
    
    .form-container {
        margin-top: 1.5rem;
        background-color: hsl(var(--surface-100));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
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
