<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Project } from '$lib/server/db/types';
	export let data: PageData;
	const project = data.project as Project;
</script>

<div class="project-detail-container">
	<header class="detail-header">
		<button class="back-button" on:click={() => goto('/dashboard')} aria-label="Back to Dashboard"
			>← Dashboard</button
		>
		<h1 class="project-title">{project.name}</h1>
	</header>
	<section class="project-info">
		<div class="info-card">
			<h2>Project ID</h2>
			<p>{project.id}</p>
		</div>
		<div class="info-card">
			<h2>Created At</h2>
			<p>{project.createdAt.toLocaleString()}</p>
		</div>
	</section>
</div>

<style>
	.project-detail-container {
		max-width: 800px;
		margin: 3rem auto;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.detail-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #6a11cb, #2575fc);
		color: white;
	}

	.back-button {
		background: transparent;
		border: none;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		padding: 0.5rem;
		transition: transform 0.2s;
	}

	.back-button:hover {
		transform: translateX(-2px);
	}

	.project-title {
		margin: 0;
		font-size: 1.75rem;
	}

	.project-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		padding: 2rem;
	}

	.info-card {
		background: #f9f9f9;
		border-radius: 4px;
		padding: 1.5rem;
		text-align: center;
	}

	.info-card h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		color: #333;
	}

	.info-card p {
		margin: 0;
		font-size: 0.9rem;
		color: #555;
	}

	@media (max-width: 600px) {
		.detail-header,
		.project-info {
			padding: 1rem;
		}

		.project-title {
			font-size: 1.5rem;
		}
	}
</style>
