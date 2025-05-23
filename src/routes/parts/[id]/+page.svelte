<script lang="ts">
  import type { PageData } from './$types';
  import PartCard from '$lib/components/cards/PartCard.svelte';
  export let data: PageData;
</script>

<svelte:head>
  <title>Part {data.part.global_part_number || data.part.part_id}</title>
</svelte:head>

<PartCard part={data.part} currentVersion={data.currentVersion} />
