<script lang="ts">
	import { page } from '$app/state';
	import logo from '$lib/images/svelte-logo.svg';
	import github from '$lib/images/github.svg';
</script>

<header class="site-header">
	<div class="corner">
		<a href="https://svelte.dev/docs/kit">
			<img src={logo} alt="SvelteKit" />
		</a>
	</div>

	<nav>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
		</svg>
		<ul class="nav-list">
			<li class="nav-item" aria-current={page.url.pathname === '/' ? 'page' : undefined}>
				<a href="/">Home</a>
			</li>
			<li class="nav-item" aria-current={page.url.pathname === '/about' ? 'page' : undefined}>
				<a href="/about">About</a>
			</li>
			<li
				class="nav-item"
				aria-current={page.url.pathname.startsWith('/sverdle') ? 'page' : undefined}
			>
				<a href="/sverdle">Sverdle</a>
			</li>
			<li class="nav-item" aria-current={page.url.pathname === '/parts/new' ? 'page' : undefined}>
				<a href="/parts/new">Add Part</a>
			</li>
			<li class="nav-item" aria-current={page.url.pathname === '/parts' ? 'page' : undefined}>
				<a href="/parts">Parts</a>
			</li>
			<li class="nav-item" aria-current={page.url.pathname.startsWith('/manufacturer') ? 'page' : undefined}>
				<a href="/manufacturer">Manufacturers</a>
			</li>
			<li class="nav-item" aria-current={page.url.pathname.startsWith('/supplier') ? 'page' : undefined}>
				<a href="/supplier">Suppliers</a>
			</li>
		</ul>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
		</svg>
	</nav>

	<div class="corner">
		<a href="https://github.com/sveltejs/kit">
			<img src={github} alt="GitHub" />
		</a>
	</div>
</header>

<style>
	.site-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		position: sticky;
		top: 0;
		z-index: 1000;
	}

	.corner {
		width: 3em;
		height: 3em;
	}

	.corner a {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.corner img {
		width: 2em;
		height: 2em;
		object-fit: contain;
	}

	nav {
		display: flex;
		justify-content: center;
		--background: rgba(255, 255, 255, 0.7);
	}

	svg {
		width: 2em;
		height: 3em;
		display: block;
	}

	path {
		fill: var(--background);
	}

	.nav-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-item {
		margin: 0 1rem;
	}

	.nav-item a {
		text-decoration: none;
		font-weight: 600;
		color: #333;
		transition: color 0.2s;
	}

	.nav-item[aria-current='page'] a {
		color: #4285f4;
	}

	.nav-item a:hover {
		color: #4285f4;
	}

	li[aria-current='page']::before {
		--size: 6px;
		content: '';
		width: 0;
		height: 0;
		position: absolute;
		top: 0;
		left: calc(50% - var(--size));
		border: var(--size) solid transparent;
		border-top: var(--size) solid var(--color-theme-1);
	}

	nav a {
		display: flex;
		height: 100%;
		align-items: center;
		padding: 0 0.5rem;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: color 0.2s linear;
	}

	a:hover {
		color: var(--color-theme-1);
	}
</style>
