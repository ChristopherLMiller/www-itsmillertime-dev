<script lang="ts">
	import ModelCard from '$lib/components/ModelCard.svelte';
	import Paginator from '$lib/Paginator.svelte';


	const { data } = $props();

	const models = $derived(data.models);
	const meta = $derived(data.meta);
</script>

	<div class="grid">
		{#each models as model (model.id)}
			<ModelCard {model} />
		{/each}
	</div>
	<Paginator meta={meta} />


<style lang="postcss">
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, 350px);
		grid-template-rows: masonry;
		justify-content: center;
		gap: 2rem;
	}
</style>
