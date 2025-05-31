<!-- src/routes/parts/new/+page.svelte -->
<script lang="ts">
	import { PartForm } from '$lib/components/forms';
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
  
	export let data: PageData;
	const { form, errors, enhance } = superForm(data.form, {
		dataType: 'json'
	});

	// Use manufacturers data directly from the server
	let clientManufacturers = data.manufacturers || [];

	// Improved data validation and logging
	onMount(() => {
		// Log server data details for troubleshooting
		console.log('[AddPartPage] Received page data structure:', {
			hasManufacturers: Array.isArray(data.manufacturers),
			manufacturersCount: data.manufacturers?.length || 0,
			hasCategories: Array.isArray(data.categories),
			categoriesCount: data.categories?.length || 0
		});
		
		// Check manufacturer data quality
		if (Array.isArray(data.manufacturers)) {
			console.log('[AddPartPage] First 3 manufacturers:', data.manufacturers.slice(0, 3));
		}
		
		// Log warning if no manufacturers found - but don't add fallback data
		if (!data.manufacturers || data.manufacturers.length === 0) {
			console.warn('[AddPartPage] Warning: No manufacturers data received from the server. Please check the API endpoint and database connection.');
		}
	});
</script>
  
<div class="container">
  <h1>Create New Part</h1>
  
  <PartForm
    data={{ form: $form, errors: $errors }}
    {enhance}
    manufacturers={clientManufacturers}
    categories={data.categories || []}
  />
</div>

<style>
  .container {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  h1 {
    margin-bottom: 1.5rem;
  }
</style>