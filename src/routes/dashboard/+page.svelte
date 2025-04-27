<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	export let data: PageData;
	const user = data.user!;
	const projects = data.projects;
	// Ensure fullName is a string for rendering
	const fullName = user.fullName ?? '';
	const initial = fullName.charAt(0) || '';
</script>

<div class="dashboard-container">
	<header class="dashboard-header">
		<div class="user-info">
			{#if user.avatarUrl}
				<img class="avatar" src={user.avatarUrl} alt="Avatar" />
			{:else}
				<div class="avatar-placeholder">{initial}</div>
			{/if}
			<div class="user-details">
				<h1 class="welcome">Welcome, {fullName}</h1>
				<button class="logout-button" on:click={() => goto('/logout')}>Logout</button>
			</div>
		</div>
	</header>

	<section class="projects-section">
		<h2>Your Projects</h2>
		{#if projects.length > 0}
			<ul class="projects-grid">
				{#each projects as project (project.id)}
					<li class="project-card">
						<a class="project-link" href={`/dashboard/${project.id}`}>{project.name}</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="no-projects">You have no projects yet.</p>
		{/if}

		<h2>Add New Project</h2>
		<form class="project-form" method="POST">
			<input
				class="project-input"
				type="text"
				name="name"
				placeholder="Project Name"
				required
			/>
			<button class="primary-btn" type="submit">Add Project</button>
		</form>
	</section>
</div>

<style>
	.dashboard-container {
		max-width: 1000px;
		margin: 2rem auto;
		padding: 0;
	}

	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #6a11cb, #2575fc);
		border-radius: 8px 8px 0 0;
		color: white;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 50px;
		height: 50px;
		background: #ddd;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: #555;
	}

	.user-details {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.welcome {
		margin: 0;
		font-size: 1.5rem;
	}

	.logout-button {
		background: white;
		color: #6a11cb;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.3s;
	}

	.logout-button:hover {
		background: #f0f0f0;
	}

	.projects-section {
		background: white;
		padding: 2rem;
		border-radius: 0 0 8px 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.projects-section h2 {
		margin-top: 0;
		color: #333;
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin: 1rem 0;
	}

	.project-card {
		background: #f9f9f9;
		padding: 1rem;
		border-radius: 4px;
		text-align: center;
		transition: box-shadow 0.3s;
	}

	.project-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.project-link {
		color: #2575fc;
		font-weight: bold;
		text-decoration: none;
	}

	.project-link:hover {
		text-decoration: underline;
	}

	.no-projects {
		color: #777;
		font-style: italic;
	}

	.project-form {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.project-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.primary-btn {
		background: #2575fc;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.3s;
	}

	.primary-btn:hover {
		background: #6a11cb;
	}

	@media (max-width: 600px) {
		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.projects-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
