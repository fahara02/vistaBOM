<!-- src/routes/parts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { PartForm } from '$lib/components';
	import type { PageData } from './$types';

	export let data: PageData;
	const { form, errors, enhance } = superForm(data.form, {
		dataType: 'json' // Enable handling of complex JSON data and union types
	});
</script>

<div class="container">
	<h1>Edit Part Version</h1>
	<p>Part ID: {data.part.id}</p>
	
	<PartForm 
		{form} 
		{errors} 
		{enhance} 
		statuses={data.lifecycleStatuses}
		packageTypes={data.packageTypes}
		weightUnits={data.weightUnits}
		isEditMode={true}
		dimensionUnits={data.dimensionUnits}
		partStatuses={data.partStatuses}
	/>
</div>

<style>
	.container {
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
		color: hsl(var(--foreground));
		transition: background-color 0.3s, color 0.3s, border-color 0.3s;
	}
	
	h1 {
		margin-bottom: 0.5rem;
		color: hsl(var(--foreground));
	}
	
	p {
		margin-bottom: 1.5rem;
		color: hsl(var(--muted-foreground));
	}
</style>
