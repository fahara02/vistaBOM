<!-- src/routes/parts/new/+page.svelte -->
<script lang="ts">
	import PartForm from '$lib/components/PartForm.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';
  
	export let data: PageData;
	const { form, errors, enhance } = superForm(data.form);
</script>
  
<div class="container">
  <h1>Create New Part</h1>
  
  <PartForm
    {form}
    {errors}
    {enhance}
    statuses={data.statuses}
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