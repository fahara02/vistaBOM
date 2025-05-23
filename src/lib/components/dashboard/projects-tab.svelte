<!-- src/routes/dashboard/components/projects-tab.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { projects, refreshData, showProjectForm } from './store';
    import type { Project } from '$lib/types/schemaTypes';
    import { enhance } from '$app/forms';
    import { ProjectForm } from '$lib/components/forms';
    
    // Props - following the Props → Derived → Methods pattern
    export let projectsList: Project[] = [];
    export let currentUserId: string;
    
    // Derived values
    $: {
        projects.set(projectsList);
    }
    
    // Methods
    function handleDeleteProject(projectId: string): void {
        // Use form submission to handle deletion
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `?/deleteProject&id=${projectId}`;
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
</script>

<div class="tab-content">
    <h2>Your Projects</h2>
    
    {#if $projects.length > 0}
        <ul class="projects-grid">
            {#each $projects as project (project.project_id)}
                <li class="project-card">
                    <h3>{project.project_name}</h3>
                    {#if project.project_description}
                        <p class="project-description">{project.project_description}</p>
                    {/if}
                    <div class="project-meta">
                        <span class="project-status {project.project_status}">{project.project_status}</span>
                        <span class="project-date">Created: {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="project-actions">
                        <a href="/projects/{project.project_id}" class="action-link">View Project</a>
                        <button 
                            class="delete-btn" 
                            on:click|preventDefault={() => handleDeleteProject(project.project_id)}
                        >
                            Delete
                        </button>
                    </div>
                </li>
            {/each}
        </ul>
    {:else}
        <div class="empty-state">
            <p>You haven't created any projects yet. Create your first project to get started.</p>
        </div>
    {/if}
    
    <div class="action-buttons">
        <button type="button" class="primary-btn" on:click={() => showProjectForm.update((show: boolean) => !show)}>
            {$showProjectForm ? 'Cancel' : 'Add New Project'}
        </button>
        <a href="/projects" class="secondary-btn">View All Projects</a>
    </div>
    
    {#if $showProjectForm}
        <ProjectForm 
            currentUserId={currentUserId}
            onComplete={() => refreshData()}
            storeRefs={{
                showProjectForm
            }}
        />
    {/if}
</div>

<style>
    .tab-content {
        padding: 2rem;
    }
    
    h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        color: hsl(var(--foreground));
    }
    
    .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    .project-card {
        background-color: hsl(var(--card));
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        padding: 1.25rem;
        border: 1px solid hsl(var(--border));
        transition: box-shadow 0.3s, transform 0.2s, border-color 0.3s;
    }
    
    .project-card:hover {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
        border-color: hsl(var(--primary) / 0.3);
    }
    
    .project-card h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1.25rem;
        color: hsl(var(--foreground));
    }
    
    .project-description {
        margin: 0 0 1rem 0;
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
        line-height: 1.5;
    }
    
    .project-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        font-size: 0.85rem;
    }
    
    .project-status {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        background-color: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        text-transform: capitalize;
    }
    
    .project-status.active {
        background-color: hsl(var(--success) / 0.2);
        color: hsl(var(--success));
    }
    
    .project-status.draft {
        background-color: hsl(var(--muted) / 0.5);
        color: hsl(var(--muted-foreground));
    }
    
    .project-status.archived {
        background-color: hsl(var(--warning) / 0.2);
        color: hsl(var(--warning));
    }
    
    .project-date {
        color: hsl(var(--muted-foreground));
    }
    
    .project-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 0.75rem;
        gap: 0.5rem;
    }
    
    .action-link {
        color: hsl(var(--primary));
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 0.4rem 0.75rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    
    .action-link:hover {
        background-color: hsl(var(--primary) / 0.1);
    }
    
    .delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: hsl(var(--destructive));
        font-size: 0.9rem;
        padding: 0.4rem 0.75rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    
    .delete-btn:hover {
        background-color: hsl(var(--destructive) / 0.1);
    }
    
    .empty-state {
        background-color: hsl(var(--muted) / 0.3);
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .empty-state p {
        color: hsl(var(--muted-foreground));
        margin: 0;
    }
    
    .add-project-form {
        display: flex;
        gap: 0.75rem;
        margin-top: 2rem;
    }
    
    .project-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid hsl(var(--input-border));
        border-radius: 6px;
        background-color: hsl(var(--input));
        color: hsl(var(--input-foreground));
    }
    
    .project-input:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }
    
    .primary-btn {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .primary-btn:hover {
        background: hsl(var(--primary-dark));
    }
    
    @media (max-width: 600px) {
        .projects-grid {
            grid-template-columns: 1fr;
        }
        
        .add-project-form {
            flex-direction: column;
        }
    }
</style>
