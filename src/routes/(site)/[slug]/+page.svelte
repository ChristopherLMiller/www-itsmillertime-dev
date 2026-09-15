<script lang="ts">
	import { browser } from '$app/environment';
	import Lexical from '$lib/components/Lexical';
	import Panel from '$lib/components/Panel';
	import { cmsPageQueryOptions, queryKeys } from '$lib/query/queries';
	import { queryPersistRestored, seedServerQueryData } from '$lib/query/seedServerQuery';
	import { pageMetaOverride } from '$lib/stores/pageMeta';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const queryClient = useQueryClient();

	const query = createQuery(() => cmsPageQueryOptions(data.slug, data.initialPage));

	$effect(() => {
		if (!browser) return;
		void $queryPersistRestored;
		seedServerQueryData(queryClient, queryKeys.page(data.slug), data.initialPage);
	});

	const pageDoc = $derived(
		(query.isPlaceholderData ? data.initialPage : (query.data ?? data.initialPage))?.page
	);

	$effect(() => {
		pageMetaOverride.set(
			(query.isPlaceholderData ? data.initialPage : (query.data ?? data.initialPage))?.meta ??
				null
		);
		return () => pageMetaOverride.set(null);
	});
</script>

{#if pageDoc?.blocks}
	{#each pageDoc.blocks as block (block.id)}
		<Panel hasBorder hasPadding>
			<Lexical data={block.block} />
		</Panel>
	{/each}
{/if}
