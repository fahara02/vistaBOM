<script lang="ts">
  import { goto } from '$app/navigation';
  export let data;
  const { project } = data;
</script>

<div class="project-detail-container">
  <button class="back-button" on:click={() => goto('/dashboard')}>← Back to Dashboard</button>
  <h1>{project.projectName}</h1>
  <p><strong>ID:</strong> {project.id}</p>
  <p><strong>Created At:</strong> {project.createdAt.toLocaleString()}</p>
</div>

<style>
  .project-detail-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1.5rem;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .back-button {
    margin-bottom: 1rem;
    background: none;
    border: none;
    color: #3498db;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .back-button:hover {
    text-decoration: underline;
  }
  h1 {
    margin-top: 0;
    color: #333;
  }
  p {
    margin: 0.5rem 0;
    color: #555;
  }
</style>
