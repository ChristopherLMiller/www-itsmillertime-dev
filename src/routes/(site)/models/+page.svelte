<script lang="ts">
	import { page } from '$app/state';
	import ModelCard from '$lib/components/ModelCard.svelte';
	import Paginator from '$lib/Paginator.svelte';
	import { getModels } from '$lib/queries/getModels';
	import { createQuery } from '@tanstack/svelte-query';

	const searchParams = $derived(page.url.searchParams);

	const queryParams = $derived({
		page: searchParams.get('page') || 1,
		limit: searchParams.get('limit') || 15
	});
	const modelsQuery = $derived(
		createQuery({
			queryKey: ['models', queryParams],
			queryFn: () => getModels(fetch, queryParams),
			staleTime: 1000 * 60 * 60
		})
	);
</script>

{#if $modelsQuery.isPending || $modelsQuery.isFetching || $modelsQuery.isLoading}
	<p>Loading models...</p>
{:else if $modelsQuery.status === 'error'}
	<p>Error loading models: {$modelsQuery.error.message}</p>
{:else if $modelsQuery.isSuccess && $modelsQuery.data?.models}
	<div class="grid">
		{#each $modelsQuery?.data?.models as model (model.id)}
			<ModelCard {model} />
		{/each}
	</div>
	<Paginator meta={$modelsQuery?.data?.meta} />
{/if}

<style lang="postcss">
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, 350px);
		grid-template-rows: masonry;
		justify-content: center;
		gap: 2rem;
	}
</style>
