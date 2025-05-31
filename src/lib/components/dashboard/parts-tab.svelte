<!-- src/routes/dashboard/components/parts-tab.svelte -->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import PartForm from '$lib/components/forms/PartForm.svelte';
    import PartCard from '$lib/components/cards/PartCard.svelte';
    import GridView from '$lib/components/grid/GridView.svelte';
    import { superForm } from 'sveltekit-superforms/client';
    import type { SuperForm, SuperValidated } from 'sveltekit-superforms';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { 
        ComplianceTypeEnum, 
        MountingTypeEnum, 
        PackageTypeEnum, 
        WeightUnitEnum, 
        TemperatureUnitEnum, 
        PartStatusEnum, 
        LifecycleStatusEnum, 
        DimensionUnitEnum 
    } from '$lib/types/enums';
    import { z } from 'zod';
    
    // Import types from the central schema
    import type { Part, PartVersion } from '$lib/types';
    import type { UnifiedPart, ManufacturerPartDefinition, SupplierPartDefinition, 
        ComplianceDefinition, RepresentationDefinition, AttachmentDefinition, 
        PartStructureDefinition, JsonValue, EnvironmentalData } from '$lib/types/schemaTypes';
    import type { Category, Manufacturer } from '$lib/types/schemaTypes';
    import type { ManufacturerDisplay } from '$lib/types/componentTypes';
    import { adaptManufacturer } from '$lib/types/componentTypes';
    import type { ElectricalProperties, MechanicalProperties, ThermalProperties } from '$lib/types/schemaTypes';
    import { createPartSchema } from '../../schema/schema';
    import { unifiedPartSchema } from '$lib/schema/unifiedPartSchema';
    import type { GridEntity, EntityType, GridPart } from '$lib/types/grid';
    
    // Define types to match the schema requirements that are missing from interfaces
    type RepresentationTypeEnum = '3D Model' | 'Footprint' | 'Schematic Symbol' | 'Simulation Model';
    
    // No longer need to extend AttachmentDefinition as it now includes is_primary field
    
    // We'll use the event dispatcher defined below
    
    // Extend SupplierPartDefinition to include manufacturer_part_index required by schema
 
    // No longer need a normalized data structure as we're working directly with UnifiedPart objects

    // Part validation function to ensure we have valid UnifiedPart data
    function isValidPartData(item: unknown): boolean {
        if (!item || typeof item !== 'object') {
            return false;
        }
        
        // Check if it has the essential UnifiedPart properties
        const partCheck = item as Partial<UnifiedPart>;
        return typeof partCheck.part_id === 'string' && 
               typeof partCheck.part_name === 'string';
    }
 
    
    // This function is no longer needed as we're working directly with UnifiedPart objects
    // but we'll keep a simplified version for backwards compatibility
    function getUnifiedPartFromLegacyFormat(item: any): UnifiedPart {
        // If it's already a UnifiedPart, return it as is
        if (item.part_id && item.part_name) {
            return item as UnifiedPart;
        }
        
        // If it has the legacy nested structure, convert to UnifiedPart
        if (item.part && item.currentVersion) {
            const part = item.part;
            const currentVersion = item.currentVersion;
            
            return {
                part_id: part.part_id,
                part_version_id: currentVersion.part_version_id || '', // Add required field
                part_name: currentVersion.part_name || 'Unnamed Part',
                part_version: currentVersion.part_version || '0.1.0',
                global_part_number: part.global_part_number || '',
                status_in_bom: part.status_in_bom || PartStatusEnum.CONCEPT,
                version_status: currentVersion.version_status || LifecycleStatusEnum.DRAFT,
                lifecycle_status: part.lifecycle_status || LifecycleStatusEnum.DRAFT,
                is_public: Boolean(part.is_public),
                short_description: currentVersion.short_description || '',
                long_description: currentVersion.long_description || '',
                functional_description: currentVersion.functional_description || '',
                created_at: part.created_at || new Date(),
                updated_at: part.updated_at || new Date(),
                creator_id: part.creator_id || '',
                manufacturer_parts: [],
                supplier_parts: [],
                attachments: [],
                representations: [],
                structure: [],
                compliance_info: []
            } as UnifiedPart;
        }
        
        // Return a minimal UnifiedPart with available data
        return {
            part_id: item.part_id || '',
            part_version_id: item.part_version_id || '', // Add required field
            part_name: item.part_name || 'Unnamed Part',
            part_version: item.part_version || '0.1.0',
            status_in_bom: item.status_in_bom || PartStatusEnum.CONCEPT,
            version_status: item.version_status || LifecycleStatusEnum.DRAFT,
            lifecycle_status: item.lifecycle_status || LifecycleStatusEnum.DRAFT,
            is_public: Boolean(item.is_public),
            created_at: item.created_at || new Date(),
            updated_at: item.updated_at || new Date(),
            creator_id: item.creator_id || '',
            manufacturer_parts: [],
            supplier_parts: [],
            attachments: [],
            representations: [],
            structure: [],
            compliance_info: []
        } as UnifiedPart;
    }
    
    // Handle GridView edit event
    function handleGridPartEdit(gridItem: GridEntity) {
        // Extract the part data from the grid entity
        if (gridItem.entityType === 'part') {
            // First validate and safely access properties without using direct type assertion
            // This is safer than using a direct type assertion with 'as UnifiedPart'
            const gridItemPart = gridItem as GridPart;
            // We keep track of the current version as a reference but don't need to use direct assertions
            
            // Initialize a flattened structure that matches UnifiedPart interface
            // combining both Part and PartVersion fields into a single object
            // Create a clean formData object without non-standard properties
            const formData: Partial<UnifiedPart> = {
                // Core Part fields - already have most
                part_id: gridItemPart.part_id,
                creator_id: gridItemPart.creator_id || '',
                global_part_number: gridItemPart.global_part_number,
                status_in_bom: gridItemPart.status_in_bom || PartStatusEnum.ACTIVE,
                lifecycle_status: gridItemPart.lifecycle_status || LifecycleStatusEnum.PRODUCTION,
                is_public: gridItemPart.is_public === true,
                created_at: gridItemPart.created_at ? new Date(gridItemPart.created_at) : new Date(),
                updated_at: gridItemPart.updated_at ? new Date(gridItemPart.updated_at) : new Date(),
                updated_by: gridItemPart.updated_by,
                current_version_id: gridItemPart.current_version_id,
                custom_fields: gridItemPart.custom_fields || null,
                
                // PartVersion fields - extend with missing ones
                part_version_id: String(gridItemPart.part_version_id || gridItemPart.current_version_id || ''),
                part_version: String(gridItemPart.part_version || '0.1.0'),
                part_name: String(gridItemPart.part_name || 'Unnamed Part'),
                version_status: gridItemPart.version_status || LifecycleStatusEnum.DRAFT,
                short_description: gridItemPart.short_description || '',
                functional_description: gridItemPart.functional_description || '',
                long_description: gridItemPart.long_description || '',
                
                // Add missing identification fields
                internal_part_number: gridItemPart.internal_part_number,
                manufacturer_part_number: gridItemPart.manufacturer_part_number,
                mpn: gridItemPart.mpn,
                gtin: gridItemPart.gtin,
                category_ids: gridItemPart.category_ids,
                family_ids: gridItemPart.family_ids,
                group_ids: gridItemPart.group_ids,
                tag_ids: gridItemPart.tag_ids,
                
                // Physical properties - extend properly
                dimensions: gridItemPart.dimensions,
                dimensions_unit: gridItemPart.dimensions_unit,
                package_type: gridItemPart.package_type,
                mounting_type: gridItemPart.mounting_type,
                part_weight: gridItemPart.part_weight,
                weight_unit: gridItemPart.weight_unit,
                weight_value: gridItemPart.weight_value,
                pin_count: gridItemPart.pin_count,
                
                // Electrical properties - already have most, add missing
                voltage_rating_min: gridItemPart.voltage_rating_min,
                voltage_rating_max: gridItemPart.voltage_rating_max,
                current_rating_min: gridItemPart.current_rating_min,
                current_rating_max: gridItemPart.current_rating_max,
                power_rating_max: gridItemPart.power_rating_max,
                tolerance: gridItemPart.tolerance,
                tolerance_unit: gridItemPart.tolerance_unit,
                electrical_properties: gridItemPart.electrical_properties,
                
                // Thermal properties - add missing
                operating_temperature_min: gridItemPart.operating_temperature_min,
                operating_temperature_max: gridItemPart.operating_temperature_max,
                storage_temperature_min: gridItemPart.storage_temperature_min,
                storage_temperature_max: gridItemPart.storage_temperature_max,
                temperature_unit: gridItemPart.temperature_unit,
                thermal_properties: gridItemPart.thermal_properties,
                
                // Technical properties - add missing
                mechanical_properties: gridItemPart.mechanical_properties,
                material_composition: gridItemPart.material_composition,
                environmental_data: gridItemPart.environmental_data,
                technical_specifications: gridItemPart.technical_specifications,
                properties: gridItemPart.properties,
                
                // Relational fields - add missing
                manufacturer_id: gridItemPart.manufacturer_id,
                manufacturer_name: gridItemPart.manufacturer_name,
                supplier_id: gridItemPart.supplier_id,
                supplier_name: gridItemPart.supplier_name,
                manufacturer: gridItemPart.manufacturer,
                suppliers: gridItemPart.suppliers || [],
                
                // Required array fields - properly initialize ALL
                manufacturer_parts: Array.isArray(gridItemPart.manufacturer_parts) ? gridItemPart.manufacturer_parts : [],
                supplier_parts: Array.isArray(gridItemPart.supplier_parts) ? gridItemPart.supplier_parts : [],
                attachments: Array.isArray(gridItemPart.attachments) ? gridItemPart.attachments : [],
                representations: Array.isArray(gridItemPart.representations) ? gridItemPart.representations : [],
                structure: Array.isArray(gridItemPart.structure) ? gridItemPart.structure : [],
                compliance_info: Array.isArray(gridItemPart.compliance_info) ? gridItemPart.compliance_info : [],
                part_tags: Array.isArray(gridItemPart.part_tags) ? gridItemPart.part_tags : [],
                part_version_tags: Array.isArray(gridItemPart.part_version_tags) ? gridItemPart.part_version_tags : [],
                categories: Array.isArray(gridItemPart.categories) ? gridItemPart.categories : [],
                
                // Metadata fields - add missing
                revision_notes: gridItemPart.revision_notes,
                released_at: gridItemPart.released_at,
                full_description: gridItemPart.full_description || gridItemPart.long_description
            };
                        
            // Log key fields to verify they're being set
            console.log('✅ FORM DATA SET WITH ALL FIELDS:');
            console.log('- part_name:', formData.part_name);
            console.log('- part_version:', formData.part_version);
            console.log('- version_status:', formData.version_status);
            console.log('- short_description:', formData.short_description);
        } else {
            console.warn('Unsupported entity type in handleGridPartEdit', gridItem);
        }
    }
    
    // Handle part deletion from GridView
    function handlePartDelete(event: CustomEvent<{ itemId: string }>): void {
        const partId = event.detail.itemId;
        // Implementation for delete functionality
        console.log(`Delete part with ID: ${partId}`);
        // You would typically call an API to delete the part
        // After deletion is complete, refresh the parts list
        dispatch('refreshData');
    }
    
    // Event dispatcher with properly typed events
    const dispatch = createEventDispatcher<{
        toggleForm: void;
        editPart: { part: UnifiedPart; currentVersion: PartVersion | null };
        refreshData: void;
        formUpdate: { data: Record<string, unknown> };
        submit: { formData: FormData };
        // Include the refresh event type that's used in GridView component
        refresh: void;
    }>();
    
    // Handle data refreshing - categories, manufacturers, etc.
    function refreshData(): void {
        // Simplified example - in real implementation fetch from API
        // Fetch categories and manufacturers from API
        // Placeholder implementation:
        const fetchCategories = Promise.resolve([]);
        const fetchManufacturers = Promise.resolve([]);
        
        Promise.all([fetchCategories, fetchManufacturers])
            .then(([categoriesData, manufacturersData]) => {
                categories = categoriesData;
                // Convert Manufacturer objects to ManufacturerDisplay
                manufacturerOptions = (manufacturersData as Manufacturer[]).map(m => adaptManufacturer(m));
            });
    }

    // Props with proper types
    // Changed from export let to export const since it's not used externally
    export const exportFormat: 'unified' | 'compact' | 'full' = 'unified';
    export let parts: UnifiedPart[] = [];
    export let currentUserId: string;
    // Updated to accept the specific UnifiedPart type instead of using 'any'
export let formInstance: SuperForm<Partial<UnifiedPart>> | null = null;
    
    // State variables
    let showForm = false;
    let editMode = false;
    let viewMode: 'grid' | 'list' = 'list';
    
    // Data for forms
    let categories: Category[] = [];
    let manufacturerOptions: ManufacturerDisplay[] = [];
    let selectedPart: Part | null = null;
    let selectedVersion: PartVersion | null = null;
    
    // Using the event dispatcher defined above

    // Toggle part form visibility
    function togglePartForm(): void {
        showForm = !showForm;
        if (!showForm) {
            // Reset edit mode when closing form
            editMode = false;
            selectedPart = null;
            selectedVersion = null;
        }
    }

    // Handle part deletion event is defined below
    
    function handlePartEdit(event: CustomEvent): void {
        try {
            // Handle both direct edit events and grid view edit events
            const gridItem = event.detail.item;
            const directItem = event.detail.part;

            // Check for gridItem first
            if (gridItem && typeof gridItem === 'object' && gridItem.entityType === 'part') {
                // Use the grid item data - convert from GridPart to UnifiedPart format
                handleGridPartEdit(gridItem);
                return; // Exit early as grid edit is handled separately
            }

            // Process direct part edit if grid item wasn't available
            if (directItem && typeof directItem === 'object') {
                // Check if it's already a UnifiedPart structure
                const unifiedPart = directItem as UnifiedPart;

                // Extract the part data for the form
                if (formInstance?.form) {
                    // Use the UnifiedPart directly - using update method instead of $ syntax
                    formInstance.form.update(form => ({
                        ...form,
                        ...unifiedPart
                    }));

                    // Set edit mode and show form
                    editMode = true;
                    showForm = true;
                }
                return;
            }
            console.warn('Unrecognized event structure', event.detail);
            return;
        } catch (error) {
            console.error('Error in handlePartEdit:', error);
        }
    }

    // Grid view state
    let gridItems: GridEntity[] = [];
    
    // Toggle between list and grid views
    function toggleViewMode(): void {
        viewMode = viewMode === 'list' ? 'grid' : 'list';
        console.log('View mode switched to:', viewMode);
        
        // Save user preference to localStorage if in browser environment
        if (browser) {
            localStorage.setItem('vistaBOM_parts_view_mode', viewMode);
        }
        
        // If switching to grid view, prepare grid items
        if (viewMode === 'grid') {
            prepareGridItems();
            console.log('Grid items prepared:', gridItems.length, 'items');
        }
    }
    
    // Prepare parts data for grid view
    function prepareGridItems(): void {
        console.log('Preparing grid items from parts:', parts.length, 'parts available');
        
        // Map parts to grid entities
        gridItems = parts.map(part => {
            if (!isValidPartData(part)) {
                console.warn('Invalid part data for grid', part);
                return null;
            }
            
            const unifiedPart = part as UnifiedPart;
            console.log('Converting part to grid item:', unifiedPart.part_name);
            
            // Create a grid entity from the UnifiedPart
            return {
                ...unifiedPart,
                entityType: 'part' as EntityType,
                _currentVersion: {
                    part_version: unifiedPart.part_version,
                    version_status: unifiedPart.version_status || LifecycleStatusEnum.DRAFT
                }
            } as GridPart;
        }).filter((item): item is GridPart => item !== null);
        
        console.log('Grid items prepared, total items:', gridItems.length);
    }
    
    // Handle grid view events
    function handleGridEvent(event: CustomEvent): void {
        const { type, detail } = event;
        
        switch (type) {
            case 'edit':
                if (detail && detail.item && detail.item.entityType === 'part') {
                    handleGridPartEdit(detail.item);
                }
                break;
            case 'delete':
                if (detail && detail.itemId) {
                    handlePartDelete({ detail: { itemId: detail.itemId } } as CustomEvent<{ itemId: string }>);
                }
                break;
            case 'refresh':
                dispatch('refreshData');
                break;
            default:
                console.warn('Unhandled grid event', type, detail);
        }
    }
    
    // Load user preferences on mount
    onMount(() => {
        if (browser) {
            // Load view mode preference
            const savedViewMode = localStorage.getItem('vistaBOM_parts_view_mode');
            if (savedViewMode === 'grid' || savedViewMode === 'list') {
                viewMode = savedViewMode;
                
                // If grid view is active, prepare items
                if (viewMode === 'grid') {
                    prepareGridItems();
                }
            }
            
            // Get current user ID if available
            currentUserId = $page.data.session?.user?.id || '';
        }
    });
    
    // Watch for changes to parts array and update grid items if needed
    $: if (parts && parts.length > 0 && viewMode === 'grid') {
        prepareGridItems();
    }
</script>

<!-- View mode toggle button -->
<div class="view-toggle-container">
    <button class="view-toggle-btn {viewMode === 'list' ? 'active' : ''}" on:click={toggleViewMode}>
        List View
    </button>
    <button class="view-toggle-btn {viewMode === 'grid' ? 'active' : ''}" on:click={toggleViewMode}>
        Grid View
    </button>
</div>

<!-- Conditional rendering based on view mode -->
{#if viewMode === 'list'}
    <!-- List view with simplified horizontal cards -->
    <div class="parts-list">
        {#each parts as item, index}
            {#if isValidPartData(item)}
                {@const unifiedPart = item as UnifiedPart}
                <div class="list-item" data-id={unifiedPart.part_id}>
                    <div class="detailed-info">
                        <h3>{unifiedPart.part_name || 'Unnamed Part'}</h3>
                        <div class="part-metadata">
                            <span class="part-number">{unifiedPart.global_part_number || 'No Part Number'}</span>
                            <span class="part-version">v{unifiedPart.part_version || '0.1.0'}</span>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="part-header">
                            <h3 class="part-title">{unifiedPart.part_name || 'Unnamed Part'}</h3>
                            <div class="part-metadata">
                                <span class="part-number">{unifiedPart.global_part_number || 'No Part Number'}</span>
                                <span class="part-version">v{unifiedPart.part_version || '0.1.0'}</span>
                            </div>
                        </div>

                        <div class="part-summary">
                            <p>{unifiedPart.short_description || 'No description available'}</p>
                        </div>

                        <div class="part-status">
                            <span class="status-badge {unifiedPart.status_in_bom?.toLowerCase()}">
                                {unifiedPart.status_in_bom || 'CONCEPT'}
                            </span>
                            <span class="lifecycle-badge {unifiedPart.lifecycle_status?.toLowerCase()}">
                                {unifiedPart.lifecycle_status || 'DRAFT'}
                            </span>
                        </div>

                        <div class="card-actions">
                            <button
                                class="action-button edit-button"
                                on:click={() => {
                                    dispatch('editPart', { part: unifiedPart, currentVersion: null });
                                    // Set selected part for form
                                    selectedPart = { part_id: unifiedPart.part_id } as Part;
                                }}
                            >
                                Edit
                            </button>

                            <button
                                class="action-button delete-button"
                                on:click={() => handlePartDelete({ detail: { itemId: unifiedPart.part_id } } as CustomEvent<{ itemId: string }>)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="list-item error-item">
                    <div>Error: Invalid part data at index {index} - {item ? 'Missing required fields' : 'Item is null'}</div>
                    {#if item}
                        <pre style="font-size: 10px; overflow: auto; max-height: 100px;">{JSON.stringify(item, null, 2)}</pre>
                    {/if}
                </div>
            {/if}
        {/each}
        
        {#if parts.length === 0}
            <div class="empty-list-message">No parts found</div>
        {/if}
    </div>

{/if}

{#if viewMode === 'grid'}
    <!-- Grid view implementation using the GridView component -->
    <div class="grid-view-container">
        <GridView
            items={gridItems}
            entityType="part"
            currentUserId={$page.data.session?.user?.id || ''}
            colorVariable="--card-part"
            storageKey="vistaBOM_parts_grid"
            columns={3}
            itemWidth={320}
            itemHeight={240}
            gap={16}
            on:edit={(event) => handleGridEvent({ type: 'edit', detail: event.detail } as CustomEvent)}
            on:delete={(event) => handleGridEvent({ type: 'delete', detail: event.detail } as CustomEvent)}
            on:refresh={() => handleGridEvent({ type: 'refresh' } as CustomEvent)}
        />
    </div>
    
    {#if gridItems.length === 0}
        <div class="empty-state">
            <p>You haven't added any parts yet. Create your first part to get started.</p>
        </div>
    {/if}
{/if}

<!-- Action Buttons -->
<div class="action-buttons">
    <button type="button" class="primary-btn" on:click={togglePartForm}>
        {showForm ? 'Cancel' : 'Add New Part'}
    </button>
    <a href="/parts" class="secondary-btn">View All Parts</a>
</div>
    
    <!-- Part Form Section -->
    {#if showForm}
        <div class="form-container enhanced-form" transition:slide={{ duration: 300 }}>
            <h2 class="form-title">{editMode ? 'Edit Part' : 'Create New Part'}</h2>
            

            <div class="part-form-container">
                <PartForm 
                    categories={categories} 
                    manufacturers={manufacturerOptions}
                    data={{ 
                        form: formInstance?.form,
                        part: selectedPart,
                        version: selectedVersion
                    }}
                    hideButtons={false}
                    isDashboardContext={true}
                    isEditMode={editMode}
                    currentUserId={currentUserId}
                    on:submit={(event) => {
                        let formData = event.detail?.formData instanceof FormData ? 
                            event.detail.formData : new FormData();
                        dispatch('submit', { formData });
                    }}
                    on:cancel={() => {
                        showForm = false;
                        editMode = false;
                        selectedPart = null;
                        dispatch('toggleForm');
                    }}
                    on:formUpdate={(event) => {
                        if (event.detail && event.detail.data) {
                            dispatch('formUpdate', { data: event.detail.data });
                        }
                    }}
                />
            </div>
        </div>
    {/if}

<style>
    .tab-container {
        width: 100%;
        padding: 1.5rem;
        background: hsl(var(--background));
        border-radius: 0.5rem;
        box-shadow: var(--shadow-sm);
    }
    
    h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: hsl(var(--foreground));
    }
    
    .view-mode-toggle {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .view-toggle {
        padding: 0.5rem 1rem;
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
    }
    
    .view-toggle.active {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
    }
    
    /* Grid view styles */
    /* Grid view styles now handled by GridView component */
    
    /* List view styles */
    .parts-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
    }
    
    .list-item {
        display: flex;
        width: 100%;
    }
    
    .list-card-container {
        width: 100%;
        position: relative;
        display: flex;
        background: hsl(var(--card));
        border-radius: 0.5rem;
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .list-card-container:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
    
    .list-card-container :global(.part-card) {
        flex: 1;
        max-width: calc(100% - 150px);
        margin: 0;
        padding: 0.5rem;
        overflow: hidden;
    }
    
    /* View toggle styles */
    .view-toggle-container {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 16px;
        gap: 8px;
    }
    
    .view-toggle-btn {
        padding: 8px 16px;
        border-radius: 4px;
        border: 1px solid hsl(var(--border));
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .view-toggle-btn.active {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-color: hsl(var(--primary));
    }
    
    /* Grid view styles */
    .grid-view-container {
        width: 100%;
        min-height: 500px;
        margin-bottom: 24px;
    }
    
    .list-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        justify-content: center;
        min-width: 120px;
        background: hsl(var(--accent) / 0.1);
        border-left: 1px solid hsl(var(--border));
    }
    
    .error-item {
        background: hsl(var(--destructive) / 0.2);
        color: hsl(var(--destructive));
        border-radius: 0.5rem;
        padding: 1rem;
    }
    
    .empty-state {
        padding: 3rem 1rem;
        text-align: center;
        background: hsl(var(--muted) / 0.5);
        border-radius: 0.5rem;
        color: hsl(var(--muted-foreground));
    }
    
    .empty-list-message {
        padding: 2rem;
        text-align: center;
        background: hsl(var(--muted));
        border-radius: 0.5rem;
        color: hsl(var(--muted-foreground));
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        margin: 1.5rem 0;
    }
    
    .view-btn, .edit-btn {
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        text-decoration: none;
        cursor: pointer;
        white-space: nowrap;
        text-align: center;
        font-weight: 500;
    }
    
    .view-btn {
        background: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .edit-btn {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
    }
    
    .primary-btn, .secondary-btn {
        padding: 0.5rem 1.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .primary-btn {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
    }
    
    .secondary-btn {
        background: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
    }
    
    .form-container {
        margin-top: 2rem;
        padding: 1.5rem;
        background: hsl(var(--card));
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
    }
    
    .form-title {
        font-size: 1.25rem;
        margin-bottom: 1.5rem;
    }
    
    .part-form-container {
        max-width: 800px;
    }
    
    /* Responsive Styles */
    @media (max-width: 768px) {
        .list-item {
            flex-direction: column;
        }
    }
    
    @media (max-width: 768px) {
        .parts-list {
            padding: 0.5rem;
        }
        
        .list-item {
            flex-direction: column;
        }
    }
</style>
