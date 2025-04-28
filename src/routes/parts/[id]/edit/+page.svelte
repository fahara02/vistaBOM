<!-- src/routes/parts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';

	export let data: PageData;
	const form = superForm(data.form);
</script>

<form method="POST" use:form.form>
	<div class="form-group">
		<label for="name">Part Name</label>
		<input type="text" name="name" bind:value={$form.name} class="input" />
		{#if $form.errors.name}
			<span class="error">{$form.errors.name}</span>
		{/if}
	</div>

	<div class="form-group">
		<label for="packageType">Package Type</label>
		<select name="packageType" bind:value={$form.packageType}>
			{#each data.packageTypes as type}
				<option value={type}>{type.replace('_', ' ')}</option>
			{/each}
		</select>
	</div>

	<!-- Add more fields following the same pattern -->

	<button type="submit" class="btn-primary">
		{data.part ? 'Update Part' : 'Create Part'}
	</button>
</form>
