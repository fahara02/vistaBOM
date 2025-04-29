<!-- src/lib/components/ItemViewer.svelte -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import Manufacturer from './manufacturer.svelte';
  import Supplier from './supplier.svelte';

  export let items: Array<Record<string, any>> = [];
  export let currentUserId: string;
  let selectedItem: Record<string, any> | null = null;
  let modalOpen = false;

  const getComponentType = (item: Record<string, any>) => {
      if (item.manufacturer) return 'manufacturer';
      if (item.supplier) return 'supplier';
      return 'part';
  };

  const openDetails = (item: Record<string, any>) => {
      selectedItem = item;
      modalOpen = true;
  };

  const closeModal = () => {
      modalOpen = false;
      setTimeout(() => (selectedItem = null), 300);
  };
</script>

<div class="item-viewer">
  <table>
      <thead>
          <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
          </tr>
      </thead>
      <tbody>
          {#each items as item (item.id)}
              <tr>
                  <td>{getComponentType(item).toUpperCase()}</td>
                  <td>
                      {#if item.manufacturer}
                          {item.manufacturer.name}
                      {:else if item.supplier}
                          {item.supplier.name}
                      {/if}
                  </td>
                  <td>
                      {#if item.manufacturer}
                          {item.manufacturer.description?.substring(0, 50)}...
                      {:else if item.supplier}
                          {item.supplier.description?.substring(0, 50)}...
                      {/if}
                  </td>
                  <td>
                      <button on:click|stopPropagation={() => openDetails(item)}>View</button>
                  </td>
              </tr>
          {/each}
      </tbody>
  </table>

  {#if modalOpen}
      <div transition:fade class="modal-backdrop" on:click|self={closeModal}>
          <div class="modal-content">
              {#if selectedItem}
                  {#if selectedItem.manufacturer}
                      <Manufacturer manufacturer={selectedItem.manufacturer} currentUserId={currentUserId} />
                  {:else if selectedItem.supplier}
                      <Supplier supplier={selectedItem.supplier} currentUserId={currentUserId} />
                  {/if}
              {/if}
              <button class="close-btn" on:click={closeModal}>✕</button>
          </div>
      </div>
  {/if}
</div>

<style>
  .item-viewer {
      position: relative;
      width: 100%;
  }

  table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
  }

  th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
  }

  tr:hover {
      background-color: #f5f5f5;
  }

  button {
      padding: 6px 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
  }

  .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
  }

  .modal-content {
      position: relative;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem;
      background: transparent;
      color: #666;
      font-size: 1.5rem;
      line-height: 1;
  }

  .close-btn:hover {
      color: #333;
  }
</style>