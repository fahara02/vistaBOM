<!-- //src/routes/supplier/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import Supplier from '$lib/components/cards/supplier.svelte';
  import { parseContactInfo } from '$lib/utils/util';

  export let data: PageData;
  const { form, errors, enhance } = superForm(data.form, {
    onSubmit: ({ formData }) => {
      // Generate a valid UUID for supplier_id if empty
      const supplierIdValue = formData.get('supplier_id');
      if (!supplierIdValue || supplierIdValue === '') {
        const uuid = crypto.randomUUID();
        formData.set('supplier_id', uuid);
        // Also update the reactive store
        $form.supplier_id = uuid;
      }
    }
  });
  const { suppliers, user } = data;
  
  // Contact info examples to show in the helper textye
  const contactInfoExamples = [
    'JSON format: { "email": "contact@example.com", "phone": "123-456-7890", "address": "123 Main St" }',
    'Key-value format: email: contact@example.com; phone: 123-456-7890',
    'Simple format: 123 Main St, contact@example.com, 123-456-7890'
  ];
  
  // Toggle for contact info examples
  let showContactExamples = false;
</script>

<h1>Suppliers</h1>

<!-- Only show form if user is logged in -->
{#if user}
  <form method="POST" use:enhance class="create-form">
    <h2>Add New Supplier</h2>
    <!-- Hidden field for supplier_id -->
    <input type="hidden" name="supplier_id" bind:value={$form.supplier_id} />
    
    <div class="field">
      <label for="supplier_name">Name</label>
      <input id="supplier_name" name="supplier_name" bind:value={$form.supplier_name} required />
      {#if $errors.supplier_name}
        <span class="error">{$errors.supplier_name}</span>
      {/if}
    </div>
    <div class="field">
      <label for="supplier_description">Description</label>
      <textarea id="supplier_description" name="supplier_description" bind:value={$form.supplier_description}></textarea>
      {#if $errors.supplier_description}
        <span class="error">{$errors.supplier_description}</span>
      {/if}
    </div>
    <div class="field">
      <label for="website_url">Website URL</label>
      <input id="website_url" name="website_url" type="url" bind:value={$form.website_url} />
      {#if $errors.website_url}
        <span class="error">{$errors.website_url}</span>
      {/if}
    </div>
    <div class="field">
      <label for="contact_info">Contact Info</label>
      <textarea 
        id="contact_info" 
        name="contact_info" 
        bind:value={$form.contact_info} 
        placeholder="Enter contact info in any format (JSON, key-value pairs, or simple text)" 
        rows="4"
      ></textarea>
      <div class="helper-text">
        <button type="button" class="text-button" on:click={() => showContactExamples = !showContactExamples}>
          {showContactExamples ? 'Hide examples' : 'Show format examples'}
        </button>
        {#if showContactExamples}
          <div class="examples">
            {#each contactInfoExamples as example}
              <div class="example">{example}</div>
            {/each}
          </div>
        {/if}
      </div>
      {#if $errors.contact_info}
        <span class="error">{$errors.contact_info}</span>
      {/if}
    </div>
    <div class="field">
      <label for="logo_url">Logo URL</label>
      <input id="logo_url" name="logo_url" type="url" bind:value={$form.logo_url} />
      {#if $errors.logo_url}
        <span class="error">{$errors.logo_url}</span>
      {/if}
    </div>
    <div class="actions">
      <button type="submit">Create</button>
    </div>
  </form>
{/if}

{#each suppliers as supplier}
  <Supplier {supplier} currentUserId={user?.user_id} />
{/each}

<style>
  .helper-text {
    margin-top: 5px;
    font-size: 0.9em;
  }
  
  .text-button {
    background: none;
    border: none;
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: 0.9em;
  }
  
  .examples {
    margin-top: 8px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    font-size: 0.85em;
  }
  
  .example {
    margin-bottom: 5px;
    line-height: 1.4;
  }
  
  .example:last-child {
    margin-bottom: 0;
  }
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: #1a1a1a;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: #2d2d2d;
  }

  .create-form {
    background: #ffffff;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 3rem;
    max-width: 800px;
  }

  .field {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 600;
    color: #404040;
    font-size: 0.95rem;
  }

  input,
  textarea {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  input[type="url"] {
    font-family: monospace;
    font-size: 0.9rem;
  }

  .error {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #fef2f2;
    border-radius: 4px;
    border: 1px solid #fecaca;
  }

  

  .actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
  }

  button[type="submit"] {
    background: #4f46e5;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button[type="submit"]:hover {
    background: #4338ca;
  }

  button[type="submit"]:active {
    transform: scale(0.98);
  }

  @media (max-width: 640px) {
    .create-form {
      padding: 1.5rem;
      margin-left: -1rem;
      margin-right: -1rem;
      border-radius: 0;
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.5rem;
    }
  }
</style>
