<!-- src/lib/components/forms/ProjectForm.svelte -->
<script lang="ts">
    import { superForm } from 'sveltekit-superforms/client';
    import { projectSchema } from '$lib/schema/schema';
    import { z } from 'zod';
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    
    // Define the type based on the schema for type safety
    type ProjectFormType = z.infer<typeof projectSchema>;
    
    // Props - follow Props → Derived → Methods pattern
    export let form: any = undefined; // Allow passing in a form directly
    export let currentUserId: string = ''; // User ID is used in form submission
    export let editMode: boolean = false;
    export let projectId: string | null = null;
    export let onComplete: () => void = () => {};
    export let submitting: boolean = false; // For use outside superForm
    export let hideButtons: boolean = false; // Option to hide buttons
    
    // For dashboard integration, you can pass store references
    export let storeRefs: {
        showProjectForm?: any
    } = {};
    
    // Initialize superForm or use passed form
    const { form: formStore, errors, enhance: superEnhance, submitting: superSubmitting, message } = superForm(
        // We'll initialize with form or null and update in onMount
        form !== undefined ? form : null as unknown as ProjectFormType,
        {
            dataType: 'json',
            resetForm: true,
            // Add UUID generation and JSON handling before form submission
            onSubmit: ({ formData }) => {
                // Generate a valid UUID for project_id if empty or missing
                const projectIdValue = formData.get('project_id');
                if (!projectIdValue || projectIdValue === '') {
                    const uuid = crypto.randomUUID();
                    formData.set('project_id', uuid);
                    
                    // Also update the reactive store
                    $formStore.project_id = uuid;
                }
            },
            onResult: ({ result }) => {
                if (result.type === 'success') {
                    // Close the form and refresh data
                    if (storeRefs.showProjectForm) {
                        storeRefs.showProjectForm.set(false);
                    }
                    onComplete();
                }
                // Let superForm handle the rest
                return result;
            }
        }
    );
    
    // Use the correct enhance function
    let enhance = superEnhance;
    
    // Initialize the form when component mounts
    onMount(() => {
        if (form === undefined) { // Only do this if form wasn't passed in directly
            // Import is inside onMount to prevent SSR issues
            import('$app/stores').then(({ page }) => {
                // Initialize the form with data from the page store
                const pageStore = page;
                // Use type assertion to access data property safely
                const pageData = (pageStore as unknown as { data: any }).data;
                
                if (editMode && projectId) {
                    // Find the project to edit from API or page data
                    // This would be implemented based on how you store/access projects
                    // For now, assume pageData contains the project
                    const projectToEdit = pageData?.project;
                    
                    if (projectToEdit) {
                        // Initialize form with the project data
                        $formStore = {
                            project_id: projectToEdit.project_id,
                            project_name: projectToEdit.project_name,
                            project_description: projectToEdit.project_description || '',
                            owner_id: projectToEdit.owner_id,
                            project_status: projectToEdit.project_status,
                            created_at: projectToEdit.created_at,
                            updated_by: currentUserId,
                            updated_at: new Date(),
                            custom_fields: projectToEdit.custom_fields || null
                        } as ProjectFormType;
                    }
                } else if (pageData?.projectForm) {
                    // Initialize with the default form data
                    $formStore = pageData.projectForm.data as ProjectFormType;
                } else {
                    // Initialize with empty values if no form data is available
                    $formStore = {
                        project_id: '',
                        project_name: '',
                        project_description: '',
                        owner_id: currentUserId,
                        project_status: 'draft', // Default status
                        created_at: new Date(),
                        updated_by: currentUserId,
                        updated_at: new Date(),
                        custom_fields: null
                    } as ProjectFormType;
                }
            });
        }
    });
    
    // Methods
    function cancelForm(): void {
        if (storeRefs.showProjectForm) {
            storeRefs.showProjectForm.set(false);
        }
    }
</script>

<div class="form-container">
    <form
        method="POST"
        action="?/project"
        use:enhance
        class="project-form"
    >
        <!-- Hidden fields -->
        <input type="hidden" name="project_id" bind:value={$formStore.project_id}>
        <input type="hidden" name="owner_id" bind:value={$formStore.owner_id}>
        <input type="hidden" name="created_at" bind:value={$formStore.created_at}>
        <input type="hidden" name="updated_at" value={new Date().toISOString()}>
        <input type="hidden" name="updated_by" bind:value={$formStore.updated_by}>
        
        <!-- Project Name Field -->
        <div class="form-field">
            <label for="project_name">Project Name *</label>
            <input
                id="project_name"
                name="project_name"
                class="enhanced-input"
                type="text"
                required
                bind:value={$formStore.project_name}
                placeholder="Enter project name"
            >
            {#if $errors.project_name}
                <div class="field-error">{$errors.project_name}</div>
            {/if}
        </div>
        
        <!-- Project Description Field -->
        <div class="form-field">
            <label for="project_description">Project Description</label>
            <textarea
                id="project_description"
                name="project_description"
                class="enhanced-input form-textarea"
                bind:value={$formStore.project_description}
                placeholder="Enter project description"
            ></textarea>
            {#if $errors.project_description}
                <div class="field-error">{$errors.project_description}</div>
            {/if}
        </div>
        
        <!-- Project Status Field -->
        <div class="form-field">
            <label for="project_status">Status</label>
            <select
                id="project_status"
                name="project_status"
                class="enhanced-input"
                bind:value={$formStore.project_status}
            >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="released">Released</option>
            </select>
            {#if $errors.project_status}
                <div class="field-error">{$errors.project_status}</div>
            {/if}
        </div>
        
        {#if !hideButtons}
            <div class="form-actions">
                <button type="button" class="cancel-btn enhanced-btn" on:click={cancelForm}>
                    Cancel
                </button>
                <button
                    type="submit"
                    class="submit-btn enhanced-btn"
                    disabled={$superSubmitting || submitting}
                >
                    {$superSubmitting || submitting ? 'Saving...' : editMode ? 'Update Project' : 'Create Project'}
                </button>
            </div>
        {/if}
    </form>
    
    {#if $message}
        <div class="form-message" class:success={$message.type === 'success'} class:error={$message.type === 'error'}>
            {$message.text}
        </div>
    {/if}
</div>

<style>
    .form-container {
        background-color: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    
    .project-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }
    
    .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    label {
        font-weight: 500;
        color: hsl(var(--foreground));
        font-size: 0.9rem;
    }
    
    .enhanced-input {
        padding: 0.75rem;
        border: 1px solid hsl(var(--input-border));
        border-radius: 6px;
        background-color: hsl(var(--input));
        color: hsl(var(--input-foreground));
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    
    .enhanced-input:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }
    
    .form-textarea {
        min-height: 100px;
        resize: vertical;
    }
    
    .field-error {
        color: hsl(var(--destructive));
        font-size: 0.85rem;
        margin-top: 0.25rem;
    }
    
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .enhanced-btn {
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }
    
    .cancel-btn {
        background: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
        border: none;
    }
    
    .cancel-btn:hover {
        background: hsl(var(--secondary-dark, var(--secondary)) / 0.9);
    }
    
    .submit-btn {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
    }
    
    .submit-btn:hover {
        background: hsl(var(--primary-dark, var(--primary)) / 0.9);
    }
    
    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .form-message {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
    }
    
    .form-message.success {
        background-color: hsl(var(--success) / 0.2);
        color: hsl(var(--success));
        border: 1px solid hsl(var(--success) / 0.3);
    }
    
    .form-message.error {
        background-color: hsl(var(--destructive) / 0.2);
        color: hsl(var(--destructive));
        border: 1px solid hsl(var(--destructive) / 0.3);
    }
    
    @media (max-width: 768px) {
        .form-actions {
            flex-direction: column;
        }
    }
</style>
