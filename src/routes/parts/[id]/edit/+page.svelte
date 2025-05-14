<!-- src/routes/parts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { PartForm } from '$lib/components';
	import type { PageData } from './$types';

	export let data: PageData;

	// Debug the data being passed to the form component
	console.log('Edit page loaded with part data:', {
		part: data.part,
		currentVersion: data.currentVersion,
		formData: data.form
	});

	// Initialize SuperForm with server-provided data
	const { form, errors, enhance } = superForm(data.form, {
		dataType: 'json',
		onUpdated: ({ form }) => {
			console.log('Form updated in edit page:', form);
		}
	});

	// Verify form data is correctly loaded with all fields
	console.log('SuperForm initialized with data:', $form);
	console.log('Form fields count:', Object.keys($form).length);
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
		
		{/* Add type assertions to fix TypeScript errors */}
		partData={{ ...data.part, status: data.part.status as any }}
		versionData={{ ...data.currentVersion, dimensions: data.currentVersion.dimensions as any }}
		
		{/* Pass the form data directly for SuperForm */}
		data={{ form: data.form.data }} 
		serverFormData={data.form} 
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
