 <!-- src/lib/components/CategoryItem.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Category } from '@/types/types';
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
      <div class="category-name">
        <div class="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <span>{category.name}</span>
      </div>
      <div class="view-actions">
        <button type="button" class="icon edit" on:click={startEdit} aria-label="Edit category">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button type="button" class="icon delete" on:click={removeCategory} aria-label="Delete category">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
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
    background-color: hsl(var(--surface-100));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
    box-shadow: 0 1px 3px hsl(var(--muted) / 0.1);
  }
  
  .category-card:hover {
    border-color: hsl(var(--category-color) / 0.3);
    box-shadow: 0 2px 5px hsl(var(--muted) / 0.15);
  }
  
  /* Dark mode adjustments */
  :global(.dark) .category-card {
    box-shadow: 0 2px 6px hsl(217 33% 5% / 0.2);
  }
  
  :global(.dark) .category-card:hover {
    border-color: hsl(var(--category-color) / 0.4);
    box-shadow: 0 3px 8px hsl(217 33% 5% / 0.3);
  }
  .category-card .view-mode {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .category-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }
  
  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--category-color));
    transition: color 0.3s;
  }
  
  .category-card .view-mode span {
    font-size: 0.9375rem;
    color: hsl(var(--foreground));
    transition: color 0.3s;
    font-weight: 500;
  }
  .category-card .view-actions {
    display: flex;
    gap: 0.5rem;
  }
  .category-card .icon {
    background-color: transparent;
    border: none;
    padding: 0.375rem;
    font-size: 1rem;
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    line-height: 1;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }
  .category-card .icon:hover {
    background-color: hsl(var(--secondary));
    color: hsl(var(--foreground));
  }
  .category-card .icon.edit:hover {
    color: hsl(var(--category-color));
  }
  .category-card .icon.delete:hover {
    color: hsl(var(--destructive));
  }
  
  /* Dark mode adjustments for icons */
  :global(.dark) .category-card .icon:hover {
    background-color: hsl(var(--secondary) / 0.5);
  }
  .category-card button {
    margin-left: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: hsl(var(--category-color));
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .category-card button:hover {
    background-color: hsl(var(--category-color) / 0.85);
    box-shadow: 0 2px 4px hsl(var(--category-color) / 0.3);
  }
  
  :global(.dark) .category-card button {
    box-shadow: 0 2px 4px hsl(var(--category-color) / 0.3);
  }
  
  :global(.dark) .category-card button:hover {
    box-shadow: 0 3px 6px hsl(var(--category-color) / 0.4);
  }
  .category-card .edit-mode input {
    flex: 1;
    padding: 0.625rem 0.75rem;
    margin-right: 0.5rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    font-size: 0.9375rem;
    background-color: hsl(var(--surface-50));
    color: hsl(var(--foreground));
    transition: all 0.2s ease;
  }
  
  .category-card .edit-mode input:focus {
    outline: none;
    border-color: hsl(var(--category-color));
    box-shadow: 0 0 0 2px hsl(var(--category-color) / 0.2);
  }
  
  :global(.dark) .category-card .edit-mode input {
    background-color: hsl(var(--surface-200));
    border-color: hsl(var(--card-border));
  }
  .category-card .edit-mode button {
    padding: 0.5rem 1rem;
    margin-left: 0.5rem;
  }
  .alert {
    padding: 0.625rem 0.875rem;
    border-radius: 0.375rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    width: 100%;
    transition: background-color 0.3s, border-color 0.3s, color 0.3s;
  }
  .alert.error {
    background-color: hsl(var(--destructive) / 0.1);
    border: 1px solid hsl(var(--destructive) / 0.25);
    color: hsl(var(--destructive) / 0.9);
  }

  .alert.success {
    background-color: hsl(var(--category-color) / 0.1);
    border: 1px solid hsl(var(--category-color) / 0.25);
    color: hsl(var(--category-color) / 0.9);
  }
  
  :global(.dark) .alert.error {
    background-color: hsl(var(--destructive) / 0.15);
    border-color: hsl(var(--destructive) / 0.3);
    color: hsl(var(--destructive) / 0.8);
  }
  
  :global(.dark) .alert.success {
    background-color: hsl(var(--category-color) / 0.15);
    border-color: hsl(var(--category-color) / 0.3);
    color: hsl(var(--category-color) / 0.8);
  }
</style>
