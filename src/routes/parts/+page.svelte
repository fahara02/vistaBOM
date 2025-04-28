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
				<td>{part.globalPartNumber}</td>
				<td>{currentVersion.name}</td>
				<td>{part.status}</td>
				<td>{currentVersion.version}</td>
				<td>
					<a href={`/parts/${part.id}`} class="btn-link">View</a>
					{#if data.user?.id === part.creatorId}
						<a href={`/parts/${part.id}/edit`} class="btn-link">Edit</a>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<a href="/parts/new" class="btn-primary">Add New Part</a>
