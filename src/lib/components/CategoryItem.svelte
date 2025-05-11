 <!-- src/lib/components/CategoryItem.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Category } from '$lib/server/db/types';
  export let category: Category;
  export let currentUserId: string;

  let editMode = false;
  let name = category.name;
  let error: string | null = null;
  let success: string | null = null;
  let abortController = new AbortController();

  onDestroy(() => {
    abortController.abort();
  });

  const startEdit = () => {
    name = category.name;
    editMode = true;
    error = success = null;
  };

  const cancelEdit = () => {
    editMode = false;
    error = success = null;
  };

  const saveCategory = async () => {
    error = success = null;
    abortController = new AbortController();
    try {
      const response = await fetch(`/api/catagory/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userId: currentUserId }),
        signal: abortController.signal
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Update failed');
      }
      category = await response.json();
      success = 'Updated successfully';
      setTimeout(() => (success = null), 3000);
      editMode = false;
    } catch (e: unknown) {
      if ((e as any).name !== 'AbortError') {
        error = e instanceof Error ? e.message : 'Unknown error';
      }
    }
  };

  const removeCategory = async () => {
    if (!confirm('Delete this category?')) return;
    try {
      const response = await fetch(`/api/catagory/${category.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
        signal: abortController.signal
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }
      dispatchEvent(new CustomEvent('deleted', { detail: category.id }));
    } catch (e: unknown) {
      if ((e as any).name !== 'AbortError') {
        error = e instanceof Error ? e.message : 'Unknown error';
      }
    }
  };
</script>

<div class="category-card">
  {#if error}
    <div class="alert error">{error}</div>
  {/if}
  {#if success}
    <div class="alert success">{success}</div>
  {/if}

  {#if !editMode}
    <div class="view-mode">
      <span>{category.name}</span>
      <button on:click={startEdit}>Edit</button>
      <button on:click={removeCategory}>Delete</button>
    </div>
  {:else}
    <div class="edit-mode">
      <input type="text" bind:value={name} required />
      <button on:click={saveCategory}>Save</button>
      <button on:click={cancelEdit}>Cancel</button>
    </div>
  {/if}
</div>
