<!-- src/routes/parts/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<table class="part-list">
	<thead>
		<tr>
			<th>Part Number</th>
			<th>Name</th>
			<th>Status</th>
			<th>Version</th>
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{#each data.parts as { part, currentVersion }}
			<tr>
				<td>{part.global_part_number}</td>
				<td>{currentVersion.part_name}</td>
				<td>{part.lifecycle_status}</td>
				<td>{currentVersion.part_version}</td>
				<td>
					<!-- Debug: {JSON.stringify(part)} -->
					<a href={`/parts/${part.part_id}`} class="btn-link">View</a>
					{#if data.user?.id === part.creator_id}
						<a href={`/parts/${part.part_id}/edit`} class="btn-link">Edit</a>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<a href="/parts/new" class="btn-primary">Add New Part</a>
