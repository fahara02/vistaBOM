<script lang="ts">
  import type { Part, PartVersion } from '$lib/server/db/types';
  export let part: Part;
  export let currentVersion: PartVersion;
</script>

<div class="part-card">
  <h1>Part {part.globalPartNumber || part.id}</h1>
  <section class="card details">
    <h2>Part Information</h2>
    <p><strong>ID:</strong> {part.id}</p>
    <p><strong>Global Number:</strong> {part.globalPartNumber}</p>
    <p><strong>Status:</strong> {part.status}</p>
    <p><strong>Lifecycle Status:</strong> {part.lifecycleStatus}</p>
  </section>

  <section class="card version">
    <h2>Current Version</h2>
    <p><strong>ID:</strong> {currentVersion.id}</p>
    <p><strong>Version:</strong> {currentVersion.version}</p>
    <p><strong>Name:</strong> {currentVersion.name}</p>
    {#if currentVersion.shortDescription}
      <p><strong>Short Description:</strong> {currentVersion.shortDescription}</p>
    {/if}
    <!-- TODO: add more fields -->
  </section>

  <nav class="actions">
    <a href="/parts/{part.id}/edit" class="btn">Edit</a>
    <form method="POST" action="?delete">
      <button type="submit" class="btn btn-danger">Delete</button>
    </form>
  </nav>
</div>

<style>
  .part-card { max-width: 800px; margin: 1rem auto; }
  .card { padding: 1rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; background: #fff; }
  .details, .version { background: #f9f9f9; }
  .actions { display: flex; gap: 1rem; }
  .btn { background: #007bff; color: #fff; padding: 0.5rem 1rem; border: none; border-radius:4px; text-decoration:none; }
  .btn-danger { background: #dc3545; }
</style>
