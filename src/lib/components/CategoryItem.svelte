 <!-- src/lib/components/CategoryItem.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Category } from '$lib/server/db/types';
  export let category: Category;
  /** current user ID executing actions */
  export let currentUserId: string | undefined;

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
    if (!currentUserId) {
      error = 'You must be logged in to edit';
      return;
    }
    error = success = null;
    abortController = new AbortController();
    try {
      const response = await fetch(`/catagory/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ name, userId: currentUserId }),
        signal: abortController.signal
      });
      console.log('PUT response status:', response.status);
      if (!response.ok) {
        // Try to parse error JSON, fallback to text
        let errMsg;
        try { errMsg = (await response.json()).message; } catch { errMsg = await response.text(); }
        throw new Error(errMsg || 'Update failed');
      }
      // Parse updated category JSON
      let updated;
      try { updated = await response.json(); }
      catch { const txt = await response.text(); console.error('Invalid JSON response', txt); throw new Error('Invalid server response'); }
      category = updated;
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
    if (!currentUserId) return;
    if (!confirm('Delete this category?')) return;
    try {
      const response = await fetch(`/catagory/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: currentUserId }),
        signal: abortController.signal
      });
      console.log('DELETE response status:', response.status);
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
      <div class="view-actions">
        <button type="button" class="icon edit" on:click={startEdit} aria-label="Edit category">✏️</button>
        <button type="button" class="icon delete" on:click={removeCategory} aria-label="Delete category">🗑️</button>
      </div>
    </div>
  {:else}
    <div class="edit-mode">
      <input type="text" bind:value={name} required />
      <button on:click={saveCategory}>Save</button>
      <button on:click={cancelEdit}>Cancel</button>
    </div>
  {/if}
</div>

<!-- CategoryItem styles -->
<style>
  .category-card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .category-card .view-mode {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .category-card .view-mode span {
    flex: 1;
    font-size: 1rem;
  }
  .category-card .view-actions {
    display: flex;
    gap: 0.5rem;
  }
  .category-card .icon {
    background: transparent;
    border: none;
    padding: 0.25rem;
    font-size: 1rem;
    cursor: pointer;
    color: #555;
    line-height: 1;
  }
  .category-card .icon:hover {
    color: #000;
  }
  .category-card button {
    margin-left: 0.5rem;
    padding: 0.5rem 1rem;
    background: #007bff;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .category-card button:hover {
    background: #0056b3;
  }
  .category-card .edit-mode input {
    flex: 1;
    padding: 0.5rem;
    margin-right: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .category-card .edit-mode button {
    padding: 0.5rem 1rem;
    margin-left: 0.5rem;
  }
  .alert {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  .alert.error {
    background: #f8d7da;
    color: #721c24;
  }
  .alert.success {
    background: #d4edda;
    color: #155724;
  }
</style>
