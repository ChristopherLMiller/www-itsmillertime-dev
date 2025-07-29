<script lang="ts">
	import { page } from '$app/state';
	import Accordian from '$lib/components/Accordian.svelte';
	import Image from '$lib/Image.svelte';
	import Lexical from '$lib/Lexical.svelte';
	import Panel from '$lib/Panel.svelte';
	import { getModel } from '$lib/queries/getModel';
	import { type Media, type Model } from '$lib/types/payload-types.js';
	import { createQuery } from '@tanstack/svelte-query';
	import { makeClockifyDurationFriendly } from '../../../../utilities/makeClockifyDurationFriendly';

	let clockifyProject = $state(null);

	$effect(() => {
		async function getClockifyProject() {
			if ($modelQuery.isSuccess) {
				if (!$modelQuery.data.model.clockify_project) return;
				const response = await fetch(
					`/api/clockify/projects/${$modelQuery.data.model.clockify_project}`
				);

				if (response.ok) {
					clockifyProject = await response.json();
				}
			}
		}

		getClockifyProject();
	});

	const modelQuery = createQuery<{ model: Model; meta: unknown }>({
		queryKey: ['model', page.params.slug],
		queryFn: () => getModel(fetch, page.params.slug),
		staleTime: 1000 * 60 * 60 * 24,
		gcTime: 1000 * 60 * 60 * 24
	});
</script>

<article style:view-transition-name={`model-${$modelQuery.data?.model?.slug}`}>
	<div class="split-column">
		<div class="column first">
			<Image hasBorder image={$modelQuery.data?.model?.model_meta.featuredImage as Media} />
			{#if $modelQuery.data?.model?.buildLog && $modelQuery.data?.model?.buildLog?.length > 0}
				<Panel hasBorder>
					<h3 class="font-oswald text-center color-primary-darker">Build Log</h3>
					{#each $modelQuery.data?.model?.buildLog as part}
						<Accordian summary={part.title}>
							<Lexical data={part.content} />
						</Accordian>
					{/each}
				</Panel>
			{/if}
		</div>
		<div class="column second">
			<Panel hasBorder hasPadding>
				<h1 class="font-oswald text-medium color-primary-darker">
					{$modelQuery.data?.model?.title}
				</h1>
				{#if $modelQuery.data?.model?.model_meta.completionDate}
					<p>
						{$modelQuery.data?.model?.model_meta.status} on {new Date(
							$modelQuery.data?.model?.model_meta.completionDate
						).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</p>
				{/if}
			</Panel>
			<Panel hasBorder hasPadding>
				<h2 class="font-oswald text-medium color-primary-darker">About the Kit</h2>
				<p>Manufacturer: {$modelQuery.data?.model?.model_meta.kit?.manufacturer?.title}</p>
				<p>Scale: {$modelQuery.data?.model?.model_meta.kit?.scale?.title}</p>
				<p>Year Released: {$modelQuery.data?.model?.model_meta.kit?.year_released}</p>
				<p>Kit Number: {$modelQuery.data?.model?.model_meta.kit?.kit_number}</p>
				<a href={$modelQuery.data?.model?.model_meta.kit?.scalemates}>Scalemates Link</a>
				<p>
					Build Time: {clockifyProject &&
						makeClockifyDurationFriendly(clockifyProject.duration, false, true)}
				</p>
			</Panel>
			{#if $modelQuery.data?.model?.model_meta?.videos && $modelQuery.data?.model?.model_meta?.videos.length > 0}
				<Panel hasBorder hasPadding>
					<h2 class="font-oswald text-medium color-primary-darker">Videos</h2>
					{#each $modelQuery.data?.model?.model_meta?.videos as video}
						<a href={video.link}>{video.title}</a>
					{/each}
				</Panel>
			{/if}
			{#if $modelQuery.data?.model?.image && $modelQuery.data?.model?.image?.length > 0}
				<div
					class="image-grid"
					style:grid-template-columns={`repeat(${$modelQuery.data?.model?.image?.length <= 3 ? $modelQuery.data?.model?.image?.length : $modelQuery.data?.model?.image?.length % 3 === 1 ? 2 : 3}, 1fr)`}
				>
					{#each $modelQuery.data?.model?.image as image}
						<Image {image} hasLightbox />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</article>

<style lang="postcss">
	.split-column {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 2rem;
	}
	.column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.column.first {
		grid-column: span 4;
	}
	.column.second {
		grid-column: span 2;
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border: var(--border-width) solid var(--color-primary-darker);
		background: var(--linen-paper);
	}
</style>
