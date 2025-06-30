<script lang="ts">
	import ModelCard from '$lib/components/ModelCard.svelte';
	import type { Model } from '$lib/types/payload-types';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();
	let models: Model[] = $derived(data.models);
</script>

<div class="grid">
	{#each models as model}
		<ModelCard {model} />
	{/each}
</div>

<style lang="postcss">
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, 350px);
		grid-template-rows: masonry;
		justify-content: center;
		gap: 2rem;
	}
</style>
