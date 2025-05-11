<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import CategoryItem from '$lib/components/CategoryItem.svelte';

  export let data: PageData;
  const { form, errors } = superForm(data.form);
  const { categories, user } = data;
  let showForm = false;
</script>

<h1>Categories</h1>
<button type="button" on:click={() => showForm = !showForm} class="toggle-btn">
  {showForm ? 'Cancel' : 'Add Category'}
</button>

{#if showForm}
  <form method="POST" class="create-form" id="create-category">
    <h2>Add New Category</h2>
    <div class="field">
      <label for="name">Name</label>
      <input id="name" name="name" bind:value={$form.name} required />
      {#if $errors.name}
        <span class="error">{$errors.name}</span>
      {/if}
    </div>
    <div class="field">
      <label for="parent_id">Parent</label>
      <select id="parent_id" name="parent_id" bind:value={$form.parent_id}>
        <option value="">None</option>
        {#each categories as c}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
      {#if $errors.parent_id}
        <span class="error">{$errors.parent_id}</span>
      {/if}
    </div>
    <div class="field">
      <label for="description">Description</label>
      <textarea id="description" name="description" bind:value={$form.description}></textarea>
      {#if $errors.description}
        <span class="error">{$errors.description}</span>
      {/if}
    </div>
    <div class="field">
      <label>
        <input type="checkbox" name="is_public" bind:checked={$form.is_public} /> Public
      </label>
      {#if $errors.is_public}
        <span class="error">{$errors.is_public}</span>
      {/if}
    </div>
    <div class="actions">
      <button type="submit">Create</button>
    </div>
  </form>
{/if}

{#each categories as category}
  <CategoryItem {category} currentUserId={user?.id} />
{/each}