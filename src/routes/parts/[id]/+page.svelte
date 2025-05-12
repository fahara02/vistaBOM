<script lang="ts">
  import type { PageData } from './$types';
  import PartCard from '@/components/PartCard.svelte';
  export let data: PageData;
</script>

<svelte:head>
  <title>Part {data.part.globalPartNumber || data.part.id}</title>
</svelte:head>

<PartCard part={data.part} currentVersion={data.currentVersion} />
