<!-- src/routes/parts/new/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';

	export let data!: PageData;
	const { form, errors,  enhance } = superForm(data.form, { dataType: 'json' });
</script>

<h1>Create New Part</h1>

<form method="POST" use:enhance={enhance}>
	<div class="form-group">
		<label for="name">Part Name</label>
		<input id="name" name="name" type="text" bind:value={$form.name} class="input" class:error={$errors.name} />
		{#if $errors.name}
			<span class="error">{$errors.name}</span>
		{/if}
	</div>

	<div class="form-group">
		<label for="version">Version</label>
		<input id="version" name="version" type="text" bind:value={$form.version} class="input" class:error={$errors.version} />
		{#if $errors.version}
			<span class="error">{$errors.version}</span>
		{/if}
	</div>

	<div class="form-group">
		<label for="status">Status</label>
		<select id="status" name="status" bind:value={$form.status} class="select" class:error={$errors.status}>
			{#each data.statuses as status (status)}
				<option value={status}>{status}</option>
			{/each}
		</select>
		{#if $errors.status}
			<span class="error">{$errors.status}</span>
		{/if}
	</div>

	<!-- Additional fields -->
	<div class="form-group">
		<label for="short_description">Short Description</label>
		<input id="short_description" name="short_description" type="text" bind:value={$form.short_description} class="input" class:error={$errors.short_description} />
		{#if $errors.short_description}
			<span class="error">{$errors.short_description}</span>
		{/if}
	</div>
	<div class="form-group">
		<label for="long_description">Long Description (JSON)</label>
		<textarea id="long_description" name="long_description" bind:value={$form.long_description} class="textarea" class:error={$errors.long_description}></textarea>
		{#if $errors.long_description}
			<span class="error">{$errors.long_description}</span>
		{/if}
	</div>
	<div class="form-group">
		<label for="functional_description">Functional Description</label>
		<textarea id="functional_description" name="functional_description" bind:value={$form.functional_description} class="textarea" class:error={$errors.functional_description}></textarea>
		{#if $errors.functional_description}
			<span class="error">{$errors.functional_description}</span>
		{/if}
	</div>
	<div class="form-group">
		<label for="technical_specifications">Technical Specifications (JSON)</label>
		<textarea id="technical_specifications" name="technical_specifications" bind:value={$form.technical_specifications} class="textarea" class:error={$errors.technical_specifications}></textarea>
		{#if $errors.technical_specifications}
			<span class="error">{$errors.technical_specifications}</span>
		{/if}
	</div>
	<div class="form-group">
		<label for="weight">Weight</label>
		<input id="weight" name="weight" type="number" bind:value={$form.weight} class="input" class:error={$errors.weight} />
		{#if $errors.weight}
			<span class="error">{$errors.weight}</span>
		{/if}
	</div>
	<div class="form-group">
		<label for="weight_unit">Weight Unit</label>
		<select id="weight_unit" name="weight_unit" bind:value={$form.weight_unit} class="select" class:error={$errors.weight_unit}>
			{#each data.weightUnits as unit}
				<option value={unit}>{unit}</option>
			{/each}
		</select>
		{#if $errors.weight_unit}
			<span class="error">{$errors.weight_unit}</span>
		{/if}
	</div>

	<button type="submit" class="btn-primary">Create Part</button>
</form>

<style>
	form {
		max-width: 600px;
		margin: 2rem auto;
		padding: 1.5rem;
		background: #f9f9f9;
		border-radius: 8px;
	}
	.form-group {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
	}
	label {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}
	.input,
	.textarea,
	.select {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}
	.textarea {
		min-height: 4rem;
		resize: vertical;
	}
	.btn-primary {
		background-color: #007bff;
		color: #fff;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}
	.btn-primary:hover {
		background-color: #0056b3;
	}
	.error {
		color: #dc3545;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}
	.input.error, .textarea.error, .select.error {
		border-color: #dc3545;
	}
</style>
