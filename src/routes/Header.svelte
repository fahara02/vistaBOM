<script lang="ts">
	import { page } from '$app/stores';
	import logo from '$lib/images/svelte-logo.svg';
	import github from '$lib/images/github.svg';
	import { toggleMode } from "mode-watcher";
	import { Button } from "$lib/components/ui/button/index.js";
	
	// Import Lucide SVG icons
	import { 
		Home, 
		Info, 
		LayoutDashboard,
		Tags, 
		Component, 
		Factory, 
		Truck,
		Sun,
		Moon
	} from 'lucide-svelte';
</script>

<header class="site-header">
	<!-- Header with dynamic background -->
	<div class="header-container">
		<div class="logo-section">
			<a href="https://svelte.dev/docs/kit" class="logo-link">
				<img src={logo} alt="SvelteKit" class="logo-image" />
				<span class="site-name">VistaBOM</span>
			</a>
		</div>

		<nav class="main-nav">
			<ul class="nav-list">
				<li class="nav-item" aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
					<a href="/">
						<span class="nav-icon">
							<Home size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">Home</span>
					</a>
				</li>
				<li class="nav-item" aria-current={$page.url.pathname === '/about' ? 'page' : undefined}>
					<a href="/about">
						<span class="nav-icon">
							<Info size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">About</span>
					</a>
				</li>
				<li class="nav-item" aria-current={$page.url.pathname === '/dashboard' ? 'page' : undefined}>
					<a href="/dashboard">
						<span class="nav-icon">
							<LayoutDashboard size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">Dashboard</span>
					</a>
				</li>
				<li class="nav-item view-only" aria-current={$page.url.pathname.startsWith('/catagory') ? 'page' : undefined}>
					<a href="/catagory">
						<span class="nav-icon">
							<Tags size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">Categories</span>
					</a>
				</li>
				<li class="nav-item view-only" aria-current={$page.url.pathname === '/parts' ? 'page' : undefined}>
					<a href="/parts">
						<span class="nav-icon">
							<Component size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">Parts</span>
					</a>
				</li>
				<li class="nav-item view-only" aria-current={$page.url.pathname.startsWith('/manufacturer') ? 'page' : undefined}>
					<a href="/manufacturer">
						<span class="nav-icon">
							<Factory size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">Manufacturers</span>
					</a>
				</li>
				<li class="nav-item view-only" aria-current={$page.url.pathname.startsWith('/supplier') ? 'page' : undefined}>
					<a href="/supplier">
						<span class="nav-icon">
							<Truck size={18} strokeWidth={2} />
						</span>
						<span class="nav-text">Suppliers</span>
					</a>
				</li>
			</ul>
		</nav>

		<div class="actions-section">
			<div class="theme-toggle-wrapper">
				<button on:click={toggleMode} class="theme-toggle-btn" aria-label="Toggle theme">
					<span class="light-icon">
						<Sun size={16} strokeWidth={2} />
					</span>
					<span class="dark-icon">
						<Moon size={16} strokeWidth={2} />
					</span>
				</button>
			</div>
			
			<a href="https://github.com/sveltejs/kit" class="github-link">
				<img src={github} alt="GitHub" class="github-icon" />
			</a>
		</div>
	</div>
</header>

<style>
	/* Header container styling */
	.site-header {
		background-color: hsl(var(--background));
		border-bottom: 1px solid hsl(var(--border));
		position: sticky;
		top: 0;
		z-index: 100;
		transition: all 0.3s ease;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
		color: hsl(var(--foreground));
	}
	
	:global(.dark) .site-header {
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2);
		border-bottom: 1px solid hsl(var(--border));
	}
	
	.header-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}
	
	/* Logo section styling */
	.logo-section {
		display: flex;
		align-items: center;
	}
	
	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}
	
	.logo-link:hover {
		opacity: 0.9;
	}
	
	.logo-image {
		width: 2rem;
		height: 2rem;
		object-fit: contain;
		filter: brightness(1);
		transition: filter 0.3s ease;
	}
	
	:global(.dark) .logo-image {
		filter: brightness(1.75) contrast(1.2);
	}
	
	.site-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		letter-spacing: 0.5px;
	}
	
	/* Navigation styling */
	.main-nav {
		flex: 1;
		display: flex;
		justify-content: center;
	}
	
	.nav-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 0.25rem;
	}
	
	.nav-item {
		position: relative;
	}
	
	.nav-item a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		color: hsl(var(--foreground));
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		border: 1px solid transparent;
	}
	
	:global(.dark) .nav-item a {
		color: hsl(var(--foreground));
	}
	
	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: currentColor;
	}
	
	/* Hover states for navigation */
	.nav-item a:hover {
		background-color: hsl(var(--nav-hover));
		color: hsl(var(--nav-hover-foreground));
		border-color: hsl(var(--border));
	}
	
	/* Active state for navigation */
	.nav-item[aria-current='page'] a,
	.nav-item.view-only[aria-current='page'] a {
		background-color: #1e3a8a; /* Dark blue for light mode */
		color: #ffffff !important; /* Pure white text - force it */
		font-weight: 700; /* Bold text */
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		outline: none;
		border: none;
	}
	
	:global(.dark) .nav-item[aria-current='page'] a,
	:global(.dark) .nav-item.view-only[aria-current='page'] a {
		background-color: #3b82f6; /* Lighter blue for dark mode */
		color: #ffffff !important; /* Pure white text - force it */
		font-weight: 700; /* Bold text */
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		outline: none;
		border: none;
	}
	
	/* Remove focus outline that creates dotted rectangle */
	.nav-item a:focus,
	.nav-item a:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring));
	}
	
	.nav-item[aria-current='page'] a:focus,
	.nav-item[aria-current='page'] a:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring));
	}
	
	/* View only items styling */
	.nav-item.view-only a {
		color: hsl(var(--foreground)); /* Same color as regular nav items */
		border-style: dashed;
		border-color: hsl(var(--border) / 0.5);
	}
	
	:global(.dark) .nav-item.view-only a {
		color: hsl(var(--foreground)); /* Same color as regular nav items */
		border-color: hsl(var(--border) / 0.7);
	}
	
	.nav-item.view-only a:hover {
		background-color: hsl(var(--nav-hover));
		color: hsl(var(--nav-hover-foreground));
		border-color: hsl(var(--border));
	}
	
	:global(.dark) .nav-item.view-only a:hover {
		background-color: hsl(var(--nav-hover));
		color: hsl(var(--nav-hover-foreground));
	}
	
	/* Dashboard link styling */
	.dashboard-link {
		font-weight: 600 !important;
		color: #1e40af !important; /* Dark blue visible in light mode */
		background-color: transparent;
		border-color: #1e40af !important;
		border-width: 1px;
		border-style: solid;
	}
	
	:global(.dark) .dashboard-link {
		color: #60a5fa !important; /* Light blue visible in dark mode */
		background-color: transparent;
		border-color: #60a5fa !important;
	}
	
	.dashboard-link:hover {
		background-color: hsl(var(--accent) / 0.1) !important;
		border-color: hsl(var(--accent) / 0.3) !important;
	}
	
	:global(.dark) .dashboard-link:hover {
		background-color: hsl(var(--accent) / 0.1) !important;
		border-color: hsl(var(--accent) / 0.3) !important;
	}
	
	/* Actions section styling */
	.actions-section {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.theme-toggle-btn {
		background-color: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 0.375rem;
		padding: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.theme-toggle-btn:hover {
		background-color: hsl(var(--nav-hover));
	}
	
	.light-icon {
		display: block;
		color: hsl(var(--foreground));
	}
	
	.dark-icon {
		display: none;
		color: hsl(var(--foreground));
	}
	
	/* Dark mode specific styles */
	:global(.dark) .light-icon {
		display: none;
	}
	
	:global(.dark) .dark-icon {
		display: block;
	}
	
	.github-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		border: 1px solid hsl(var(--border));
		transition: all 0.2s ease;
	}
	
	.github-link:hover {
		background-color: hsl(var(--muted));
		border-color: hsl(var(--border));
	}
	
	.github-icon {
		width: 1.25rem;
		height: 1.25rem;
		object-fit: contain;
		filter: brightness(1);
		transition: filter 0.3s ease;
	}
	
	:global(.dark) .github-icon {
		filter: brightness(1.75) contrast(1.2);
	}
	
	/* Responsive adjustments */
	@media (max-width: 900px) {
		.nav-text {
			display: none;
		}
		
		.nav-item a {
			padding: 0.5rem;
		}
	}
	
	@media (max-width: 640px) {
		.site-name {
			display: none;
		}
		
		.header-container {
			padding: 0.5rem 1rem;
		}
	}
</style>
