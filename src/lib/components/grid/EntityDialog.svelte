<!-- src/lib/components/grid/EntityDialog.svelte -->
<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '$lib/components/ui/dialog';
  import ManufacturerCard from '$lib/components/cards/manufacturer.svelte';
  import { X } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let open: boolean;
  export let entity: any;
  export let entityType: 'supplier' | 'manufacturer' | 'category';
  export let currentUserId: string;
  export let onOpenChange: (open: boolean) => void;
  
  // Handle entity deletion events to close dialog and forward the event
  function handleDeleted(event: CustomEvent) {
    onOpenChange(false);
    dispatch('deleted', event.detail);
  }
  
  // Handle edit events and forward them
  function handleEdit(event: CustomEvent) {
    dispatch('edit', event.detail);
  }
</script>

<Dialog {open} onOpenChange={onOpenChange}>
  <DialogContent class="entity-dialog-content">
    <DialogHeader>
      <DialogTitle>
        {#if entityType === 'manufacturer'}
          Manufacturer: {entity.manufacturer_name || 'Details'}
        {/if}
      </DialogTitle>
      <DialogClose class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogHeader>
    
    <div class="entity-card-container">
      {#if entityType === 'manufacturer'}
        <div class="card-wrapper">
          <ManufacturerCard 
            manufacturer={entity} 
            {currentUserId} 
            allowEdit={true} 
            allowDelete={true}
            on:deleted={handleDeleted}
            on:edit={handleEdit}
          />
        </div>
      {/if}
    </div>
  </DialogContent>
</Dialog>

<style>
  :global(.entity-dialog-content) {
    max-width: 90vw !important;
    width: 700px !important;
    max-height: 90vh !important;
    overflow-y: auto !important;
  }
  
  .entity-card-container {
    padding: 0.5rem;
    width: 100%;
    display: flex;
    justify-content: center;
  }
  
  .card-wrapper {
    width: 100%;
    max-width: 700px;
  }
  
  :global(.card-wrapper > :global(.manufacturer-card)) {
    display: block !important;
    width: 100% !important;
  }
</style>
