<script>
    import { goto } from '$app/navigation';
    export let data;
    const { user, projects } = data;
  </script>
  
  <div class="dashboard-container">
    <button class="logout-button" on:click={() => goto('/logout')}>Logout</button>
    {#if user.avatarUrl}
      <img src={user.avatarUrl} alt="User Avatar" width="50" height="50" />
    {:else}
      <div>No avatar</div>
    {/if}
    <h1>Welcome, {user.fullName}</h1>
    
    <h2>Your Projects</h2>
    <ul class="projects-list">
      {#each projects as project}
        <li><a class="project-link" href={`/dashboard/${project.id}`}>{project.projectName}</a></li>
      {/each}
    </ul>
    
    <h2>Add New Project</h2>
    <form method="POST">
      <input type="text" name="projectName" placeholder="Project Name" required />
      <button type="submit">Add Project</button>
    </form>
  </div>
  
  <style>
    .dashboard-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
    }
    .logout-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #e74c3c;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .projects-list {
      list-style: none;
      padding: 0;
      margin-bottom: 1rem;
    }
    .projects-list li {
      background: #fff;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    form {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    input[type="text"] {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button[type="submit"] {
      background: #3498db;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .project-link {
      color: #3498db;
      text-decoration: none;
    }
    .project-link:hover {
      text-decoration: underline;
    }
  </style>