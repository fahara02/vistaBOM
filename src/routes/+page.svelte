<script>
    import { goto } from '$app/navigation';
    export let data;
    const { user } = data;
  </script>
  
  <div class="landing-container">
    {#if user}
      <h1>Welcome back, {user.fullName}</h1>
      <button class="cta-button" on:click={() => goto('/dashboard')}>Go to Dashboard</button>
    {:else}
      <h1>Visual Electronic BOM</h1>
      <p>Manage your electronic projects visually, with ease.</p>
      <button class="cta-button" on:click={() => goto('/auth/google')}>Sign in with Google</button>
    {/if}
  </div>

  <style>
    .landing-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 4rem);
      text-align: center;
      padding: 2rem;
      background: #f0f4f8;
    }
    .landing-container h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #333;
    }
    .landing-container p {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      color: #555;
    }
    .cta-button {
      background: #4285f4;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s;
    }
    .cta-button:hover {
      background: #357ae8;
    }
  </style>