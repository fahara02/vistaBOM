<script lang="ts">
	import { goto } from '$app/navigation';
	export let data: any;
	const { user } = data;
</script>

<div class="landing-container">
	<div class="hero">
		{#if user}
			<h1>Welcome back, <span class="highlight">{user.fullName}</span></h1>
			<button class="cta-button" on:click={() => goto('/dashboard')}>Go to Dashboard</button>
		{:else}
			<h1 class="title">Vista BOM</h1>
			<p class="subtitle">Manage your electronic projects visually, with ease.</p>
			<button class="google-btn" on:click={() => goto('/auth/google')}>
				<svg
					class="google-icon"
					width="18"
					height="18"
					viewBox="0 0 18 18"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fill="#EA4335"
						d="M9 7.5v3h5.16c-.22 1.23-1.2 3.6-5.16 3.6-3.11 0-5.64-2.56-5.64-5.71S5.89 2.5 9 2.5c1.67 0 2.78.72 3.41 1.33l2.33-2.33C13.61.72 11.92 0 9 0 4.03 0 .36 3.59.36 8S4.03 16 9 16c4.12 0 6.85-2.89 6.85-6.96 0-.47-.05-.82-.11-1.18H9z"
					/>
				</svg>
				<span>Sign in with Google</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.landing-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #6a11cb, #2575fc);
		padding: 2rem;
	}

	.hero {
		background: white;
		padding: 3rem;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
		text-align: center;
		max-width: 400px;
		width: 100%;
	}

	.title {
		font-size: 2.5rem;
		margin: 0;
		color: #333;
	}

	.subtitle {
		font-size: 1.1rem;
		color: #555;
		margin: 1rem 0 2rem;
	}

	.highlight {
		color: #2575fc;
	}

	.cta-button {
		background: #2575fc;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.3s ease;
	}

	.cta-button:hover {
		background: #6a11cb;
	}

	.google-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: white;
		color: #555;
		border: 1px solid #ddd;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition:
			background 0.3s,
			box-shadow 0.3s;
	}

	.google-btn:hover {
		background: #f7f7f7;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.google-icon {
		display: block;
	}

	@media (max-width: 600px) {
		.hero {
			padding: 2rem;
		}
		.title {
			font-size: 2rem;
		}
	}
</style>
