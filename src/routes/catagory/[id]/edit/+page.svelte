<!-- //src/routes/catagory/[id]/edit/+page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import type { PageData } from './$types';
  import { formatJSON, isJSONValid } from '$lib/utils/formatters';
  import CategoryComboBox from '$lib/components/CategoryComboBox.svelte';
  import type { Category } from '@/types/types';

  export let data: PageData;
  const { form, errors, enhance, submitting } = superForm(data.form, {
    dataType: 'json',
    resetForm: false,
    taintedMessage: false,
  });

  // For formatting JSON display
  let customFieldsJsonValid = true;
  let customFieldsFormatError = '';

  // Function to format the custom fields JSON
  const formatCustomFields = () => {
    try {
      const parsed = JSON.parse($form.customFieldsJson || '{}');
      $form.customFieldsJson = formatJSON(parsed);
      customFieldsJsonValid = true;
      customFieldsFormatError = '';
    } catch (e) {
      customFieldsJsonValid = false;
      if (e instanceof Error) {
        customFieldsFormatError = e.message;
      } else {
        customFieldsFormatError = 'Invalid JSON format';
      }
    }
  };

  // Validate JSON as user types
  $: if ($form.customFieldsJson) {
    customFieldsJsonValid = isJSONValid($form.customFieldsJson);
  }

  function formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
</script>

<div class="edit-container">
  <header>
    <h1>Edit Category</h1>
    <a href="/catagory" class="back-link">← Back to Categories</a>
  </header>

  <div class="card">
    <form method="POST" use:enhance>
      <div class="form-grid">
        <div class="form-group">
          <label for="name">Category Name*</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            bind:value={$form.name} 
            required 
            class:error={$errors.name}
          />
          {#if $errors.name}
            <span class="error-text">{$errors.name}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="parent_id">Parent Category</label>
          <div class="combobox-container">
            <CategoryComboBox
              categories={data.categories as unknown as Category[]}
              bind:value={$form.parent_id}
              name="parent_id"
              placeholder="Search or select parent category..."
              width="w-full"
            />
            <small class="help-text">Search by typing to find categories in large lists</small>
          </div>
          {#if $errors.parent_id}
            <span class="error-text">{$errors.parent_id}</span>
          {/if}
        </div>
      </div>

      <div class="form-group full-width">
        <label for="description">Description</label>
        <textarea 
          id="description" 
          name="description" 
          bind:value={$form.description} 
          rows="4"
          class:error={$errors.description}
        ></textarea>
        {#if $errors.description}
          <span class="error-text">{$errors.description}</span>
        {/if}
      </div>

      <div class="form-group checkbox">
        <label for="is_public">
          <input 
            type="checkbox" 
            id="is_public" 
            name="is_public" 
            bind:checked={$form.is_public} 
          />
          <span>Make category public</span>
        </label>
        {#if $errors.is_public}
          <span class="error-text">{$errors.is_public}</span>
        {/if}
      </div>

      <div class="custom-fields-section">
        <h2>Custom Fields</h2>
        <p class="help-text">
          Add any additional information about this category as custom fields. Format: JSON object with key-value pairs.
        </p>
        
        {#if data.customFields && data.customFields.length > 0}
          <div class="existing-fields">
            <h3>Existing Custom Fields:</h3>
            <ul>
              {#each data.customFields as field}
                <li><strong>{formatFieldName(field.name)}</strong> ({field.type})</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="form-group full-width">
          <label for="customFieldsJson">
            Custom Fields (JSON)
            <button 
              type="button" 
              class="format-btn" 
              on:click={formatCustomFields}
            >
              Format JSON
            </button>
          </label>
          <textarea 
            id="customFieldsJson" 
            name="customFieldsJson" 
            bind:value={$form.customFieldsJson} 
            rows="8"
            class:error={!customFieldsJsonValid || $errors.customFieldsJson}
            placeholder="Enter JSON object here (example in code below)"
          ></textarea>
          {#if !customFieldsJsonValid}
            <span class="error-text">Invalid JSON format: {customFieldsFormatError}</span>
          {/if}
          {#if $errors.customFieldsJson}
            <span class="error-text">{$errors.customFieldsJson}</span>
          {/if}
          <div class="json-examples">
            <p>Examples:</p>
            <div class="example-code">
              certification: "ISO 9001",<br>
              yearEstablished: 1995,<br>
              isVerified: true
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <a href="/catagory" class="cancel-btn">Cancel</a>
        <button type="submit" class="save-btn" disabled={$submitting || !customFieldsJsonValid}>
          {$submitting ? 'Saving...' : 'Save Category'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .edit-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    color: #1a202c;
    margin: 0;
  }

  .back-link {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .card {
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #4b5563;
  }

  /* Input styles - reduced to only what's used */
  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.15s ease-in-out;
  }

  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
  }

  input.error,
  textarea.error {
    border-color: #ef4444;
  }

  .error-text {
    display: block;
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.375rem;
  }

  .checkbox {
    display: flex;
    align-items: center;
  }

  .checkbox label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox input {
    margin-right: 0.5rem;
  }

  .custom-fields-section {
    margin: 2rem 0;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .custom-fields-section h2 {
    font-size: 1.25rem;
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }

  .help-text {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  
  .combobox-container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  .combobox-container .help-text {
    margin-top: 0.25rem;
    margin-bottom: 0;
    font-style: italic;
  }

  .existing-fields {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #eef2ff;
    border-radius: 6px;
  }

  .existing-fields h3 {
    font-size: 1rem;
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: #4338ca;
  }

  .existing-fields ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .format-btn {
    float: right;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .format-btn:hover {
    background: #4338ca;
  }

  .json-examples {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .example-code {
    display: block;
    background: #f3f4f6;
    padding: 0.5rem;
    border-radius: 4px;
    white-space: pre-wrap;
    font-family: monospace;
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }

  .cancel-btn {
    padding: 0.75rem 1.5rem;
    background: #f3f4f6;
    color: #4b5563;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.15s ease-in-out;
  }

  .cancel-btn:hover {
    background: #e5e7eb;
  }

  .save-btn {
    padding: 0.75rem 1.5rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
  }

  .save-btn:hover {
    background: #4338ca;
  }

  .save-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .card {
      padding: 1.5rem;
    }

    header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>
